using System;
using System.Security.Claims;
using System.Threading.Tasks;
using CloudStorage.API.Controllers;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using System.Collections.Generic;

namespace CloudStorage.API.Tests.Controllers
{
    public class DeltaSyncControllerTests
    {
        private readonly Mock<IDeltaSyncService> _mockDeltaSyncService;
        private readonly DeltaSyncController _controller;

        public DeltaSyncControllerTests()
        {
            _mockDeltaSyncService = new Mock<IDeltaSyncService>();
            _controller = new DeltaSyncController(_mockDeltaSyncService.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim("id", "1")
            }, "mock"));

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        [Fact]
        public async Task GetChangesSince_ReturnsOk_WithChanges()
        {
            // Arrange
            var sinceUtc = DateTime.UtcNow.AddMinutes(-10);
            var expectedResponse = new DeltaSyncResponseDto
            {
                ServerTimestampUtc = DateTime.UtcNow,
                ChangedFiles = new List<FileListDto>(),
                DeletedFileIds = new List<Guid>()
            };

            _mockDeltaSyncService.Setup(s => s.GetChangesSinceAsync(1, sinceUtc))
                .ReturnsAsync(expectedResponse);

            // Act
            var result = await _controller.GetChangesSince(sinceUtc);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<DeltaSyncResponseDto>>(okResult.Value);
            Assert.True(response.Success);
            Assert.Equal(expectedResponse.ServerTimestampUtc, response.Data!.ServerTimestampUtc);
        }

        [Fact]
        public async Task GetChangesSince_ReturnsBadRequest_OnException()
        {
            // Arrange
            var sinceUtc = DateTime.UtcNow.AddMinutes(-10);
            _mockDeltaSyncService.Setup(s => s.GetChangesSinceAsync(It.IsAny<int>(), It.IsAny<DateTime>()))
                .ThrowsAsync(new Exception("Service error"));

            // Act
            var result = await _controller.GetChangesSince(sinceUtc);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.NotNull(badRequestResult.Value);
        }
    }
}
