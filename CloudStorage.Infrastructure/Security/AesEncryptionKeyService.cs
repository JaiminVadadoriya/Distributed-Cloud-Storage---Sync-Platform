using System;
using System.Collections.Concurrent;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Security;
using Microsoft.Extensions.Configuration;

namespace CloudStorage.Infrastructure.Security
{
    public class AesEncryptionKeyService : IEncryptionKeyService
    {
        private readonly byte[] _masterKek;
        private readonly ConcurrentDictionary<string, byte[]> _keys = new();
        private readonly ConcurrentDictionary<string, KeyMetadata> _metadata = new();

        public AesEncryptionKeyService(IConfiguration configuration)
        {
            var masterKeyString = configuration["Security:MasterKey"] ?? "default-antigravity-master-key-must-be-32-bytes-long!";
            
            // Derive a 256-bit KEK from the configured master key string using PBKDF2
            using var derive = new Rfc2898DeriveBytes(masterKeyString, Encoding.UTF8.GetBytes("antigravity-salt"), 10000, HashAlgorithmName.SHA256);
            _masterKek = derive.GetBytes(32);
        }

        private byte[] GetOrCreateDek(string keyId)
        {
            return _keys.GetOrAdd(keyId, id =>
            {
                var dek = new byte[32];
                RandomNumberGenerator.Fill(dek);
                
                _metadata[id] = new KeyMetadata(
                    KeyId: id,
                    Algorithm: EncryptionAlgorithm.Aes256Gcm,
                    CreatedAt: DateTime.UtcNow,
                    RotatedAt: null,
                    Version: 1
                );
                
                return dek;
            });
        }

        public Task<byte[]> EncryptAsync(byte[] data, string keyId, CancellationToken ct = default)
        {
            if (data == null) throw new ArgumentNullException(nameof(data));

            // Get or create the plaintext DEK for this keyId
            var dek = GetOrCreateDek(keyId);

            // Generate nonces
            var dataNonce = new byte[12];
            var dekNonce = new byte[12];
            RandomNumberGenerator.Fill(dataNonce);
            RandomNumberGenerator.Fill(dekNonce);

            // 1. Encrypt DEK with KEK (master key) using AES-256-GCM, binding to keyId using AAD
            var encryptedDek = new byte[dek.Length];
            var dekTag = new byte[16];
            var keyIdBytes = Encoding.UTF8.GetBytes(keyId);
            using (var aesKek = new AesGcm(_masterKek, 16))
            {
                aesKek.Encrypt(dekNonce, dek, encryptedDek, dekTag, keyIdBytes);
            }

            // 2. Encrypt plaintext data with DEK using AES-256-GCM
            var cipherText = new byte[data.Length];
            var dataTag = new byte[16];
            using (var aesDek = new AesGcm(dek, 16))
            {
                aesDek.Encrypt(dataNonce, data, cipherText, dataTag);
            }

            // 3. Assemble payload
            // Layout:
            // [1 byte version] [4 bytes encrypted DEK len]
            // [12 bytes DEK nonce] [16 bytes DEK tag] [encrypted DEK]
            // [12 bytes Data nonce] [16 bytes Data tag] [Data ciphertext]
            using var ms = new MemoryStream();
            using var writer = new BinaryWriter(ms);
            writer.Write((byte)1); // Version
            writer.Write(encryptedDek.Length);
            writer.Write(dekNonce);
            writer.Write(dekTag);
            writer.Write(encryptedDek);
            writer.Write(dataNonce);
            writer.Write(dataTag);
            writer.Write(cipherText);

            return Task.FromResult(ms.ToArray());
        }

        public Task<byte[]> DecryptAsync(byte[] cipherText, string keyId, CancellationToken ct = default)
        {
            if (cipherText == null) throw new ArgumentNullException(nameof(cipherText));

            using var ms = new MemoryStream(cipherText);
            using var reader = new BinaryReader(ms);

            byte version = reader.ReadByte();
            if (version != 1)
            {
                throw new InvalidDataException($"Unsupported payload version: {version}");
            }

            int encryptedDekLen = reader.ReadInt32();
            var dekNonce = reader.ReadBytes(12);
            var dekTag = reader.ReadBytes(16);
            var encryptedDek = reader.ReadBytes(encryptedDekLen);
            var dataNonce = reader.ReadBytes(12);
            var dataTag = reader.ReadBytes(16);
            var dataCipherText = reader.ReadBytes((int)(ms.Length - ms.Position));

            // 1. Decrypt DEK with KEK (master key) using AES-256-GCM, verifying AAD keyId
            var dek = new byte[encryptedDekLen];
            var keyIdBytes = Encoding.UTF8.GetBytes(keyId);
            using (var aesKek = new AesGcm(_masterKek, 16))
            {
                aesKek.Decrypt(dekNonce, encryptedDek, dekTag, dek, keyIdBytes);
            }

            // 2. Decrypt data ciphertext with DEK using AES-256-GCM
            var plaintext = new byte[dataCipherText.Length];
            using (var aesDek = new AesGcm(dek, 16))
            {
                aesDek.Decrypt(dataNonce, dataCipherText, dataTag, plaintext);
            }

            return Task.FromResult(plaintext);
        }

        public Task<KeyMetadata> RotateKeyAsync(string keyId, CancellationToken ct = default)
        {
            var newDek = new byte[32];
            RandomNumberGenerator.Fill(newDek);

            _keys[keyId] = newDek;

            var existingMeta = _metadata.TryGetValue(keyId, out var meta) ? meta : null;
            var newVersion = existingMeta != null ? existingMeta.Version + 1 : 1;

            var newMeta = new KeyMetadata(
                KeyId: keyId,
                Algorithm: EncryptionAlgorithm.Aes256Gcm,
                CreatedAt: existingMeta?.CreatedAt ?? DateTime.UtcNow,
                RotatedAt: DateTime.UtcNow,
                Version: newVersion
            );

            _metadata[keyId] = newMeta;

            return Task.FromResult(newMeta);
        }

        public Task<KeyMetadata> GetKeyMetadataAsync(string keyId, CancellationToken ct = default)
        {
            if (!_metadata.TryGetValue(keyId, out var meta))
            {
                GetOrCreateDek(keyId);
                meta = _metadata[keyId];
            }
            return Task.FromResult(meta);
        }
    }
}
