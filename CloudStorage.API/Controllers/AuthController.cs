using System.Threading.Tasks;
using System.Threading.RateLimiting;
using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Entities;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;

namespace CloudStorage.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            try
            {
                var user = new User
                {
                    Username = dto.Username,
                    Email = dto.Email
                };

                var result = await _authService.RegisterAsync(user, dto.Password);
                return Ok(new ApiResponse<object> 
                { 
                    Success = true, 
                    Message = "Registration successful", 
                    Data = new { result.Id, result.Username, result.Email } 
                });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new ApiResponse 
                { 
                    Success = false, 
                    Message = ex.Message 
                });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            try
            {
                var response = await _authService.LoginAsync(dto.Identifier, dto.Password);

                if (response == null)
                    return Unauthorized(new ApiResponse 
                    { 
                        Success = false, 
                        Message = "Invalid credentials" 
                    });

                return Ok(new ApiResponse<LoginResponseDto> 
                { 
                    Success = true, 
                    Message = "Login successful", 
                    Data = response 
                });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new ApiResponse 
                { 
                    Success = false, 
                    Message = ex.Message 
                });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh(RefreshTokenDto dto)
        {
            var response = await _authService.RefreshTokenAsync(dto.RefreshToken);

            if (response == null)
                return Unauthorized(new ApiResponse 
                { 
                    Success = false, 
                    Message = "Invalid or expired refresh token" 
                });

            return Ok(new ApiResponse<LoginResponseDto> 
            { 
                Success = true, 
                Message = "Token refreshed successfully", 
                Data = response 
            });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout(RefreshTokenDto dto)
        {
            await _authService.LogoutAsync(dto.RefreshToken);
            return Ok(new ApiResponse 
            { 
                Success = true, 
                Message = "Logged out successfully" 
            });
        }

        [HttpPost("password-reset-request")]
        public async Task<IActionResult> RequestPasswordReset(PasswordResetRequestDto dto)
        {
            var result = await _authService.RequestPasswordResetAsync(dto.Email);
            return Ok(new ApiResponse 
            { 
                Success = true, 
                Message = result 
            });
        }

        [HttpPost("password-reset")]
        public async Task<IActionResult> ResetPassword(PasswordResetDto dto)
        {
            try
            {
                await _authService.ResetPasswordAsync(dto.Token, dto.NewPassword);
                return Ok(new ApiResponse 
                { 
                    Success = true, 
                    Message = "Password reset successfully" 
                });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new ApiResponse 
                { 
                    Success = false, 
                    Message = ex.Message 
                });
            }
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                throw new UnauthorizedAccessException("User ID not found in token");
            return int.Parse(userIdClaim);
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile(UpdateProfileDto dto)
        {
            try
            {
                var userId = GetUserId();
                var user = await _authService.UpdateProfileAsync(userId, dto);
                return Ok(new ApiResponse<UserDto>
                {
                    Success = true,
                    Message = "Profile updated successfully",
                    Data = user
                });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        [HttpPut("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
        {
            try
            {
                var userId = GetUserId();
                await _authService.ChangePasswordAsync(userId, dto);
                return Ok(new ApiResponse { Success = true, Message = "Password changed successfully" });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        [HttpGet("users/search")]
        [Authorize]
        public async Task<IActionResult> SearchUsers([FromQuery] string q)
        {
            try
            {
                var results = await _authService.SearchUsersAsync(q);
                return Ok(new ApiResponse<IEnumerable<UserSearchResultDto>>
                {
                    Success = true,
                    Message = "Search results retrieved",
                    Data = results
                });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }
    }
}
