using System;
using System.Collections.Generic;

namespace CloudStorage.Domain.Entities
{
    public class Folder
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime LastModifiedAt { get; set; }
        
        public int OwnerId { get; set; }
        public User Owner { get; set; } = null!;

        public Guid? ParentFolderId { get; set; }
        public Folder? ParentFolder { get; set; }

        public ICollection<Folder> SubFolders { get; set; } = new List<Folder>();
        public ICollection<FileMetadata> Files { get; set; } = new List<FileMetadata>();
        public ICollection<FolderPermission> Permissions { get; set; } = new List<FolderPermission>();
    }
}
