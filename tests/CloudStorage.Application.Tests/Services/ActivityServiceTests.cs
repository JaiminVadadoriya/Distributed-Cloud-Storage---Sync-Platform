using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;
using CloudStorage.Infrastructure.Services;
using Moq;
using Xunit;

namespace CloudStorage.Application.Tests.Services
{
    public class ActivityServiceTests
    {
        private readonly Mock<IActivityLogRepository> _activityRepoMock;
        private readonly ActivityService _activityService;

        public ActivityServiceTests()
        {
            _activityRepoMock = new Mock<IActivityLogRepository>();
            _activityService = new ActivityService(_activityRepoMock.Object);
        }

        [Fact]
        public async Task LogActivityAsync_ShouldCreateAndAddLog()
        {
            // Act
            await _activityService.LogActivityAsync(1, "UPLOAD", "File", "f1", "Uploaded test.txt");

            // Assert
            _activityRepoMock.Verify(r => r.AddAsync(It.Is<ActivityLog>(l => 
                l.UserId == 1 && 
                l.Action == "UPLOAD" && 
                l.EntityType == "File" && 
                l.EntityId == "f1" && 
                l.Details == "Uploaded test.txt")), Times.Once);
        }

        [Fact]
        public async Task GetUserActivityAsync_ShouldReturnLogsFromRepo()
        {
            // Arrange
            var expectedLogs = new List<ActivityLog> { new ActivityLog { UserId = 1, Action = "TEST" } };
            _activityRepoMock.Setup(r => r.GetRecentActivityAsync(1, 10)).ReturnsAsync(expectedLogs);

            // Act
            var logs = await _activityService.GetUserActivityAsync(1, 10);

            // Assert
            Assert.Equal(expectedLogs, logs);
            _activityRepoMock.Verify(r => r.GetRecentActivityAsync(1, 10), Times.Once);
        }
    }
}
