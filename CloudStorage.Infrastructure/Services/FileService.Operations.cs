using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;

namespace CloudStorage.Infrastructure.Services
{
    public partial class FileService
    {
        // ─── File Operations ──────────────────────────────────────────────

        public async Task RenameFileAsync(Guid fileId, string newName, int userId)
        {
            var file = await _fileRepository.GetByIdAsync(fileId);
            if (file == null || file.IsDeleted)
                throw new Exception("File not found");

            if (file.OwnerId != userId)
                throw new UnauthorizedAccessException("Only the owner can rename this file");

            var oldName = file.FileName;
            file.FileName = newName;
            file.LastModifiedAt = DateTime.UtcNow;
            await _fileRepository.UpdateAsync(file);
            await _fileRepository.SaveChangesAsync();

            await _activityService.LogActivityAsync(userId, "RENAME", "FILE", fileId.ToString(),
                $"File renamed from '{oldName}' to '{newName}'.");
            await _cache.RemoveByPrefixAsync($"file:{fileId}:");
        }

        public async Task MoveFileAsync(Guid fileId, Guid? targetFolderId, int userId)
        {
            var file = await _fileRepository.GetByIdAsync(fileId);
            if (file == null || file.IsDeleted)
                throw new Exception("File not found");

            if (file.OwnerId != userId)
                throw new UnauthorizedAccessException("Only the owner can move this file");

            file.FolderId = targetFolderId;
            file.LastModifiedAt = DateTime.UtcNow;
            await _fileRepository.UpdateAsync(file);
            await _fileRepository.SaveChangesAsync();

            await _activityService.LogActivityAsync(userId, "MOVE", "FILE", fileId.ToString(),
                $"File '{file.FileName}' moved to folder {targetFolderId?.ToString() ?? "root"}.");
            await _cache.RemoveByPrefixAsync($"file:{fileId}:");
        }

        // ─── Bulk Operations ──────────────────────────────────────────────

        public async Task BulkDeleteAsync(IEnumerable<Guid> resourceIds, int userId)
        {
            foreach (var id in resourceIds)
            {
                var file = await _fileRepository.GetByIdAsync(id);
                if (file != null)
                {
                    await DeleteFileAsync(id, userId);
                    continue;
                }

                var folder = await _folderRepository.GetByIdAsync(id);
                if (folder != null)
                {
                    if (folder.OwnerId != userId)
                        throw new UnauthorizedAccessException("Only the owner can delete this folder");

                    await _folderRepository.DeleteAsync(folder);
                    await _folderRepository.SaveChangesAsync();
                    await _activityService.LogActivityAsync(userId, "DELETE", "FOLDER", id.ToString(), $"Folder '{folder.Name}' was deleted via bulk operation.");
                    continue;
                }

                // If neither found, we log warning but continue the sequence
                Console.WriteLine($"[BulkDelete] Resource {id} not found in files or folders for User {userId}");
            }

            await _cache.RemoveByPrefixAsync($"stats:{userId}");
        }

        public async Task BulkMoveAsync(IEnumerable<Guid> fileIds, Guid? targetFolderId, int userId)
        {
            foreach (var fileId in fileIds)
            {
                await MoveFileAsync(fileId, targetFolderId, userId);
            }
        }

        public async Task BulkShareAsync(IEnumerable<Guid> fileIds, int targetUserId, int grantedByUserId, PermissionType permission)
        {
            foreach (var fileId in fileIds)
            {
                await GrantPermissionAsync(fileId, targetUserId, grantedByUserId, permission);
            }
        }

        // ─── Permission Management ───────────────────────────────────────

        public async Task<IEnumerable<FilePermissionListDto>> GetFilePermissionsAsync(Guid fileId, int userId)
        {
            if (!await HasPermissionAsync(fileId, userId, PermissionType.Read))
                throw new UnauthorizedAccessException("Access denied");

            var file = await _fileRepository.GetWithPermissionsAsync(fileId);
            if (file == null)
                throw new Exception("File not found");

            var result = new List<FilePermissionListDto>();
            foreach (var perm in file.Permissions)
            {
                var user = perm.User;
                result.Add(new FilePermissionListDto
                {
                    UserId = perm.UserId,
                    Username = user?.Username ?? "Unknown",
                    Email = user?.Email ?? "Unknown",
                    PermissionType = perm.PermissionType.ToString(),
                    GrantedAt = perm.GrantedAt
                });
            }

            return result;
        }

        public async Task RemovePermissionAsync(Guid fileId, int targetUserId, int requestingUserId)
        {
            var file = await _fileRepository.GetWithPermissionsAsync(fileId);
            if (file == null)
                throw new Exception("File not found");

            if (file.OwnerId != requestingUserId)
                throw new UnauthorizedAccessException("Only the owner can remove permissions");

            var permission = file.Permissions.FirstOrDefault(p => p.UserId == targetUserId);
            if (permission == null)
                throw new Exception("Permission not found");

            file.Permissions.Remove(permission);
            await _fileRepository.UpdateAsync(file);
            await _fileRepository.SaveChangesAsync();
            await _cache.RemoveByPrefixAsync($"perm:{fileId}:");
            await _cache.RemoveByPrefixAsync($"file:{fileId}:");
        }

        public async Task UpdatePermissionAsync(Guid fileId, int targetUserId, PermissionType newPermission, int requestingUserId)
        {
            var file = await _fileRepository.GetWithPermissionsAsync(fileId);
            if (file == null)
                throw new Exception("File not found");

            if (file.OwnerId != requestingUserId)
                throw new UnauthorizedAccessException("Only the owner can update permissions");

            var permission = file.Permissions.FirstOrDefault(p => p.UserId == targetUserId);
            if (permission == null)
                throw new Exception("Permission not found");

            permission.PermissionType = newPermission;
            permission.GrantedAt = DateTime.UtcNow;
            await _fileRepository.UpdateAsync(file);
            await _fileRepository.SaveChangesAsync();
            await _cache.RemoveByPrefixAsync($"perm:{fileId}:");
            await _cache.RemoveByPrefixAsync($"file:{fileId}:");
        }
    }
}
