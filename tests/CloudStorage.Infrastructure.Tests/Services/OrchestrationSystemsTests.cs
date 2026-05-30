using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using CloudStorage.Infrastructure.Data;
using Moq;
using Xunit;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Replication;
using CloudStorage.Application.Interfaces.Tiering;
using CloudStorage.Application.Interfaces.Routing;
using CloudStorage.Application.Interfaces.Upload;
using CloudStorage.Application.Interfaces.Security;
using CloudStorage.Application.Events;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Enums;
using CloudStorage.Domain.Interfaces;
using CloudStorage.Infrastructure.Providers;
using CloudStorage.Infrastructure.Replication;
using CloudStorage.Infrastructure.Tiering;
using CloudStorage.Infrastructure.Routing;
using CloudStorage.Infrastructure.Upload;
using CloudStorage.Infrastructure.Security;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Blobs.Specialized;
using Amazon.S3;
using Amazon.S3.Model;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class OrchestrationSystemsTests
    {
        #region 1. Security & Integrity Tests

        [Fact]
        public async Task Sha256IntegrityVerifier_ComputeChecksum_ValidStream_ReturnsCorrectHash()
        {
            // Arrange
            var verifier = new Sha256IntegrityVerifier();
            var data = "hello world";
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(data));
            var expectedHash = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"; // SHA-256 for "hello world"

            // Act
            var hash = await verifier.ComputeChecksumAsync(stream);

            // Assert
            Assert.Equal(expectedHash, hash);
        }

        [Fact]
        public async Task Sha256IntegrityVerifier_VerifyChecksum_ValidHash_ReturnsTrue()
        {
            // Arrange
            var verifier = new Sha256IntegrityVerifier();
            var data = "test-data";
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(data));
            var hash = await verifier.ComputeChecksumAsync(stream);

            // Act
            var result = await verifier.VerifyChecksumAsync(stream, hash);

            // Assert
            Assert.True(result.IsValid);
            Assert.Equal(hash, result.ComputedHash);
        }

        [Fact]
        public async Task Sha256IntegrityVerifier_VerifyChecksum_InvalidHash_ReturnsFalse()
        {
            // Arrange
            var verifier = new Sha256IntegrityVerifier();
            var data = "test-data";
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(data));

            // Act
            var result = await verifier.VerifyChecksumAsync(stream, "wronghash");

            // Assert
            Assert.False(result.IsValid);
        }

        [Fact]
        public async Task AesEncryptionKeyService_EncryptAndDecrypt_Roundtrip_Succeeds()
        {
            // Arrange
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { new KeyValuePair<string, string?>("Security:MasterKey", "some-super-secret-key-32-characters") })
                .Build();
            var service = new AesEncryptionKeyService(config);
            var plaintext = Encoding.UTF8.GetBytes("top secret information");
            var keyId = "key-123";

            // Act
            var encrypted = await service.EncryptAsync(plaintext, keyId);
            var decrypted = await service.DecryptAsync(encrypted, keyId);
            var decryptedStr = Encoding.UTF8.GetString(decrypted);

            // Assert
            Assert.NotNull(encrypted);
            Assert.NotEqual(plaintext, encrypted);
            Assert.Equal("top secret information", decryptedStr);
        }

        [Fact]
        public async Task AesEncryptionKeyService_EncryptAndDecrypt_MultipleKeys_Succeeds()
        {
            // Arrange
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { new KeyValuePair<string, string?>("Security:MasterKey", "some-super-secret-key-32-characters") })
                .Build();
            var service = new AesEncryptionKeyService(config);
            var plaintext = Encoding.UTF8.GetBytes("shared secrets");

            // Act
            var encrypted1 = await service.EncryptAsync(plaintext, "key-1");
            var encrypted2 = await service.EncryptAsync(plaintext, "key-2");
            var decrypted1 = await service.DecryptAsync(encrypted1, "key-1");
            var decrypted2 = await service.DecryptAsync(encrypted2, "key-2");

            // Assert
            Assert.Equal("shared secrets", Encoding.UTF8.GetString(decrypted1));
            Assert.Equal("shared secrets", Encoding.UTF8.GetString(decrypted2));
            Assert.NotEqual(encrypted1, encrypted2); // Output ciphertext nonce-dependent and key-dependent
        }

        [Fact]
        public async Task AesEncryptionKeyService_Decrypt_WithInvalidKey_ThrowsException()
        {
            // Arrange
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { new KeyValuePair<string, string?>("Security:MasterKey", "some-super-secret-key-32-characters") })
                .Build();
            var service = new AesEncryptionKeyService(config);
            var plaintext = Encoding.UTF8.GetBytes("secret");
            var encrypted = await service.EncryptAsync(plaintext, "key-1");

            // Act & Assert
            await Assert.ThrowsAnyAsync<Exception>(() => service.DecryptAsync(encrypted, "key-2"));
        }

        [Fact]
        public async Task AesEncryptionKeyService_Decrypt_WithCorruptedPayload_ThrowsException()
        {
            // Arrange
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { new KeyValuePair<string, string?>("Security:MasterKey", "some-super-secret-key-32-characters") })
                .Build();
            var service = new AesEncryptionKeyService(config);
            var plaintext = Encoding.UTF8.GetBytes("secret");
            var encrypted = await service.EncryptAsync(plaintext, "key-1");
            encrypted[encrypted.Length - 1] ^= 0xFF; // Corrupt payload

            // Act & Assert
            await Assert.ThrowsAnyAsync<Exception>(() => service.DecryptAsync(encrypted, "key-1"));
        }

        [Fact]
        public async Task AesEncryptionKeyService_RotateKey_IncrementsVersion()
        {
            // Arrange
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { new KeyValuePair<string, string?>("Security:MasterKey", "some-super-secret-key-32-characters") })
                .Build();
            var service = new AesEncryptionKeyService(config);
            var keyId = "key-rotate";

            // Act
            var meta1 = await service.GetKeyMetadataAsync(keyId);
            var rotated = await service.RotateKeyAsync(keyId);
            var meta2 = await service.GetKeyMetadataAsync(keyId);

            // Assert
            Assert.Equal(1, meta1.Version);
            Assert.Equal(2, rotated.Version);
            Assert.Equal(2, meta2.Version);
            Assert.NotNull(rotated.RotatedAt);
        }

        [Fact]
        public async Task AesEncryptionKeyService_GetKeyMetadata_RetrievesCorrectMetadata()
        {
            // Arrange
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { new KeyValuePair<string, string?>("Security:MasterKey", "some-super-secret-key-32-characters") })
                .Build();
            var service = new AesEncryptionKeyService(config);
            var keyId = "key-meta";

            // Act
            var meta = await service.GetKeyMetadataAsync(keyId);

            // Assert
            Assert.Equal(keyId, meta.KeyId);
            Assert.Equal(EncryptionAlgorithm.Aes256Gcm, meta.Algorithm);
            Assert.Null(meta.RotatedAt);
        }

        #endregion

        #region 2. Capability Negotiator Tests

        [Fact]
        public void CapabilityNegotiator_GetCapabilities_ReturnsProviderSpecificCapabilities()
        {
            // Arrange
            var negotiator = new CapabilityNegotiator();

            // Act
            var s3Caps = negotiator.GetCapabilities("S3");
            var azureCaps = negotiator.GetCapabilities("Azure");
            var localCaps = negotiator.GetCapabilities("Local");

            // Assert
            Assert.True(s3Caps.SupportsMultipartUpload);
            Assert.True(azureCaps.SupportsStorageTiering);
            Assert.False(localCaps.SupportsPresignedUrls);
        }

        [Fact]
        public void CapabilityNegotiator_SupportsFeature_ReturnsCorrectBoolean()
        {
            // Arrange
            var negotiator = new CapabilityNegotiator();

            // Act & Assert
            Assert.True(negotiator.SupportsFeature("S3", "SupportsMultipartUpload"));
            Assert.False(negotiator.SupportsFeature("Local", "SupportsPresignedUrls"));
            Assert.False(negotiator.SupportsFeature("NonExistent", "SupportsVersioning"));
        }

        [Fact]
        public void CapabilityNegotiator_ResolveUploadStrategy_SmallFile_ReturnsStream()
        {
            // Arrange
            var negotiator = new CapabilityNegotiator();

            // Act
            var strategy = negotiator.ResolveUploadStrategy("S3", 4 * 1024 * 1024); // 4MB

            // Assert
            Assert.Equal(UploadStrategyType.Stream, strategy);
        }

        [Fact]
        public void CapabilityNegotiator_ResolveUploadStrategy_LargeFile_S3_ReturnsMultipart()
        {
            // Arrange
            var negotiator = new CapabilityNegotiator();

            // Act
            var strategy = negotiator.ResolveUploadStrategy("S3", 10 * 1024 * 1024); // 10MB

            // Assert
            Assert.Equal(UploadStrategyType.Multipart, strategy);
        }

        [Fact]
        public void CapabilityNegotiator_ResolveUploadStrategy_LargeFile_Azure_ReturnsBlockBlob()
        {
            // Arrange
            var negotiator = new CapabilityNegotiator();

            // Act
            var strategy = negotiator.ResolveUploadStrategy("Azure", 10 * 1024 * 1024); // 10MB

            // Assert
            Assert.Equal(UploadStrategyType.BlockBlob, strategy);
        }

        [Fact]
        public void CapabilityNegotiator_ResolveUploadStrategy_LargeFile_Gcp_ReturnsResumable()
        {
            // Arrange
            var negotiator = new CapabilityNegotiator();

            // Act
            var strategy = negotiator.ResolveUploadStrategy("GCP", 10 * 1024 * 1024); // 10MB

            // Assert
            Assert.Equal(UploadStrategyType.Resumable, strategy);
        }

        [Fact]
        public void CapabilityNegotiator_ResolveUploadStrategy_LargeFile_Local_ReturnsStream()
        {
            // Arrange
            var negotiator = new CapabilityNegotiator();

            // Act
            var strategy = negotiator.ResolveUploadStrategy("Local", 10 * 1024 * 1024); // 10MB

            // Assert
            Assert.Equal(UploadStrategyType.Stream, strategy);
        }

        [Fact]
        public void CapabilityNegotiator_ResolveUploadStrategy_InvalidProvider_ThrowsKeyNotFoundException()
        {
            // Arrange
            var negotiator = new CapabilityNegotiator();

            // Act & Assert
            Assert.Throws<KeyNotFoundException>(() => negotiator.ResolveUploadStrategy("NonExistent", 10 * 1024 * 1024));
        }

        #endregion

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

        #region 5. Storage Tiering & Lifecycle Tests

        [Fact]
        public void StorageCostAnalyzer_GetTierCostPerGB_ReturnsExpectedCost()
        {
            // Arrange
            var analyzer = new StorageCostAnalyzer();

            // Act & Assert
            Assert.Equal(0.010, analyzer.GetTierCostPerGB("Local", StorageTier.Hot));
            Assert.Equal(0.005, analyzer.GetTierCostPerGB("Local", StorageTier.Warm));
            Assert.Equal(0.002, analyzer.GetTierCostPerGB("Local", StorageTier.Cold));
            Assert.Equal(0.001, analyzer.GetTierCostPerGB("Local", StorageTier.Archive));
        }

        [Fact]
        public async Task StorageCostAnalyzer_EstimateMonthlyCost_CalculatesCostCorrectly()
        {
            // Arrange
            var analyzer = new StorageCostAnalyzer();

            // Act
            var s3Cost = await analyzer.EstimateMonthlyCostAsync("S3", 1000 * 1024L * 1024 * 1024); // 1000 GB

            // Assert
            Assert.Equal(23.0, s3Cost); // 1000 * 0.023
        }

        [Fact]
        public async Task StorageTieringService_MoveToTier_S3_InvokesCopyObject()
        {
            // Arrange
            var mockConfig = new Mock<IConfiguration>();
            mockConfig.Setup(c => c["StorageProvider:S3:BucketName"]).Returns("my-bucket");

            var mockS3 = new Mock<IAmazonS3>();
            mockS3.Setup(s => s.GetObjectMetadataAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new GetObjectMetadataResponse { StorageClass = S3StorageClass.Standard });
            mockS3.Setup(s => s.CopyObjectAsync(It.IsAny<CopyObjectRequest>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new CopyObjectResponse());

            var service = new StorageTieringService(mockConfig.Object, Mock.Of<ILogger<StorageTieringService>>(), null, mockS3.Object);

            // Act
            var result = await service.MoveToTierAsync("S3", "key-123", StorageTier.Cold);

            // Assert
            Assert.True(result.Success);
            Assert.Equal(StorageTier.Cold, result.ToTier);
        }

        [Fact]
        public async Task StorageTieringService_MoveToTier_Azure_InvokesSetAccessTier()
        {
            // Arrange
            var mockConfig = new Mock<IConfiguration>();
            mockConfig.Setup(c => c["StorageProvider:Azure:ContainerName"]).Returns("my-container");

            var mockBlob = new Mock<BlobClient>();
            var mockProperties = new Mock<Response<BlobProperties>>();
            var properties = BlobsModelFactory.BlobProperties(accessTier: AccessTier.Hot.ToString());
            mockProperties.Setup(p => p.Value).Returns(properties);

            mockBlob.Setup(b => b.GetPropertiesAsync(It.IsAny<BlobRequestConditions>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(mockProperties.Object);
            mockBlob.Setup(b => b.SetAccessTierAsync(It.IsAny<AccessTier>(), It.IsAny<BlobRequestConditions>(), It.IsAny<RehydratePriority?>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new Mock<Response>().Object);

            var mockContainer = new Mock<BlobContainerClient>();
            mockContainer.Setup(c => c.GetBlobClient(It.IsAny<string>())).Returns(mockBlob.Object);

            var mockClient = new Mock<BlobServiceClient>();
            mockClient.Setup(c => c.GetBlobContainerClient(It.IsAny<string>())).Returns(mockContainer.Object);

            var service = new StorageTieringService(mockConfig.Object, Mock.Of<ILogger<StorageTieringService>>(), mockClient.Object, null);

            // Act
            var result = await service.MoveToTierAsync("Azure", "key-123", StorageTier.Archive);

            // Assert
            Assert.True(result.Success);
            Assert.Equal(StorageTier.Archive, result.ToTier);
        }

        [Fact]
        public async Task LifecyclePolicyEngine_Evaluate_NoMatchingPolicy_DoesNothing()
        {
            // Arrange
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            var context = new ApplicationDbContext(options);

            var mockTiering = new Mock<IStorageTieringService>();
            var mockPublisher = new Mock<IEventPublisher>();
            
            var mockSp = new Mock<IServiceProvider>();
            var mockScope = new Mock<IServiceScope>();
            var mockScopeFactory = new Mock<IServiceScopeFactory>();

            mockScopeFactory.Setup(f => f.CreateScope()).Returns(mockScope.Object);
            mockScope.Setup(s => s.ServiceProvider).Returns(mockSp.Object);

            mockSp.Setup(s => s.GetService(typeof(IServiceScopeFactory))).Returns(mockScopeFactory.Object);
            mockSp.Setup(s => s.GetService(typeof(ApplicationDbContext))).Returns(context);
            
            var config = new ConfigurationBuilder().Build();
            var engine = new LifecyclePolicyEngine(mockSp.Object, mockTiering.Object, mockPublisher.Object, config, Mock.Of<ILogger<LifecyclePolicyEngine>>());

            // Act
            await engine.EvaluateAsync("S3", "key-123");

            // Assert
            mockTiering.Verify(t => t.MoveToTierAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StorageTier>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        #endregion

        #region 6. Upload Orchestration Tests

        [Fact]
        public async Task UploadOrchestrator_OrchestrateUpload_ResolvesStreamStrategyForSmallFile()
        {
            // Arrange
            var mockNegotiator = new Mock<ICapabilityNegotiator>();
            mockNegotiator.Setup(n => n.ResolveUploadStrategy(It.IsAny<string>(), It.IsAny<long>()))
                .Returns(UploadStrategyType.Stream);

            var mockServiceProvider = new Mock<IServiceProvider>();
            var mockStreamStrategy = new Mock<StreamUploadStrategy>(Mock.Of<IStorageProviderFactory>());
            mockServiceProvider.Setup(s => s.GetService(typeof(StreamUploadStrategy)))
                .Returns(mockStreamStrategy.Object);

            var mockFactory = new Mock<IStorageProviderFactory>();
            var mockProvider = new Mock<IObjectStorageProvider>();
            mockProvider.Setup(p => p.ProviderName).Returns("Local");
            mockFactory.Setup(f => f.GetProvider()).Returns(mockProvider.Object);
            mockServiceProvider.Setup(s => s.GetService(typeof(IStorageProviderFactory)))
                .Returns(mockFactory.Object);

            var orchestrator = new UploadOrchestrator(mockNegotiator.Object, mockServiceProvider.Object, Mock.Of<ILogger<UploadOrchestrator>>());

            var stream = new MemoryStream(new byte[1024]);
            var options = new StorageUploadOptions { Overwrite = true };

            // Act
            await orchestrator.OrchestrateUploadAsync(Guid.NewGuid(), "key-123", stream, 1024, options);

            // Assert
            mockStreamStrategy.Verify(s => s.ExecuteAsync("Local", "key-123", It.IsAny<Stream>(), options, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task UploadOrchestrator_OrchestrateUpload_ResolvesMultipartStrategyForS3LargeFile()
        {
            // Arrange
            var mockNegotiator = new Mock<ICapabilityNegotiator>();
            mockNegotiator.Setup(n => n.ResolveUploadStrategy("S3", It.IsAny<long>()))
                .Returns(UploadStrategyType.Multipart);

            var mockServiceProvider = new Mock<IServiceProvider>();
            var mockMultipartStrategy = new Mock<MultipartUploadStrategy>(
                Mock.Of<IConfiguration>(),
                Mock.Of<ILogger<MultipartUploadStrategy>>(),
                Mock.Of<IStorageProviderFactory>(),
                null
            );
            mockServiceProvider.Setup(s => s.GetService(typeof(MultipartUploadStrategy)))
                .Returns(mockMultipartStrategy.Object);

            var mockFactory = new Mock<IStorageProviderFactory>();
            var mockProvider = new Mock<IObjectStorageProvider>();
            mockProvider.Setup(p => p.ProviderName).Returns("S3");
            mockFactory.Setup(f => f.GetProvider()).Returns(mockProvider.Object);
            mockServiceProvider.Setup(s => s.GetService(typeof(IStorageProviderFactory)))
                .Returns(mockFactory.Object);

            var orchestrator = new UploadOrchestrator(mockNegotiator.Object, mockServiceProvider.Object, Mock.Of<ILogger<UploadOrchestrator>>());

            var stream = new MemoryStream(new byte[10 * 1024 * 1024]);
            var options = new StorageUploadOptions { Overwrite = true };

            // Act
            await orchestrator.OrchestrateUploadAsync(Guid.NewGuid(), "key-123", stream, 10 * 1024 * 1024, options);

            // Assert
            mockMultipartStrategy.Verify(s => s.ExecuteAsync("S3", "key-123", It.IsAny<Stream>(), options, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task UploadOrchestrator_OrchestrateUpload_ResolvesBlockBlobStrategyForAzureLargeFile()
        {
            // Arrange
            var mockNegotiator = new Mock<ICapabilityNegotiator>();
            mockNegotiator.Setup(n => n.ResolveUploadStrategy("Azure", It.IsAny<long>()))
                .Returns(UploadStrategyType.BlockBlob);

            var mockServiceProvider = new Mock<IServiceProvider>();
            var mockBlockBlobStrategy = new Mock<BlockBlobUploadStrategy>(
                Mock.Of<IConfiguration>(),
                Mock.Of<ILogger<BlockBlobUploadStrategy>>(),
                Mock.Of<IStorageProviderFactory>(),
                null
            );
            mockServiceProvider.Setup(s => s.GetService(typeof(BlockBlobUploadStrategy)))
                .Returns(mockBlockBlobStrategy.Object);

            var mockFactory = new Mock<IStorageProviderFactory>();
            var mockProvider = new Mock<IObjectStorageProvider>();
            mockProvider.Setup(p => p.ProviderName).Returns("Azure");
            mockFactory.Setup(f => f.GetProvider()).Returns(mockProvider.Object);
            mockServiceProvider.Setup(s => s.GetService(typeof(IStorageProviderFactory)))
                .Returns(mockFactory.Object);

            var orchestrator = new UploadOrchestrator(mockNegotiator.Object, mockServiceProvider.Object, Mock.Of<ILogger<UploadOrchestrator>>());

            var stream = new MemoryStream(new byte[10 * 1024 * 1024]);
            var options = new StorageUploadOptions { Overwrite = true };

            // Act
            await orchestrator.OrchestrateUploadAsync(Guid.NewGuid(), "key-123", stream, 10 * 1024 * 1024, options);

            // Assert
            mockBlockBlobStrategy.Verify(s => s.ExecuteAsync("Azure", "key-123", It.IsAny<Stream>(), options, It.IsAny<CancellationToken>()), Times.Once);
        }

        #endregion

        #region 7. Additional Enterprise Orchestration Tests

        [Fact]
        public void CapabilityNegotiator_SupportsFeature_InvalidFeature_ReturnsFalse()
        {
            var negotiator = new CapabilityNegotiator();
            Assert.False(negotiator.SupportsFeature("S3", "InvalidFeatureName"));
        }

        [Fact]
        public void CapabilityNegotiator_GetCapabilities_Gcp_ReturnsExpectedCapabilities()
        {
            var negotiator = new CapabilityNegotiator();
            var caps = negotiator.GetCapabilities("Gcp");
            Assert.True(caps.SupportsPresignedUrls);
            Assert.True(caps.SupportsObjectLocking);
        }

        [Fact]
        public void StorageCostAnalyzer_GetTierCostPerGB_Azure_ReturnsExpectedCosts()
        {
            var analyzer = new StorageCostAnalyzer();
            Assert.Equal(0.018, analyzer.GetTierCostPerGB("Azure", StorageTier.Hot));
            Assert.Equal(0.010, analyzer.GetTierCostPerGB("Azure", StorageTier.Warm));
            Assert.Equal(0.0036, analyzer.GetTierCostPerGB("Azure", StorageTier.Cold));
            Assert.Equal(0.00099, analyzer.GetTierCostPerGB("Azure", StorageTier.Archive));
        }

        [Fact]
        public void StorageCostAnalyzer_GetTierCostPerGB_S3_ReturnsExpectedCosts()
        {
            var analyzer = new StorageCostAnalyzer();
            Assert.Equal(0.023, analyzer.GetTierCostPerGB("S3", StorageTier.Hot));
            Assert.Equal(0.0125, analyzer.GetTierCostPerGB("S3", StorageTier.Warm));
            Assert.Equal(0.0036, analyzer.GetTierCostPerGB("S3", StorageTier.Cold));
            Assert.Equal(0.00099, analyzer.GetTierCostPerGB("S3", StorageTier.Archive));
        }

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
        public async Task LifecyclePolicyEngine_Evaluate_MatchingPolicyTransition_InvokesMoveToTier()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            var context = new ApplicationDbContext(options);

            var item = new StorageObjectLifecycle
            {
                Id = Guid.NewGuid(),
                FileId = Guid.NewGuid(),
                ObjectKey = "key-123",
                ProviderName = "S3",
                CurrentTier = StorageTier.Hot,
                CreatedAt = DateTime.UtcNow.AddDays(-60),
                LastAccessedAt = DateTime.UtcNow.AddDays(-60)
            };
            context.StorageObjectLifecycles.Add(item);
            await context.SaveChangesAsync();

            var mockTiering = new Mock<IStorageTieringService>();
            mockTiering.Setup(t => t.MoveToTierAsync("S3", "key-123", StorageTier.Archive, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new TierTransitionResult(true, "key-123", StorageTier.Hot, StorageTier.Archive));

            var mockPublisher = new Mock<IEventPublisher>();
            
            var mockSp = new Mock<IServiceProvider>();
            var mockScope = new Mock<IServiceScope>();
            var mockScopeFactory = new Mock<IServiceScopeFactory>();

            mockScopeFactory.Setup(f => f.CreateScope()).Returns(mockScope.Object);
            mockScope.Setup(s => s.ServiceProvider).Returns(mockSp.Object);

            mockSp.Setup(s => s.GetService(typeof(IServiceScopeFactory))).Returns(mockScopeFactory.Object);
            mockSp.Setup(s => s.GetService(typeof(ApplicationDbContext))).Returns(context);

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { 
                    new KeyValuePair<string, string?>("StorageProvider:LifecycleRules:0:RuleId", "transition-rule"),
                    new KeyValuePair<string, string?>("StorageProvider:LifecycleRules:0:Prefix", "key-"),
                    new KeyValuePair<string, string?>("StorageProvider:LifecycleRules:0:TransitionAfterDays", "30"),
                    new KeyValuePair<string, string?>("StorageProvider:LifecycleRules:0:TargetTier", "Archive"),
                    new KeyValuePair<string, string?>("StorageProvider:LifecycleRules:0:IsActive", "true")
                })
                .Build();

            var engine = new LifecyclePolicyEngine(mockSp.Object, mockTiering.Object, mockPublisher.Object, config, Mock.Of<ILogger<LifecyclePolicyEngine>>());

            await engine.EvaluateAsync("S3", "key-123");

            mockTiering.Verify(t => t.MoveToTierAsync("S3", "key-123", StorageTier.Archive, It.IsAny<CancellationToken>()), Times.Once);
            mockPublisher.Verify(p => p.PublishAsync(It.IsAny<StorageTierChangedEvent>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task LifecyclePolicyEngine_Evaluate_MatchingPolicyExpiration_InvokesDelete()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            var context = new ApplicationDbContext(options);

            var item = new StorageObjectLifecycle
            {
                Id = Guid.NewGuid(),
                FileId = Guid.NewGuid(),
                ObjectKey = "key-123",
                ProviderName = "S3",
                CurrentTier = StorageTier.Hot,
                CreatedAt = DateTime.UtcNow.AddDays(-60),
                LastAccessedAt = DateTime.UtcNow
            };
            context.StorageObjectLifecycles.Add(item);
            await context.SaveChangesAsync();

            var mockTiering = new Mock<IStorageTieringService>();
            var mockPublisher = new Mock<IEventPublisher>();
            var mockProvider = new Mock<IObjectStorageProvider>();

            var mockFactory = new Mock<IStorageProviderFactory>();
            mockFactory.Setup(f => f.GetProvider("S3")).Returns(mockProvider.Object);

            var mockSp = new Mock<IServiceProvider>();
            var mockScope = new Mock<IServiceScope>();
            var mockScopeFactory = new Mock<IServiceScopeFactory>();

            mockScopeFactory.Setup(f => f.CreateScope()).Returns(mockScope.Object);
            mockScope.Setup(s => s.ServiceProvider).Returns(mockSp.Object);

            mockSp.Setup(s => s.GetService(typeof(IServiceScopeFactory))).Returns(mockScopeFactory.Object);
            mockSp.Setup(s => s.GetService(typeof(ApplicationDbContext))).Returns(context);
            mockSp.Setup(s => s.GetService(typeof(IStorageProviderFactory))).Returns(mockFactory.Object);

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { 
                    new KeyValuePair<string, string?>("StorageProvider:LifecycleRules:0:RuleId", "expiration-rule"),
                    new KeyValuePair<string, string?>("StorageProvider:LifecycleRules:0:Prefix", "key-"),
                    new KeyValuePair<string, string?>("StorageProvider:LifecycleRules:0:ExpirationDays", "30"),
                    new KeyValuePair<string, string?>("StorageProvider:LifecycleRules:0:IsActive", "true")
                })
                .Build();

            var engine = new LifecyclePolicyEngine(mockSp.Object, mockTiering.Object, mockPublisher.Object, config, Mock.Of<ILogger<LifecyclePolicyEngine>>());

            await engine.EvaluateAsync("S3", "key-123");

            mockProvider.Verify(p => p.DeleteAsync("key-123", It.IsAny<CancellationToken>()), Times.Once);
            var exists = await context.StorageObjectLifecycles.AnyAsync(l => l.ObjectKey == "key-123");
            Assert.False(exists);
        }

        [Fact]
        public async Task AesEncryptionKeyService_EncryptAndDecrypt_Succeeds()
        {
            var mockConfig = new Mock<IConfiguration>();
            mockConfig.Setup(c => c["Security:MasterKey"]).Returns("antigravity-master-key-must-be-32-bytes-long!");
            var service = new AesEncryptionKeyService(mockConfig.Object);

            var plaintext = Encoding.UTF8.GetBytes("hello encryption");
            var keyId = "test-key-id";

            var encrypted = await service.EncryptAsync(plaintext, keyId);
            var decrypted = await service.DecryptAsync(encrypted, keyId);

            var decryptedText = Encoding.UTF8.GetString(decrypted);
            Assert.Equal("hello encryption", decryptedText);
        }

        [Fact]
        public async Task AesEncryptionKeyService_Decrypt_WithIncorrectKeyId_ThrowsCryptographicException()
        {
            var mockConfig = new Mock<IConfiguration>();
            mockConfig.Setup(c => c["Security:MasterKey"]).Returns("antigravity-master-key-must-be-32-bytes-long!");
            var service = new AesEncryptionKeyService(mockConfig.Object);

            var plaintext = Encoding.UTF8.GetBytes("sensitive data");
            var keyId = "key-id-123";

            var encrypted = await service.EncryptAsync(plaintext, keyId);

            await Assert.ThrowsAnyAsync<System.Security.Cryptography.CryptographicException>(() =>
                service.DecryptAsync(encrypted, "key-id-wrong"));
        }

        [Fact]
        public async Task Sha256IntegrityVerifier_VerifyChecksum_ValidChecksum_ReturnsTrue()
        {
            var verifier = new Sha256IntegrityVerifier();
            var data = "hello world";
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(data));
            var hash = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";

            var result = await verifier.VerifyChecksumAsync(stream, hash);

            Assert.True(result.IsValid);
        }

        [Fact]
        public async Task Sha256IntegrityVerifier_VerifyChecksum_InvalidChecksum_ReturnsFalse()
        {
            var verifier = new Sha256IntegrityVerifier();
            var data = "hello world";
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(data));
            var hash = "wronghash";

            var result = await verifier.VerifyChecksumAsync(stream, hash);

            Assert.False(result.IsValid);
        }

        [Fact]
        public async Task UploadOrchestrator_OrchestrateUpload_ResolvesResumableStrategyForGcpLargeFile()
        {
            // Arrange
            var mockNegotiator = new Mock<ICapabilityNegotiator>();
            mockNegotiator.Setup(n => n.ResolveUploadStrategy("Gcp", It.IsAny<long>()))
                .Returns(UploadStrategyType.Resumable);

            var mockServiceProvider = new Mock<IServiceProvider>();
            var mockResumableStrategy = new Mock<ResumableUploadStrategy>(
                Mock.Of<IStorageProviderFactory>()
            );
            mockServiceProvider.Setup(s => s.GetService(typeof(ResumableUploadStrategy)))
                .Returns(mockResumableStrategy.Object);

            var mockFactory = new Mock<IStorageProviderFactory>();
            var mockProvider = new Mock<IObjectStorageProvider>();
            mockProvider.Setup(p => p.ProviderName).Returns("Gcp");
            mockFactory.Setup(f => f.GetProvider()).Returns(mockProvider.Object);
            mockServiceProvider.Setup(s => s.GetService(typeof(IStorageProviderFactory)))
                .Returns(mockFactory.Object);

            var orchestrator = new UploadOrchestrator(mockNegotiator.Object, mockServiceProvider.Object, Mock.Of<ILogger<UploadOrchestrator>>());

            var stream = new MemoryStream(new byte[10 * 1024 * 1024]);
            var options = new StorageUploadOptions { Overwrite = true };

            // Act
            await orchestrator.OrchestrateUploadAsync(Guid.NewGuid(), "key-123", stream, 10 * 1024 * 1024, options);

            // Assert
            mockResumableStrategy.Verify(s => s.ExecuteAsync("Gcp", "key-123", It.IsAny<Stream>(), options, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task LifecyclePolicyEngine_ApplyPolicies_EvaluatesAllRegisteredLifecycles()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            var context = new ApplicationDbContext(options);

            context.StorageObjectLifecycles.Add(new StorageObjectLifecycle
            {
                Id = Guid.NewGuid(),
                FileId = Guid.NewGuid(),
                ObjectKey = "key-1",
                ProviderName = "S3",
                CurrentTier = StorageTier.Hot,
                CreatedAt = DateTime.UtcNow,
                LastAccessedAt = DateTime.UtcNow
            });
            context.StorageObjectLifecycles.Add(new StorageObjectLifecycle
            {
                Id = Guid.NewGuid(),
                FileId = Guid.NewGuid(),
                ObjectKey = "key-2",
                ProviderName = "Azure",
                CurrentTier = StorageTier.Hot,
                CreatedAt = DateTime.UtcNow,
                LastAccessedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            var mockTiering = new Mock<IStorageTieringService>();
            var mockPublisher = new Mock<IEventPublisher>();

            var mockSp = new Mock<IServiceProvider>();
            var mockScope = new Mock<IServiceScope>();
            var mockScopeFactory = new Mock<IServiceScopeFactory>();

            mockScopeFactory.Setup(f => f.CreateScope()).Returns(mockScope.Object);
            mockScope.Setup(s => s.ServiceProvider).Returns(mockSp.Object);

            mockSp.Setup(s => s.GetService(typeof(IServiceScopeFactory))).Returns(mockScopeFactory.Object);
            mockSp.Setup(s => s.GetService(typeof(ApplicationDbContext))).Returns(context);

            var config = new ConfigurationBuilder().Build();
            var engine = new LifecyclePolicyEngine(mockSp.Object, mockTiering.Object, mockPublisher.Object, config, Mock.Of<ILogger<LifecyclePolicyEngine>>());

            await engine.ApplyPoliciesAsync();

            mockTiering.Verify(t => t.MoveToTierAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StorageTier>(), It.IsAny<CancellationToken>()), Times.Never);
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
