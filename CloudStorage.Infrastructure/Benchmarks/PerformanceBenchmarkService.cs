using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Benchmarks;

namespace CloudStorage.Infrastructure.Benchmarks
{
    public class PerformanceBenchmarkService : IPerformanceBenchmarkService
    {
        public async Task<BenchmarkResult> RunThroughputBenchmarkAsync(string provider, int objectCount, int objectSizeKB)
        {
            var sw = Stopwatch.StartNew();
            var latencies = new List<double>();
            
            long totalBytes = 0;
            var rand = new Random();

            for (int i = 0; i < objectCount; i++)
            {
                var stepSw = Stopwatch.StartNew();
                // Simulate throughput action (data generation & write)
                byte[] mockData = new byte[objectSizeKB * 1024];
                rand.NextBytes(mockData);
                await Task.Delay(2); // Mock write network latency
                
                stepSw.Stop();
                latencies.Add(stepSw.Elapsed.TotalMilliseconds);
                totalBytes += mockData.Length;
            }

            sw.Stop();

            double seconds = sw.Elapsed.TotalSeconds;
            double mb = totalBytes / (1024.0 * 1024.0);
            double throughput = seconds > 0 ? mb / seconds : 0;

            latencies.Sort();
            double p50 = latencies.Count > 0 ? latencies[(int)(latencies.Count * 0.5)] : 0;
            double p99 = latencies.Count > 0 ? latencies[(int)(latencies.Count * 0.99)] : 0;

            // SLA Check: passed if P99 latency <= 5000ms
            bool passedSLA = p99 <= 5000.0;

            return new BenchmarkResult(
                TestName: $"Throughput Test ({provider})",
                ThroughputMBps: throughput,
                LatencyP50Ms: p50,
                LatencyP99Ms: p99,
                ObjectsTested: objectCount,
                Duration: sw.Elapsed,
                PassedSLA: passedSLA
            );
        }

        public async Task<BenchmarkResult> RunLatencyBenchmarkAsync(string provider, int iterations)
        {
            var sw = Stopwatch.StartNew();
            var latencies = new List<double>();

            for (int i = 0; i < iterations; i++)
            {
                var stepSw = Stopwatch.StartNew();
                // Mock metadata operation latency
                await Task.Delay(1);
                stepSw.Stop();
                latencies.Add(stepSw.Elapsed.TotalMilliseconds);
            }

            sw.Stop();

            latencies.Sort();
            double p50 = latencies.Count > 0 ? latencies[(int)(latencies.Count * 0.5)] : 0;
            double p99 = latencies.Count > 0 ? latencies[(int)(latencies.Count * 0.99)] : 0;

            // SLA check: passed if P99 <= 5000ms
            bool passedSLA = p99 <= 5000.0;

            return new BenchmarkResult(
                TestName: $"Latency Test ({provider})",
                ThroughputMBps: 0,
                LatencyP50Ms: p50,
                LatencyP99Ms: p99,
                ObjectsTested: iterations,
                Duration: sw.Elapsed,
                PassedSLA: passedSLA
            );
        }

        public async Task<IReadOnlyList<BenchmarkResult>> RunFullSuiteAsync(string provider)
        {
            var results = new List<BenchmarkResult>
            {
                await RunThroughputBenchmarkAsync(provider, 20, 256), // 20 files of 256KB
                await RunLatencyBenchmarkAsync(provider, 50)          // 50 operations
            };

            return results;
        }
    }
}
