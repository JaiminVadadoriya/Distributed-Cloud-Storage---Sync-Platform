using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Chaos
{
    public interface IChaosTestingService
    {
        void EnableChaos(string provider, double failureRate, int latencySpikeMs);
        void DisableChaos(string provider);
        Task SimulateFaultIfEnabledAsync(string provider);
    }
}
