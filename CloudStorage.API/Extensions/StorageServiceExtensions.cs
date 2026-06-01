using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Azure.Storage.Blobs;
using Amazon.S3;
using Minio;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Infrastructure.Providers;
using CloudStorage.Infrastructure.Providers.Azure;
using CloudStorage.Infrastructure.Providers.S3;
using CloudStorage.Infrastructure.Providers.MinIO;
using CloudStorage.Infrastructure.Providers.Local;
using CloudStorage.Infrastructure.Providers.GCP;
using CloudStorage.Application.Interfaces;
using CloudStorage.Infrastructure.Services;
using CloudStorage.Application.Interfaces.Replication;
using CloudStorage.Infrastructure.Replication;
using CloudStorage.Application.Interfaces.Tiering;
using CloudStorage.Infrastructure.Tiering;
using CloudStorage.Application.Interfaces.Routing;
using CloudStorage.Infrastructure.Routing;
using CloudStorage.Application.Interfaces.Upload;
using CloudStorage.Infrastructure.Upload;
using CloudStorage.Application.Interfaces.Security;
using CloudStorage.Infrastructure.Security;
using CloudStorage.API.Services;
using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.API.Extensions
{
    public static class StorageServiceExtensions
    {
        public static IServiceCollection AddCloudStorage(this IServiceCollection services, IConfiguration configuration)
        {
            // 1. Register AWS S3 Client
            var s3Section = configuration.GetSection("StorageProvider:S3");
            var awsS3Config = new AmazonS3Config();
            if (!string.IsNullOrEmpty(s3Section["ServiceURL"]))
            {
                awsS3Config.ServiceURL = s3Section["ServiceURL"];
                awsS3Config.ForcePathStyle = true;
            }
            else if (!string.IsNullOrEmpty(s3Section["Region"]))
            {
                awsS3Config.RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(s3Section["Region"]);
            }
            var s3Client = new AmazonS3Client(
                s3Section["AccessKey"] ?? "dummy",
                s3Section["SecretKey"] ?? "dummy",
                awsS3Config);
            services.AddSingleton<IAmazonS3>(s3Client);

            // 2. Register MinIO Client
            var minioSection = configuration.GetSection("StorageProvider:MinIO");
            var minioClient = new MinioClient()
                .WithEndpoint(minioSection["Endpoint"] ?? "localhost:9000")
                .WithCredentials(minioSection["AccessKey"] ?? "dummy", minioSection["SecretKey"] ?? "dummy")
                .Build();
            services.AddSingleton<IMinioClient>(minioClient);

            // 3. Register Azure BlobServiceClient
            var azureSection = configuration.GetSection("StorageProvider:Azure");
            var azureConnectionString = azureSection["ConnectionString"] 
                ?? configuration["AzureBlob:ConnectionString"] 
                ?? "UseDevelopmentStorage=true";
            services.AddSingleton(sp => new BlobServiceClient(azureConnectionString));

            // 4. Register all Providers as Keyed Services
            services.AddKeyedScoped<IObjectStorageProvider, AzureBlobStorageProvider>("Azure");
            services.AddKeyedScoped<IObjectStorageProvider, S3StorageProvider>("S3");
            services.AddKeyedScoped<IObjectStorageProvider, MinIOStorageProvider>("MinIO");
            services.AddKeyedScoped<IObjectStorageProvider, LocalStorageProvider>("Local");
            services.AddKeyedScoped<IObjectStorageProvider, GcpStorageProvider>("GCP");

            services.AddKeyedScoped<IChunkStorageProvider, AzureChunkStorageProvider>("Azure");
            services.AddKeyedScoped<IChunkStorageProvider, S3ChunkStorageProvider>("S3");
            services.AddKeyedScoped<IChunkStorageProvider, MinIOChunkStorageProvider>("MinIO");
            services.AddKeyedScoped<IChunkStorageProvider, LocalChunkStorageProvider>("Local");
            // GCP uses S3/base style chunk provider
            services.AddKeyedScoped<IChunkStorageProvider, BaseChunkStorageProvider>("GCP");

            // 5. Register Factory and Resolver Services
            services.AddScoped<IStorageProviderFactory, StorageProviderFactory>();
            services.AddScoped<IChunkVerificationService, ChunkVerificationService>();
            services.AddSingleton<ICapabilityNegotiator, CapabilityNegotiator>();
            services.AddScoped<IReplicationCoordinator, ReplicationCoordinator>();
            services.AddScoped<IReplicationProvider, ReplicationProvider>();
            services.AddHostedService<ReplicationWorkerService>();
            services.AddScoped<IStorageTieringService, StorageTieringService>();
            services.AddScoped<ILifecyclePolicyEngine, LifecyclePolicyEngine>();
            services.AddScoped<IStorageCostAnalyzer, StorageCostAnalyzer>();
            services.AddHostedService<LifecycleWorkerService>();
            services.AddScoped<IProviderHealthService, ProviderHealthService>();
            services.AddScoped<IStorageRoutingEngine, StorageRoutingEngine>();
            services.AddScoped<IFailoverCoordinator, FailoverCoordinator>();
            services.AddScoped<IUploadOrchestrator, UploadOrchestrator>();
            services.AddScoped<StreamUploadStrategy>();
            services.AddScoped<MultipartUploadStrategy>();
            services.AddScoped<BlockBlobUploadStrategy>();
            services.AddScoped<ResumableUploadStrategy>();

            // 6. Register default resolved providers
            services.AddScoped<IObjectStorageProvider>(sp => 
                sp.GetRequiredService<IStorageProviderFactory>().GetProvider());
            services.AddScoped<IChunkStorageProvider>(sp => 
                sp.GetRequiredService<IStorageProviderFactory>().GetChunkProvider());

            // 7. Register backward-compatibility wrappers
            services.AddScoped<IBlobSasService, BlobSasService>();
            services.AddScoped<IAzureChunkVerificationService, AzureChunkVerificationService>();
            services.AddScoped<IChunkStorageService, BlobChunkStorageService>();

            // 8. Register dynamic storage health check
            services.AddHealthChecks().AddCheck<StorageHealthCheck>("Storage_Provider");

            // 9. Register Security Services
            services.AddSingleton<IEncryptionKeyService, AesEncryptionKeyService>();
            services.AddSingleton<IIntegrityVerifier, Sha256IntegrityVerifier>();

            return services;
        }
    }

    public class StorageHealthCheck : IHealthCheck
    {
        private readonly IStorageProviderFactory _factory;

        public StorageHealthCheck(IStorageProviderFactory factory)
        {
            _factory = factory;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            try
            {
                var provider = _factory.GetProvider();
                var healthy = await provider.IsHealthyAsync(cancellationToken);
                return healthy 
                    ? HealthCheckResult.Healthy($"Storage provider '{provider.ProviderName}' is healthy.") 
                    : HealthCheckResult.Unhealthy($"Storage provider '{provider.ProviderName}' is unhealthy.");
            }
            catch (Exception ex)
            {
                return HealthCheckResult.Unhealthy("Storage provider health check failed.", ex);
            }
        }
    }
}
