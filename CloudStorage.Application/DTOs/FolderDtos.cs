using System;
using System.Collections.Generic;

namespace CloudStorage.Application.DTOs
{
    public class FolderDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public Guid? ParentFolderId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastModifiedAt { get; set; }
        public ICollection<FolderDto> SubFolders { get; set; } = new List<FolderDto>();
        public ICollection<FileListDto> Files { get; set; } = new List<FileListDto>();
    }

    public class CreateFolderDto
    {
        public string Name { get; set; } = string.Empty;
        public Guid? ParentFolderId { get; set; }
    }

    public class RenameFolderDto
    {
        public string NewName { get; set; } = string.Empty;
    }

    public class MoveFolderDto
    {
        public Guid? NewParentFolderId { get; set; }
    }
}
