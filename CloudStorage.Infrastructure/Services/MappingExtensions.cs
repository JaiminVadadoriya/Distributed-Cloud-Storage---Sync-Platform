using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Infrastructure.Services
{
    /// <summary>
    /// Centralized, reusable extension methods for mapping Domain Entities to DTOs.
    /// Eliminates duplicate mapping code across FileService, FolderService, and DeltaSyncService.
    /// </summary>
    public static class MappingExtensions
    {
        /// <summary>
        /// Maps a FileMetadata entity to a FileListDto (for listings).
        /// </summary>
        public static FileListDto ToListDto(this FileMetadata file, bool isShared = false)
        {
            return new FileListDto
            {
                Id = file.Id,
                FileName = file.FileName,
                ContentType = file.ContentType,
                Size = file.Size,
                CreatedAt = file.CreatedAt,
                LastModifiedAt = file.LastModifiedAt,
                IsShared = isShared,
                VersionVector = file.VersionVector,
                FolderId = file.FolderId
            };
        }

        /// <summary>
        /// Maps a FileMetadata entity to a FileResponseDto (for detail views).
        /// </summary>
        public static FileResponseDto ToResponseDto(this FileMetadata file, string ownerUsername = "Unknown")
        {
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
                OwnerUsername = ownerUsername,
                FolderId = file.FolderId
            };
        }

        /// <summary>
        /// Maps a Folder entity to a FolderDto (recursive).
        /// </summary>
        public static FolderDto ToDto(this Folder folder)
        {
            return new FolderDto
            {
                Id = folder.Id,
                Name = folder.Name,
                ParentFolderId = folder.ParentFolderId,
                CreatedAt = folder.CreatedAt,
                LastModifiedAt = folder.LastModifiedAt,
                SubFolders = folder.SubFolders?.Select(sf => sf.ToDto()).ToList() ?? new List<FolderDto>(),
                Files = folder.Files?.Select(f => f.ToListDto(f.OwnerId != folder.OwnerId)).ToList() ?? new List<FileListDto>()
            };
        }
    }
}
