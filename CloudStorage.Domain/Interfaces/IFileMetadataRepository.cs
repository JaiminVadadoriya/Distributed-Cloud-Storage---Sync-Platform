using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Domain.Interfaces
{
    public interface IFileMetadataRepository : IRepository<FileMetadata>
    {
        Task<FileMetadata?> GetBySessionIdAsync(string sessionId);
        Task<FileMetadata?> GetByIdWithChunksAsync(Guid id);
        Task<IEnumerable<FileMetadata>> GetUserFilesAsync(int userId, bool includeDeleted = false);
        Task<FileMetadata?> GetWithChunksAsync(Guid fileId);
        Task<FileMetadata?> GetWithPermissionsAsync(Guid fileId);
        Task<IEnumerable<FileMetadata>> GetSharedFilesAsync(int userId);
        Task<IEnumerable<FileMetadata>> SearchAsync(int userId, string query);
        Task<bool> HasPermissionAsync(Guid fileId, int userId, PermissionType minimumPermission);
        Task DeleteAllUserFilesAsync(int userId);
        Task<IEnumerable<FileMetadata>> GetVersionChainAsync(Guid fileId);
    }
}
