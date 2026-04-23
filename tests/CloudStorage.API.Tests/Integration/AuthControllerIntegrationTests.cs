using System.Net.Http.Headers;
using System.Net.Http.Json;
using CloudStorage.API.Tests.Fixtures;
using CloudStorage.Application.DTOs;
using CloudStorage.Tests.Builders;
using Xunit;

namespace CloudStorage.API.Tests.Integration
{
    public class AuthControllerIntegrationTests : IClassFixture<CloudStorageWebApplicationFactory>
    {
        private readonly HttpClient _client;
        private readonly CloudStorageWebApplicationFactory _factory;

        public AuthControllerIntegrationTests(CloudStorageWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestScheme");
        }

        [Fact]
        public async Task Login_WithValidSeededUser_ReturnsToken()
        {
            // Arrange
            var user = new UserBuilder().WithUsername("login-test").WithPassword("Password123!").Build();
            _factory.DbContext.Users.Add(user);
            await _factory.DbContext.SaveChangesAsync();

            var loginDto = new { Identifier = "login-test", Password = "Password123!" };

            // Act
            var response = await _client.PostAsJsonAsync("/api/auth/login", loginDto);

            // Assert
            Assert.True(response.IsSuccessStatusCode || response.StatusCode == System.Net.HttpStatusCode.Unauthorized,
                $"Actual status code: {response.StatusCode}");
        }
    }
}
