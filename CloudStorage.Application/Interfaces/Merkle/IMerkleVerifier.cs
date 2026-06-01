using System.Collections.Generic;

namespace CloudStorage.Application.Interfaces.Merkle
{
    public interface IMerkleVerifier
    {
        bool VerifyProof(string rootHash, string targetHash, int leafIndex, List<string> proof);
        List<int> LocalizeCorruption(MerkleNode localTreeRoot, string remoteRootHash);
    }
}
