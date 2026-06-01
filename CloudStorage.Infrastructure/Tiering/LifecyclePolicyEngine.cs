using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Events;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Tiering;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Enums;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Tiering
{
    public class LifecyclePolicyEngine : ILifecyclePolicyEngine
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IStorageTieringService _tieringService;
        private readonly IEventPublisher _eventPublisher;
        private readonly ILogger<LifecyclePolicyEngine> _logger;
        private readonly List<LifecycleRule> _rules;

        public LifecyclePolicyEngine(
            IServiceProvider serviceProvider,
            IStorageTieringService tieringService,
            IEventPublisher eventPublisher,
            IConfiguration configuration,
            ILogger<LifecyclePolicyEngine> logger)
        {
            _serviceProvider = serviceProvider;
            _tieringService = tieringService;
            _eventPublisher = eventPublisher;
            _logger = logger;
            _rules = new List<LifecycleRule>();

            var section = configuration.GetSection("StorageProvider:LifecycleRules");
            foreach (var child in section.GetChildren())
            {
                var ruleId = child["RuleId"] ?? "";
                var prefix = child["Prefix"] ?? "";
                var transitionDays = int.TryParse(child["TransitionAfterDays"], out var td) ? (int?)td : null;
                var expirationDays = int.TryParse(child["ExpirationDays"], out var ed) ? (int?)ed : null;
                var isActive = bool.TryParse(child["IsActive"], out var active) && active;
                
                StorageTier? targetTier = null;
                if (Enum.TryParse<StorageTier>(child["TargetTier"], true, out var tier))
                {
                    targetTier = tier;
                }

                if (!string.IsNullOrEmpty(ruleId))
                {
                    _rules.Add(new LifecycleRule(ruleId, prefix, transitionDays, targetTier, expirationDays, isActive));
                }
            }

            if (_rules.Count == 0)
            {
                _rules.Add(new LifecycleRule(
                    RuleId: "default-archive-rule",
                    Prefix: "",
                    TransitionAfterDays: 30,
                    TargetTier: StorageTier.Archive,
                    ExpirationDays: 365,
                    IsActive: true
                ));
            }
        }

        public async Task EvaluateAsync(string providerName, string objectKey, CancellationToken ct = default)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var lifecycle = await dbContext.StorageObjectLifecycles
                .FirstOrDefaultAsync(l => l.ObjectKey == objectKey && l.ProviderName == providerName, ct);

            if (lifecycle == null)
            {
                lifecycle = new StorageObjectLifecycle
                {
                    Id = Guid.NewGuid(),
                    FileId = Guid.Empty,
                    ObjectKey = objectKey,
                    ProviderName = providerName,
                    CurrentTier = StorageTier.Hot,
                    LastAccessedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };

                var chunk = await dbContext.FileChunks.FirstOrDefaultAsync(c => c.StoragePath.Contains(objectKey), ct);
                if (chunk != null)
                {
                    lifecycle.FileId = chunk.FileMetadataId;
                }

                dbContext.StorageObjectLifecycles.Add(lifecycle);
                await dbContext.SaveChangesAsync(ct);
            }

            var ageDays = (DateTime.UtcNow - lifecycle.CreatedAt).TotalDays;
            var lastAccessDays = (DateTime.UtcNow - lifecycle.LastAccessedAt).TotalDays;

            foreach (var rule in _rules.Where(r => r.IsActive))
            {
                if (!string.IsNullOrEmpty(rule.Prefix) && !objectKey.StartsWith(rule.Prefix, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (rule.TransitionAfterDays.HasValue && rule.TargetTier.HasValue && rule.TargetTier.Value > lifecycle.CurrentTier)
                {
                    if (lastAccessDays >= rule.TransitionAfterDays.Value)
                    {
                        var oldTier = lifecycle.CurrentTier;
                        var result = await _tieringService.MoveToTierAsync(providerName, objectKey, rule.TargetTier.Value, ct);
                        if (result.Success)
                        {
                            lifecycle.CurrentTier = rule.TargetTier.Value;
                            dbContext.StorageObjectLifecycles.Update(lifecycle);
                            await dbContext.SaveChangesAsync(ct);

                            var ev = new StorageTierChangedEvent(
                                FileId: lifecycle.FileId,
                                ObjectKey: objectKey,
                                FromTier: oldTier.ToString(),
                                ToTier: rule.TargetTier.Value.ToString(),
                                Provider: providerName,
                                Timestamp: DateTime.UtcNow
                            );
                            await _eventPublisher.PublishAsync(ev, ct);
                        }
                    }
                }

                if (rule.ExpirationDays.HasValue && ageDays >= rule.ExpirationDays.Value)
                {
                    _logger.LogInformation("Object {ObjectKey} on {Provider} expired under rule {RuleId}. Deleting.", objectKey, providerName, rule.RuleId);
                    
                    var factory = scope.ServiceProvider.GetRequiredService<IStorageProviderFactory>();
                    var provider = factory.GetProvider(providerName);
                    await provider.DeleteAsync(objectKey, ct);

                    dbContext.StorageObjectLifecycles.Remove(lifecycle);
                    await dbContext.SaveChangesAsync(ct);
                    break;
                }
            }
        }

        public async Task ApplyPoliciesAsync(CancellationToken ct = default)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var lifecycles = await dbContext.StorageObjectLifecycles.ToListAsync(ct);
            _logger.LogInformation("Applying lifecycle policies to {Count} objects.", lifecycles.Count);

            foreach (var item in lifecycles)
            {
                if (ct.IsCancellationRequested) break;
                await EvaluateAsync(item.ProviderName, item.ObjectKey, ct);
            }
        }
    }
}
