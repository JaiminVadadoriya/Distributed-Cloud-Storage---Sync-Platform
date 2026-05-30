using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Security
{
    public interface IClientEncryptionService
    {
        Task<byte[]> EncryptClientSideAsync(byte[] plaintext, string clientSecret);
        Task<byte[]> DecryptClientSideAsync(byte[] ciphertext, string clientSecret);
    }
}
