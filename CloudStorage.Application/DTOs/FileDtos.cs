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
}
