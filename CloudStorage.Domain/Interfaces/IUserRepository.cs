using System.Threading.Tasks;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Domain.Interfaces
{
    public interface IUserRepository : IRepository<User>
    {
        Task<User?> GetByUsernameAsync(string username);
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetWithDevicesAsync(int userId);
        Task<User?> GetWithRefreshTokensAsync(int userId);
    }
}
