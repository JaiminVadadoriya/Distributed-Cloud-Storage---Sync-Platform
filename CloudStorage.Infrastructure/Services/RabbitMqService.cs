using System;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using RabbitMQ.Client;

namespace CloudStorage.Infrastructure.Services
{
    public class RabbitMqService : IMessageQueue, IDisposable
    {
        private readonly IConnection _connection;
        private readonly IModel _channel;

        public RabbitMqService(IConfiguration configuration)
        {
            var factory = new ConnectionFactory
            {
                HostName = configuration["RabbitMQ:HostName"] ?? "localhost",
                UserName = configuration["RabbitMQ:UserName"] ?? "guest",
                Password = configuration["RabbitMQ:Password"] ?? "guest",
                DispatchConsumersAsync = true
            };

            var retries = 5;
            var delay = TimeSpan.FromSeconds(5);

            for (int i = 0; i < retries; i++)
            {
                try
                {
                    _connection = factory.CreateConnection();
                    _channel = _connection.CreateModel();
                    return;
                }
                catch (Exception)
                {
                    if (i == retries - 1) throw;
                    System.Threading.Thread.Sleep(delay);
                }
            }

            // Fallback for compiler flow analysis
            _connection = null!;
            _channel = null!;
        }

        public Task PublishAsync<T>(string queueName, T message)
        {
            _channel.QueueDeclare(queue: queueName,
                                 durable: true,
                                 exclusive: false,
                                 autoDelete: false,
                                 arguments: null);

            var json = JsonSerializer.Serialize(message);
            var body = Encoding.UTF8.GetBytes(json);

            var properties = _channel.CreateBasicProperties();
            properties.Persistent = true;

            _channel.BasicPublish(exchange: "",
                                 routingKey: queueName,
                                 basicProperties: properties,
                                 body: body);

            return Task.CompletedTask;
        }

        public void Dispose()
        {
            _channel?.Dispose();
            _connection?.Dispose();
        }
    }
}
