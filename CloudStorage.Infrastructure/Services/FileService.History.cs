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
        // ─── Version History ──────────────────────────────────────────────

        public async Task<IEnumerable<FileVersionDto>> GetFileVersionsAsync(Guid fileId, int userId)
        {
            if (!await HasPermissionAsync(fileId, userId, PermissionType.Read))
                throw new UnauthorizedAccessException("Access denied");

            var file = await _fileRepository.GetByIdAsync(fileId);
            if (file == null || file.IsDeleted)
                throw new Exception("File not found");

            // Fetch the entire version chain in a single recursive CTE query
            var versions = await _fileRepository.GetVersionChainAsync(fileId);

            // Fetch owner usernames in a single query
            var ownerIds = versions.Select(v => v.OwnerId).Distinct().ToList();
            var ownersList = await _userRepository.FindAsync(u => ownerIds.Contains(u.Id));
            var ownersDict = ownersList.ToDictionary(u => u.Id, u => u.Username);

            var result = new List<FileVersionDto>();
            foreach (var v in versions.OrderByDescending(v => v.Version))
            {
                ownersDict.TryGetValue(v.OwnerId, out var username);
                result.Add(new FileVersionDto
                {
                    Id = v.Id,
                    Version = v.Version,
                    Size = v.Size,
                    Hash = v.Hash,
                    CreatedAt = v.CreatedAt,
                    LastModifiedAt = v.LastModifiedAt,
                    ModifiedByUsername = username ?? "Unknown"
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
            await _fileRepository.SaveChangesAsync();
            await _activityService.LogActivityAsync(userId, "RESTORE", "FILE", fileId.ToString(),
                $"File '{currentFile.FileName}' restored to version {versionFile.Version}.");

            await _cache.RemoveByPrefixAsync($"file:{fileId}:");

            var owner = await _userRepository.GetByIdAsync(currentFile.OwnerId);
            return currentFile.ToResponseDto(owner?.Username ?? "Unknown");
        }
    }
}
