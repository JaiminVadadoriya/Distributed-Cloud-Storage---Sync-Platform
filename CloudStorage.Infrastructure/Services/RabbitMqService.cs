using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using RabbitMQ.Client;

namespace CloudStorage.Infrastructure.Services
{
    public class RabbitMqService : IMessageQueue, IDisposable
    {
        private readonly ConnectionFactory _factory;
        private IConnection? _connection;
        private IChannel? _channel;
        private readonly SemaphoreSlim _connectionLock = new(1, 1);

        public RabbitMqService(IConfiguration configuration)
        {
            _factory = new ConnectionFactory
            {
                HostName = configuration["RabbitMQ:HostName"] ?? "localhost",
                UserName = configuration["RabbitMQ:UserName"] ?? "guest",
                Password = configuration["RabbitMQ:Password"] ?? "guest"
            };
        }

        private async Task EnsureConnectedAsync()
        {
            if (_channel is { IsOpen: true }) return;

            await _connectionLock.WaitAsync();
            try
            {
                if (_channel is { IsOpen: true }) return;

                // Dispose existing if broken
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

                var retries = 5;
                var delay = TimeSpan.FromSeconds(5);

                for (int i = 0; i < retries; i++)
                {
                    try
                    {
                        _connection = await _factory.CreateConnectionAsync();
                        _channel = await _connection.CreateChannelAsync();
                        return;
                    }
                    catch (Exception)
                    {
                        if (i == retries - 1) throw;
                        await Task.Delay(delay);
                    }
                }
            }
            finally
            {
                _connectionLock.Release();
            }
        }

        public async Task PublishAsync<T>(string queueName, T message)
        {
            await EnsureConnectedAsync();

            await _channel!.QueueDeclareAsync(queue: queueName,
                                             durable: true,
                                             exclusive: false,
                                             autoDelete: false,
                                             arguments: null);

            var json = JsonSerializer.Serialize(message);
            var body = Encoding.UTF8.GetBytes(json);

            var properties = new BasicProperties
            {
                Persistent = true
            };

            await _channel.BasicPublishAsync(exchange: "",
                                            routingKey: queueName,
                                            mandatory: false,
                                            basicProperties: properties,
                                            body: body);
        }

        public void Dispose()
        {
            _channel?.Dispose();
            _connection?.Dispose();
            _connectionLock.Dispose();
            GC.SuppressFinalize(this);
        }
    }
}
