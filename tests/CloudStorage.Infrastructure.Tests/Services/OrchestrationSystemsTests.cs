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
    public partial class OrchestrationSystemsTests
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
    }
}
