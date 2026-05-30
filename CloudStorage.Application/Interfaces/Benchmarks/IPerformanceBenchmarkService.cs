using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Benchmarks
{
    public record BenchmarkResult(string TestName, double ThroughputMBps, double LatencyP50Ms, 
        double LatencyP99Ms, long ObjectsTested, TimeSpan Duration, bool PassedSLA);

    public interface IPerformanceBenchmarkService
    {
        Task<BenchmarkResult> RunThroughputBenchmarkAsync(string provider, int objectCount, int objectSizeKB);
        Task<BenchmarkResult> RunLatencyBenchmarkAsync(string provider, int iterations);
        Task<IReadOnlyList<BenchmarkResult>> RunFullSuiteAsync(string provider);
    }
}
