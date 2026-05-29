using System;
using System.Collections.Generic;

namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Represents a folder in the hierarchical file system.
    /// Inherits Id and CreatedAt from BaseAuditableEntity.
    /// Implements IOwnedEntity for polymorphic ownership checks.
    /// </summary>
    public class Folder : BaseAuditableEntity<Guid>, IOwnedEntity
    {
        public Folder()
        {
            SubFolders = new List<Folder>();
            Files = new List<FileMetadata>();
            Permissions = new List<FolderPermission>();
        }

        public string Name { get; set; } = string.Empty;
        public DateTime LastModifiedAt { get; set; }

        public int OwnerId { get; set; }
        public User Owner { get; set; } = null!;

        public Guid? ParentFolderId { get; set; }
        public Folder? ParentFolder { get; set; }

        public virtual ICollection<Folder> SubFolders { get; set; }
        public virtual ICollection<FileMetadata> Files { get; set; }
        public virtual ICollection<FolderPermission> Permissions { get; set; }
    }
}
