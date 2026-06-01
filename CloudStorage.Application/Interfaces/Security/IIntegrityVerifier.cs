using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Security
{
    public interface IIntegrityVerifier
    {
        Task<string> ComputeChecksumAsync(Stream stream, CancellationToken ct = default);
        Task<IntegrityResult> VerifyChecksumAsync(Stream stream, string expectedHash, CancellationToken ct = default);
    }
}
