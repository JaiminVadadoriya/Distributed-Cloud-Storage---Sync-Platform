using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;

namespace CloudStorage.Application.Interfaces
{
    public interface IFolderService
    {
        Task<FolderDto?> GetFolderByIdAsync(Guid folderId, int userId);
        Task<IEnumerable<FolderDto>> GetUserRootFoldersAsync(int userId);
        Task<FolderDto> CreateFolderAsync(CreateFolderDto dto, int userId);
        Task<FolderDto> RenameFolderAsync(Guid folderId, string newName, int userId);
        Task<FolderDto> MoveFolderAsync(Guid folderId, Guid? newParentId, int userId);
        Task DeleteFolderAsync(Guid folderId, int userId);
        Task ShareFolderAsync(Guid folderId, int targetUserId, int ownerId, string permissionType);
    }
}
