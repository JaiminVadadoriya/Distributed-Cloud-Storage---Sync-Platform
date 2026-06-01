using CloudStorage.Domain.Entities;

namespace CloudStorage.Application.DTOs
{
    public class FolderShareDto
    {
        public int UserId { get; set; }
        /// <summary>
        /// Permission level to grant: "Read" or "Write"
        /// </summary>
        public string PermissionType { get; set; } = "Read";
    }
}
