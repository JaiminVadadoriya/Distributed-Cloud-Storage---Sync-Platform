using System;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Services;
using NetArchTest.Rules;
using Xunit;

namespace CloudStorage.Application.Tests
{
    public class ArchitectureTests
    {
        private const string DomainNamespace = "CloudStorage.Domain";
        private const string ApplicationNamespace = "CloudStorage.Application";
        private const string InfrastructureNamespace = "CloudStorage.Infrastructure";
        private const string ApiNamespace = "CloudStorage.API";

        [Fact]
        public void DomainLayer_ShouldNotHaveDependencyOnOtherLayers()
        {
            // Arrange
            var assembly = typeof(FileMetadata).Assembly;
            var otherLayers = new[]
            {
                ApplicationNamespace,
                InfrastructureNamespace,
                ApiNamespace
            };

            // Act
            var result = Types.InAssembly(assembly)
                .ShouldNot()
                .HaveDependencyOnAll(otherLayers)
                .GetResult();

            // Assert
            Assert.True(result.IsSuccessful, $"Domain layer has dependencies on: {string.Join(", ", result.FailingTypes?.Select(t => t.FullName) ?? Array.Empty<string>())}");
        }

        [Fact]
        public void ApplicationLayer_ShouldNotHaveDependencyOnInfrastructureOrApi()
        {
            // Arrange
            var assembly = typeof(CloudStorage.Application.Interfaces.IActivityService).Assembly;
            var otherLayers = new[]
            {
                InfrastructureNamespace,
                ApiNamespace
            };

            // Act
            var result = Types.InAssembly(assembly)
                .ShouldNot()
                .HaveDependencyOnAll(otherLayers)
                .GetResult();

            // Assert
            Assert.True(result.IsSuccessful, $"Application layer has dependencies on: {string.Join(", ", result.FailingTypes?.Select(t => t.FullName) ?? Array.Empty<string>())}");
        }

        [Fact]
        public void InfrastructureLayer_ShouldNotHaveDependencyOnApi()
        {
            // Arrange
            var assembly = typeof(ActivityService).Assembly;

            // Act
            var result = Types.InAssembly(assembly)
                .ShouldNot()
                .HaveDependencyOnAny(ApiNamespace) // Use HaveDependencyOnAny instead of HaveDependencyOn
                .GetResult();

            // Assert
            Assert.True(result.IsSuccessful, $"Infrastructure layer has dependencies on: {string.Join(", ", result.FailingTypes?.Select(t => t.FullName) ?? Array.Empty<string>())}");
        }
    }
}
