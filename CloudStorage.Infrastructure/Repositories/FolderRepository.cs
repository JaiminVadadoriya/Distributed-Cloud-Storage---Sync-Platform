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
    public class FolderRepository : Repository<Folder>, IFolderRepository
    {
        public FolderRepository(ApplicationDbContext context) : base(context) { }

        public async Task<Folder?> GetWithContentsAsync(Guid id)
        {
            return await _dbSet
                .Include(f => f.SubFolders)
                .Include(f => f.Files)
                .FirstOrDefaultAsync(f => f.Id == id);
        }

        public async Task<IEnumerable<Folder>> GetUserRootFoldersAsync(int userId)
        {
            return await _dbSet
                .Where(f => f.OwnerId == userId && f.ParentFolderId == null)
                .ToListAsync();
        }
    }
}
