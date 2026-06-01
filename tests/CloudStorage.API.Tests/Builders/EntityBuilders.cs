using CloudStorage.Domain.Entities;
using System;
using System.Collections.Generic;

namespace CloudStorage.Tests.Builders
{
    /// <summary>
    /// Fluent builder for creating test User entities with sensible defaults.
    /// </summary>
    public class UserBuilder
    {
        private int _id = 0; // Default to 0 for EF Core to handle identity
        private string _username = "testuser";
        private string _email = "test@example.com";
        private string _passwordHash = BCrypt.Net.BCrypt.HashPassword("Password123!");
        private string _role = "User";
        private bool _emailVerified = true;
        private DateTime? _lastLoginAt = DateTime.UtcNow.AddDays(-1);
        private bool _isActive = true;

        public UserBuilder WithId(int id)
        {
            _id = id;
            return this;
        }

        public UserBuilder WithUsername(string username)
        {
            _username = username;
            return this;
        }

        public UserBuilder WithEmail(string email)
        {
            _email = email;
            return this;
        }

        public UserBuilder WithPasswordHash(string passwordHash)
        {
            _passwordHash = passwordHash;
            return this;
        }

        public UserBuilder WithPassword(string clearTextPassword)
        {
            _passwordHash = BCrypt.Net.BCrypt.HashPassword(clearTextPassword);
            return this;
        }

        public UserBuilder WithRole(string role)
        {
            _role = role;
            return this;
        }

        public UserBuilder Admin()
        {
            _role = "Admin";
            return this;
        }

        public UserBuilder WithEmailVerified(bool verified)
        {
            _emailVerified = verified;
            return this;
        }

        public UserBuilder WithLastLoginAt(DateTime? lastLogin)
        {
            _lastLoginAt = lastLogin;
            return this;
        }

        public UserBuilder Inactive()
        {
            _isActive = false;
            return this;
        }

        public User Build()
        {
            return new User
            {
                Id = _id,
                Username = _username,
                Email = _email,
                PasswordHash = _passwordHash,
                Role = _role,
                EmailVerified = _emailVerified,
                LastLoginAt = _lastLoginAt,
                IsActive = _isActive,
                CreatedAt = DateTime.UtcNow,
                RefreshTokens = new List<RefreshToken>(),
                Devices = new List<Device>(),
                FilePermissions = new List<FilePermission>(),
                Notifications = new List<Notification>()
            };
        }
    }

    /// <summary>
    /// Fluent builder for creating test FileMetadata entities.
    /// </summary>
    public class FileMetadataBuilder
    {
        private Guid _id = Guid.NewGuid();
        private string _fileName = "testfile.txt";
        private string _contentType = "text/plain";
        private long _size = 1024;
        private int _version = 1;
        private int _chunkCount = 1;
        private string _hash = "abc123def456";
        private int _ownerId = 1;
        private Guid? _folderId;
        private bool _isDeleted = false;
        private UploadStatus _status = UploadStatus.Complete;
        private int _uploadedChunks = 1;
        private string _uploadSessionId = Guid.NewGuid().ToString();
        private string? _versionVector;

        public FileMetadataBuilder WithId(Guid id)
        {
            _id = id;
            return this;
        }

        public FileMetadataBuilder WithFileName(string fileName)
        {
            _fileName = fileName;
            return this;
        }

        public FileMetadataBuilder WithContentType(string contentType)
        {
            _contentType = contentType;
            return this;
        }

        public FileMetadataBuilder WithSize(long size)
        {
            _size = size;
            return this;
        }

        public FileMetadataBuilder WithVersion(int version)
        {
            _version = version;
            return this;
        }

        public FileMetadataBuilder WithChunkCount(int chunkCount)
        {
            _chunkCount = chunkCount;
            _uploadedChunks = chunkCount;
            return this;
        }

        public FileMetadataBuilder WithHash(string hash)
        {
            _hash = hash;
            return this;
        }

        public FileMetadataBuilder WithOwnerId(int ownerId)
        {
            _ownerId = ownerId;
            return this;
        }

