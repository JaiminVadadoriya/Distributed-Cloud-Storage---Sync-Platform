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
        public void Dtos_ShouldInitializeCorrectly()
        {
            var now = DateTime.UtcNow;
            var fileId = Guid.NewGuid();
            var folderId = Guid.NewGuid();

            // 1. AdminDashboardStatsDto & RegionalNodeDto
            var regionalNode = new RegionalNodeDto
            {
                Id = "node-1",
                X = 1.2,
                Y = 3.4,
                Intensity = 0.8,
                RegionName = "US East"
            };
            Assert.Equal("node-1", regionalNode.Id);
            Assert.Equal(1.2, regionalNode.X);
            Assert.Equal(3.4, regionalNode.Y);
            Assert.Equal(0.8, regionalNode.Intensity);
            Assert.Equal("US East", regionalNode.RegionName);

            var stats = new AdminDashboardStatsDto
            {
                TotalFiles = 100,
                TotalUsers = 10,
                TotalStorageUsed = 1024,
                TotalStorageLimit = 2048,
                ActiveUsersLast24h = 5,
                SuspendedUsers = 1,
                UploadsToday = 12,
                DownloadsToday = 25,
                NewUsersThisWeek = 3,
                ActiveSessionsNow = 4,
                FilesTrend = 0.15,
                UsersTrend = -0.05,
                StorageTrend = 0.22,
                StorageHistory = new List<double> { 1, 2, 3 },
                TrafficHistory = new List<double> { 4, 5, 6 },
                RegionalTraffic = new List<RegionalNodeDto> { regionalNode }
            };
            Assert.Equal(100, stats.TotalFiles);
            Assert.Equal(10, stats.TotalUsers);
            Assert.Equal(1024, stats.TotalStorageUsed);
            Assert.Equal(2048, stats.TotalStorageLimit);
            Assert.Equal(5, stats.ActiveUsersLast24h);
            Assert.Equal(1, stats.SuspendedUsers);
            Assert.Equal(12, stats.UploadsToday);
            Assert.Equal(25, stats.DownloadsToday);
            Assert.Equal(3, stats.NewUsersThisWeek);
            Assert.Equal(4, stats.ActiveSessionsNow);
            Assert.Equal(0.15, stats.FilesTrend);
            Assert.Equal(-0.05, stats.UsersTrend);
            Assert.Equal(0.22, stats.StorageTrend);
            Assert.Equal(new List<double> { 1, 2, 3 }, stats.StorageHistory);
            Assert.Equal(new List<double> { 4, 5, 6 }, stats.TrafficHistory);
            Assert.Equal(new List<RegionalNodeDto> { regionalNode }, stats.RegionalTraffic);

            // 2. AdminUserManagementDto
            var adminUser = new AdminUserManagementDto
            {
                Id = 1,
                Username = "admin",
                Email = "admin@test.com",
                Role = "Admin",
                IsActive = true,
                CreatedAt = now,
                LastLoginAt = now,
                StorageUsed = 500,
                StorageQuota = 1000
            };
            Assert.Equal(1, adminUser.Id);
            Assert.Equal("admin", adminUser.Username);
            Assert.Equal("admin@test.com", adminUser.Email);
            Assert.Equal("Admin", adminUser.Role);
            Assert.True(adminUser.IsActive);
            Assert.Equal(now, adminUser.CreatedAt);
            Assert.Equal(now, adminUser.LastLoginAt);
            Assert.Equal(500, adminUser.StorageUsed);
            Assert.Equal(1000, adminUser.StorageQuota);

            // 3. AdminAuditDto
            var auditId = Guid.NewGuid();
            var audit = new AdminAuditDto
            {
                Id = auditId,
                UserId = 1,
                PerformedBy = "admin",
                Action = "DeleteFile",
                TargetType = "File",
                TargetName = "test.txt",
                Details = "details",
                PerformedAt = now,
                IpAddress = "127.0.0.1"
            };
            Assert.Equal(auditId, audit.Id);
            Assert.Equal(1, audit.UserId);
            Assert.Equal("admin", audit.PerformedBy);
            Assert.Equal("DeleteFile", audit.Action);
            Assert.Equal("File", audit.TargetType);
            Assert.Equal("test.txt", audit.TargetName);
            Assert.Equal("details", audit.Details);
            Assert.Equal(now, audit.PerformedAt);
            Assert.Equal("127.0.0.1", audit.IpAddress);

            // 4. SystemHealthDetailsDto & ServiceCheckDto
            var serviceCheck = new ServiceCheckDto
            {
                Name = "Database",
                Status = "ok",
                Message = "connected",
                LatencyMs = 12
            };
            Assert.Equal("Database", serviceCheck.Name);
            Assert.Equal("ok", serviceCheck.Status);
            Assert.Equal("connected", serviceCheck.Message);
            Assert.Equal(12, serviceCheck.LatencyMs);

            var systemHealth = new SystemHealthDetailsDto
            {
                Status = "healthy",
                CpuUsage = 25.5,
                MemoryUsed = 1024L,
                MemoryTotal = 4096L,
                DiskUsed = 2048L,
                DiskTotal = 8192L,
                Uptime = 3600,
                ActiveConnections = 15,
                RequestsPerMinute = 120,
                ErrorRate = 0.02,
                AvgResponseMs = 45,
                Checks = new List<ServiceCheckDto> { serviceCheck }
            };
            Assert.Equal("healthy", systemHealth.Status);
            Assert.Equal(25.5, systemHealth.CpuUsage);
            Assert.Equal(1024L, systemHealth.MemoryUsed);
            Assert.Equal(4096L, systemHealth.MemoryTotal);
            Assert.Equal(2048L, systemHealth.DiskUsed);
            Assert.Equal(8192L, systemHealth.DiskTotal);
            Assert.Equal(3600, systemHealth.Uptime);
            Assert.Equal(15, systemHealth.ActiveConnections);
            Assert.Equal(120, systemHealth.RequestsPerMinute);
            Assert.Equal(0.02, systemHealth.ErrorRate);
            Assert.Equal(45, systemHealth.AvgResponseMs);
            Assert.Equal(new List<ServiceCheckDto> { serviceCheck }, systemHealth.Checks);

            // 5. CreateUserDto
            var createUser = new CreateUserDto
            {
                Username = "newuser",
                Email = "new@test.com",
                Password = "password",
                Role = "User",
                InitialQuota = 1000L
            };
            Assert.Equal("newuser", createUser.Username);
            Assert.Equal("new@test.com", createUser.Email);
            Assert.Equal("password", createUser.Password);
            Assert.Equal("User", createUser.Role);
            Assert.Equal(1000L, createUser.InitialQuota);

            // 6. UpdateQuotaDto
            var updateQuota = new UpdateQuotaDto { NewQuota = 5000L };
            Assert.Equal(5000L, updateQuota.NewQuota);

            // 7. InitiateUploadDto
            var initUpload = new InitiateUploadDto
            {
                FileName = "test.bin",
                FileSize = 1024L,
                TotalChunks = 5,
                Hash = "hash123",
                ContentType = "application/octet-stream"
            };
            Assert.Equal("test.bin", initUpload.FileName);
            Assert.Equal(1024L, initUpload.FileSize);
            Assert.Equal(5, initUpload.TotalChunks);
            Assert.Equal("hash123", initUpload.Hash);
            Assert.Equal("application/octet-stream", initUpload.ContentType);

            // 8. UploadSessionResponseDto
            var uploadSession = new UploadSessionResponseDto
            {
                FileId = fileId,
                SessionId = "sess-123",
                UploadUrl = "http://upload"
            };
            Assert.Equal(fileId, uploadSession.FileId);
            Assert.Equal("sess-123", uploadSession.SessionId);
            Assert.Equal("http://upload", uploadSession.UploadUrl);

            // 9. ChunkUploadResponseDto
            var chunkId = Guid.NewGuid();
            var chunkResponse = new ChunkUploadResponseDto
            {
                ChunkId = chunkId,
                Status = "Uploaded",
                IsDuplicate = true,
                Message = "dupe"
            };
            Assert.Equal(chunkId, chunkResponse.ChunkId);
            Assert.Equal("Uploaded", chunkResponse.Status);
            Assert.True(chunkResponse.IsDuplicate);
            Assert.Equal("dupe", chunkResponse.Message);

            // 10. CompleteUploadDto
            var completeUpload = new CompleteUploadDto { SessionId = "sess-123" };
            Assert.Equal("sess-123", completeUpload.SessionId);

            // 11. UploadStatusResponseDto
            var uploadStatus = new UploadStatusResponseDto
            {
                SessionId = "sess-123",
                UploadedChunks = new int[] { 1, 2 },
                TotalChunks = 3,
                Status = "InProgress"
            };
            Assert.Equal("sess-123", uploadStatus.SessionId);
            Assert.Equal(new int[] { 1, 2 }, uploadStatus.UploadedChunks);
            Assert.Equal(3, uploadStatus.TotalChunks);
            Assert.Equal("InProgress", uploadStatus.Status);

            // 12. PresignedUploadUrlRequestDto
            var presignedReq = new PresignedUploadUrlRequestDto
            {
                SessionId = "sess-123",
                ChunkIndex = 1,
                Hash = "hash"
            };
            Assert.Equal("sess-123", presignedReq.SessionId);
            Assert.Equal(1, presignedReq.ChunkIndex);
            Assert.Equal("hash", presignedReq.Hash);

            // 13. SasUploadUrlRequestDto
#pragma warning disable CS0618
            var sasReq = new SasUploadUrlRequestDto
            {
                SessionId = "sess-123",
                ChunkIndex = 1,
                Hash = "hash"
            };
            Assert.Equal("sess-123", sasReq.SessionId);
#pragma warning restore CS0618

            // 14. PresignedUploadUrlResponseDto
            var presignedResp = new PresignedUploadUrlResponseDto
            {
                Url = "http://presigned",
                ObjectKey = "key-123",
                ExpiresAt = now
            };
            Assert.Equal("http://presigned", presignedResp.Url);
            Assert.Equal("key-123", presignedResp.ObjectKey);
            Assert.Equal(now, presignedResp.ExpiresAt);

            // 15. SasUploadUrlResponseDto
#pragma warning disable CS0618
            var sasResp = new SasUploadUrlResponseDto
            {
                SasUrl = "http://sas",
                BlobName = "blob",
                ExpiresAt = now
            };
            Assert.Equal("http://sas", sasResp.SasUrl);
            Assert.Equal("blob", sasResp.BlobName);
            Assert.Equal(now, sasResp.ExpiresAt);
#pragma warning restore CS0618

            // 16. VerifyChunkUploadDto
            var verifyChunk = new VerifyChunkUploadDto
            {
                SessionId = "sess-123",
                ChunkIndex = 2,
                Hash = "hash",
                BlobName = "blob",
                Size = 100
            };
            Assert.Equal("sess-123", verifyChunk.SessionId);
            Assert.Equal(2, verifyChunk.ChunkIndex);
            Assert.Equal("hash", verifyChunk.Hash);
            Assert.Equal("blob", verifyChunk.BlobName);
            Assert.Equal(100, verifyChunk.Size);

            // 17. ChunkVerificationResultDto
            var chunkVerDto = new ChunkVerificationResultDto
            {
                IsValid = true,
                MissingChunkIndices = new int[] { 3 }
            };
            Assert.True(chunkVerDto.IsValid);
            Assert.Equal(new int[] { 3 }, chunkVerDto.MissingChunkIndices);
        }
    }
}
