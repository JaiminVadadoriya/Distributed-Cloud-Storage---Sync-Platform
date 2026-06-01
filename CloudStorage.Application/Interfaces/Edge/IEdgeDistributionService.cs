using System;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Edge
{
    public interface IEdgeDistributionService
    {
        Task<string> GetGeoRoutedUrlAsync(string key, string clientIp);
        Task<string> GenerateSignedCdnUrlAsync(string key, TimeSpan expiry);
    }
}
