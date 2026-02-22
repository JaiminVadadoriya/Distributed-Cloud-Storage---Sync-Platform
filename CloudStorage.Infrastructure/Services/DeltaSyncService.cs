using System;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Infrastructure.Services
{
    public class DeltaSyncService : IDeltaSyncService
    {
        private readonly ApplicationDbContext _context;

        public DeltaSyncService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<DeltaSyncResponseDto> GetChangesSinceAsync(int userId, DateTime sinceUtc)
        {
            // Get files created or modified since `sinceUtc` that are NOT deleted
            var changedFiles = await _context.FileMetadata
                .AsNoTracking()
                .Where(f => f.OwnerId == userId && !f.IsDeleted && f.LastModifiedAt > sinceUtc && f.Status == Domain.Entities.UploadStatus.Complete)
                .Select(f => new FileListDto
                {
                    Id = f.Id,
                    FileName = f.FileName,
                    Size = f.Size,
                    CreatedAt = f.CreatedAt,
                    IsShared = false // Modify if sharing logic is updated
                })
                .ToListAsync();

            // Find file deletions/changes using SyncEvents or checking IsDeleted
            // Assuming IsDeleted=true represents a deleted file
            var deletedFileIds = await _context.FileMetadata
                .AsNoTracking()
                .Where(f => f.OwnerId == userId && f.IsDeleted && f.LastModifiedAt > sinceUtc)
                .Select(f => f.Id)
                .ToListAsync();

            return new DeltaSyncResponseDto
            {
                ServerTimestampUtc = DateTime.UtcNow,
                ChangedFiles = changedFiles,
                DeletedFileIds = deletedFileIds
            };
        }
    }
}
