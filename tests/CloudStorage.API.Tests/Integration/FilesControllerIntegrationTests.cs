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
    }
}
