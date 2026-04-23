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
    public class ConflictControllerTests
    {
        private readonly Mock<IConflictDetectionService> _mockConflictService;
        private readonly ConflictController _controller;

        public ConflictControllerTests()
        {
            _mockConflictService = new Mock<IConflictDetectionService>();
            _controller = new ConflictController(_mockConflictService.Object);

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
        public async Task CheckConflicts_ReturnsOk_WhenNoException()
        {
            // Arrange
            var request = new ConflictCheckRequestDto
            {
                FileId = Guid.NewGuid(),
                ClientVersionVector = "1:1"
            };
            var expectedResult = new ConflictCheckResponseDto { HasConflict = false };

            _mockConflictService.Setup(s => s.CheckConflictAsync(request.FileId, request.ClientVersionVector))
                .ReturnsAsync(expectedResult);

            // Act
            var result = await _controller.CheckConflicts(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<ConflictCheckResponseDto>>(okResult.Value);
            Assert.True(response.Success);
            Assert.False(response.Data!.HasConflict);
        }

        [Fact]
        public async Task CheckConflicts_ReturnsBadRequest_OnException()
        {
            // Arrange
            var request = new ConflictCheckRequestDto { FileId = Guid.NewGuid() };
            _mockConflictService.Setup(s => s.CheckConflictAsync(It.IsAny<Guid>(), It.IsAny<string>()))
                .ThrowsAsync(new Exception("Error checking conflict"));

            // Act
            var result = await _controller.CheckConflicts(request);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.NotNull(badRequestResult.Value);
        }

        [Fact]
        public async Task ResolveConflict_ReturnsOk_OnSuccess()
        {
            // Arrange
            var request = new ConflictResolutionDto
            {
                FileId = Guid.NewGuid(),
                Resolution = ConflictResolution.KeepLocal,
                ClientVersionVector = "1:2"
            };

            _mockConflictService.Setup(s => s.ResolveConflictAsync(request.FileId, 1, request.Resolution, request.ClientVersionVector))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _controller.ResolveConflict(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse>(okResult.Value);
            Assert.True(response.Success);
        }

        [Fact]
        public async Task ResolveConflict_ReturnsNotFound_OnInvalidOperationException()
        {
            // Arrange
            var request = new ConflictResolutionDto { FileId = Guid.NewGuid() };
            _mockConflictService.Setup(s => s.ResolveConflictAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<ConflictResolution>(), It.IsAny<string>()))
                .ThrowsAsync(new InvalidOperationException("File not found"));

            // Act
            var result = await _controller.ResolveConflict(request);

            // Assert
            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
            Assert.NotNull(notFoundResult.Value);
        }

        [Fact]
        public async Task ResolveConflict_ReturnsBadRequest_OnGenericException()
        {
            // Arrange
            var request = new ConflictResolutionDto { FileId = Guid.NewGuid() };
            _mockConflictService.Setup(s => s.ResolveConflictAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<ConflictResolution>(), It.IsAny<string>()))
                .ThrowsAsync(new Exception("Something went wrong"));

            // Act
            var result = await _controller.ResolveConflict(request);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.NotNull(badRequestResult.Value);
        }
    }
}
