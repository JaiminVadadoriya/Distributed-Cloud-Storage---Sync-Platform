using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using CloudStorage.Application.Interfaces.Merkle;

namespace CloudStorage.Infrastructure.Merkle
{
    public class MerkleTreeService : IMerkleTreeService
    {
        public MerkleNode BuildTree(List<string> chunkHashes)
        {
            if (chunkHashes == null || chunkHashes.Count == 0)
            {
                var emptyHash = ComputeHash(string.Empty);
                var emptyNode = new MerkleNode(emptyHash, true);
                MerkleRegistry.Trees[emptyHash] = emptyNode;
                return emptyNode;
            }

            var currentLevel = chunkHashes.Select(h => new MerkleNode(h, true)).ToList();

            while (currentLevel.Count > 1)
            {
                var nextLevel = new List<MerkleNode>();

                for (int i = 0; i < currentLevel.Count; i += 2)
                {
                    if (i + 1 < currentLevel.Count)
                    {
                        var left = currentLevel[i];
                        var right = currentLevel[i + 1];
                        var parentHash = ComputeHash(left.Hash + right.Hash);
                        nextLevel.Add(new MerkleNode(parentHash, false, left, right));
                    }
                    else
                    {
                        var left = currentLevel[i];
                        var parentHash = ComputeHash(left.Hash + left.Hash);
                        nextLevel.Add(new MerkleNode(parentHash, false, left, left));
                    }
                }

                currentLevel = nextLevel;
            }

            var root = currentLevel[0];
            MerkleRegistry.Trees[root.Hash] = root;
            return root;
        }

        public List<string> GetAuditProof(MerkleNode root, string targetHash, int leafIndex)
        {
            var proof = new List<string>();
            if (root == null)
            {
                return proof;
            }

            int currentLeafIndex = 0;
            FindPath(root, leafIndex, ref currentLeafIndex, proof);
            return proof;
        }

        private bool FindPath(MerkleNode? node, int targetLeafIndex, ref int currentLeafIndex, List<string> path)
        {
            if (node == null) return false;

            if (node.IsLeaf)
            {
                if (currentLeafIndex == targetLeafIndex)
                {
                    return true;
                }
                currentLeafIndex++;
                return false;
            }

            // Check left subtree
            if (FindPath(node.Left, targetLeafIndex, ref currentLeafIndex, path))
            {
                if (node.Right != null)
                {
                    path.Add(node.Right.Hash);
                }
                return true;
            }

            // Check right subtree
            if (FindPath(node.Right, targetLeafIndex, ref currentLeafIndex, path))
            {
                if (node.Left != null)
                {
                    path.Add(node.Left.Hash);
                }
                return true;
            }

            return false;
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
