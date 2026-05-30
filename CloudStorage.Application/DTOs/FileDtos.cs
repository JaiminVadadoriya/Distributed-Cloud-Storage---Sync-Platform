using System;
using System.ComponentModel.DataAnnotations;

namespace CloudStorage.Application.DTOs
{
    public class FileResponseDto
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long Size { get; set; }
        public int Version { get; set; }
        public int ChunkCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastModifiedAt { get; set; }
        public int OwnerId { get; set; }
        public string OwnerUsername { get; set; } = string.Empty;
        public Guid? FolderId { get; set; }
    }

    public class FileUploadDto
    {
        [Required]
        [StringLength(255)]
        public string FileName { get; set; } = string.Empty;

        [Required]
        public string ContentType { get; set; } = string.Empty;

        [Required]
        [Range(1, long.MaxValue)]
        public long Size { get; set; }

        public int ChunkCount { get; set; } = 1;

        public string Hash { get; set; } = string.Empty;
        public Guid? FolderId { get; set; }
    }

    public class FilePermissionDto
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        public string PermissionType { get; set; } = "Read";
    }

    public class FileListDto
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long Size { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastModifiedAt { get; set; }
        public bool IsShared { get; set; }
        public string? VersionVector { get; set; }
        public Guid? FolderId { get; set; }
    }

    public class DashboardStatsDto
    {
        public long TotalStorageBytes { get; set; }
        public long MaxStorageBytes { get; set; }
        public int TotalFiles { get; set; }
        public int RecentUploads { get; set; }
    }

    public class FileVersionDto
    {
        public Guid Id { get; set; }
        public int Version { get; set; }
        public long Size { get; set; }
        public string Hash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime LastModifiedAt { get; set; }
        public string ModifiedByUsername { get; set; } = string.Empty;
    }

    public class FileRenameDto
    {
        [Required]
        [StringLength(255)]
        public string NewName { get; set; } = string.Empty;
    }

    public class FileMoveDto
    {
        public Guid? TargetFolderId { get; set; }
    }

    public class BulkDeleteDto
    {
        [Required]
        public List<Guid> FileIds { get; set; } = new();
    }

    public class BulkMoveDto
    {
        [Required]
        public List<Guid> FileIds { get; set; } = new();
        public Guid? TargetFolderId { get; set; }
    }

    public class BulkShareDto
    {
        [Required]
        public List<Guid> FileIds { get; set; } = new();
        [Required]
        public int UserId { get; set; }
        public string PermissionType { get; set; } = "Read";
    }

    public class FilePermissionListDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PermissionType { get; set; } = string.Empty;
        public DateTime GrantedAt { get; set; }
    }

    public class UploadAnalyticsDto
    {
        public int TotalUploads { get; set; }
        public double SuccessRate { get; set; }
        public long AvgSpeedBps { get; set; }
        public int TotalRetries { get; set; }
        public int FailedCount { get; set; }
    }

    public class StorageBreakdownDto
    {
        public long Images { get; set; }
        public long Videos { get; set; }
        public long Documents { get; set; }
        public long Others { get; set; }
    }
}
