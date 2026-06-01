namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Defines the level of access a user has on a file or folder.
    /// Values are ordered by privilege — Owner > Write > Read — enabling
    /// "minimum permission" checks via numeric comparison.
    /// </summary>
    public enum PermissionType
    {
        /// <summary>Can view and download the file/folder.</summary>
        Read = 0,

        /// <summary>Can view, download, rename, and modify the file/folder.</summary>
        Write = 1,

        /// <summary>Full control — includes deletion, sharing, and permission management.</summary>
        Owner = 2
    }
}
