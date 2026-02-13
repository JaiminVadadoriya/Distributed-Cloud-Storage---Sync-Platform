using System;

namespace CloudStorage.Domain.Entities
{
    public enum PermissionType
    {
        Read = 0,
        Write = 1,
        Owner = 2
    }

    public class FilePermission
    {
        public Guid Id { get; set; }
        public Guid FileMetadataId { get; set; }
        public FileMetadata FileMetadata { get; set; } = null!;
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public PermissionType PermissionType { get; set; }
        public DateTime GrantedAt { get; set; }
        public int GrantedBy { get; set; }
    }
}
