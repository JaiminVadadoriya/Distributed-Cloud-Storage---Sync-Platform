using System.Collections.Concurrent;
using CloudStorage.Application.Interfaces.Merkle;

namespace CloudStorage.Infrastructure.Merkle
{
    public static class MerkleRegistry
    {
        public static ConcurrentDictionary<string, MerkleNode> Trees { get; } = new();
    }
}
