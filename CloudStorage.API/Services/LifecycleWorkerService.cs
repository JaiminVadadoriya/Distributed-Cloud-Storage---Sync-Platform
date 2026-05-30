using System;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Tiering;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CloudStorage.API.Services
{
    public class LifecycleWorkerService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<LifecycleWorkerService> _logger;
        private readonly TimeSpan _checkInterval;

        public LifecycleWorkerService(
            IServiceProvider serviceProvider,
            ILogger<LifecycleWorkerService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            // Run every 24 hours
            _checkInterval = TimeSpan.FromHours(24);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("LifecycleWorkerService started.");

            // Wait 30 seconds after startup before the first run
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("Starting daily lifecycle policy evaluation run.");
                    
                    using var scope = _serviceProvider.CreateScope();
                    var engine = scope.ServiceProvider.GetRequiredService<ILifecyclePolicyEngine>();
                    await engine.ApplyPoliciesAsync(stoppingToken);

                    _logger.LogInformation("Finished lifecycle policy evaluation run.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during lifecycle policy evaluation run.");
                }

                try
                {
                    await Task.Delay(_checkInterval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
    }
}
