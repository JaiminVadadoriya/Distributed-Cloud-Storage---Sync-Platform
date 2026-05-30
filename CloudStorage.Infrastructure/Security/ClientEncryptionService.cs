using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Security;

namespace CloudStorage.Infrastructure.Security
{
    public class ClientEncryptionService : IClientEncryptionService
    {
        public Task<byte[]> EncryptClientSideAsync(byte[] plaintext, string clientSecret)
        {
            if (plaintext == null) throw new ArgumentNullException(nameof(plaintext));
            if (string.IsNullOrEmpty(clientSecret)) throw new ArgumentException("Client secret cannot be null or empty", nameof(clientSecret));

            using var aes = Aes.Create();
            using var sha256 = SHA256.Create();
            aes.Key = sha256.ComputeHash(Encoding.UTF8.GetBytes(clientSecret));
            aes.GenerateIV();

            using var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
            using var ms = new MemoryStream();
            
            // Prepend the 16-byte random IV
            ms.Write(aes.IV, 0, aes.IV.Length);

            using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
            {
                cs.Write(plaintext, 0, plaintext.Length);
                cs.FlushFinalBlock();
            }

            return Task.FromResult(ms.ToArray());
        }

        public Task<byte[]> DecryptClientSideAsync(byte[] ciphertext, string clientSecret)
        {
            if (ciphertext == null) throw new ArgumentNullException(nameof(ciphertext));
            if (string.IsNullOrEmpty(clientSecret)) throw new ArgumentException("Client secret cannot be null or empty", nameof(clientSecret));
            if (ciphertext.Length < 16) throw new ArgumentException("Invalid ciphertext length", nameof(ciphertext));

            using var aes = Aes.Create();
            using var sha256 = SHA256.Create();
            aes.Key = sha256.ComputeHash(Encoding.UTF8.GetBytes(clientSecret));

            var iv = new byte[16];
            Array.Copy(ciphertext, 0, iv, 0, 16);
            aes.IV = iv;

            using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
            using var ms = new MemoryStream();
            using (var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Write))
            {
                cs.Write(ciphertext, 16, ciphertext.Length - 16);
                cs.FlushFinalBlock();
            }

            return Task.FromResult(ms.ToArray());
        }
    }
}
