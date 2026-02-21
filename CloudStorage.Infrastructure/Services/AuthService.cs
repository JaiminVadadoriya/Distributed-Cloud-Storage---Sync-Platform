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

        public AuthService(ApplicationDbContext context, IConfiguration configuration, IRefreshTokenService refreshTokenService)
        {
            _context = context;
            _configuration = configuration;
            _refreshTokenService = refreshTokenService;
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
            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == identifier || u.Username == identifier);

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
            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                // Don't reveal that the email doesn't exist
                return "If the email exists, a password reset link has been sent";
            }

            // Generate password reset token
            var resetToken = GeneratePasswordResetToken();
            
            // In a real application, you would:
            // 1. Store this token in the database with expiration
            // 2. Send an email with the reset link
            // For now, we'll just return a placeholder message

            return resetToken; // In production, don't return the token directly
        }

        public async Task ResetPasswordAsync(string token, string newPassword)
        {
            // In a real application, you would:
            // 1. Validate the reset token from the database
            // 2. Check if it's expired
            // 3. Update the password
            // For now, this is a placeholder

            throw new NotImplementedException("Password reset functionality requires email integration");
        }

        public async Task<User?> GetUserByIdAsync(int userId)
        {
            return await _context.Users.FindAsync(userId);
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

        private string GeneratePasswordResetToken()
        {
            var randomBytes = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
            }
            return Convert.ToBase64String(randomBytes);
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
    }
}
