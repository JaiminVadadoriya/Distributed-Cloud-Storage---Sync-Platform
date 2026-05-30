using System.Collections.Generic;

namespace CloudStorage.Application.Interfaces.Merkle
{
    public record MerkleNode(string Hash, bool IsLeaf, MerkleNode? Left = null, MerkleNode? Right = null);

    public interface IMerkleTreeService
    {
        MerkleNode BuildTree(List<string> chunkHashes);
        List<string> GetAuditProof(MerkleNode root, string targetHash, int leafIndex);
    }
}
