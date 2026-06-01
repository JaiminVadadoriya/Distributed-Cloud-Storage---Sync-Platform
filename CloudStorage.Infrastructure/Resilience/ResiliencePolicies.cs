using System;
using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;
using Polly.Timeout;

namespace CloudStorage.Infrastructure.Resilience
{
    public static class ResiliencePolicies
    {
        public static ResiliencePipeline<T> GetProviderPipeline<T>(string providerName)
        {
            return new ResiliencePipelineBuilder<T>()
                .AddRetry(new RetryStrategyOptions<T>
                {
                    MaxRetryAttempts = 3,
                    BackoffType = DelayBackoffType.Exponential,
                    UseJitter = true,
                    Delay = TimeSpan.FromSeconds(1)
                })
                .AddCircuitBreaker(new CircuitBreakerStrategyOptions<T>
                {
                    FailureRatio = 0.5,
                    SamplingDuration = TimeSpan.FromSeconds(30),
                    MinimumThroughput = 5,
                    BreakDuration = TimeSpan.FromSeconds(60)
                })
                .AddTimeout(TimeSpan.FromSeconds(30))
                .Build();
        }

        public static ResiliencePipeline GetProviderPipeline(string providerName)
        {
            return new ResiliencePipelineBuilder()
                .AddRetry(new RetryStrategyOptions
                {
                    MaxRetryAttempts = 3,
                    BackoffType = DelayBackoffType.Exponential,
                    UseJitter = true,
                    Delay = TimeSpan.FromSeconds(1)
                })
                .AddCircuitBreaker(new CircuitBreakerStrategyOptions
                {
                    FailureRatio = 0.5,
                    SamplingDuration = TimeSpan.FromSeconds(30),
                    MinimumThroughput = 5,
                    BreakDuration = TimeSpan.FromSeconds(60)
                })
                .AddTimeout(TimeSpan.FromSeconds(30))
                .Build();
        }
    }
}
