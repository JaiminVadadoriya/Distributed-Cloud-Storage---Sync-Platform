using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using CloudStorage.Application.Interfaces.Merkle;

namespace CloudStorage.Infrastructure.Merkle
{
    public class MerkleVerifier : IMerkleVerifier
    {
        public bool VerifyProof(string rootHash, string targetHash, int leafIndex, List<string> proof)
        {
            if (proof == null)
            {
                return false;
            }

            string currentHash = targetHash;
            int currentIndex = leafIndex;

            foreach (var siblingHash in proof)
            {
                if (currentIndex % 2 == 0)
                {
                    currentHash = ComputeHash(currentHash + siblingHash);
                }
                else
                {
                    currentHash = ComputeHash(siblingHash + currentHash);
                }
                currentIndex /= 2;
            }

            return string.Equals(currentHash, rootHash, StringComparison.OrdinalIgnoreCase);
        }

        public List<int> LocalizeCorruption(MerkleNode localTreeRoot, string remoteRootHash)
        {
            var corruptIndices = new List<int>();
            if (localTreeRoot == null)
            {
                return corruptIndices;
            }

            if (string.Equals(localTreeRoot.Hash, remoteRootHash, StringComparison.OrdinalIgnoreCase))
            {
                return corruptIndices;
            }

            if (!MerkleRegistry.Trees.TryGetValue(remoteRootHash, out var remoteTreeRoot))
            {
                // Fallback: if remote tree isn't registered, assume all leaves are potentially corrupted
                int leafCount = CountLeaves(localTreeRoot);
                for (int i = 0; i < leafCount; i++)
                {
                    corruptIndices.Add(i);
                }
                return corruptIndices;
            }

            int currentLeafIndex = 0;
            FindDifferences(localTreeRoot, remoteTreeRoot, ref currentLeafIndex, corruptIndices);
            return corruptIndices;
        }

        private void FindDifferences(MerkleNode? local, MerkleNode? remote, ref int currentLeafIndex, List<int> corruptIndices)
        {
            if (local == null || remote == null)
            {
                return;
            }

            if (string.Equals(local.Hash, remote.Hash, StringComparison.OrdinalIgnoreCase))
            {
                // Entire subtree is identical; skip its leaves.
                currentLeafIndex += CountLeaves(local);
                return;
            }

            if (local.IsLeaf && remote.IsLeaf)
            {
                corruptIndices.Add(currentLeafIndex);
                currentLeafIndex++;
                return;
            }

            // If one is leaf and other is not, or they are both internal and differ, drill down
            FindDifferences(local.Left, remote.Left, ref currentLeafIndex, corruptIndices);
            FindDifferences(local.Right, remote.Right, ref currentLeafIndex, corruptIndices);
        }

        private int CountLeaves(MerkleNode? node)
        {
            if (node == null) return 0;
            if (node.IsLeaf) return 1;
            return CountLeaves(node.Left) + CountLeaves(node.Right);
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
