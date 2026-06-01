using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using CloudStorage.Infrastructure.Data;
using Moq;
using Xunit;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Replication;
using CloudStorage.Application.Interfaces.Tiering;
using CloudStorage.Application.Interfaces.Routing;
using CloudStorage.Application.Interfaces.Upload;
using CloudStorage.Application.Events;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Enums;
using CloudStorage.Infrastructure.Providers;
using CloudStorage.Infrastructure.Replication;
using CloudStorage.Infrastructure.Routing;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public partial class OrchestrationSystemsTests
    {
        #region 3. Provider Health Routing & Failover Tests

        [Fact]
        public async Task ProviderHealthService_RecordLatency_UpdatesScoreAndEMA()
        {
            // Arrange
            var mockCache = new Mock<ICacheService>();
            mockCache.Setup(c => c.GetAsync<double?>(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((double?)100.0);
            var service = new ProviderHealthService(mockCache.Object);

            // Act
            await service.RecordLatencyAsync("S3", 80.0);

            // Assert
            var score = await service.GetHealthScoreAsync("S3");
            Assert.True(score.HealthScore > 0);
            mockCache.Verify(c => c.SetAsync(It.Is<string>(k => k.Contains("latency")), It.IsAny<double?>(), It.IsAny<TimeSpan>(), null, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task ProviderHealthService_CircuitBreaker_OpenStatus_AffectsRouting()
        {
            // Arrange
            var mockCache = new Mock<ICacheService>();
            mockCache.Setup(c => c.GetAsync<bool?>(It.Is<string>(k => k.Contains("circuit")), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);
            var service = new ProviderHealthService(mockCache.Object);

            // Act
            var isOpen = await service.IsCircuitOpenAsync("S3");
            var score = await service.GetHealthScoreAsync("S3");

            // Assert
            Assert.True(isOpen);
            Assert.Equal(0.0, score.HealthScore);
        }

        [Fact]
        public async Task StorageRoutingEngine_ResolveProvider_AvailabilityOptimized_ReturnsHealthiest()
        {
            // Arrange
            var mockHealth = new Mock<IProviderHealthService>();
            mockHealth.Setup(h => h.GetHealthScoreAsync("S3", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ProviderHealthScore("S3", HealthState.Healthy, 95.0, 100.0, false));
            mockHealth.Setup(h => h.GetHealthScoreAsync("Azure", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ProviderHealthScore("Azure", HealthState.Healthy, 80.0, 120.0, false));
            
            var mockConfig = new Mock<IConfiguration>();
            mockConfig.Setup(c => c["StorageProvider:Active"]).Returns("S3");

            var engine = new StorageRoutingEngine(mockHealth.Object, mockConfig.Object, Mock.Of<ILogger<StorageRoutingEngine>>());

            // Act
            var result = await engine.ResolveProviderAsync("Upload");

            // Assert
            Assert.Equal("S3", result.SelectedProvider);
        }

        [Fact]
        public async Task StorageRoutingEngine_ResolveProvider_CostOptimized_ReturnsLowestCost()
        {
            // Arrange
            var mockHealth = new Mock<IProviderHealthService>();
            mockHealth.Setup(h => h.GetHealthScoreAsync("S3", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ProviderHealthScore("S3", HealthState.Healthy, 90.0, 100.0, false));
            mockHealth.Setup(h => h.GetHealthScoreAsync("Azure", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ProviderHealthScore("Azure", HealthState.Healthy, 90.0, 120.0, false));

            var mockConfig = new Mock<IConfiguration>();
            mockConfig.Setup(c => c["StorageProvider:Active"]).Returns("S3");

            var engine = new StorageRoutingEngine(mockHealth.Object, mockConfig.Object, Mock.Of<ILogger<StorageRoutingEngine>>());

            // Act
            var result = await engine.ResolveProviderAsync("Upload");

            // Assert
            Assert.Equal("S3", result.SelectedProvider);
        }

        [Fact]
        public async Task StorageRoutingEngine_ResolveProvider_AllCircuitsOpen_FallbackToActive()
        {
            // Arrange
            var mockHealth = new Mock<IProviderHealthService>();
            mockHealth.Setup(h => h.GetHealthScoreAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ProviderHealthScore("S3", HealthState.Unhealthy, 0.0, 1000.0, true));

            var mockConfig = new Mock<IConfiguration>();
            mockConfig.Setup(c => c["StorageProvider:Active"]).Returns("S3");

            var engine = new StorageRoutingEngine(mockHealth.Object, mockConfig.Object, Mock.Of<ILogger<StorageRoutingEngine>>());

            // Act
            var result = await engine.ResolveProviderAsync("Upload");

            // Assert
            Assert.Equal("S3", result.SelectedProvider);
            Assert.Equal("FallbackDefault", result.StrategyUsed);
        }

        [Fact]
        public async Task FailoverCoordinator_TriggerFailover_UpdatesStateAndPublishesEvent()
        {
            // Arrange
            var mockCache = new Mock<ICacheService>();
            var mockEventPublisher = new Mock<IEventPublisher>();
            var coordinator = new FailoverCoordinator(mockCache.Object, mockEventPublisher.Object);

            // Act
            await coordinator.TriggerFailoverAsync("Azure", "S3");

            // Assert
            mockCache.Verify(c => c.SetAsync(It.Is<string>(k => k.Contains("failover")), It.IsAny<FailoverState>(), It.IsAny<TimeSpan>(), null, It.IsAny<CancellationToken>()), Times.Once);
            mockEventPublisher.Verify(p => p.PublishAsync(It.IsAny<ProviderHealthChangedEvent>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        #endregion

        #region 4. Replication Coordinator & Provider Tests

        [Fact]
        public async Task ReplicationCoordinator_ScheduleReplication_CreatesJobAndQueuesCommand()
        {
            // Arrange
            var mockCache = new Mock<ICacheService>();
            var mockMessageQueue = new Mock<IMessageQueue>();
            var mockLogger = new Mock<ILogger<ReplicationCoordinator>>();
            
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { 
                    new KeyValuePair<string, string?>("StorageProvider:ReplicationPolicies:0:SourceProvider", "Azure"),
                    new KeyValuePair<string, string?>("StorageProvider:ReplicationPolicies:0:TargetProvider", "S3"),
                    new KeyValuePair<string, string?>("StorageProvider:ReplicationPolicies:0:Mode", "ActivePassive"),
                    new KeyValuePair<string, string?>("StorageProvider:ReplicationPolicies:0:IsActive", "true")
                })
                .Build();

            var coordinator = new ReplicationCoordinator(mockMessageQueue.Object, mockCache.Object, config, mockLogger.Object);

            // Act
            await coordinator.ScheduleReplicationAsync(Guid.NewGuid(), "my-object-key", "Azure");

            // Assert
            mockCache.Verify(c => c.SetAsync(It.Is<string>(k => k.Contains("replication")), It.IsAny<ReplicationJob>(), It.IsAny<TimeSpan>(), null, It.IsAny<CancellationToken>()), Times.Once);
            mockMessageQueue.Verify(q => q.PublishAsync("replication-tasks", It.IsAny<ReplicateObjectCommand>()), Times.Once);
        }

        [Fact]
        public async Task ReplicationProvider_Replicate_DownloadsAndUploadsCorrectly()
        {
            // Arrange
            var mockFactory = new Mock<IStorageProviderFactory>();
            var mockSource = new Mock<IObjectStorageProvider>();
            var mockTarget = new Mock<IObjectStorageProvider>();
            
            var dataBytes = Encoding.UTF8.GetBytes("replicated payload data");
            mockSource.Setup(s => s.DownloadAsync(It.IsAny<string>(), It.IsAny<StorageDownloadOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new MemoryStream(dataBytes));

            mockFactory.Setup(f => f.GetProvider("Azure")).Returns(mockSource.Object);
            mockFactory.Setup(f => f.GetProvider("S3")).Returns(mockTarget.Object);

            var provider = new ReplicationProvider(mockFactory.Object, Mock.Of<ILogger<ReplicationProvider>>());

            // Act
            await provider.ReplicateAsync(Guid.NewGuid(), "key-123", "Azure", "S3");

            // Assert
            mockSource.Verify(s => s.DownloadAsync("key-123", It.IsAny<StorageDownloadOptions>(), It.IsAny<CancellationToken>()), Times.Once);
            mockTarget.Verify(t => t.UploadAsync("key-123", It.IsAny<Stream>(), It.IsAny<StorageUploadOptions>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        #endregion

        #region Extra Health & Replication Tests

        [Fact]
        public async Task ProviderHealthService_SetCircuitOpen_SavesStateToCache()
        {
            var mockCache = new Mock<ICacheService>();
            var service = new ProviderHealthService(mockCache.Object);

            await service.SetCircuitOpenAsync("Azure", true);

            mockCache.Verify(c => c.SetAsync(
                It.Is<string>(k => k.Contains("circuit:Azure")),
                It.Is<bool?>(v => v == true),
                It.IsAny<TimeSpan>(),
                null,
                It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task StorageRoutingEngine_ResolveProvider_LatencyOptimized_SelectsLowestLatency()
        {
            var mockHealth = new Mock<IProviderHealthService>();
            mockHealth.Setup(h => h.GetHealthScoreAsync("S3", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ProviderHealthScore("S3", HealthState.Healthy, 90.0, 50.0, false));
            mockHealth.Setup(h => h.GetHealthScoreAsync("Azure", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ProviderHealthScore("Azure", HealthState.Healthy, 90.0, 150.0, false));

            var mockConfig = new Mock<IConfiguration>();
            mockConfig.Setup(c => c["StorageProvider:Active"]).Returns("S3");
            mockConfig.Setup(c => c["StorageProvider:RoutingStrategy"]).Returns("LatencyOptimized");

            var engine = new StorageRoutingEngine(mockHealth.Object, mockConfig.Object, Mock.Of<ILogger<StorageRoutingEngine>>());

            var result = await engine.ResolveProviderAsync("Upload");

            Assert.Equal("S3", result.SelectedProvider);
        }

        [Fact]
        public async Task StorageRoutingEngine_ResolveProvider_NoActiveProviderConfigured_ReturnsFirstHealthy()
        {
            var mockHealth = new Mock<IProviderHealthService>();
            mockHealth.Setup(h => h.GetHealthScoreAsync("MinIO", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ProviderHealthScore("MinIO", HealthState.Unhealthy, 0.0, 1000.0, true));
            mockHealth.Setup(h => h.GetHealthScoreAsync("S3", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ProviderHealthScore("S3", HealthState.Healthy, 90.0, 100.0, false));
            mockHealth.Setup(h => h.GetHealthScoreAsync("Azure", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ProviderHealthScore("Azure", HealthState.Healthy, 95.0, 100.0, false));
            mockHealth.Setup(h => h.GetHealthScoreAsync("Local", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ProviderHealthScore("Local", HealthState.Healthy, 90.0, 100.0, false));

            var mockConfig = new Mock<IConfiguration>();

            var engine = new StorageRoutingEngine(mockHealth.Object, mockConfig.Object, Mock.Of<ILogger<StorageRoutingEngine>>());

            var result = await engine.ResolveProviderAsync("Upload");

            Assert.Equal("S3", result.SelectedProvider);
        }

        [Fact]
        public async Task FailoverCoordinator_TriggerFailover_AlreadyInFailoverState_DoesNotTriggerAgain()
        {
            var mockCache = new Mock<ICacheService>();
            mockCache.Setup(c => c.GetAsync<FailoverState>(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new FailoverState("Azure", "S3", true, DateTime.UtcNow));
            
            var mockPublisher = new Mock<IEventPublisher>();
            var coordinator = new FailoverCoordinator(mockCache.Object, mockPublisher.Object);

            await coordinator.TriggerFailoverAsync("Azure", "S3");

            mockCache.Verify(c => c.SetAsync(
                It.Is<string>(k => k.Contains("failover")),
                It.IsAny<FailoverState>(),
                It.IsAny<TimeSpan>(),
                null,
                It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task ReplicationCoordinator_ScheduleReplication_NoActivePolicies_DoesNotSchedule()
        {
            var mockCache = new Mock<ICacheService>();
            var mockMessageQueue = new Mock<IMessageQueue>();
            
            var customConfig = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { 
                    new KeyValuePair<string, string?>("StorageProvider:ReplicationPolicies:0:SourceProvider", "Azure"),
                    new KeyValuePair<string, string?>("StorageProvider:ReplicationPolicies:0:TargetProvider", "S3"),
                    new KeyValuePair<string, string?>("StorageProvider:ReplicationPolicies:0:IsActive", "false")
                })
                .Build();

            var coordinator = new ReplicationCoordinator(mockMessageQueue.Object, mockCache.Object, customConfig, Mock.Of<ILogger<ReplicationCoordinator>>());

            await coordinator.ScheduleReplicationAsync(Guid.NewGuid(), "my-key", "Azure");

            mockCache.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<ReplicationJob>(), It.IsAny<TimeSpan>(), null, It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task ReplicationProvider_Replicate_SourceDownloadFails_ThrowsException()
        {
            var mockFactory = new Mock<IStorageProviderFactory>();
            var mockSource = new Mock<IObjectStorageProvider>();
            var mockTarget = new Mock<IObjectStorageProvider>();

            mockSource.Setup(s => s.DownloadAsync(It.IsAny<string>(), It.IsAny<StorageDownloadOptions>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new FileNotFoundException("Source not found"));

            mockFactory.Setup(f => f.GetProvider("Azure")).Returns(mockSource.Object);
            mockFactory.Setup(f => f.GetProvider("S3")).Returns(mockTarget.Object);

            var provider = new ReplicationProvider(mockFactory.Object, Mock.Of<ILogger<ReplicationProvider>>());

            await Assert.ThrowsAsync<FileNotFoundException>(() => 
                provider.ReplicateAsync(Guid.NewGuid(), "key-123", "Azure", "S3"));
        }

        [Fact]
        public async Task ReplicationProvider_Replicate_TargetUploadFails_ThrowsException()
        {
            var mockFactory = new Mock<IStorageProviderFactory>();
            var mockSource = new Mock<IObjectStorageProvider>();
            var mockTarget = new Mock<IObjectStorageProvider>();

            mockSource.Setup(s => s.DownloadAsync(It.IsAny<string>(), It.IsAny<StorageDownloadOptions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new MemoryStream(new byte[10]));

            mockTarget.Setup(t => t.UploadAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<StorageUploadOptions>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("Upload failed"));

            mockFactory.Setup(f => f.GetProvider("Azure")).Returns(mockSource.Object);
            mockFactory.Setup(f => f.GetProvider("S3")).Returns(mockTarget.Object);

            var provider = new ReplicationProvider(mockFactory.Object, Mock.Of<ILogger<ReplicationProvider>>());

            await Assert.ThrowsAsync<System.InvalidOperationException>(() => 
                provider.ReplicateAsync(Guid.NewGuid(), "key-123", "Azure", "S3"));
        }

        [Fact]
        public async Task ProviderHealthService_RecordLatency_HandlesSubsequentReadsCorrectly()
        {
            var mockCache = new Mock<ICacheService>();
            mockCache.SetupSequence(c => c.GetAsync<double?>(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((double?)null)
                .ReturnsAsync((double?)150.0);

            var service = new ProviderHealthService(mockCache.Object);

            await service.RecordLatencyAsync("S3", 100.0);

            var score = await service.GetHealthScoreAsync("S3");

            Assert.Equal(150.0, score.AverageLatencyMs);
        }

        #endregion
    }
}
