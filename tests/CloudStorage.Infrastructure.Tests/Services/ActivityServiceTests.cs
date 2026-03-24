using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;
using CloudStorage.Infrastructure.Services;
using Moq;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class ActivityServiceTests
    {
        private readonly Mock<IActivityLogRepository> _activityRepoMock;
        private readonly ActivityService _service;

        public ActivityServiceTests()
        {
            _activityRepoMock = new Mock<IActivityLogRepository>();
            _service = new ActivityService(_activityRepoMock.Object);
        }

        [Fact]
        public async Task LogActivityAsync_CallsRepositoryWithCorrectData()
        {
            // Arrange
            int userId = 1;
            string action = "upload";
            string entityType = "file";
            string entityId = "f1";
            string details = "Uploaded test.txt";

            // Act
            await _service.LogActivityAsync(userId, action, entityType, entityId, details);

            // Assert
            _activityRepoMock.Verify(repo => repo.AddAsync(It.Is<ActivityLog>(log =>
                log.UserId == userId &&
                log.Action == action &&
                log.EntityType == entityType &&
                log.EntityId == entityId &&
                log.Details == details &&
                log.Timestamp <= DateTime.UtcNow &&
                log.Timestamp > DateTime.UtcNow.AddSeconds(-5)
            )), Times.Once);
        }

        [Fact]
        public async Task GetUserActivityAsync_CallsRepositoryWithCorrectParameters()
        {
            // Arrange
            int userId = 1;
            int limit = 10;
            var expectedLogs = new List<ActivityLog> { new ActivityLog { Id = Guid.NewGuid(), UserId = userId } };
            
            _activityRepoMock.Setup(repo => repo.GetRecentActivityAsync(userId, limit))
                .ReturnsAsync(expectedLogs);

            // Act
            var result = await _service.GetUserActivityAsync(userId, limit);

            // Assert
            Assert.Equal(expectedLogs, result);
            _activityRepoMock.Verify(repo => repo.GetRecentActivityAsync(userId, limit), Times.Once);
        }
    }
}
