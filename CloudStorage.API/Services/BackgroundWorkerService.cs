using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace CloudStorage.API.Services
{
    public class BackgroundWorkerService : BackgroundService
    {
        private readonly ILogger<BackgroundWorkerService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private IConnection? _connection;
        private IChannel? _channel;

        public BackgroundWorkerService(
            ILogger<BackgroundWorkerService> logger,
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

                    await _channel.QueueDeclareAsync(queue: "deduplication-tasks",
                                                     durable: true,
                                                     exclusive: false,
                                                     autoDelete: false,
                                                     arguments: null,
                                                     cancellationToken: stoppingToken);

                    await _channel.BasicQosAsync(prefetchSize: 0, prefetchCount: 10, global: false, cancellationToken: stoppingToken);

                    _logger.LogInformation("Connected to RabbitMQ for background tasks.");

                    var consumer = new AsyncEventingBasicConsumer(_channel);
                    consumer.ReceivedAsync += async (model, ea) =>
                    {
                        var body = ea.Body.ToArray();
                        var message = Encoding.UTF8.GetString(body);

                        try
                        {
                            var taskData = JsonDocument.Parse(message).RootElement;
                            var taskType = taskData.GetProperty("TaskType").GetString();

                            if (taskType == "VerifyAndComplete")
                            {
                                var fileId = taskData.GetProperty("FileId").GetGuid();
                                var chunkCount = taskData.GetProperty("ChunkCount").GetInt32();

                                _logger.LogInformation($"[WORKER] Starting verification for File: {fileId} ({chunkCount} chunks)");

                                using var scope = _serviceProvider.CreateScope();
                                var verifyService = scope.ServiceProvider.GetRequiredService<IChunkVerificationService>();
                                var fileRepository = scope.ServiceProvider.GetRequiredService<IFileMetadataRepository>();

                                var result = await verifyService.VerifyAllChunksAsync(fileId, chunkCount);

                                if (result.IsValid)
                                {
                                    _logger.LogInformation($"[WORKER] Verification SUCCESS for File: {fileId}");
                                }
                                else
                                {
                                    _logger.LogError($"[WORKER] Verification FAILED for File: {fileId}. Missing chunks: {string.Join(", ", result.MissingChunkIndices)}");

                                    var file = await fileRepository.GetByIdAsync(fileId);
                                    if (file != null)
                                    {
                                        file.Status = UploadStatus.Failed;
                                        await fileRepository.UpdateAsync(file);
                                    }
                                }
                            }

                            if (_channel != null && _channel.IsOpen)
                            {
                                await _channel.BasicAckAsync(deliveryTag: ea.DeliveryTag, multiple: false, cancellationToken: stoppingToken);
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error processing background task");
                            if (_channel != null && _channel.IsOpen)
                            {
                                await _channel.BasicNackAsync(deliveryTag: ea.DeliveryTag, multiple: false, requeue: true, cancellationToken: stoppingToken);
                            }
                        }
                    };

                    await _channel.BasicConsumeAsync(queue: "deduplication-tasks",
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
                    _logger.LogWarning(ex, "RabbitMQ connection failed in BackgroundWorkerService. Retrying in 5 seconds...");
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
            base.Dispose();
        }
    }
}
