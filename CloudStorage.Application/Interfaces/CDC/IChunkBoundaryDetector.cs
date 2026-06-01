namespace CloudStorage.Application.Interfaces.CDC
{
    public interface IChunkBoundaryDetector
    {
        bool IsBoundary(byte[] window, int position, uint fingerprint);
        uint ComputeFingerprint(byte[] data, int offset, int length);
    }
}
