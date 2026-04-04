using System;

namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Represents a permission grant on a specific folder.
    /// Inherits common permission fields from PermissionBase (polymorphism).
    /// </summary>
    public class FolderPermission : PermissionBase
    {
        public Guid FolderId { get; set; }
        public Folder Folder { get; set; } = null!;
    }
}
