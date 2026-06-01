using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;
using CloudStorage.Infrastructure.Providers;

namespace CloudStorage.Infrastructure.Services
{
    public partial class FileService : IFileService
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

            // Verify local chunks exist on disk before proceeding (skips URL blob and remote protocol checks)
            foreach (var chunk in chunkData)
            {
                if (!chunk.StoragePath.StartsWith("http") &&
                    !StoragePathResolver.IsRemoteStorage(chunk.StoragePath) &&
                    !System.IO.File.Exists(chunk.StoragePath))
                {
                    throw new System.IO.FileNotFoundException($"Chunk missing from storage: {System.IO.Path.GetFileName(chunk.StoragePath)}");
                }
            }

            return chunkData;
        }

        public async Task<FileResponseDto> CreateFileMetadataAsync(FileUploadDto dto, int ownerId)
        {
            var user = await _userRepository.GetByIdAsync(ownerId);
            if (user == null)
                throw new InvalidOperationException("User not found");

            var stats = await GetDashboardStatsAsync(ownerId);
            if (stats.TotalStorageBytes + dto.Size > user.StorageQuota)
            {
                throw new InvalidOperationException("QUOTA_EXCEEDED: Insufficient storage quota remaining.");
            }

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
            await _fileRepository.SaveChangesAsync();

            await _activityService.LogActivityAsync(ownerId, "UPLOAD", "FILE", fileMetadata.Id.ToString(), $"File '{fileMetadata.FileName}' uploaded successfully.");

            return fileMetadata.ToResponseDto(user.Username);
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
            await _fileRepository.SaveChangesAsync();

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
            await _fileRepository.SaveChangesAsync();

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

        public async Task<StorageBreakdownDto> GetStorageBreakdownAsync(int userId)
        {
            var files = await _fileRepository.GetUserFilesAsync(userId);
            
            long images = 0;
            long videos = 0;
            long documents = 0;
            long others = 0;

            foreach (var file in files)
            {
                var extension = System.IO.Path.GetExtension(file.FileName).ToLowerInvariant();
                var contentType = file.ContentType?.ToLowerInvariant() ?? string.Empty;

                if (contentType.StartsWith("image/") || 
                    extension == ".jpg" || extension == ".jpeg" || extension == ".png" || 
                    extension == ".gif" || extension == ".bmp" || extension == ".webp" || extension == ".svg")
                {
                    images += file.Size;
                }
                else if (contentType.StartsWith("video/") || 
                         extension == ".mp4" || extension == ".mkv" || extension == ".avi" || 
                         extension == ".mov" || extension == ".wmv" || extension == ".flv" || extension == ".webm")
                {
                    videos += file.Size;
                }
                else if (contentType.StartsWith("text/") || 
                         contentType == "application/pdf" ||
                         contentType == "application/msword" ||
                         contentType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                         contentType == "application/vnd.ms-excel" ||
                         contentType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                         contentType == "application/vnd.ms-powerpoint" ||
                         contentType == "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
                         extension == ".pdf" || extension == ".doc" || extension == ".docx" || 
                         extension == ".xls" || extension == ".xlsx" || extension == ".ppt" || 
                         extension == ".pptx" || extension == ".txt" || extension == ".md" || 
                         extension == ".csv" || extension == ".rtf")
                {
                    documents += file.Size;
                }
                else
                {
                    others += file.Size;
                }
            }

            return new StorageBreakdownDto
            {
                Images = images,
                Videos = videos,
                Documents = documents,
                Others = others
            };
        }

        public async Task DeleteAllUserFilesAsync(int userId)
        {
            await _fileRepository.DeleteAllUserFilesAsync(userId);
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
    }
}
