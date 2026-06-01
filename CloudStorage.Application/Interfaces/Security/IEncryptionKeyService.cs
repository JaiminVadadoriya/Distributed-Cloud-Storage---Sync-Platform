using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Security
{
    public interface IEncryptionKeyService
    {
        Task<byte[]> EncryptAsync(byte[] data, string keyId, CancellationToken ct = default);
        Task<byte[]> DecryptAsync(byte[] cipherText, string keyId, CancellationToken ct = default);
        Task<KeyMetadata> RotateKeyAsync(string keyId, CancellationToken ct = default);
        Task<KeyMetadata> GetKeyMetadataAsync(string keyId, CancellationToken ct = default);
    }
}
