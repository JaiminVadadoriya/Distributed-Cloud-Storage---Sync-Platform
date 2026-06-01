using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Edge;

namespace CloudStorage.Infrastructure.Edge
{
    public class EdgeDistributionService : IEdgeDistributionService
    {
        private const string CdnSigningKey = "cdn-secret-signing-key-for-token-generation";

        public Task<string> GetGeoRoutedUrlAsync(string key, string clientIp)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentException("Key cannot be null or empty", nameof(key));

            // Determine edge region based on IP heuristics
            string region = "us-east";
            if (!string.IsNullOrEmpty(clientIp))
            {
                if (clientIp.StartsWith("192.") || clientIp.StartsWith("10."))
                {
                    region = "lan-local";
                }
                else if (clientIp.StartsWith("8.8.") || clientIp.Contains(".eu") || clientIp.StartsWith("82."))
                {
                    region = "eu-west";
                }
                else if (clientIp.StartsWith("202.") || clientIp.StartsWith("115."))
                {
                    region = "ap-south";
                }
            }

            return Task.FromResult($"https://cdn-{region}.cloudstorage.net/objects/{key}");
        }

        public Task<string> GenerateSignedCdnUrlAsync(string key, TimeSpan expiry)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentException("Key cannot be null or empty", nameof(key));

            var expiryTimestamp = DateTimeOffset.UtcNow.Add(expiry).ToUnixTimeSeconds();
            var payload = $"{key}:{expiryTimestamp}";

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(CdnSigningKey));
            var signatureBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var signature = Convert.ToHexString(signatureBytes).ToLowerInvariant();

            return Task.FromResult($"https://cdn-global.cloudstorage.net/objects/{key}?sig={signature}&exp={expiryTimestamp}");
        }
    }
}
