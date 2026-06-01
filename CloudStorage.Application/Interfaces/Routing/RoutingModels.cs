using System;

namespace CloudStorage.Application.Interfaces.Routing
{
    public enum HealthState
    {
        Healthy,
        Degraded,
        Unhealthy
    }

    public record ProviderHealthScore(
        string ProviderName,
        HealthState State,
        double HealthScore,
        double AverageLatencyMs,
        bool IsCircuitOpen
    );

    public record RoutingDecision(
        string SelectedProvider,
        string StrategyUsed,
        string? Reason = null
    );

    public record FailoverState(
        string PrimaryProvider,
        string CurrentProvider,
        bool IsFailedOver,
        DateTime? LastFailoverTime = null
    );
}
