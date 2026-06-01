using System;

namespace CloudStorage.Application.Interfaces.Security
{
    public enum EncryptionAlgorithm
    {
        Aes256Gcm,
        Aes256Cbc
    }

    public record KeyMetadata(
        string KeyId,
        EncryptionAlgorithm Algorithm,
        DateTime CreatedAt,
        DateTime? RotatedAt,
        int Version
    );

    public record IntegrityResult(
        bool IsValid,
        string ComputedHash,
        string ExpectedHash
    );
}
