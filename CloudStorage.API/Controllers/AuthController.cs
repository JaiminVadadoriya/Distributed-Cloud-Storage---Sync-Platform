using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Entities;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;

namespace CloudStorage.API.Controllers
{
    /// <summary>
    /// Manages authentication, user profiles, and password management.
    /// Inherits from BaseApiController for shared infrastructure.
    /// </summary>
    [Route("api/[controller]")]
    [EnableRateLimiting("auth")]
    public class AuthController : BaseApiController
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public Task<IActionResult> Register(RegisterDto dto) => ExecuteAsync(async () =>
        {
            var user = new User
            {
                Username = dto.Username,
                Email = dto.Email
            };

            var result = await _authService.RegisterAsync(user, dto.Password);
            return Ok(ApiResponse<object>.Ok(
                new { result.Id, result.Username, result.Email },
                "Registration successful"));
        });

        [HttpPost("login")]
        [AllowAnonymous]
        public Task<IActionResult> Login(LoginDto dto) => ExecuteAsync(async () =>
        {
            var response = await _authService.LoginAsync(dto.Identifier, dto.Password);
            if (response == null)
                return Unauthorized(ApiResponse.Fail("Invalid credentials"));

            return Ok(ApiResponse<LoginResponseDto>.Ok(response, "Login successful"));
        });

        [HttpPost("refresh")]
        [AllowAnonymous]
        public Task<IActionResult> Refresh(RefreshTokenDto dto) => ExecuteAsync(async () =>
        {
            var response = await _authService.RefreshTokenAsync(dto.RefreshToken);
            if (response == null)
                return Unauthorized(ApiResponse.Fail("Invalid or expired refresh token"));

            return Ok(ApiResponse<LoginResponseDto>.Ok(response, "Token refreshed successfully"));
        });

        [HttpPost("logout")]
        public Task<IActionResult> Logout(RefreshTokenDto dto) => ExecuteAsync(async () =>
        {
            await _authService.LogoutAsync(dto.RefreshToken);
            return Ok(ApiResponse.Ok("Logged out successfully"));
        });

        [HttpPost("password-reset-request")]
        [AllowAnonymous]
        public Task<IActionResult> RequestPasswordReset(PasswordResetRequestDto dto) => ExecuteAsync(async () =>
        {
            var result = await _authService.RequestPasswordResetAsync(dto.Email);
            return Ok(ApiResponse.Ok(result));
        });

        [HttpPost("password-reset")]
        [AllowAnonymous]
        public Task<IActionResult> ResetPassword(PasswordResetDto dto) => ExecuteAsync(async () =>
        {
            await _authService.ResetPasswordAsync(dto.Token, dto.NewPassword);
            return Ok(ApiResponse.Ok("Password reset successfully"));
        });

        [HttpPut("profile")]
        public Task<IActionResult> UpdateProfile(UpdateProfileDto dto) => ExecuteAsync(async () =>
        {
            var user = await _authService.UpdateProfileAsync(GetUserId(), dto);
            return Ok(ApiResponse<UserDto>.Ok(user, "Profile updated successfully"));
        });

        [HttpPut("change-password")]
        public Task<IActionResult> ChangePassword(ChangePasswordDto dto) => ExecuteAsync(async () =>
        {
            await _authService.ChangePasswordAsync(GetUserId(), dto);
            return Ok(ApiResponse.Ok("Password changed successfully"));
        });

        [HttpGet("users/search")]
        public Task<IActionResult> SearchUsers([FromQuery] string q) => ExecuteAsync(async () =>
        {
            var results = await _authService.SearchUsersAsync(q);
            return Ok(ApiResponse<IEnumerable<UserSearchResultDto>>.Ok(results, "Search results retrieved"));
        });
    }
}
