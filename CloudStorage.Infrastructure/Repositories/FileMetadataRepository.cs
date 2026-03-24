using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Infrastructure.Repositories
{
    public class FileMetadataRepository : Repository<FileMetadata>, IFileMetadataRepository
    {
        public FileMetadataRepository(ApplicationDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<FileMetadata>> GetUserFilesAsync(int userId, bool includeDeleted = false)
        {
            var query = _dbSet.Where(f => f.OwnerId == userId);

            if (!includeDeleted)
            {
                query = query.Where(f => !f.IsDeleted);
            }

            return await query
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();
        }

        public async Task<FileMetadata?> GetWithChunksAsync(Guid fileId)
        {
            return await _dbSet
                .Include(f => f.Chunks.OrderBy(c => c.ChunkIndex))
                .FirstOrDefaultAsync(f => f.Id == fileId);
        }

        public async Task<FileMetadata?> GetWithPermissionsAsync(Guid fileId)
        {
            return await _dbSet
                .Include(f => f.Permissions)
                .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(f => f.Id == fileId);
        }

        public async Task<IEnumerable<FileMetadata>> GetSharedFilesAsync(int userId)
        {
            return await _dbSet
                .Include(f => f.Permissions)
                .Where(f => f.Permissions.Any(p => p.UserId == userId) && !f.IsDeleted)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> HasPermissionAsync(Guid fileId, int userId, PermissionType minimumPermission)
        {
            var file = await _dbSet
                .Include(f => f.Permissions)
                .FirstOrDefaultAsync(f => f.Id == fileId);

            if (file == null)
                return false;

            // Owner has all permissions
            if (file.OwnerId == userId)
                return true;

            // Check explicit file-level permissions
            var filePermission = file.Permissions.FirstOrDefault(p => p.UserId == userId);
            if (filePermission != null && filePermission.PermissionType >= minimumPermission)
                return true;

            // Check inherited folder permissions (walk up the hierarchy)
            if (file.FolderId.HasValue)
            {
                return await HasFolderPermissionAsync(file.FolderId.Value, userId, minimumPermission);
            }

            return false;
        }

        private async Task<bool> HasFolderPermissionAsync(Guid folderId, int userId, PermissionType minimumPermission)
        {
            // Limit recursion depth to avoid deep traversal issues
            const int maxDepth = 10;
            Guid? currentFolderId = folderId;
            int depth = 0;

            while (currentFolderId.HasValue && depth < maxDepth)
            {
                var folder = await _context.Folders
                    .Include(f => f.Permissions)
                    .FirstOrDefaultAsync(f => f.Id == currentFolderId.Value);

                if (folder == null)
                    break;

                // Folder owner inherits all permissions
                if (folder.OwnerId == userId)
                    return true;

                // Check explicit folder-level permission
                var folderPermission = folder.Permissions?.FirstOrDefault(p => p.UserId == userId);
                if (folderPermission != null && folderPermission.PermissionType >= minimumPermission)
                    return true;

                currentFolderId = folder.ParentFolderId;
                depth++;
            }

            return false;
        }

        public async Task<FileMetadata?> GetBySessionIdAsync(string sessionId)
        {
            return await _dbSet
                .Include(f => f.Chunks.OrderBy(c => c.ChunkIndex))
                .FirstOrDefaultAsync(f => f.UploadSessionId == sessionId);
        }

        public async Task<IEnumerable<FileMetadata>> SearchAsync(int userId, string query)
        {
            return await _dbSet
                .Where(f => f.OwnerId == userId && !f.IsDeleted && 
                            EF.Functions.ILike(f.FileName, $"%{query}%"))
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync();
        }

        public async Task<FileMetadata?> GetByIdWithChunksAsync(Guid id)
        {
            return await _dbSet
                .Include(f => f.Chunks.OrderBy(c => c.ChunkIndex))
                .FirstOrDefaultAsync(f => f.Id == id);
        }
    }
}
