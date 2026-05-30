using System.Net.Http.Headers;
using System.Net.Http.Json;
using CloudStorage.API.Tests.Fixtures;
using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Entities;
using Xunit;

namespace CloudStorage.API.Tests.Integration
{
    public class FilesControllerIntegrationTests : IClassFixture<CloudStorageWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CloudStorageWebApplicationFactory _factory;

        public FilesControllerIntegrationTests(CloudStorageWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme");
        }

        [Fact]
        public async Task GetUserFiles_AlwaysReturnsSuccessResponse()
        {
            // Act
            var response = await _client.GetAsync("/api/files");

            // Assert
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<List<FileListDto>>>();
            Assert.NotNull(result);
            Assert.True(result.Success);
        }

        [Fact]
        public async Task CreateFile_PersistsInDatabase()
        {
            // Arrange
            var dto = new FileUploadDto
            {
                FileName = "integration-test.pdf",
                Size = 500,
                ContentType = "application/pdf",
                Hash = "test-hash",
                ChunkCount = 1
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/files", dto);
            var responseContent = await response.Content.ReadAsStringAsync();

            // Assert
            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"Integration test failed. Status: {response.StatusCode}. Body: {responseContent}");
            }
            var result = await response.Content.ReadFromJsonAsync<ApiResponse<FileResponseDto>>();
            Assert.NotNull(result?.Data);

            // Verify in DB directly
            var fileInDb = await _factory.DbContext.FileMetadata.FindAsync(result.Data.Id);
            Assert.NotNull(fileInDb);
            Assert.Equal(dto.FileName, fileInDb.FileName);
        }

        [Fact]
        public async Task GetUserFiles_AnonymousRequest_ReturnsUnauthorized()
        {
            // Arrange
            _factory.DbContext.ChangeTracker.Clear();
            var anonymousClient = _factory.CreateClient(); // No auth header

            // Act
            var response = await anonymousClient.GetAsync("/api/files");

            // Assert
            Assert.Equal(System.Net.HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetFileById_IDOR_ReturnsNotFound()
        {
            // Arrange
            _factory.DbContext.ChangeTracker.Clear();
            // Seed a file owned by User 2 (owner ID = 2)
            var file = new FileMetadata
            {
                Id = Guid.NewGuid(),
                FileName = "private-file.txt",
                ContentType = "text/plain",
                Size = 100,
                Hash = "private-hash",
                OwnerId = 2, // Belongs to User 2 (Admin)
                Status = UploadStatus.Complete,
                CreatedAt = DateTime.UtcNow,
                LastModifiedAt = DateTime.UtcNow
            };
            _factory.DbContext.FileMetadata.Add(file);
            await _factory.DbContext.SaveChangesAsync();

            // Client requests as User 1
            _client.DefaultRequestHeaders.Remove("X-Test-User-Id");
            _client.DefaultRequestHeaders.Add("X-Test-User-Id", "1");

            // Act
            var response = await _client.GetAsync($"/api/files/{file.Id}");

            // Assert
            Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task CreateFile_ExceedsQuota_ReturnsBadRequest()
        {
            // Arrange
            _factory.DbContext.ChangeTracker.Clear();
            var user = new User
            {
                Username = "quota-test-user",
                Email = "quota@test.com",
                PasswordHash = "fakehash",
                Role = "User",
                StorageQuota = 50, // 50 bytes only!
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _factory.DbContext.Users.Add(user);
            await _factory.DbContext.SaveChangesAsync();

            // Client requests as the new quota user
            _client.DefaultRequestHeaders.Remove("X-Test-User-Id");
            _client.DefaultRequestHeaders.Add("X-Test-User-Id", user.Id.ToString());

            var dto = new FileUploadDto
            {
                FileName = "too-large.zip",
                Size = 100, // 100 bytes > 50 bytes quota limit!
                ContentType = "application/zip",
                Hash = "large-hash",
                ChunkCount = 1
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/files", dto);

            // Assert
            Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);
        }
    }
}
