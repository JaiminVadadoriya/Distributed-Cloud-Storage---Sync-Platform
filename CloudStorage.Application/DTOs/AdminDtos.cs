using System;
using System.Collections.Generic;

namespace CloudStorage.Application.DTOs
{
    public class AdminDashboardStatsDto
    {
        public long TotalFiles { get; set; }
        public long TotalUsers { get; set; }
        public long TotalStorageUsed { get; set; }
        public long TotalStorageLimit { get; set; }
        public int ActiveUsersLast24h { get; set; }
        public int SuspendedUsers { get; set; }
        public int UploadsToday { get; set; }
        public int DownloadsToday { get; set; }
        public int NewUsersThisWeek { get; set; }
        public int ActiveSessionsNow { get; set; }

        // Trends (percentage change)
        public double FilesTrend { get; set; }
        public double UsersTrend { get; set; }
        public double StorageTrend { get; set; }

        // History for sparklines (last 7 points)
        public List<double> StorageHistory { get; set; } = new();
        public List<double> TrafficHistory { get; set; } = new();

        // Geographic Telemetry
        public List<RegionalNodeDto> RegionalTraffic { get; set; } = new();
    }

    public class RegionalNodeDto
    {
        public string Id { get; set; } = string.Empty;
        public double X { get; set; }
        public double Y { get; set; }
        public double Intensity { get; set; }
        public string RegionName { get; set; } = string.Empty;
    }

    public class AdminUserManagementDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = "User";
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public long StorageUsed { get; set; }
        public long StorageQuota { get; set; }
    }

    public class AdminAuditDto
    {
        public Guid Id { get; set; }
        public int UserId { get; set; }
        public string PerformedBy { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string TargetType { get; set; } = string.Empty;
        public string TargetName { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public DateTime PerformedAt { get; set; }
        public string? IpAddress { get; set; }
    }

    public class SystemHealthDetailsDto
    {
        public string Status { get; set; } = "healthy";
        public double CpuUsage { get; set; }
        public long MemoryUsed { get; set; }
        public long MemoryTotal { get; set; }
        public long DiskUsed { get; set; }
        public long DiskTotal { get; set; }
        public int Uptime { get; set; }
        public int ActiveConnections { get; set; }
        public int RequestsPerMinute { get; set; }
        public double ErrorRate { get; set; }
        public int AvgResponseMs { get; set; }
        public List<ServiceCheckDto> Checks { get; set; } = new();
    }

    public class ServiceCheckDto
    {
        public string Name { get; set; } = string.Empty;
        public string Status { get; set; } = "ok";
        public string Message { get; set; } = string.Empty;
        public int? LatencyMs { get; set; }
    }

    public class CreateUserDto
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "User";
        public long InitialQuota { get; set; } = 5368709120; // 5GB default
    }

    public class UpdateQuotaDto
    {
        public long NewQuota { get; set; }
    }
}
