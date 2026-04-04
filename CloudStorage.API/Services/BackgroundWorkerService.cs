using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
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
        private IModel? _channel;

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
                Password = _configuration["RabbitMQ:Password"] ?? "guest",
                DispatchConsumersAsync = true
            };

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _connection = factory.CreateConnection();
                    _channel = _connection.CreateModel();

                    _channel.QueueDeclare(queue: "deduplication-tasks",
                                         durable: true,
                                         exclusive: false,
                                         autoDelete: false,
                                         arguments: null);
                                         
                    _channel.BasicQos(prefetchSize: 0, prefetchCount: 10, global: false);
                    
                    _logger.LogInformation("Connected to RabbitMQ for background tasks.");
                    
                    var consumer = new AsyncEventingBasicConsumer(_channel);
                    consumer.Received += async (model, ea) =>
                    {
                        var body = ea.Body.ToArray();
                        var message = Encoding.UTF8.GetString(body);
                        
                        try 
                        {
                            _logger.LogInformation($"Received deduplication task: {message}");
                            
                            using var scope = _serviceProvider.CreateScope();
                            var verifyService = scope.ServiceProvider.GetRequiredService<IAzureChunkVerificationService>();
                            
                            await Task.Delay(100, stoppingToken);
                            
                            if (_channel.IsOpen)
                            {
                                _channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false);
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error processing background task");
                            if (_channel != null && _channel.IsOpen)
                            {
                                _channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: true);
                            }
                        }
                    };

                    _channel.BasicConsume(queue: "deduplication-tasks",
                                         autoAck: false,
                                         consumer: consumer);

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
                    _channel?.Dispose();
                    _connection?.Dispose();
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
