using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Tiering
{
    public interface ILifecyclePolicyEngine
    {
        Task EvaluateAsync(string providerName, string objectKey, CancellationToken ct = default);
        Task ApplyPoliciesAsync(CancellationToken ct = default);
    }
}
