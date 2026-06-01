using System;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace CloudStorage.Infrastructure.Services
{
    public class RefreshTokenService : IRefreshTokenService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public RefreshTokenService(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        private static string HashToken(string token)
        {
            using var sha256 = SHA256.Create();
            var bytes = System.Text.Encoding.UTF8.GetBytes(token);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToHexString(hash);
        }

        public async Task<RefreshToken> GenerateRefreshTokenAsync(int userId)
        {
            var rawToken = GenerateSecureToken();
            var tokenHash = HashToken(rawToken);

            var token = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Token = tokenHash,
                RawToken = rawToken,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(GetRefreshTokenExpirationDays()),
                IsRevoked = false
            };

            _context.RefreshTokens.Add(token);
            await _context.SaveChangesAsync();

            return token;
        }

        public async Task<RefreshToken?> ValidateRefreshTokenAsync(string token)
        {
            var tokenHash = HashToken(token);
            var refreshToken = await _context.RefreshTokens
                .Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == tokenHash);

            if (refreshToken == null)
                return null;

            if (refreshToken.IsRevoked)
                return null;

            if (refreshToken.ExpiresAt < DateTime.UtcNow)
            {
                refreshToken.IsRevoked = true;
                refreshToken.RevokedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return null;
            }

            return refreshToken;
        }

        public async Task RevokeTokenAsync(string token)
        {
            var tokenHash = HashToken(token);
            var refreshToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == tokenHash);

            if (refreshToken != null && !refreshToken.IsRevoked)
            {
                refreshToken.IsRevoked = true;
                refreshToken.RevokedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task RevokeAllUserTokensAsync(int userId)
        {
            var tokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == userId && !rt.IsRevoked)
                .ToListAsync();

            foreach (var token in tokens)
            {
                token.IsRevoked = true;
                token.RevokedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }

        private string GenerateSecureToken()
        {
            var randomBytes = new byte[64];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
            }
            return Convert.ToBase64String(randomBytes);
        }

        private int GetRefreshTokenExpirationDays()
        {
            var configValue = _configuration["RefreshToken:ExpirationDays"];
            return int.TryParse(configValue, out var days) ? days : 7;
        }
    }
}
