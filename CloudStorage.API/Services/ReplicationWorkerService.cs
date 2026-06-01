using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Events;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Replication;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Infrastructure.Replication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace CloudStorage.API.Services
{
    public class ReplicationWorkerService : BackgroundService
    {
        private readonly ILogger<ReplicationWorkerService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private IConnection? _connection;
        private IChannel? _channel;

        public ReplicationWorkerService(
            ILogger<ReplicationWorkerService> logger,
            IConfiguration configuration,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _configuration = configuration;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var factory = new ConnectionFactory
            {
                HostName = _configuration["RabbitMQ:HostName"] ?? "localhost",
                UserName = _configuration["RabbitMQ:UserName"] ?? "guest",
                Password = _configuration["RabbitMQ:Password"] ?? "guest"
            };

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _connection = await factory.CreateConnectionAsync(stoppingToken);
                    _channel = await _connection.CreateChannelAsync(cancellationToken: stoppingToken);

                    // Declare DLX and DLQ
                    await _channel.ExchangeDeclareAsync(
                        exchange: "domain-events-dlx",
                        type: ExchangeType.Direct,
                        durable: true,
                        autoDelete: false,
                        arguments: null,
                        cancellationToken: stoppingToken);

                    await _channel.QueueDeclareAsync(
                        queue: "domain-events-dlq",
                        durable: true,
                        exclusive: false,
                        autoDelete: false,
                        arguments: null,
                        cancellationToken: stoppingToken);

                    await _channel.QueueBindAsync(
                        queue: "domain-events-dlq",
                        exchange: "domain-events-dlx",
                        routingKey: "replication-tasks-retry",
                        cancellationToken: stoppingToken);

                    // Declare replication queue with DLX arguments
                    var args = new Dictionary<string, object?>
                    {
                        { "x-dead-letter-exchange", "domain-events-dlx" },
                        { "x-dead-letter-routing-key", "replication-tasks-retry" }
                    };

                    await _channel.QueueDeclareAsync(
                        queue: "replication-tasks",
                        durable: true,
                        exclusive: false,
                        autoDelete: false,
                        arguments: args,
                        cancellationToken: stoppingToken);

                    await _channel.BasicQosAsync(prefetchSize: 0, prefetchCount: 5, global: false, cancellationToken: stoppingToken);

                    _logger.LogInformation("Connected to RabbitMQ for replication tasks.");

                    var consumer = new AsyncEventingBasicConsumer(_channel);
                    consumer.ReceivedAsync += async (model, ea) =>
                    {
                        var body = ea.Body.ToArray();
                        var message = Encoding.UTF8.GetString(body);

                        using var scope = _serviceProvider.CreateScope();
                        var replicationProvider = scope.ServiceProvider.GetRequiredService<IReplicationProvider>();
                        var cache = scope.ServiceProvider.GetRequiredService<ICacheService>();
                        var eventPublisher = scope.ServiceProvider.GetRequiredService<IEventPublisher>();

                        ReplicateObjectCommand? command = null;
                        try
                        {
                            command = JsonSerializer.Deserialize<ReplicateObjectCommand>(message);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to deserialize replication command: {Message}", message);
                            await _channel.BasicRejectAsync(deliveryTag: ea.DeliveryTag, requeue: false, cancellationToken: stoppingToken);
                            return;
                        }

                        if (command == null)
                        {
                            await _channel.BasicRejectAsync(deliveryTag: ea.DeliveryTag, requeue: false, cancellationToken: stoppingToken);
                            return;
                        }

                        var jobKey = $"replication:job:{command.JobId}";
                        var job = await cache.GetAsync<ReplicationJob>(jobKey, stoppingToken);
                        if (job == null)
                        {
                            job = new ReplicationJob(
                                JobId: command.JobId,
                                FileId: command.FileId,
                                SourceProvider: command.SourceProvider,
                                TargetProvider: command.TargetProvider,
                                ObjectKey: command.ObjectKey,
                                Status: ReplicationStatus.InProgress,
                                CreatedAt: DateTime.UtcNow
                            );
                        }
                        else if (job.Status == ReplicationStatus.Completed)
                        {
                            _logger.LogInformation("Replication job {JobId} is already completed. Skipping.", command.JobId);
                            await _channel.BasicAckAsync(deliveryTag: ea.DeliveryTag, multiple: false, cancellationToken: stoppingToken);
                            return;
                        }

                        job = job with { Status = ReplicationStatus.InProgress };
                        await cache.SetAsync(jobKey, job, TimeSpan.FromDays(7), ct: stoppingToken);

                        try
                        {
                            await replicationProvider.ReplicateAsync(
                                command.FileId,
                                command.ObjectKey,
                                command.SourceProvider,
                                command.TargetProvider,
                                stoppingToken
                            );

                            job = job with { Status = ReplicationStatus.Completed, CompletedAt = DateTime.UtcNow };
                            await cache.SetAsync(jobKey, job, TimeSpan.FromDays(7), ct: stoppingToken);

                            var replicatedEvent = new FileReplicatedEvent(command.FileId, command.SourceProvider, command.TargetProvider, DateTime.UtcNow);
                            await eventPublisher.PublishAsync(replicatedEvent, stoppingToken);

                            await _channel.BasicAckAsync(deliveryTag: ea.DeliveryTag, multiple: false, cancellationToken: stoppingToken);
                        }
                        catch (Exception ex)
                        {
                            var retryCount = job.RetryCount + 1;
                            job = job with { RetryCount = retryCount, Error = ex.Message };

                            _logger.LogError(ex, "Replication failed for job {JobId} (Retry: {RetryCount})", command.JobId, retryCount);

                            if (retryCount >= 3)
                            {
                                job = job with { Status = ReplicationStatus.Failed, CompletedAt = DateTime.UtcNow };
                                await cache.SetAsync(jobKey, job, TimeSpan.FromDays(7), ct: stoppingToken);

                                var failedEvent = new ReplicationFailedEvent(command.FileId, command.SourceProvider, command.TargetProvider, ex.Message, retryCount, DateTime.UtcNow);
                                await eventPublisher.PublishAsync(failedEvent, stoppingToken);

                                await _channel.BasicRejectAsync(deliveryTag: ea.DeliveryTag, requeue: false, cancellationToken: stoppingToken);
                            }
                            else
                            {
                                await cache.SetAsync(jobKey, job, TimeSpan.FromDays(7), ct: stoppingToken);
                                await _channel.BasicNackAsync(deliveryTag: ea.DeliveryTag, multiple: false, requeue: true, cancellationToken: stoppingToken);
                            }
                        }
                    };

                    await _channel.BasicConsumeAsync(
                        queue: "replication-tasks",
                        autoAck: false,
                        consumer: consumer,
                        cancellationToken: stoppingToken);

                    while (!stoppingToken.IsCancellationRequested && _connection.IsOpen)
                    {
                        await Task.Delay(1000, stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "RabbitMQ connection failed in ReplicationWorkerService. Retrying in 5 seconds...");
                    await Task.Delay(5000, stoppingToken);
                }
                finally
                {
                    if (_channel != null)
                    {
                        _channel.Dispose();
                        _channel = null;
                    }
                    if (_connection != null)
                    {
                        _connection.Dispose();
                        _connection = null;
                    }
                }
            }
        }

        public override void Dispose()
        {
            _channel?.Dispose();
            _connection?.Dispose();
            base.Dispose();
        }
    }
}
