using System;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Application.Interfaces
{
    public interface IRefreshTokenService
    {
        Task<RefreshToken> GenerateRefreshTokenAsync(int userId);
        Task<RefreshToken?> ValidateRefreshTokenAsync(string token);
        Task RevokeTokenAsync(string token);
        Task RevokeAllUserTokensAsync(int userId);
    }
}
