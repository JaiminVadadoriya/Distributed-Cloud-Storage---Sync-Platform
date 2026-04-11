using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    public class AdminController : BaseApiController
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            return await ExecuteAsync(async () =>
            {
                var stats = await _adminService.GetDashboardStatsAsync();
                return Ok(ApiResponse<AdminDashboardStatsDto>.Ok(stats));
            });
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            return await ExecuteAsync(async () =>
            {
                var users = await _adminService.GetAllUsersAsync();
                return Ok(ApiResponse<IEnumerable<AdminUserManagementDto>>.Ok(users));
            });
        }

        [HttpPost("users")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            return await ExecuteAsync(async () =>
            {
                var user = await _adminService.CreateUserAsync(dto);
                return Ok(ApiResponse<AdminUserManagementDto>.Ok(user, "User provisioned successfully"));
            });
        }

        [HttpPatch("users/{userId}/quota")]
        public async Task<IActionResult> UpdateQuota(int userId, [FromBody] UpdateQuotaDto dto)
        {
            return await ExecuteAsync(async () =>
            {
                var result = await _adminService.UpdateUserQuotaAsync(userId, dto.NewQuota);
                if (result == null) return NotFound(ApiResponse.Fail("User not found"));
                return Ok(ApiResponse<AdminUserManagementDto>.Ok(result, "Storage quota adjusted"));
            });
        }

        [HttpPost("users/{userId}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(int userId, [FromBody] bool isActive)
        {
            return await ExecuteAsync(async () =>
            {
                await _adminService.ToggleUserStatusAsync(userId, isActive);
                return Ok(ApiResponse.Ok($"User status set to {(isActive ? "Active" : "Inactive")}"));
            });
        }

        [HttpGet("health")]
        public async Task<IActionResult> GetHealth()
        {
            return await ExecuteAsync(async () =>
            {
                var health = await _adminService.GetSystemHealthAsync();
                return Ok(ApiResponse<SystemHealthDetailsDto>.Ok(health));
            });
        }

        [HttpGet("audit")]
        public async Task<IActionResult> GetAuditLogs([FromQuery] int count = 50)
        {
            return await ExecuteAsync(async () =>
            {
                var logs = await _adminService.GetRecentAuditLogsAsync(count);
                return Ok(ApiResponse<IEnumerable<AdminAuditDto>>.Ok(logs));
            });
        }

        [HttpPost("users/{userId}/impersonate")]
        public async Task<IActionResult> Impersonate(int userId)
        {
            return await ExecuteAsync(async () =>
            {
                var token = await _adminService.GetImpersonationTokenAsync(userId);
                return Ok(ApiResponse<object>.Ok(new { token }, "Impersonation session initialized"));
            });
        }
    }
}
