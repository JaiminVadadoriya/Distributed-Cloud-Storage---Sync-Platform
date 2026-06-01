using System;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Events;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Routing;

namespace CloudStorage.Infrastructure.Routing
{
    public class FailoverCoordinator : IFailoverCoordinator
    {
        private readonly ICacheService _cache;
        private readonly IEventPublisher _eventPublisher;

        public FailoverCoordinator(ICacheService cache, IEventPublisher eventPublisher)
        {
            _cache = cache;
            _eventPublisher = eventPublisher;
        }

        public async Task<FailoverState> GetFailoverStateAsync(string primaryProvider, CancellationToken ct = default)
        {
            var key = $"failover:state:{primaryProvider}";
            var state = await _cache.GetAsync<FailoverState>(key, ct);
            if (state == null)
            {
                state = new FailoverState(primaryProvider, primaryProvider, false, null);
            }
            return state;
        }

        public async Task TriggerFailoverAsync(string fromProvider, string toProvider, CancellationToken ct = default)
        {
            var currentState = await GetFailoverStateAsync(fromProvider, ct);
            if (currentState.IsFailedOver && string.Equals(currentState.CurrentProvider, toProvider, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var key = $"failover:state:{fromProvider}";
            var state = new FailoverState(fromProvider, toProvider, true, DateTime.UtcNow);
            await _cache.SetAsync(key, state, TimeSpan.FromDays(7), ct: ct);

            var ev = new ProviderHealthChangedEvent(
                ProviderName: fromProvider,
                PreviousState: "Healthy",
                NewState: "Unhealthy",
                HealthScore: 0.0,
                Timestamp: DateTime.UtcNow
            );
            await _eventPublisher.PublishAsync(ev, ct);
        }

        public async Task TriggerFailbackAsync(string primaryProvider, CancellationToken ct = default)
        {
            var key = $"failover:state:{primaryProvider}";
            var state = new FailoverState(primaryProvider, primaryProvider, false, DateTime.UtcNow);
            await _cache.SetAsync(key, state, TimeSpan.FromDays(7), ct: ct);

            var ev = new ProviderHealthChangedEvent(
                ProviderName: primaryProvider,
                PreviousState: "Unhealthy",
                NewState: "Healthy",
                HealthScore: 1.0,
                Timestamp: DateTime.UtcNow
            );
            await _eventPublisher.PublishAsync(ev, ct);
        }
    }
}
