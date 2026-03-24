using System;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Domain.Entities
{
    public class FolderPermission
    {
        public Guid Id { get; set; }
        public Guid FolderId { get; set; }
        public Folder Folder { get; set; } = null!;
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public PermissionType PermissionType { get; set; }
        public DateTime GrantedAt { get; set; }
        public int GrantedBy { get; set; }
    }
}
