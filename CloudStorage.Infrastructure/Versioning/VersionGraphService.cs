using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Versioning;

namespace CloudStorage.Infrastructure.Versioning
{
    public class VersionGraphService : IVersionGraphService
    {
        private static readonly ConcurrentDictionary<string, List<VersionNode>> VersionGraphs = new();

        public Task<VersionNode> AddVersionAsync(string objectKey, string parentId, string hash, string author, string branch)
        {
            if (string.IsNullOrEmpty(objectKey)) throw new ArgumentException("Object key cannot be null or empty", nameof(objectKey));

            var node = new VersionNode(
                Guid.NewGuid().ToString(),
                parentId ?? string.Empty,
                hash,
                author ?? "anonymous",
                branch ?? "main"
            );

            VersionGraphs.AddOrUpdate(
                objectKey,
                _ => new List<VersionNode> { node },
                (_, list) =>
                {
                    lock (list)
                    {
                        list.Add(node);
                    }
                    return list;
                }
            );

            return Task.FromResult(node);
        }

        public Task<List<VersionNode>> GetHistoryAsync(string objectKey)
        {
            if (string.IsNullOrEmpty(objectKey)) throw new ArgumentException("Object key cannot be null or empty", nameof(objectKey));

            if (VersionGraphs.TryGetValue(objectKey, out var list))
            {
                lock (list)
                {
                    // Return copy in topological order (simple insertion list for simulated DAG)
                    return Task.FromResult(list.ToList());
                }
            }

            return Task.FromResult(new List<VersionNode>());
        }

        public Task<VersionNode> MergeVersionsAsync(string objectKey, string baseBranch, string sourceBranch)
        {
            if (string.IsNullOrEmpty(objectKey)) throw new ArgumentException("Object key cannot be null or empty", nameof(objectKey));

            if (!VersionGraphs.TryGetValue(objectKey, out var list))
            {
                throw new InvalidOperationException($"No version history found for key: {objectKey}");
            }

            VersionNode? baseLatest;
            VersionNode? sourceLatest;

            lock (list)
            {
                baseLatest = list.LastOrDefault(n => n.BranchName == baseBranch);
                sourceLatest = list.LastOrDefault(n => n.BranchName == sourceBranch);
            }

            if (baseLatest == null)
            {
                throw new InvalidOperationException($"No version found for base branch: {baseBranch}");
            }
            if (sourceLatest == null)
            {
                throw new InvalidOperationException($"No version found for source branch: {sourceBranch}");
            }

            // Compute merged hash
            var mergedHash = ComputeHash(baseLatest.Hash + sourceLatest.Hash);

            var mergeNode = new VersionNode(
                Guid.NewGuid().ToString(),
                baseLatest.VersionId, // First parent
                mergedHash,
                "System Merger",
                baseBranch
            );

            lock (list)
            {
                list.Add(mergeNode);
            }

            return Task.FromResult(mergeNode);
        }

        private string ComputeHash(string input)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(input);
            var hashBytes = sha256.ComputeHash(bytes);
            return Convert.ToHexString(hashBytes).ToLowerInvariant();
        }
    }
}
