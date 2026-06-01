using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Application.Interfaces
{
    public interface IFileService
    {
        Task<IEnumerable<FileListDto>> GetUserFilesAsync(int userId);
        Task<IEnumerable<FileListDto>> GetSharedFilesAsync(int userId);
        Task<IEnumerable<FileListDto>> SearchFilesAsync(int userId, string query);
        Task<FileResponseDto?> GetFileByIdAsync(Guid fileId, int requestingUserId);
        Task<IEnumerable<(string StoragePath, long Size)>> GetFileChunkPathsAsync(Guid fileId, int requestingUserId);
        Task<FileResponseDto> CreateFileMetadataAsync(FileUploadDto dto, int ownerId);
        Task DeleteFileAsync(Guid fileId, int userId);
        Task GrantPermissionAsync(Guid fileId, int userId, int grantedByUserId, PermissionType permissionType);
        Task<bool> HasPermissionAsync(Guid fileId, int userId, PermissionType minimumPermission);
        Task<DashboardStatsDto> GetDashboardStatsAsync(int userId);
        Task<StorageBreakdownDto> GetStorageBreakdownAsync(int userId);
        Task DeleteAllUserFilesAsync(int userId);
        Task PurgeUserDriveAsync(int userId);

        // Version history
        Task<IEnumerable<FileVersionDto>> GetFileVersionsAsync(Guid fileId, int userId);
        Task<FileResponseDto> RestoreFileVersionAsync(Guid fileId, Guid versionId, int userId);

        // File operations
        Task RenameFileAsync(Guid fileId, string newName, int userId);
        Task MoveFileAsync(Guid fileId, Guid? targetFolderId, int userId);

        // Bulk operations
        Task BulkDeleteAsync(IEnumerable<Guid> fileIds, int userId);
        Task BulkMoveAsync(IEnumerable<Guid> fileIds, Guid? targetFolderId, int userId);
        Task BulkShareAsync(IEnumerable<Guid> fileIds, int targetUserId, int grantedByUserId, PermissionType permission);

        // Permission management
        Task<IEnumerable<FilePermissionListDto>> GetFilePermissionsAsync(Guid fileId, int userId);
        Task RemovePermissionAsync(Guid fileId, int targetUserId, int requestingUserId);
        Task UpdatePermissionAsync(Guid fileId, int targetUserId, PermissionType newPermission, int requestingUserId);
    }
}
