using System;

namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Abstract base for all permission entities.
    /// Encapsulates the common permission structure shared by FilePermission and FolderPermission,
    /// enabling polymorphic permission handling.
    /// </summary>
    public abstract class PermissionBase : BaseEntity<Guid>
    {
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public PermissionType PermissionType { get; set; }
        public DateTime GrantedAt { get; set; }
        public int GrantedBy { get; set; }
    }
}