        public FileMetadataBuilder WithFolderId(Guid? folderId)
        {
            _folderId = folderId;
            return this;
        }

        public FileMetadataBuilder Deleted()
        {
            _isDeleted = true;
            return this;
        }

        public FileMetadataBuilder WithStatus(UploadStatus status)
        {
            _status = status;
            _uploadedChunks = status == UploadStatus.Complete ? _chunkCount : 0;
            return this;
        }

        public FileMetadataBuilder WithVersionVector(string? versionVector)
        {
            _versionVector = versionVector;
            return this;
        }

        public FileMetadata Build()
        {
            return new FileMetadata
            {
                Id = _id,
                FileName = _fileName,
                ContentType = _contentType,
                Size = _size,
                Version = _version,
                ChunkCount = _chunkCount,
                Hash = _hash,
                OwnerId = _ownerId,
                FolderId = _folderId,
                IsDeleted = _isDeleted,
                Status = _status,
                UploadedChunks = _uploadedChunks,
                UploadSessionId = _uploadSessionId,
                StoragePath = $"/storage/{_ownerId}/{_id}.bin",
                VersionVector = _versionVector,
                CreatedAt = DateTime.UtcNow,
                LastModifiedAt = DateTime.UtcNow,
                LastSyncedAt = _status == UploadStatus.Complete ? DateTime.UtcNow : null,
                Chunks = new List<FileChunk>(),
                Permissions = new List<FilePermission>(),
                SyncEvents = new List<SyncEvent>()
            };
        }
    }

    /// <summary>
    /// Fluent builder for creating test Folder entities.
    /// </summary>
    public class FolderBuilder
    {
        private Guid _id = Guid.NewGuid();
        private string _name = "TestFolder";
        private int _ownerId = 1;
        private Guid? _parentFolderId;

        public FolderBuilder WithId(Guid id)
        {
            _id = id;
            return this;
        }

        public FolderBuilder WithName(string name)
        {
            _name = name;
            return this;
        }

        public FolderBuilder WithOwnerId(int ownerId)
        {
            _ownerId = ownerId;
            return this;
        }

        public FolderBuilder WithParentFolderId(Guid? parentFolderId)
        {
            _parentFolderId = parentFolderId;
            return this;
        }

        public Folder Build()
        {
            return new Folder
            {
                Id = _id,
                Name = _name,
                OwnerId = _ownerId,
                ParentFolderId = _parentFolderId,
                CreatedAt = DateTime.UtcNow,
                LastModifiedAt = DateTime.UtcNow,
                SubFolders = new List<Folder>(),
                Files = new List<FileMetadata>(),
                Permissions = new List<FolderPermission>()
            };
        }
    }

    /// <summary>
    /// Fluent builder for creating test Device entities.
    /// </summary>
    public class DeviceBuilder
    {
        private Guid _id = Guid.NewGuid();
        private int _userId = 1;
        private string _deviceName = "TestDevice";
        private string _deviceType = "Desktop";
        private DateTime? _lastSyncAt = DateTime.UtcNow.AddHours(-1);

        public DeviceBuilder WithId(Guid id)
        {
            _id = id;
            return this;
        }

        public DeviceBuilder WithUserId(int userId)
        {
            _userId = userId;
            return this;
        }

        public DeviceBuilder WithDeviceName(string deviceName)
        {
            _deviceName = deviceName;
            return this;
        }

        public DeviceBuilder WithDeviceType(string deviceType)
        {
            _deviceType = deviceType;
            return this;
        }

        public DeviceBuilder WithLastSyncAt(DateTime? lastSyncAt)
        {
            _lastSyncAt = lastSyncAt;
            return this;
        }

        public Device Build()
        {
            return new Device
            {
                Id = _id,
                UserId = _userId,
                DeviceName = _deviceName,
                DeviceType = _deviceType,
                LastSyncAt = _lastSyncAt,
                CreatedAt = DateTime.UtcNow
            };
        }
    }
}
