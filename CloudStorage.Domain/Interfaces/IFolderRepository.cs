using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Domain.Interfaces
{
    public interface IFolderRepository : IRepository<Folder>
    {
        Task<Folder?> GetWithContentsAsync(Guid id);
        Task<IEnumerable<Folder>> GetUserRootFoldersAsync(int userId);
        Task<IEnumerable<Folder>> GetAllUserFoldersAsync(int userId);
    }
}
