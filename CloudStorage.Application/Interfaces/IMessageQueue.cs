using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces
{
    public interface IMessageQueue
    {
        Task PublishAsync<T>(string queueName, T message);
    }
}
