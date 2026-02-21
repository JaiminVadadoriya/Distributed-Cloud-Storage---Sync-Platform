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
        private readonly IUserRepository _userRepository;

        public FileService(IFileMetadataRepository fileRepository, IUserRepository userRepository)
        {
            _fileRepository = fileRepository;
            _userRepository = userRepository;
        }

        public async Task<IEnumerable<FileListDto>> GetUserFilesAsync(int userId)
        {
            var files = await _fileRepository.GetUserFilesAsync(userId);
            var sharedFiles = await _fileRepository.GetSharedFilesAsync(userId);

            var allFiles = files.Concat(sharedFiles)
                .DistinctBy(f => f.Id)
                .Where(f => f.Status == UploadStatus.Complete);  // Only show fully uploaded files

            return allFiles.Select(f => new FileListDto
            {
                Id = f.Id,
                FileName = f.FileName,
                Size = f.Size,
                CreatedAt = f.CreatedAt,
                IsShared = f.OwnerId != userId
            });
        }

        public async Task<FileResponseDto?> GetFileByIdAsync(Guid fileId, int requestingUserId)
        {
            if (!await HasPermissionAsync(fileId, requestingUserId, PermissionType.Read))
                return null;

            var file = await _fileRepository.GetByIdAsync(fileId);
            if (file == null || file.IsDeleted || file.Status != UploadStatus.Complete)
                return null;

            var owner = await _userRepository.GetByIdAsync(file.OwnerId);

            return new FileResponseDto
            {
                Id = file.Id,
                FileName = file.FileName,
                ContentType = file.ContentType,
                Size = file.Size,
                Version = file.Version,
                ChunkCount = file.ChunkCount,
                CreatedAt = file.CreatedAt,
                LastModifiedAt = file.LastModifiedAt,
                OwnerId = file.OwnerId,
                OwnerUsername = owner?.Username ?? "Unknown"
            };
        }

        public async Task<IEnumerable<string>> GetFileChunkPathsAsync(Guid fileId, int requestingUserId)
        {
            if (!await HasPermissionAsync(fileId, requestingUserId, PermissionType.Read))
                throw new UnauthorizedAccessException("Access denied");

            var file = await _fileRepository.GetWithChunksAsync(fileId);
            if (file == null || file.IsDeleted)
                throw new Exception("File not found");

            if (file.Status != UploadStatus.Complete)
                throw new Exception("File upload is not complete yet");

            var chunkPaths = file.Chunks.OrderBy(c => c.ChunkIndex).Select(c => c.StoragePath).ToList();

            // Verify all chunks exist on disk before proceeding
            foreach (var path in chunkPaths)
            {
                if (!System.IO.File.Exists(path))
                    throw new System.IO.FileNotFoundException($"Chunk missing from storage: {System.IO.Path.GetFileName(path)}");
            }

            return chunkPaths;
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
                IsDeleted = false
            };

            await _fileRepository.AddAsync(fileMetadata);

            var owner = await _userRepository.GetByIdAsync(ownerId);

            return new FileResponseDto
            {
                Id = fileMetadata.Id,
                FileName = fileMetadata.FileName,
                ContentType = fileMetadata.ContentType,
                Size = fileMetadata.Size,
                Version = fileMetadata.Version,
                ChunkCount = fileMetadata.ChunkCount,
                CreatedAt = fileMetadata.CreatedAt,
                LastModifiedAt = fileMetadata.LastModifiedAt,
                OwnerId = fileMetadata.OwnerId,
                OwnerUsername = owner?.Username ?? "Unknown"
            };
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
        }

        public async Task<bool> HasPermissionAsync(Guid fileId, int userId, PermissionType minimumPermission)
        {
            return await _fileRepository.HasPermissionAsync(fileId, userId, minimumPermission);
        }

        public async Task<DashboardStatsDto> GetDashboardStatsAsync(int userId)
        {
            var files = await _fileRepository.GetUserFilesAsync(userId);
            var oneWeekAgo = DateTime.UtcNow.AddDays(-7);
            
            return new DashboardStatsDto
            {
                TotalStorageBytes = files.Sum(f => f.Size),
                MaxStorageBytes = 10L * 1024 * 1024 * 1024, // 10 GB limit placeholder
                TotalFiles = files.Count(),
                RecentUploads = files.Count(f => f.CreatedAt >= oneWeekAgo)
            };
        }
    }
}
