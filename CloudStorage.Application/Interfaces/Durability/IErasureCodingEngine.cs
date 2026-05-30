namespace CloudStorage.Application.Interfaces.Durability
{
    public record ErasureCodingConfig(int DataShards, int ParityShards);
    public record ErasureCodedObject(byte[][] DataBlocks, byte[][] ParityBlocks, ErasureCodingConfig Config);

    public interface IErasureCodingEngine
    {
        ErasureCodedObject Encode(byte[] data, ErasureCodingConfig config);
        byte[] Decode(byte[]?[] availableShards, ErasureCodingConfig config);
        bool CanRecover(int availableShardCount, ErasureCodingConfig config);
    }
}
