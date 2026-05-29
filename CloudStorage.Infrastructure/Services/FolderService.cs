using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;

namespace CloudStorage.Infrastructure.Services
{
    public class FolderService : IFolderService
    {
        private readonly IFolderRepository _folderRepository;
        private readonly ICacheService _cache;
        private readonly IActivityService _activityService;

        public FolderService(
            IFolderRepository folderRepository,
            ICacheService cache,
            IActivityService activityService)
        {
            _folderRepository = folderRepository;
            _cache = cache;
            _activityService = activityService;
        }

        public async Task<FolderDto?> GetFolderByIdAsync(Guid folderId, int userId)
        {
            var folder = await _folderRepository.GetWithContentsAsync(folderId);
            if (folder == null || folder.OwnerId != userId)
                return null;

            return MapToDto(folder);
        }

        public async Task<IEnumerable<FolderDto>> GetUserRootFoldersAsync(int userId)
        {
            var folders = await _folderRepository.GetUserRootFoldersAsync(userId);
            return folders.Select(MapToDto);
        }

        public async Task<FolderDto> CreateFolderAsync(CreateFolderDto dto, int userId)
        {
            var folder = new Folder
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                OwnerId = userId,
                ParentFolderId = dto.ParentFolderId,
                CreatedAt = DateTime.UtcNow,
                LastModifiedAt = DateTime.UtcNow
            };

            await _folderRepository.AddAsync(folder);

            await _activityService.LogActivityAsync(userId, "CREATE", "FOLDER", folder.Id.ToString(), $"Folder '{folder.Name}' was created.");

            await _cache.RemoveByPrefixAsync($"stats:{userId}");

            return MapToDto(folder);
        }

        public async Task<FolderDto> RenameFolderAsync(Guid folderId, string newName, int userId)
        {
            var folder = await _folderRepository.GetByIdAsync(folderId);
            if (folder == null || folder.OwnerId != userId)
                throw new Exception("Folder not found or access denied");

            folder.Name = newName;
            folder.LastModifiedAt = DateTime.UtcNow;
            await _folderRepository.UpdateAsync(folder);

            await _activityService.LogActivityAsync(userId, "RENAME", "FOLDER", folderId.ToString(), $"Folder renamed to '{newName}'.");

            return MapToDto(folder);
        }

        public async Task<FolderDto> MoveFolderAsync(Guid folderId, Guid? newParentId, int userId)
        {
            var folder = await _folderRepository.GetByIdAsync(folderId);
            if (folder == null || folder.OwnerId != userId)
                throw new Exception("Folder not found or access denied");

            // Prevent moving a folder into itself or its own subfolders (simplified check for now)
            if (newParentId.HasValue && newParentId.Value == folderId)
                throw new Exception("Cannot move a folder into itself");

            folder.ParentFolderId = newParentId;
            folder.LastModifiedAt = DateTime.UtcNow;
            await _folderRepository.UpdateAsync(folder);

            await _activityService.LogActivityAsync(userId, "MOVE", "FOLDER", folderId.ToString(), "Folder was moved.");

            return MapToDto(folder);
        }

        public async Task DeleteFolderAsync(Guid folderId, int userId)
        {
            var folder = await _folderRepository.GetByIdAsync(folderId);
            if (folder == null || folder.OwnerId != userId)
                throw new Exception("Folder not found or access denied");

            await _folderRepository.DeleteAsync(folder);

            await _activityService.LogActivityAsync(userId, "DELETE", "FOLDER", folderId.ToString(), $"Folder '{folder.Name}' was deleted.");

            await _cache.RemoveByPrefixAsync($"stats:{userId}");
        }

        public async Task ShareFolderAsync(Guid folderId, int targetUserId, int ownerId, string permissionType)
        {
            var folder = await _folderRepository.GetByIdAsync(folderId);
            if (folder == null || folder.OwnerId != ownerId)
                throw new UnauthorizedAccessException("Folder not found or access denied");

            if (!Enum.TryParse<Domain.Entities.PermissionType>(permissionType, true, out var perm))
                throw new ArgumentException($"Invalid permission type '{permissionType}'. Use 'Read' or 'Write'.");

            var existing = folder.Permissions?.FirstOrDefault(p => p.UserId == targetUserId);
            if (existing != null)
            {
                existing.PermissionType = perm;
                existing.GrantedAt = DateTime.UtcNow;
                await _folderRepository.UpdateAsync(folder);
            }
            else
            {
                // Need direct DB access since IFolderRepository doesn't have an AddPermission method
                var permission = new Domain.Entities.FolderPermission
                {
                    Id = Guid.NewGuid(),
                    FolderId = folderId,
                    UserId = targetUserId,
                    PermissionType = perm,
                    GrantedAt = DateTime.UtcNow,
                    GrantedBy = ownerId
                };
                // FolderRepository is a generic repo — use the folder's navigation collection trick via EF
                var fullFolder = await _folderRepository.GetWithContentsAsync(folderId);
                fullFolder!.Permissions ??= new List<Domain.Entities.FolderPermission>();
                fullFolder.Permissions.Add(permission);
                await _folderRepository.UpdateAsync(fullFolder);
            }

            await _activityService.LogActivityAsync(ownerId, "SHARE", "FOLDER", folderId.ToString(),
                $"Folder shared with user ID {targetUserId} ({permissionType}).");
        }

        /// <summary>
        /// Mapping is now delegated to MappingExtensions.ToDto() for reusability.
        /// </summary>
        private static FolderDto MapToDto(Folder folder) => folder.ToDto();
    }
}
