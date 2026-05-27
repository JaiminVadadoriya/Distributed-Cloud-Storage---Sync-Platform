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
    public class FileService : IFileService
    {
        private readonly IFileMetadataRepository _fileRepository;
        private readonly IFolderRepository _folderRepository;
        private readonly IUserRepository _userRepository;
        private readonly ICacheService _cache;
        private readonly IActivityService _activityService;

        public FileService(
            IFileMetadataRepository fileRepository,
            IFolderRepository folderRepository,
            IUserRepository userRepository,
            ICacheService cache,
            IActivityService activityService)
        {
            _fileRepository = fileRepository;
            _folderRepository = folderRepository;
            _userRepository = userRepository;
            _cache = cache;
            _activityService = activityService;
        }

        public async Task<IEnumerable<FileListDto>> GetUserFilesAsync(int userId)
        {
            var files = await _fileRepository.GetUserFilesAsync(userId);

            return files
                .Where(f => f.Status == UploadStatus.Complete)
                .Select(f => f.ToListDto());
        }

        public async Task<IEnumerable<FileListDto>> GetSharedFilesAsync(int userId)
        {
            var sharedFiles = await _fileRepository.GetSharedFilesAsync(userId);

            return sharedFiles
                .Where(f => f.Status == UploadStatus.Complete)
                .Select(f => f.ToListDto(isShared: true));
        }

        public async Task<IEnumerable<FileListDto>> SearchFilesAsync(int userId, string query)
        {
            var files = await _fileRepository.SearchAsync(userId, query);

            return files.Select(f => f.ToListDto());
        }

        public async Task<FileResponseDto?> GetFileByIdAsync(Guid fileId, int requestingUserId)
        {
            var cacheKey = $"file:{fileId}:{requestingUserId}";
            var cachedResponse = await _cache.GetAsync<FileResponseDto>(cacheKey);
            if (cachedResponse != null)
            {
                return cachedResponse;
            }

            if (!await HasPermissionAsync(fileId, requestingUserId, PermissionType.Read))
                return null;

            var file = await _fileRepository.GetByIdAsync(fileId);
            if (file == null || file.IsDeleted || file.Status != UploadStatus.Complete)
                return null;

            var owner = await _userRepository.GetByIdAsync(file.OwnerId);
            var response = file.ToResponseDto(owner?.Username ?? "Unknown");

            await _cache.SetAsync(cacheKey, response, TimeSpan.FromMinutes(10));
            return response;
        }

        public async Task<IEnumerable<(string StoragePath, long Size)>> GetFileChunkPathsAsync(Guid fileId, int requestingUserId)
        {
            if (!await HasPermissionAsync(fileId, requestingUserId, PermissionType.Read))
                throw new UnauthorizedAccessException("Access denied");

            var file = await _fileRepository.GetWithChunksAsync(fileId);
            if (file == null || file.IsDeleted)
                throw new Exception("File not found");

            if (file.Status != UploadStatus.Complete)
                throw new Exception("File upload is not complete yet");

            var chunkData = file.Chunks.OrderBy(c => c.ChunkIndex).Select(c => (
                StoragePath: !string.IsNullOrEmpty(c.BlobUrl) ? c.BlobUrl : c.StoragePath,
                Size: c.Size
            )).ToList();

            // Verify local chunks exist on disk before proceeding (skips URL blob and azure protocol checks)
            foreach (var chunk in chunkData)
            {
                if (!chunk.StoragePath.StartsWith("http") &&
                    !chunk.StoragePath.StartsWith("azure://") &&
                    !System.IO.File.Exists(chunk.StoragePath))
                {
                    throw new System.IO.FileNotFoundException($"Chunk missing from storage: {System.IO.Path.GetFileName(chunk.StoragePath)}");
                }
            }

            return chunkData;
        }

        public async Task<FileResponseDto> CreateFileMetadataAsync(FileUploadDto dto, int ownerId)
        {
            var fileMetadata = new FileMetadata
            {
                Id = Guid.NewGuid(),
                FileName = dto.FileName,
                ContentType = dto.ContentType,
                Size = dto.Size,
                ChunkCount = dto.ChunkCount,
                Hash = dto.Hash,
                OwnerId = ownerId,
                CreatedAt = DateTime.UtcNow,
                LastModifiedAt = DateTime.UtcNow,
                StoragePath = string.Empty, // Will be set when chunks are uploaded
                Version = 1,
                IsDeleted = false,
                FolderId = dto.FolderId
            };

            await _fileRepository.AddAsync(fileMetadata);

            await _activityService.LogActivityAsync(ownerId, "UPLOAD", "FILE", fileMetadata.Id.ToString(), $"File '{fileMetadata.FileName}' uploaded successfully.");

            var owner = await _userRepository.GetByIdAsync(ownerId);
            return fileMetadata.ToResponseDto(owner?.Username ?? "Unknown");
        }

        public async Task DeleteFileAsync(Guid fileId, int userId)
        {
            var file = await _fileRepository.GetByIdAsync(fileId);
            if (file == null)
                throw new Exception("File not found");

            if (file.OwnerId != userId)
                throw new UnauthorizedAccessException("Only the owner can delete this file");

            file.IsDeleted = true;
            file.LastModifiedAt = DateTime.UtcNow;
            await _fileRepository.UpdateAsync(file);

            await _activityService.LogActivityAsync(userId, "DELETE", "FILE", fileId.ToString(), $"File '{file.FileName}' was deleted.");

            await _cache.RemoveByPrefixAsync($"file:{fileId}:");
            await _cache.RemoveByPrefixAsync($"stats:{userId}");
            await _cache.RemoveByPrefixAsync($"perm:{fileId}:");
        }

        public async Task GrantPermissionAsync(Guid fileId, int userId, int grantedByUserId, PermissionType permissionType)
        {
            var file = await _fileRepository.GetWithPermissionsAsync(fileId);
            if (file == null)
                throw new Exception("File not found");

            if (file.OwnerId != grantedByUserId)
                throw new UnauthorizedAccessException("Only the owner can grant permissions");

            var existingPermission = file.Permissions.FirstOrDefault(p => p.UserId == userId);
            if (existingPermission != null)
            {
                existingPermission.PermissionType = permissionType;
                existingPermission.GrantedAt = DateTime.UtcNow;
            }
            else
            {
                var permission = new FilePermission
                {
                    Id = Guid.NewGuid(),
                    FileMetadataId = fileId,
                    UserId = userId,
                    PermissionType = permissionType,
                    GrantedAt = DateTime.UtcNow,
                    GrantedBy = grantedByUserId
                };
                file.Permissions.Add(permission);
            }

            await _fileRepository.UpdateAsync(file);

            await _activityService.LogActivityAsync(grantedByUserId, "SHARE", "FILE", fileId.ToString(), $"File '{file.FileName}' shared with user ID {userId}.");

            await _cache.RemoveByPrefixAsync($"perm:{fileId}:");
            await _cache.RemoveByPrefixAsync($"file:{fileId}:");
        }

        public async Task<bool> HasPermissionAsync(Guid fileId, int userId, PermissionType minimumPermission)
        {
            var cacheKey = $"perm:{fileId}:{userId}:{minimumPermission}";
            var cachedPermission = await _cache.GetAsync<bool?>(cacheKey);

            if (cachedPermission.HasValue)
            {
                return cachedPermission.Value;
            }

            var hasPerm = await _fileRepository.HasPermissionAsync(fileId, userId, minimumPermission);
            await _cache.SetAsync(cacheKey, hasPerm, TimeSpan.FromMinutes(15));
            return hasPerm;
        }

        public async Task<DashboardStatsDto> GetDashboardStatsAsync(int userId)
        {
            var cacheKey = $"stats:{userId}";
            var cachedStats = await _cache.GetAsync<DashboardStatsDto>(cacheKey);

            if (cachedStats != null)
            {
                return cachedStats;
            }

            var files = await _fileRepository.GetUserFilesAsync(userId);
            var oneWeekAgo = DateTime.UtcNow.AddDays(-7);

            var stats = new DashboardStatsDto
            {
                TotalStorageBytes = files.Sum(f => f.Size),
                MaxStorageBytes = 10L * 1024 * 1024 * 1024, // 10 GB limit placeholder
                TotalFiles = files.Count(),
                RecentUploads = files.Count(f => f.CreatedAt >= oneWeekAgo)
            };

            await _cache.SetAsync(cacheKey, stats, TimeSpan.FromMinutes(5));
            return stats;
        }

        public async Task DeleteAllUserFilesAsync(int userId)
        {
            var files = await _fileRepository.GetUserFilesAsync(userId);
            var nonDeletedFiles = files.Where(f => !f.IsDeleted).ToList();

            foreach (var file in nonDeletedFiles)
            {
                file.IsDeleted = true;
                file.LastModifiedAt = DateTime.UtcNow;
                await _fileRepository.UpdateAsync(file);
            }
        }

        public async Task PurgeUserDriveAsync(int userId)
        {
            // 1. Mark all files as deleted
            await DeleteAllUserFilesAsync(userId);

            // 2. Delete all folders
            var folders = await _folderRepository.GetAllUserFoldersAsync(userId);
            foreach (var folder in folders)
            {
                await _folderRepository.DeleteAsync(folder);
            }

            // 3. Log Activity
            await _activityService.LogActivityAsync(userId, "PURGE_DRIVE", "DRIVE", userId.ToString(), "Complete storage reset initiated by user.");

            // 4. Clear Caches
            await _cache.RemoveByPrefixAsync($"stats:{userId}");
            await _cache.RemoveByPrefixAsync($"file-list:{userId}");
        }

        // ─── Version History ──────────────────────────────────────────────

        public async Task<IEnumerable<FileVersionDto>> GetFileVersionsAsync(Guid fileId, int userId)
        {
            if (!await HasPermissionAsync(fileId, userId, PermissionType.Read))
                throw new UnauthorizedAccessException("Access denied");

            var file = await _fileRepository.GetByIdAsync(fileId);
            if (file == null || file.IsDeleted)
                throw new Exception("File not found");

            // Collect all versions by walking the ParentVersionId chain
            var versions = new List<FileMetadata> { file };
            var current = file;
            while (current.ParentVersionId.HasValue)
            {
                var parent = await _fileRepository.GetByIdAsync(current.ParentVersionId.Value);
                if (parent == null) break;
                versions.Add(parent);
                current = parent;
            }

            var result = new List<FileVersionDto>();
            foreach (var v in versions.OrderByDescending(v => v.Version))
            {
                var owner = await _userRepository.GetByIdAsync(v.OwnerId);
                result.Add(new FileVersionDto
                {
                    Id = v.Id,
                    Version = v.Version,
                    Size = v.Size,
                    Hash = v.Hash,
                    CreatedAt = v.CreatedAt,
                    LastModifiedAt = v.LastModifiedAt,
                    ModifiedByUsername = owner?.Username ?? "Unknown"
                });
            }

            return result;
        }

        public async Task<FileResponseDto> RestoreFileVersionAsync(Guid fileId, Guid versionId, int userId)
        {
            if (!await HasPermissionAsync(fileId, userId, PermissionType.Write))
                throw new UnauthorizedAccessException("Access denied");

            var currentFile = await _fileRepository.GetByIdAsync(fileId);
            if (currentFile == null || currentFile.IsDeleted)
                throw new Exception("File not found");

            var versionFile = await _fileRepository.GetByIdAsync(versionId);
            if (versionFile == null)
                throw new Exception("Version not found");

            // Create a new version that copies from the old one
            currentFile.FileName = versionFile.FileName;
            currentFile.Size = versionFile.Size;
            currentFile.Hash = versionFile.Hash;
            currentFile.ContentType = versionFile.ContentType;
            currentFile.Version = currentFile.Version + 1;
            currentFile.ParentVersionId = versionId;
            currentFile.LastModifiedAt = DateTime.UtcNow;

            await _fileRepository.UpdateAsync(currentFile);
            await _activityService.LogActivityAsync(userId, "RESTORE", "FILE", fileId.ToString(),
                $"File '{currentFile.FileName}' restored to version {versionFile.Version}.");

            await _cache.RemoveByPrefixAsync($"file:{fileId}:");

            var owner = await _userRepository.GetByIdAsync(currentFile.OwnerId);
            return currentFile.ToResponseDto(owner?.Username ?? "Unknown");
        }

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
                var user = await _userRepository.GetByIdAsync(perm.UserId);
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
            await _cache.RemoveByPrefixAsync($"perm:{fileId}:");
            await _cache.RemoveByPrefixAsync($"file:{fileId}:");
        }
    }
}
