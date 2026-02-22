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
                return Ok(new { result.Id, result.Username, result.Email });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            try
            {
                var response = await _authService.LoginAsync(dto.Identifier, dto.Password);

                if (response == null)
                    return Unauthorized(new { message = "Invalid credentials" });

                return Ok(response);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh(RefreshTokenDto dto)
        {
            var response = await _authService.RefreshTokenAsync(dto.RefreshToken);

            if (response == null)
                return Unauthorized(new { message = "Invalid or expired refresh token" });

            return Ok(response);
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout(RefreshTokenDto dto)
        {
            await _authService.LogoutAsync(dto.RefreshToken);
            return Ok(new { message = "Logged out successfully" });
        }

        [HttpPost("password-reset-request")]
        public async Task<IActionResult> RequestPasswordReset(PasswordResetRequestDto dto)
        {
            var result = await _authService.RequestPasswordResetAsync(dto.Email);
            return Ok(new { message = result });
        }

        [HttpPost("password-reset")]
        public async Task<IActionResult> ResetPassword(PasswordResetDto dto)
        {
            try
            {
                await _authService.ResetPasswordAsync(dto.Token, dto.NewPassword);
                return Ok(new { message = "Password reset successfully" });
            }
            catch (System.NotImplementedException ex)
            {
                return StatusCode(501, new { message = ex.Message });
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
