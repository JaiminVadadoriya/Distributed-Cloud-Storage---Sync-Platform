using System;
using CloudStorage.Application.Interfaces.CDC;

namespace CloudStorage.Infrastructure.CDC
{
    public class FastCdcChunkBoundaryDetector : IChunkBoundaryDetector
    {
        public static readonly uint[] GearTable = new uint[256];

        static FastCdcChunkBoundaryDetector()
        {
            var rand = new Random(1337); // Seeded for determinism
            for (int i = 0; i < 256; i++)
            {
                byte[] bytes = new byte[4];
                rand.NextBytes(bytes);
                GearTable[i] = BitConverter.ToUInt32(bytes, 0);
            }
        }

        public bool IsBoundary(byte[] window, int position, uint fingerprint)
        {
            return (fingerprint & 0x1FFF) == 0; // 0x1FFF gives approx 8KB chunks
        }

        public uint ComputeFingerprint(byte[] data, int offset, int length)
        {
            uint hash = 0;
            for (int i = 0; i < length; i++)
            {
                hash = (hash << 1) + GearTable[data[offset + i]];
            }
            return hash;
        }

        public static uint UpdateFingerprint(uint currentHash, byte b)
        {
            return (currentHash << 1) + GearTable[b];
        }
    }
}
