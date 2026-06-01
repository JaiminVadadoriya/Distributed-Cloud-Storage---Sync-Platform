using System;
using System.Collections.Generic;
using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Enums;
using Xunit;

namespace CloudStorage.Application.Tests.Services
{
    public partial class ApplicationModelTests
    {
        [Fact]
        public void Dtos_ShouldInitializeCorrectly_Part2()
        {
            var now = DateTime.UtcNow;
            var fileId = Guid.NewGuid();
            var folderId = Guid.NewGuid();
            var fileList = new FileListDto
            {
                Id = fileId,
                FileName = "file.txt",
                ContentType = "text/plain",
                Size = 100,
                CreatedAt = now,
                LastModifiedAt = now,
                IsShared = true,
                VersionVector = "v3",
                FolderId = folderId
            };

            // 18. BlobChunkVerificationResultDto
#pragma warning disable CS0618
            var blobChunkVer = new BlobChunkVerificationResultDto
            {
                IsValid = true,
                MissingChunkIndices = new int[] { 4 }
            };
            Assert.True(blobChunkVer.IsValid);
#pragma warning restore CS0618

            // 19. ConflictCheckRequestDto
            var conflictReq = new ConflictCheckRequestDto
            {
                FileId = fileId,
                ClientVersionVector = "v1",
                ClientLastModifiedAt = now
            };
            Assert.Equal(fileId, conflictReq.FileId);
            Assert.Equal("v1", conflictReq.ClientVersionVector);
            Assert.Equal(now, conflictReq.ClientLastModifiedAt);

            // 20. ConflictCheckResponseDto
            var conflictResp = new ConflictCheckResponseDto
            {
                HasConflict = true,
                ServerVersionVector = "v2",
                ServerLastModifiedAt = now,
                ServerFileName = "file.txt",
                ServerSize = 500,
                ServerVersion = 3
            };
            Assert.True(conflictResp.HasConflict);
            Assert.Equal("v2", conflictResp.ServerVersionVector);
            Assert.Equal(now, conflictResp.ServerLastModifiedAt);
            Assert.Equal("file.txt", conflictResp.ServerFileName);
            Assert.Equal(500, conflictResp.ServerSize);
            Assert.Equal(3, conflictResp.ServerVersion);

            // 21. ConflictResolutionDto
            var resolutionDto = new ConflictResolutionDto
            {
                FileId = fileId,
                Resolution = ConflictResolution.ConflictCopy,
                ClientVersionVector = "v1"
            };
            Assert.Equal(fileId, resolutionDto.FileId);
            Assert.Equal(ConflictResolution.ConflictCopy, resolutionDto.Resolution);
            Assert.Equal("v1", resolutionDto.ClientVersionVector);

            // 22. DeltaSyncRequestDto
            var deltaSyncReq = new DeltaSyncRequestDto { SinceUtc = now };
            Assert.Equal(now, deltaSyncReq.SinceUtc);

            // 23. DeltaSyncResponseDto & FileListDto
            var deltaSyncResp = new DeltaSyncResponseDto
            {
                ServerTimestampUtc = now,
                ChangedFiles = new List<FileListDto> { fileList },
                DeletedFileIds = new List<Guid> { fileId }
            };
            Assert.Equal(now, deltaSyncResp.ServerTimestampUtc);
            Assert.Equal(new List<FileListDto> { fileList }, deltaSyncResp.ChangedFiles);
            Assert.Equal(new List<Guid> { fileId }, deltaSyncResp.DeletedFileIds);

            // 24. DeviceDto & RegisterDeviceDto & UpdateDeviceSyncDto
            var device = new DeviceDto
            {
                Id = fileId,
                DeviceName = "My PC",
                DeviceType = "desktop",
                LastSyncAt = now,
                CreatedAt = now
            };
            Assert.Equal(fileId, device.Id);
            Assert.Equal("My PC", device.DeviceName);
            Assert.Equal("desktop", device.DeviceType);
            Assert.Equal(now, device.LastSyncAt);
            Assert.Equal(now, device.CreatedAt);

            var registerDevice = new RegisterDeviceDto
            {
                DeviceName = "Phone",
                DeviceType = "mobile"
            };
            Assert.Equal("Phone", registerDevice.DeviceName);
            Assert.Equal("mobile", registerDevice.DeviceType);

            var updateDeviceSync = new UpdateDeviceSyncDto { DeviceId = fileId };
            Assert.Equal(fileId, updateDeviceSync.DeviceId);

            // 25. FileResponseDto
            var fileResp = new FileResponseDto
            {
                Id = fileId,
                FileName = "test.txt",
                ContentType = "text/plain",
                Size = 200,
                Version = 1,
                ChunkCount = 2,
                CreatedAt = now,
                LastModifiedAt = now,
                OwnerId = 10,
                OwnerUsername = "john",
                FolderId = folderId
            };
            Assert.Equal(fileId, fileResp.Id);
            Assert.Equal("test.txt", fileResp.FileName);
            Assert.Equal("text/plain", fileResp.ContentType);
            Assert.Equal(200, fileResp.Size);
            Assert.Equal(1, fileResp.Version);
            Assert.Equal(2, fileResp.ChunkCount);
            Assert.Equal(now, fileResp.CreatedAt);
            Assert.Equal(now, fileResp.LastModifiedAt);
            Assert.Equal(10, fileResp.OwnerId);
            Assert.Equal("john", fileResp.OwnerUsername);
            Assert.Equal(folderId, fileResp.FolderId);

            // 26. FileUploadDto
            var fileUpload = new FileUploadDto
            {
                FileName = "upload.jpg",
                ContentType = "image/jpeg",
                Size = 1000,
                ChunkCount = 4,
                Hash = "hash123",
                FolderId = folderId
            };
            Assert.Equal("upload.jpg", fileUpload.FileName);
            Assert.Equal("image/jpeg", fileUpload.ContentType);
            Assert.Equal(1000, fileUpload.Size);
            Assert.Equal(4, fileUpload.ChunkCount);
            Assert.Equal("hash123", fileUpload.Hash);
            Assert.Equal(folderId, fileUpload.FolderId);

            // 27. FilePermissionDto
            var filePermission = new FilePermissionDto
            {
                UserId = 5,
                PermissionType = "Write"
            };
            Assert.Equal(5, filePermission.UserId);
            Assert.Equal("Write", filePermission.PermissionType);

            // 28. DashboardStatsDto
            var dashboardStats = new DashboardStatsDto
            {
                TotalStorageBytes = 5000,
                MaxStorageBytes = 10000,
                TotalFiles = 15,
                RecentUploads = 3
            };
            Assert.Equal(5000, dashboardStats.TotalStorageBytes);
            Assert.Equal(10000, dashboardStats.MaxStorageBytes);
            Assert.Equal(15, dashboardStats.TotalFiles);
            Assert.Equal(3, dashboardStats.RecentUploads);

            // 29. FileVersionDto
            var fileVersion = new FileVersionDto
            {
                Id = fileId,
                Version = 2,
                Size = 500,
                Hash = "hash",
                CreatedAt = now,
                LastModifiedAt = now,
                ModifiedByUsername = "user"
            };
            Assert.Equal(fileId, fileVersion.Id);
            Assert.Equal(2, fileVersion.Version);
            Assert.Equal(500, fileVersion.Size);
            Assert.Equal("hash", fileVersion.Hash);
            Assert.Equal(now, fileVersion.CreatedAt);
            Assert.Equal(now, fileVersion.LastModifiedAt);
            Assert.Equal("user", fileVersion.ModifiedByUsername);

            // 29b. FileEventDto
            var fileEvent = new FileEventDto
            {
                FileId = fileId,
                FileName = "test.txt",
                Size = 1024,
                EventType = "Created",
                Timestamp = now,
                OwnerId = 1
            };
            Assert.Equal(fileId, fileEvent.FileId);
            Assert.Equal("test.txt", fileEvent.FileName);
            Assert.Equal(1024, fileEvent.Size);
            Assert.Equal("Created", fileEvent.EventType);
            Assert.Equal(now, fileEvent.Timestamp);
            Assert.Equal(1, fileEvent.OwnerId);

            // 30. FileRenameDto & FileMoveDto & BulkDeleteDto & BulkMoveDto & BulkShareDto & FilePermissionListDto
            var rename = new FileRenameDto { NewName = "new" };
            Assert.Equal("new", rename.NewName);

            var move = new FileMoveDto { TargetFolderId = folderId };
            Assert.Equal(folderId, move.TargetFolderId);

            var bulkDel = new BulkDeleteDto { FileIds = new List<Guid> { fileId } };
            Assert.Equal(new List<Guid> { fileId }, bulkDel.FileIds);

            var bulkMove = new BulkMoveDto { FileIds = new List<Guid> { fileId }, TargetFolderId = folderId };
            Assert.Equal(new List<Guid> { fileId }, bulkMove.FileIds);
            Assert.Equal(folderId, bulkMove.TargetFolderId);

            var bulkShare = new BulkShareDto { FileIds = new List<Guid> { fileId }, UserId = 10, PermissionType = "Write" };
            Assert.Equal(new List<Guid> { fileId }, bulkShare.FileIds);
            Assert.Equal(10, bulkShare.UserId);
            Assert.Equal("Write", bulkShare.PermissionType);

            var permList = new FilePermissionListDto
            {
                UserId = 5,
                Username = "u",
                Email = "e",
                PermissionType = "Read",
                GrantedAt = now
            };
            Assert.Equal(5, permList.UserId);
            Assert.Equal("u", permList.Username);
            Assert.Equal("e", permList.Email);
            Assert.Equal("Read", permList.PermissionType);
            Assert.Equal(now, permList.GrantedAt);

            // 31. UploadAnalyticsDto & StorageBreakdownDto
            var analytics = new UploadAnalyticsDto
            {
                TotalUploads = 10,
                SuccessRate = 0.9,
                AvgSpeedBps = 1000,
                TotalRetries = 2,
                FailedCount = 1
            };
            Assert.Equal(10, analytics.TotalUploads);
            Assert.Equal(0.9, analytics.SuccessRate);
            Assert.Equal(1000, analytics.AvgSpeedBps);
            Assert.Equal(2, analytics.TotalRetries);
            Assert.Equal(1, analytics.FailedCount);

            var breakdown = new StorageBreakdownDto
            {
                Images = 10,
                Videos = 20,
                Documents = 30,
                Others = 40
            };
            Assert.Equal(10, breakdown.Images);
            Assert.Equal(20, breakdown.Videos);
            Assert.Equal(30, breakdown.Documents);
            Assert.Equal(40, breakdown.Others);

            // 32. FolderDto & CreateFolderDto & RenameFolderDto & MoveFolderDto & FolderShareDto
            var folderDto = new FolderDto
            {
                Id = folderId,
                Name = "folder",
                ParentFolderId = fileId,
                CreatedAt = now,
                LastModifiedAt = now,
                SubFolders = new List<FolderDto>(),
                Files = new List<FileListDto> { fileList }
            };
            Assert.Equal(folderId, folderDto.Id);
            Assert.Equal("folder", folderDto.Name);
            Assert.Equal(fileId, folderDto.ParentFolderId);
            Assert.Equal(now, folderDto.CreatedAt);
            Assert.Equal(now, folderDto.LastModifiedAt);
            Assert.Empty(folderDto.SubFolders);
            Assert.Equal(new List<FileListDto> { fileList }, folderDto.Files);

            var createFolder = new CreateFolderDto { Name = "new", ParentFolderId = folderId };
            Assert.Equal("new", createFolder.Name);
            Assert.Equal(folderId, createFolder.ParentFolderId);

            var renameFolder = new RenameFolderDto { NewName = "newname" };
            Assert.Equal("newname", renameFolder.NewName);

            var moveFolder = new MoveFolderDto { NewParentFolderId = folderId };
            Assert.Equal(folderId, moveFolder.NewParentFolderId);

            var folderShare = new FolderShareDto { UserId = 2, PermissionType = "Write" };
            Assert.Equal(2, folderShare.UserId);
            Assert.Equal("Write", folderShare.PermissionType);

            // 33. NotificationDto
            var notif = new NotificationDto
            {
                Id = fileId,
                Type = "Alert",
                Title = "Alert Title",
                Message = "Message details",
                IsRead = true,
                RelatedEntityId = folderId,
                CreatedAt = now
            };
            Assert.Equal(fileId, notif.Id);
            Assert.Equal("Alert", notif.Type);
            Assert.Equal("Alert Title", notif.Title);
            Assert.Equal("Message details", notif.Message);
            Assert.True(notif.IsRead);
            Assert.Equal(folderId, notif.RelatedEntityId);
            Assert.Equal(now, notif.CreatedAt);

            // 34. RegisterDto & UserDto & LoginDto & LoginResponseDto & RefreshTokenDto & PasswordResetRequestDto & PasswordResetDto & UpdateProfileDto & ChangePasswordDto & UserSearchResultDto
            var register = new RegisterDto { Username = "u", Email = "e", Password = "p" };
            Assert.Equal("u", register.Username);
            Assert.Equal("e", register.Email);
            Assert.Equal("p", register.Password);

            var user = new UserDto { Id = "1", Username = "u", Email = "e", Role = "User" };
            Assert.Equal("1", user.Id);
            Assert.Equal("u", user.Username);
            Assert.Equal("e", user.Email);
            Assert.Equal("User", user.Role);

            var login = new LoginDto { Identifier = "u", Password = "p" };
            Assert.Equal("u", login.Identifier);
            Assert.Equal("p", login.Password);

            var loginResp = new LoginResponseDto
            {
                AccessToken = "at",
                RefreshToken = "rt",
                ExpiresIn = 3600,
                TokenType = "Bearer",
                User = user
            };
            Assert.Equal("at", loginResp.AccessToken);
            Assert.Equal("rt", loginResp.RefreshToken);
            Assert.Equal(3600, loginResp.ExpiresIn);
            Assert.Equal("Bearer", loginResp.TokenType);
            Assert.Same(user, loginResp.User);

            var refresh = new RefreshTokenDto { RefreshToken = "rt" };
            Assert.Equal("rt", refresh.RefreshToken);

            var resetReq = new PasswordResetRequestDto { Email = "e" };
            Assert.Equal("e", resetReq.Email);

            var reset = new PasswordResetDto { Token = "t", NewPassword = "np" };
            Assert.Equal("t", reset.Token);
            Assert.Equal("np", reset.NewPassword);

            var profile = new UpdateProfileDto { Username = "u", Email = "e" };
            Assert.Equal("u", profile.Username);
            Assert.Equal("e", profile.Email);

            var changePass = new ChangePasswordDto { CurrentPassword = "cp", NewPassword = "np" };
            Assert.Equal("cp", changePass.CurrentPassword);
            Assert.Equal("np", changePass.NewPassword);

            var userSearch = new UserSearchResultDto { Id = 1, Username = "u", Email = "e", Role = "User" };
            Assert.Equal(1, userSearch.Id);
            Assert.Equal("u", userSearch.Username);
            Assert.Equal("e", userSearch.Email);
            Assert.Equal("User", userSearch.Role);
        }
    }
}
