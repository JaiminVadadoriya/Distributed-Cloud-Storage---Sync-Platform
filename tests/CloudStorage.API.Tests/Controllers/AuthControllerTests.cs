using System;
using System.Threading.Tasks;
using CloudStorage.API.Controllers;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CloudStorage.API.Tests.Controllers
{
    public class AuthControllerTests
    {
        private readonly Mock<IAuthService> _mockAuthService;
        private readonly AuthController _controller;

        public AuthControllerTests()
        {
            _mockAuthService = new Mock<IAuthService>();
            _controller = new AuthController(_mockAuthService.Object);
        }

        [Fact]
        public async Task Register_ValidData_ReturnsOk()
        {
            // Arrange
            var dto = new RegisterDto { Username = "test", Email = "test@example.com", Password = "password" };
            var user = new User { Id = 1, Username = dto.Username, Email = dto.Email };
            
            _mockAuthService.Setup(x => x.RegisterAsync(It.IsAny<User>(), dto.Password))
                .ReturnsAsync(user);

            // Act
            var result = await _controller.Register(dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task Login_ValidCredentials_ReturnsOk()
        {
            // Arrange
            var dto = new LoginDto { Identifier = "test@example.com", Password = "password" };
            var response = new LoginResponseDto { AccessToken = "token", RefreshToken = "refresh" };

            _mockAuthService.Setup(x => x.LoginAsync(dto.Identifier, dto.Password))
                .ReturnsAsync(response);

            // Act
            var result = await _controller.Login(dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(response, okResult.Value);
        }

        [Fact]
        public async Task Login_InvalidCredentials_ReturnsUnauthorized()
        {
            // Arrange
            var dto = new LoginDto { Identifier = "test@example.com", Password = "wrong" };
            
            _mockAuthService.Setup(x => x.LoginAsync(dto.Identifier, dto.Password))
                .ReturnsAsync((LoginResponseDto?)null);

            // Act
            var result = await _controller.Login(dto);

            // Assert
            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        [Fact]
        public async Task Refresh_ValidToken_ReturnsOk()
        {
            // Arrange
            var dto = new RefreshTokenDto { RefreshToken = "valid-token" };
            var response = new LoginResponseDto { AccessToken = "new-token", RefreshToken = "new-refresh" };

            _mockAuthService.Setup(x => x.RefreshTokenAsync(dto.RefreshToken))
                .ReturnsAsync(response);

            // Act
            var result = await _controller.Refresh(dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(response, okResult.Value);
        }

        [Fact]
        public async Task Refresh_InvalidToken_ReturnsUnauthorized()
        {
            // Arrange
            var dto = new RefreshTokenDto { RefreshToken = "invalid-token" };
            
            _mockAuthService.Setup(x => x.RefreshTokenAsync(dto.RefreshToken))
                .ReturnsAsync((LoginResponseDto?)null);

            // Act
            var result = await _controller.Refresh(dto);

            // Assert
            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        [Fact]
        public async Task Logout_ReturnsOk()
        {
            // Arrange
            var dto = new RefreshTokenDto { RefreshToken = "token" };

            // Act
            var result = await _controller.Logout(dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            _mockAuthService.Verify(x => x.LogoutAsync(dto.RefreshToken), Times.Once);
        }
    }
}
