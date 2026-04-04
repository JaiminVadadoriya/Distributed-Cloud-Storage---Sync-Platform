using System;

namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Represents a permission grant on a specific file.
    /// Inherits common permission fields from PermissionBase (polymorphism).
    /// </summary>
    public class FilePermission : PermissionBase
    {
        public Guid FileMetadataId { get; set; }
        public FileMetadata FileMetadata { get; set; } = null!;
    }
}
