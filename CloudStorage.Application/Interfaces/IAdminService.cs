using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;

namespace CloudStorage.Application.Interfaces
{
    public interface IAdminService
    {
        Task<AdminDashboardStatsDto> GetDashboardStatsAsync();
        Task<IEnumerable<AdminUserManagementDto>> GetAllUsersAsync();
        Task<AdminUserManagementDto?> UpdateUserQuotaAsync(int userId, long newQuota);
        Task<SystemHealthDetailsDto> GetSystemHealthAsync();
        Task<IEnumerable<AdminAuditDto>> GetRecentAuditLogsAsync(int count = 50);
        Task<AdminUserManagementDto> CreateUserAsync(CreateUserDto dto);
        Task ToggleUserStatusAsync(int userId, bool isActive);
        Task<string> GetImpersonationTokenAsync(int userId);
    }
}
