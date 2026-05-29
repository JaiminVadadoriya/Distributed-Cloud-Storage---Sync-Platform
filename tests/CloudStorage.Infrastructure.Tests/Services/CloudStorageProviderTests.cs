using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Infrastructure.Providers;
using CloudStorage.Infrastructure.Providers.Local;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class CloudStorageProviderTests
    {
        [Fact]
        public void StoragePathResolver_Resolve_LegacyAzurePath_ReturnsAzureProviderAndBlobName()
        {
            // Arrange
            var path = "azure://my-file-id/0.chunk";

            // Act
            var (provider, key) = StoragePathResolver.Resolve(path);

            // Assert
            Assert.Equal("Azure", provider);
            Assert.Equal("my-file-id/0.chunk", key);
        }

        [Fact]
        public void StoragePathResolver_Resolve_ProviderPath_ReturnsCorrectProviderAndKey()
        {
            // Arrange
            var path = "provider://S3/my-bucket-key/1.chunk";

            // Act
            var (provider, key) = StoragePathResolver.Resolve(path);

            // Assert
            Assert.Equal("S3", provider);
            Assert.Equal("my-bucket-key/1.chunk", key);
        }

        [Fact]
        public void StoragePathResolver_Resolve_LocalDiskPath_ReturnsLocalAndPath()
        {
            // Arrange
            var path = "/app/storage/chunks/file-id/0.chunk";

            // Act
            var (provider, key) = StoragePathResolver.Resolve(path);

            // Assert
            Assert.Equal("Local", provider);
            Assert.Equal(path, key);
        }

        [Fact]
        public void StoragePathResolver_FormatPath_ReturnsCorrectScheme()
        {
            // Act & Assert
            Assert.Equal("provider://S3/my-key", StoragePathResolver.FormatPath("S3", "my-key"));
            Assert.Equal("my-key", StoragePathResolver.FormatPath("Local", "my-key"));
        }

        [Fact]
        public void StoragePathResolver_IsRemoteStorage_ReturnsCorrectBoolean()
        {
            // Act & Assert
            Assert.True(StoragePathResolver.IsRemoteStorage("azure://key"));
            Assert.True(StoragePathResolver.IsRemoteStorage("provider://MinIO/key"));
            Assert.False(StoragePathResolver.IsRemoteStorage("/var/data/key"));
        }

        [Fact]
        public void StorageProviderFactory_GetProvider_ResolvesActiveFromConfiguration()
        {
            // Arrange
            var services = new ServiceCollection();
            var mockLocalProvider = new Mock<IObjectStorageProvider>();
            mockLocalProvider.Setup(p => p.ProviderName).Returns("Local");
            
            var mockS3Provider = new Mock<IObjectStorageProvider>();
            mockS3Provider.Setup(p => p.ProviderName).Returns("S3");

            services.AddKeyedSingleton<IObjectStorageProvider>("Local", mockLocalProvider.Object);
            services.AddKeyedSingleton<IObjectStorageProvider>("S3", mockS3Provider.Object);

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { new System.Collections.Generic.KeyValuePair<string, string?>("StorageProvider:Active", "S3") })
                .Build();

            services.AddSingleton<IConfiguration>(config);
            services.AddSingleton<IStorageProviderFactory, StorageProviderFactory>();
            
            var sp = services.BuildServiceProvider();
            var factory = sp.GetRequiredService<IStorageProviderFactory>();

            // Act
            var provider = factory.GetProvider();

            // Assert
            Assert.Equal("S3", provider.ProviderName);
        }

        [Fact]
        public async Task LocalStorageProvider_UploadAndDownload_SavesAndRetrievesCorrectData()
        {
            // Arrange
            var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            var inMemoryConfig = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] {
                    new System.Collections.Generic.KeyValuePair<string, string?>("StorageProvider:Local:BasePath", tempDir),
                    new System.Collections.Generic.KeyValuePair<string, string?>("StorageProvider:Local:BaseUrl", "http://localhost")
                })
                .Build();

            var loggerMock = new Mock<ILogger<LocalStorageProvider>>();
            var provider = new LocalStorageProvider(inMemoryConfig, loggerMock.Object);

            var objectKey = "test-folder/test-file.txt";
            var fileContent = "Hello Multi-Cloud Storage!";
            var dataStream = new MemoryStream(Encoding.UTF8.GetBytes(fileContent));

            try
            {
                // Act - Upload
                var uploadResult = await provider.UploadAsync(objectKey, dataStream);

                // Assert Upload
                Assert.Equal(objectKey, uploadResult.ObjectKey);
                Assert.True(File.Exists(Path.Combine(tempDir, "test-folder/test-file.txt")));

                // Act - Exists
                var exists = await provider.ExistsAsync(objectKey);
                Assert.True(exists);

                // Act - Download
                string downloadedText;
                using (var downloadStream = await provider.DownloadAsync(objectKey))
                using (var reader = new StreamReader(downloadStream))
                {
                    downloadedText = await reader.ReadToEndAsync();
                }

                // Assert Download
                Assert.Equal(fileContent, downloadedText);

                // Act - Delete
                await provider.DeleteAsync(objectKey);
                var existsAfterDelete = await provider.ExistsAsync(objectKey);

                // Assert Delete
                Assert.False(existsAfterDelete);
            }
            finally
            {
                if (Directory.Exists(tempDir))
                {
                    Directory.Delete(tempDir, true);
                }
            }
        }

        [Fact]
        public void StorageProviderFactory_GetChunkProvider_ResolvesActiveFromConfiguration()
        {
            // Arrange
            var services = new ServiceCollection();
            var mockLocalProvider = new Mock<IChunkStorageProvider>();
            
            var mockS3Provider = new Mock<IChunkStorageProvider>();

            services.AddKeyedSingleton<IChunkStorageProvider>("Local", mockLocalProvider.Object);
            services.AddKeyedSingleton<IChunkStorageProvider>("S3", mockS3Provider.Object);

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] { new System.Collections.Generic.KeyValuePair<string, string?>("StorageProvider:Active", "S3") })
                .Build();

            services.AddSingleton<IConfiguration>(config);
            services.AddSingleton<IStorageProviderFactory, StorageProviderFactory>();
            
            var sp = services.BuildServiceProvider();
            var factory = sp.GetRequiredService<IStorageProviderFactory>();

            // Act
            var provider = factory.GetChunkProvider();

            // Assert
            Assert.Same(mockS3Provider.Object, provider);
        }

        [Fact]
        public void StorageProviderFactory_GetAvailableProviders_ReturnsExpectedList()
        {
            // Arrange
            var factory = new StorageProviderFactory(new Mock<IServiceProvider>().Object, new Mock<IConfiguration>().Object);

            // Act
            var providers = factory.GetAvailableProviders();

            // Assert
            Assert.Contains("Local", providers);
            Assert.Contains("Azure", providers);
            Assert.Contains("S3", providers);
            Assert.Contains("MinIO", providers);
            Assert.Contains("GCP", providers);
        }

        [Fact]
        public async Task LocalStorageProvider_GeneratePresignedUrls_ReturnsProxyUrls()
        {
            // Arrange
            var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            var inMemoryConfig = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] {
                    new System.Collections.Generic.KeyValuePair<string, string?>("StorageProvider:Local:BasePath", tempDir),
                    new System.Collections.Generic.KeyValuePair<string, string?>("StorageProvider:Local:BaseUrl", "http://localhost:5000")
                })
                .Build();

            var loggerMock = new Mock<ILogger<LocalStorageProvider>>();
            var provider = new LocalStorageProvider(inMemoryConfig, loggerMock.Object);
            var objectKey = "test-file.txt";

            try
            {
                // Act
                var uploadUrlResult = await provider.GeneratePresignedUploadUrlAsync(objectKey, TimeSpan.FromMinutes(10));
                var downloadUrlResult = await provider.GeneratePresignedDownloadUrlAsync(objectKey, "download.txt", TimeSpan.FromMinutes(10));

                // Assert
                Assert.Contains("http://localhost:5000/api/files/local-proxy", uploadUrlResult.Url);
                Assert.Contains("mode=upload", uploadUrlResult.Url);
                Assert.Contains("http://localhost:5000/api/files/local-proxy", downloadUrlResult.Url);
                Assert.Contains("mode=download", downloadUrlResult.Url);
                Assert.Contains("filename=download.txt", downloadUrlResult.Url);
            }
            finally
            {
                if (Directory.Exists(tempDir))
                {
                    Directory.Delete(tempDir, true);
                }
            }
        }

        [Fact]
        public async Task LocalStorageProvider_DownloadWithRange_ReturnsCorrectSliceOfData()
        {
            // Arrange
            var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            var inMemoryConfig = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] {
                    new System.Collections.Generic.KeyValuePair<string, string?>("StorageProvider:Local:BasePath", tempDir),
                    new System.Collections.Generic.KeyValuePair<string, string?>("StorageProvider:Local:BaseUrl", "http://localhost")
                })
                .Build();

            var loggerMock = new Mock<ILogger<LocalStorageProvider>>();
            var provider = new LocalStorageProvider(inMemoryConfig, loggerMock.Object);

            var objectKey = "range-test.txt";
            var fileContent = "0123456789"; // 10 bytes
            var dataStream = new MemoryStream(Encoding.UTF8.GetBytes(fileContent));

            try
            {
                await provider.UploadAsync(objectKey, dataStream);

                // Act - Download bytes 2-5 ("2345")
                var options = new StorageDownloadOptions { RangeStart = 2, RangeEnd = 5 };
                string downloadedText;
                using (var downloadStream = await provider.DownloadAsync(objectKey, options))
                using (var reader = new StreamReader(downloadStream))
                {
                    downloadedText = await reader.ReadToEndAsync();
                }

                // Assert
                Assert.Equal("2345", downloadedText);
            }
            finally
            {
                if (Directory.Exists(tempDir))
                {
                    Directory.Delete(tempDir, true);
                }
            }
        }

        [Fact]
        public async Task LocalStorageProvider_IsHealthy_ReturnsTrueWhenDirectoryWritable()
        {
            // Arrange
            var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            var inMemoryConfig = new ConfigurationBuilder()
                .AddInMemoryCollection(new[] {
                    new System.Collections.Generic.KeyValuePair<string, string?>("StorageProvider:Local:BasePath", tempDir)
                })
                .Build();

            var loggerMock = new Mock<ILogger<LocalStorageProvider>>();
            var provider = new LocalStorageProvider(inMemoryConfig, loggerMock.Object);

            try
            {
                // Act
                var healthy = await provider.IsHealthyAsync();

                // Assert
                Assert.True(healthy);
            }
            finally
            {
                if (Directory.Exists(tempDir))
                {
                    Directory.Delete(tempDir, true);
                }
            }
        }
    }
}
