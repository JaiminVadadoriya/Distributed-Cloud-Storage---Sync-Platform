using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Infrastructure.Services
{
    public class ConflictDetectionService : IConflictDetectionService
    {
        private readonly ApplicationDbContext _context;

        public ConflictDetectionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ConflictCheckResponseDto> CheckConflictAsync(Guid fileId, string clientVersionVector)
        {
            var file = await _context.FileMetadata
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.Id == fileId && !f.IsDeleted);

            if (file == null)
            {
                return new ConflictCheckResponseDto
                {
                    HasConflict = false,
                    ServerVersionVector = null,
                    ServerLastModifiedAt = DateTime.UtcNow,
                    ServerFileName = string.Empty,
                    ServerSize = 0,
                    ServerVersion = 0
                };
            }

            var clientVector = DeserializeVersionVector(clientVersionVector);
            var serverVector = DeserializeVersionVector(file.VersionVector);

            var hasConflict = AreVersionVectorsConcurrent(clientVector, serverVector);

            return new ConflictCheckResponseDto
            {
                HasConflict = hasConflict,
                ServerVersionVector = file.VersionVector,
                ServerLastModifiedAt = file.LastModifiedAt,
                ServerFileName = file.FileName,
                ServerSize = file.Size,
                ServerVersion = file.Version
            };
        }

        public async Task ResolveConflictAsync(Guid fileId, int userId, ConflictResolution resolution, string? clientVersionVector)
        {
            var file = await _context.FileMetadata
                .FirstOrDefaultAsync(f => f.Id == fileId && f.OwnerId == userId && !f.IsDeleted);

            if (file == null)
                throw new InvalidOperationException("File not found or access denied.");

            if (resolution == ConflictResolution.KeepServer)
            {
                // No changes needed on the server — the client will discard local changes
                // and pull the server version. We just acknowledge the resolution.
                return;
            }

            if (resolution == ConflictResolution.KeepLocal)
            {
                // Merge the client's version vector into the server's
                var serverVector = DeserializeVersionVector(file.VersionVector);
                var clientVector = DeserializeVersionVector(clientVersionVector);

                var mergedVector = MergeVersionVectors(serverVector, clientVector);
                file.VersionVector = SerializeVersionVector(mergedVector);
                file.Version += 1;
                file.LastModifiedAt = DateTime.UtcNow;
                file.LastSyncedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
            }
        }

        /// <summary>
        /// Two version vectors are concurrent if neither dominates the other.
        /// Vector A dominates B if for every key, A[key] >= B[key] and at least one A[key] > B[key].
        /// </summary>
        public static bool AreVersionVectorsConcurrent(
            Dictionary<string, int> vectorA,
            Dictionary<string, int> vectorB)
        {
            if (vectorA.Count == 0 || vectorB.Count == 0)
                return false;

            var allKeys = vectorA.Keys.Union(vectorB.Keys).ToList();
            bool aHasGreater = false;
            bool bHasGreater = false;

            foreach (var key in allKeys)
            {
                var aVal = vectorA.GetValueOrDefault(key, 0);
                var bVal = vectorB.GetValueOrDefault(key, 0);

                if (aVal > bVal) aHasGreater = true;
                if (bVal > aVal) bHasGreater = true;

                // If both have a component greater than the other, they're concurrent
                if (aHasGreater && bHasGreater) return true;
            }

            return false;
        }

        public static Dictionary<string, int> MergeVersionVectors(
            Dictionary<string, int> vectorA,
            Dictionary<string, int> vectorB)
        {
            var merged = new Dictionary<string, int>(vectorA);

            foreach (var kvp in vectorB)
            {
                if (merged.ContainsKey(kvp.Key))
                    merged[kvp.Key] = Math.Max(merged[kvp.Key], kvp.Value);
                else
                    merged[kvp.Key] = kvp.Value;
            }

            return merged;
        }

        public static Dictionary<string, int> DeserializeVersionVector(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return new Dictionary<string, int>();

            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, int>>(json)
                       ?? new Dictionary<string, int>();
            }
            catch
            {
                return new Dictionary<string, int>();
            }
        }

        public static string SerializeVersionVector(Dictionary<string, int> vector)
        {
            return JsonSerializer.Serialize(vector);
        }
    }
}
