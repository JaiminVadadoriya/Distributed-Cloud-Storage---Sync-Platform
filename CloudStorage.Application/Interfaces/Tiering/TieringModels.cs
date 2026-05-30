using System;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Domain.Enums;

namespace CloudStorage.Application.Interfaces.Tiering
{
    public record TierTransitionResult(
        bool Success,
        string ObjectKey,
        StorageTier FromTier,
        StorageTier ToTier,
        string? Error = null
    );
}
