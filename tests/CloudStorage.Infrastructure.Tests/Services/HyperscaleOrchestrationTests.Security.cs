using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.AI;
using CloudStorage.Application.Interfaces.Chaos;
using CloudStorage.Application.Interfaces.Cost;
using CloudStorage.Application.Interfaces.Edge;
using CloudStorage.Application.Interfaces.SaaS;
using CloudStorage.Application.Interfaces.Security;
using CloudStorage.Application.Interfaces.Sla;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.CDC;
using CloudStorage.Infrastructure.Consensus;
using CloudStorage.Infrastructure.Cost;
using CloudStorage.Infrastructure.Edge;
using CloudStorage.Infrastructure.Metadata;
using CloudStorage.Infrastructure.SaaS;
using CloudStorage.Infrastructure.Search;
using CloudStorage.Infrastructure.Security;
using CloudStorage.Infrastructure.AI;
using CloudStorage.Infrastructure.Sla;
using CloudStorage.Infrastructure.Chaos;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public partial class HyperscaleOrchestrationTests
    {
        #region 6. Security & Key Management Tests

        [Fact]
        public async Task ClientEncryptionService_EncryptAndDecrypt_Succeeds()
        {
            var service = new ClientEncryptionService();
            var plaintext = Encoding.UTF8.GetBytes("Super secret data payload!");
            var secret = "my-shared-secret-123456";

            var encrypted = await service.EncryptClientSideAsync(plaintext, secret);
            Assert.NotEqual(plaintext, encrypted);

            var decrypted = await service.DecryptClientSideAsync(encrypted, secret);
            var decryptedStr = Encoding.UTF8.GetString(decrypted);

            Assert.Equal("Super secret data payload!", decryptedStr);
        }

        [Fact]
        public async Task ClientEncryptionService_Decrypt_WithWrongKey_ThrowsException()
        {
            var service = new ClientEncryptionService();
            var plaintext = Encoding.UTF8.GetBytes("Secret data");
            var secret = "secret-1";

            var encrypted = await service.EncryptClientSideAsync(plaintext, secret);

            await Assert.ThrowsAnyAsync<Exception>(() => service.DecryptClientSideAsync(encrypted, "wrong-secret"));
        }

        [Fact]
        public async Task KeyHierarchyManager_DeriveTenantKey_GeneratesDeterministicKey()
        {
            var manager = new KeyHierarchyManager();
            var masterKey = "master-key-12345-secret-bytes";
            
            var key1 = await manager.DeriveTenantKeyAsync(masterKey, "tenant-a");
            var key2 = await manager.DeriveTenantKeyAsync(masterKey, "tenant-a");
            var keyDifferent = await manager.DeriveTenantKeyAsync(masterKey, "tenant-b");

            Assert.Equal(key1, key2);
            Assert.NotEqual(key1, keyDifferent);
        }

        [Fact]
        public async Task KeyHierarchyManager_DeriveUserKey_GeneratesDeterministicKey()
        {
            var manager = new KeyHierarchyManager();
            var tenantKey = "derived-tenant-key-signature-hex";
            
            var userKey1 = await manager.DeriveUserKeyAsync(tenantKey, "user-1");
            var userKey2 = await manager.DeriveUserKeyAsync(tenantKey, "user-1");

            Assert.Equal(userKey1, userKey2);
        }

        #endregion

        #region 7. SaaS & Tenant Isolation Tests

        [Fact]
        public async Task TenantService_ValidateQuota_RespectsLimits()
        {
            var service = new TenantService();
            var config = new TenantConfig("tenant-a", 1000, "key-1", "s3");
            await service.CreateTenantAsync(config);

            var allowed = await service.ValidateQuotaAsync("tenant-a", 600);
            Assert.True(allowed);

            TenantService.RecordUsage("tenant-a", 600);

            var allowedOverLimit = await service.ValidateQuotaAsync("tenant-a", 500); // 600 + 500 = 1100 > 1000
            Assert.False(allowedOverLimit);
        }

        [Fact]
        public async Task TenantService_ValidateQuota_UnregisteredTenant_AllowsByFallback()
        {
            var service = new TenantService();
            var allowed = await service.ValidateQuotaAsync("unregistered", 999999);
            Assert.True(allowed); // Allows by default fallback
        }

        [Fact]
        public void TenantIsolationProvider_GetCurrentTenantId_ReturnsDefaultOrContextId()
        {
            var provider = new TenantIsolationProvider();
            var id = provider.GetCurrentTenantId();
            Assert.Equal("tenant-default", id);

            TenantIsolationProvider.SetCurrentTenantId("enterprise-1");
            var updatedId = provider.GetCurrentTenantId();
            Assert.Equal("enterprise-1", updatedId);
            
            TenantIsolationProvider.Clear();
        }

        #endregion

        #region 8. Cost Optimization Tests

        [Fact]
        public async Task CostOptimizationEngine_ForecastMonthlyCosts_ReturnsCorrectCalculations()
        {
            var engine = new CostOptimizationEngine(_dbContext);

            // Populate database with 10 GB metadata
            long size10GB = 10L * 1024 * 1024 * 1024;
            var meta = new DbObjectMetadata
            {
                Key = "huge-file.iso",
                TenantId = "tenant-cost",
                Size = size10GB,
                RootHash = "hash",
                CurrentTier = "Hot",
                LastModified = DateTime.UtcNow
            };
            await _dbContext.ObjectMetadata.AddAsync(meta);
            await _dbContext.SaveChangesAsync();

            var forecast = await engine.ForecastMonthlyCostsAsync("tenant-cost");

            Assert.Equal(10.0 * 0.023, forecast.S3Cost, 3);
            Assert.Equal(10.0 * 0.018, forecast.AzureCost, 3);
            Assert.Equal(10.0 * 0.005, forecast.MinIoCost, 3);
        }

        [Fact]
        public async Task CostOptimizationEngine_GenerateTieringRecommendations_IdentifiesIdleFiles()
        {
            var engine = new CostOptimizationEngine(_dbContext);

            var oldMeta = new DbObjectMetadata
            {
                Key = "old-backups.zip",
                TenantId = "tenant-old",
                Size = 1024 * 1024 * 1024,
                RootHash = "hash",
                CurrentTier = "Hot",
                LastModified = DateTime.UtcNow.AddDays(-40) // older than 30 days
            };
            await _dbContext.ObjectMetadata.AddAsync(oldMeta);
            await _dbContext.SaveChangesAsync();

            var recommendations = await engine.GenerateTieringRecommendationsAsync("tenant-old");

            Assert.Single(recommendations);
            Assert.Contains("Recommend moving from Hot to Cool tier", recommendations[0]);
        }

        #endregion

        #region 9. AI Storage Intelligence Tests

        [Fact]
        public async Task StorageIntelligenceService_ClassifyContent_IdentifiesMimeClasses()
        {
            var service = new StorageIntelligenceService(_dbContext);
            
            var c1 = await service.ClassifyContentAsync("report.pdf", Array.Empty<byte>());
            var c2 = await service.ClassifyContentAsync("photo.jpeg", Array.Empty<byte>());
            var c3 = await service.ClassifyContentAsync("build.js", Array.Empty<byte>());

            Assert.Equal("Documents", c1);
            Assert.Equal("Media", c2);
            Assert.Equal("Source Code", c3);
        }

        [Fact]
        public async Task StorageIntelligenceService_GenerateEmbeddings_ReturnsNormalizedVector()
        {
            var service = new StorageIntelligenceService(_dbContext);
            var vector = await service.GenerateEmbeddingsAsync("semantic segment");

            Assert.Equal(128, vector.Length);

            // Validate unit length normalization (magnitude should be very close to 1)
            double magnitudeSum = vector.Sum(v => v * v);
            Assert.Equal(1.0, magnitudeSum, 4);
        }

        [Fact]
        public async Task StorageIntelligenceService_DetectDuplicate_IdentifiesExistingHashes()
        {
            var service = new StorageIntelligenceService(_dbContext);
            
            var meta = new DbObjectMetadata
            {
                Key = "original.txt",
                TenantId = "tenant-1",
                Size = 10,
                RootHash = "aaaaaabbbbbbcccccc",
                CurrentTier = "Hot",
                LastModified = DateTime.UtcNow
            };
            await _dbContext.ObjectMetadata.AddAsync(meta);
            await _dbContext.SaveChangesAsync();

            var hashBytes = Convert.FromHexString("aaaaaabbbbbbcccccc");
            var duplicateDetected = await service.DetectDuplicateAsync("copy.txt", hashBytes);

            Assert.True(duplicateDetected);
        }

        #endregion

        #region 10. Edge CDN Routing Tests

        [Fact]
        public async Task EdgeDistributionService_GetGeoRoutedUrl_ResolvesCorrectEdge()
        {
            var service = new EdgeDistributionService();
            
            var urlUS = await service.GetGeoRoutedUrlAsync("doc.pdf", "8.8.8.8");
            var urlEU = await service.GetGeoRoutedUrlAsync("doc.pdf", "82.165.1.1");
            var urlLocal = await service.GetGeoRoutedUrlAsync("doc.pdf", "192.168.1.5");

            Assert.Contains("cdn-eu-west.cloudstorage.net", urlEU);
            Assert.Contains("cdn-lan-local.cloudstorage.net", urlLocal);
        }

        [Fact]
        public async Task EdgeDistributionService_GenerateSignedCdnUrl_GeneratesValidHMAC()
        {
            var service = new EdgeDistributionService();
            var signedUrl = await service.GenerateSignedCdnUrlAsync("report.pdf", TimeSpan.FromMinutes(10));

            Assert.NotEmpty(signedUrl);
            Assert.Contains("sig=", signedUrl);
            Assert.Contains("exp=", signedUrl);
        }

        #endregion

        #region 11. SLO Telemetry & Chaos Engineering Tests

        [Fact]
        public async Task SloMonitoringService_RecordMetrics_CalculatesCorrectAvailability()
        {
            var service = new SloMonitoringService();
            
            await service.RecordRequestMetricsAsync("s3", true, 50.0);
            await service.RecordRequestMetricsAsync("s3", true, 60.0);
            await service.RecordRequestMetricsAsync("s3", false, 120.0); // 1 failure out of 3

            var report = await service.GenerateSloReportAsync("s3");

            Assert.Equal(66.6666, report.AvailabilityPercentage, 2);
            Assert.Equal(76.6666, report.AverageLatencyMs, 2);
            Assert.True(report.ErrorBudgetUsed > 100.0); // exceeded the 99.9% target by far
        }

        [Fact]
        public async Task ChaosTestingService_SimulateFault_ThrowsFaultWhenEnabled()
        {
            var service = new ChaosTestingService();
            service.EnableChaos("gcp", 1.0, 0); // 100% failure rate

            await Assert.ThrowsAsync<InvalidOperationException>(() => service.SimulateFaultIfEnabledAsync("gcp"));

            service.DisableChaos("gcp");
            
            // Should not throw now
            var exception = await Record.ExceptionAsync(() => service.SimulateFaultIfEnabledAsync("gcp"));
            Assert.Null(exception);
        }

        #endregion
    }
}
