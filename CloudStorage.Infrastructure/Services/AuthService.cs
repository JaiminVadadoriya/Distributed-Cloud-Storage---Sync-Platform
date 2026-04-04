using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using BCrypt.Net;
using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Entities;
using CloudStorage.Application.Interfaces;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CloudStorage.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IRefreshTokenService _refreshTokenService;
        private readonly IEmailService _emailService;

        public AuthService(
            ApplicationDbContext context,
            IConfiguration configuration,
            IRefreshTokenService refreshTokenService,
            IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _refreshTokenService = refreshTokenService;
            _emailService = emailService;
        }

        public async Task<User> RegisterAsync(User user, string password)
        {
            if (await _context.Users.AnyAsync(u => u.Username == user.Username))
                throw new Exception("Username already exists");

            if (await _context.Users.AnyAsync(u => u.Email == user.Email))
                throw new Exception("Email already exists");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
            user.CreatedAt = DateTime.UtcNow;
            user.EmailVerified = false;
            user.IsActive = true;

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return user;
        }

        public async Task<LoginResponseDto?> LoginAsync(string identifier, string password)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == identifier || u.Username == identifier);

            if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                return null;

            if (!user.IsActive)
                throw new Exception("User account is inactive");

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var accessToken = GenerateJwtToken(user);
            var refreshToken = await _refreshTokenService.GenerateRefreshTokenAsync(user.Id);

            return new LoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken.Token,
                ExpiresIn = GetAccessTokenExpirationSeconds(),
                TokenType = "Bearer",
                User = new UserDto
                {
                    Id = user.Id.ToString(),
                    Username = user.Username,
                    Email = user.Email
                }
            };
        }

        public async Task<LoginResponseDto?> RefreshTokenAsync(string refreshToken)
        {
            var validatedToken = await _refreshTokenService.ValidateRefreshTokenAsync(refreshToken);
            if (validatedToken == null)
                return null;

            var user = validatedToken.User;
            if (user == null || !user.IsActive)
                return null;

            // Generate new tokens
            var accessToken = GenerateJwtToken(user);
            var newRefreshToken = await _refreshTokenService.GenerateRefreshTokenAsync(user.Id);

            // Revoke old refresh token
            await _refreshTokenService.RevokeTokenAsync(refreshToken);

            return new LoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = newRefreshToken.Token,
                ExpiresIn = GetAccessTokenExpirationSeconds(),
                TokenType = "Bearer",
                User = new UserDto
                {
                    Id = user.Id.ToString(),
                    Username = user.Username,
                    Email = user.Email
                }
            };
        }

        public async Task LogoutAsync(string refreshToken)
        {
            await _refreshTokenService.RevokeTokenAsync(refreshToken);
        }

        public async Task<string> RequestPasswordResetAsync(string email)
        {
            const string genericMessage = "If the email exists, a password reset link has been sent";

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                // Never reveal whether the email exists
                return genericMessage;
            }

            // Generate a cryptographically random token
            var rawToken = GenerateSecureToken();
            var tokenHash = HashToken(rawToken);

            var resetToken = new PasswordResetToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = tokenHash,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(GetPasswordResetTokenExpirationMinutes()),
                IsUsed = false
            };

            _context.PasswordResetTokens.Add(resetToken);
            await _context.SaveChangesAsync();

            // Send the email with the raw (unhashed) token
            await _emailService.SendPasswordResetEmailAsync(email, rawToken);

            return genericMessage;
        }

        public async Task ResetPasswordAsync(string token, string newPassword)
        {
            var tokenHash = HashToken(token);

            var resetToken = await _context.PasswordResetTokens
                .Include(prt => prt.User)
                .FirstOrDefaultAsync(prt => prt.TokenHash == tokenHash);

            if (resetToken == null)
                throw new Exception("Invalid password reset token");

            if (resetToken.ExpiresAt < DateTime.UtcNow)
                throw new Exception("Password reset token has expired");

            if (resetToken.IsUsed)
                throw new Exception("Password reset token has already been used");

            // Update user's password
            var user = resetToken.User;
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            
            // Mark token as used
            resetToken.IsUsed = true;
            resetToken.UsedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Revoke all active sessions for security
            await _refreshTokenService.RevokeAllUserTokensAsync(user.Id);
        }

        public async Task<User?> GetUserByIdAsync(int userId)
        {
            return await _context.Users.FindAsync(userId);
        }

        public async Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                throw new Exception("User not found");

            if (!string.IsNullOrEmpty(dto.Username) && dto.Username != user.Username)
            {
                if (await _context.Users.AnyAsync(u => u.Username == dto.Username && u.Id != userId))
                    throw new Exception("Username already taken");
                user.Username = dto.Username;
            }

            if (!string.IsNullOrEmpty(dto.Email) && dto.Email != user.Email)
            {
                if (await _context.Users.AnyAsync(u => u.Email == dto.Email && u.Id != userId))
                    throw new Exception("Email already in use");
                user.Email = dto.Email;
            }

            await _context.SaveChangesAsync();

            return new UserDto
            {
                Id = user.Id.ToString(),
                Username = user.Username,
                Email = user.Email
            };
        }

        public async Task ChangePasswordAsync(int userId, ChangePasswordDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                throw new Exception("User not found");

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                throw new Exception("Current password is incorrect");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            // Revoke all refresh tokens for security
            await _refreshTokenService.RevokeAllUserTokensAsync(user.Id);
        }

        public async Task<IEnumerable<UserSearchResultDto>> SearchUsersAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Length < 2)
                return Enumerable.Empty<UserSearchResultDto>();

            var normalizedQuery = query.ToLower();
            var users = await _context.Users
                .Where(u => u.IsActive && (
                    u.Email.ToLower().Contains(normalizedQuery) ||
                    u.Username.ToLower().Contains(normalizedQuery)))
                .Take(10)
                .Select(u => new UserSearchResultDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email
                })
                .ToListAsync();

            return users;
        }

        private string GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"];
            if (string.IsNullOrEmpty(jwtKey)) throw new Exception("JWT Key is missing from configuration");
             
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("id", user.Id.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddMinutes(GetAccessTokenExpirationMinutes()),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static string GenerateSecureToken()
        {
            var randomBytes = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
            }
            return Convert.ToHexString(randomBytes);
        }

        private static string HashToken(string token)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(token);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToHexString(hash);
        }

        private int GetAccessTokenExpirationMinutes()
        {
            var configValue = _configuration["Jwt:ExpirationMinutes"];
            return int.TryParse(configValue, out var minutes) ? minutes : 15;
        }

        private int GetAccessTokenExpirationSeconds()
        {
            return GetAccessTokenExpirationMinutes() * 60;
        }

        private int GetPasswordResetTokenExpirationMinutes()
        {
            var configValue = _configuration["PasswordReset:TokenExpirationMinutes"];
            return int.TryParse(configValue, out var minutes) ? minutes : 60;
        }
    }
}
