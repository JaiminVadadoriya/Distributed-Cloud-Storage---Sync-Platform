using System;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Application.Interfaces
{
    public interface IAuthService
    {
        Task<User> RegisterAsync(User user, string password);
        Task<LoginResponseDto?> LoginAsync(string identifier, string password);
        Task<LoginResponseDto?> RefreshTokenAsync(string refreshToken);
        Task LogoutAsync(string refreshToken);
        Task<string> RequestPasswordResetAsync(string email);
        Task ResetPasswordAsync(string token, string newPassword);
        Task<User?> GetUserByIdAsync(int userId);

        // Profile management
        Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileDto dto);
        Task ChangePasswordAsync(int userId, ChangePasswordDto dto);

        // User search (for sharing)
        Task<IEnumerable<UserSearchResultDto>> SearchUsersAsync(string query);
    }
}
