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
    public class RabbitMqService : IMessageQueue, IEventPublisher, IDisposable
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

            System.Collections.Generic.Dictionary<string, object?>? arguments = null;
            if (queueName == "replication-tasks")
            {
                arguments = new System.Collections.Generic.Dictionary<string, object?>
                {
                    { "x-dead-letter-exchange", "domain-events-dlx" },
                    { "x-dead-letter-routing-key", "replication-tasks-retry" }
                };
            }

            await _channel!.QueueDeclareAsync(queue: queueName,
                                             durable: true,
                                             exclusive: false,
                                             autoDelete: false,
                                             arguments: arguments);

            var json = JsonSerializer.Serialize(message);
            var body = Encoding.UTF8.GetBytes(json);

            var properties = new BasicProperties
            {
                Persistent = true,
                MessageId = Guid.NewGuid().ToString(),
                Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds())
            };

            var headers = new System.Collections.Generic.Dictionary<string, object?>();
            if (message != null)
            {
                headers["Type"] = message.GetType().FullName ?? message.GetType().Name;
            }
            headers["x-retry-count"] = 0;
            properties.Headers = headers;

            await _channel.BasicPublishAsync(exchange: "",
                                             routingKey: queueName,
                                             mandatory: false,
                                             basicProperties: properties,
                                             body: body);
        }

        public async Task PublishAsync<TEvent>(TEvent @event, CancellationToken ct = default) where TEvent : class
        {
            await EnsureConnectedAsync();

            var eventName = @event.GetType().Name;
            var exchangeName = "domain-events";

            // Declare a topic exchange for domain events
            await _channel!.ExchangeDeclareAsync(
                exchange: exchangeName,
                type: ExchangeType.Topic,
                durable: true,
                autoDelete: false,
                arguments: null,
                cancellationToken: ct);

            var json = JsonSerializer.Serialize(@event);
            var body = Encoding.UTF8.GetBytes(json);

            var properties = new BasicProperties
            {
                Persistent = true,
                MessageId = Guid.NewGuid().ToString(),
                Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds())
            };

            var headers = new System.Collections.Generic.Dictionary<string, object?>();
            if (@event != null)
            {
                headers["Type"] = @event.GetType().FullName ?? @event.GetType().Name;
            }
            headers["x-retry-count"] = 0;
            properties.Headers = headers;

            await _channel.BasicPublishAsync(
                exchange: exchangeName,
                routingKey: eventName,
                mandatory: false,
                basicProperties: properties,
                body: body,
                cancellationToken: ct);
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
