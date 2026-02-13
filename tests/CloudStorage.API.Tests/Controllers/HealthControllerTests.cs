using System.Threading.Tasks;
using CloudStorage.API.Controllers;
using CloudStorage.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CloudStorage.API.Tests.Controllers
{
    public class HealthControllerTests
    {
        private readonly HealthController _controller;
        private readonly ApplicationDbContext _context;

        public HealthControllerTests()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: "HealthTestDb")
                .Options;
            _context = new ApplicationDbContext(options);
            _controller = new HealthController(_context);
        }

        [Fact]
        public void GetHealth_ReturnsOk()
        {
            // Act
            var result = _controller.GetHealth();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetReadiness_ReturnsOk()
        {
            // Act
            var result = await _controller.GetReadiness();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }
    }
}
