using System;
using System.IO;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Security;

namespace CloudStorage.Infrastructure.Security
{
    public class Sha256IntegrityVerifier : IIntegrityVerifier
    {
        public async Task<string> ComputeChecksumAsync(Stream stream, CancellationToken ct = default)
        {
            if (stream == null) throw new ArgumentNullException(nameof(stream));

            if (stream.CanSeek)
            {
                stream.Position = 0;
            }

            using var sha256 = SHA256.Create();
            byte[] hashBytes = await sha256.ComputeHashAsync(stream, ct);
            return Convert.ToHexString(hashBytes).ToLowerInvariant();
        }

        public async Task<IntegrityResult> VerifyChecksumAsync(Stream stream, string expectedHash, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(expectedHash))
            {
                return new IntegrityResult(false, string.Empty, expectedHash);
            }

            string computedHash = await ComputeChecksumAsync(stream, ct);
            bool isValid = string.Equals(computedHash, expectedHash, StringComparison.OrdinalIgnoreCase);

            return new IntegrityResult(isValid, computedHash, expectedHash);
        }
    }
}
