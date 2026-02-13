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

            // Check explicit permissions
            var permission = file.Permissions.FirstOrDefault(p => p.UserId == userId);
            if (permission == null)
                return false;

            return permission.PermissionType >= minimumPermission;
        }

        public async Task<FileMetadata?> GetBySessionIdAsync(string sessionId)
        {
            return await _dbSet
                .Include(f => f.Chunks.OrderBy(c => c.ChunkIndex))
                .FirstOrDefaultAsync(f => f.UploadSessionId == sessionId);
        }

        public async Task<FileMetadata?> GetByIdWithChunksAsync(Guid id)
        {
            return await _dbSet
                .Include(f => f.Chunks.OrderBy(c => c.ChunkIndex))
                .FirstOrDefaultAsync(f => f.Id == id);
        }
    }
}
