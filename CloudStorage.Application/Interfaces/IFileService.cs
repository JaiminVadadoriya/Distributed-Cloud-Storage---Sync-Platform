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
        Task<FileResponseDto?> GetFileByIdAsync(Guid fileId, int requestingUserId);
        Task<IEnumerable<string>> GetFileChunkPathsAsync(Guid fileId, int requestingUserId);
        Task<FileResponseDto> CreateFileMetadataAsync(FileUploadDto dto, int ownerId);
        Task DeleteFileAsync(Guid fileId, int userId);
        Task GrantPermissionAsync(Guid fileId, int userId, int grantedByUserId, PermissionType permissionType);
        Task<bool> HasPermissionAsync(Guid fileId, int userId, PermissionType minimumPermission);
        Task<DashboardStatsDto> GetDashboardStatsAsync(int userId);
    }
}
