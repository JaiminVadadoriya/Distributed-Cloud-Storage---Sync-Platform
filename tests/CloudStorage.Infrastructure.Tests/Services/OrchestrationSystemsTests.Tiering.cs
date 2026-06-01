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
using CloudStorage.Application.Interfaces.Tiering;
using CloudStorage.Application.Events;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Enums;
using CloudStorage.Infrastructure.Tiering;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Blobs.Specialized;
using Amazon.S3;
using Amazon.S3.Model;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public partial class OrchestrationSystemsTests
    {
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

        #region Extra Tiering & Lifecycle Tests

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

        #endregion
    }
}
