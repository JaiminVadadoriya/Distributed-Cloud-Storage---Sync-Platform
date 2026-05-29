using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces
{
    public interface IEventPublisher
    {
        Task PublishAsync<TEvent>(TEvent @event, CancellationToken ct = default) where TEvent : class;
    }
}
