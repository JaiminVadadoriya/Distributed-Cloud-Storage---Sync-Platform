using System.Collections.Generic;
using CloudStorage.Application.DTOs;
using Xunit;

namespace CloudStorage.Application.Tests.Services
{
    public partial class ApplicationModelTests
    {
        [Fact]
        public void ApiResponse_ShouldInitializeCorrectly()
        {
            var responseData = ApiResponse<string>.Ok("dataPayload", "successMessage");
            Assert.True(responseData.Success);
            Assert.Equal("dataPayload", responseData.Data);
            Assert.Equal("successMessage", responseData.Message);

            var failResponseData = ApiResponse<string>.Fail("failedMessage", new List<string> { "error1" });
            Assert.False(failResponseData.Success);
            Assert.Null(failResponseData.Data);
            Assert.Equal("failedMessage", failResponseData.Message);
            Assert.Contains("error1", failResponseData.Errors);

            var responseNonGeneric = ApiResponse.Ok("successNonGeneric");
            Assert.True(responseNonGeneric.Success);
            Assert.Equal("successNonGeneric", responseNonGeneric.Message);

            var failNonGeneric = ApiResponse.Fail("failedNonGeneric", new List<string> { "error2" });
            Assert.False(failNonGeneric.Success);
            Assert.Equal("failedNonGeneric", failNonGeneric.Message);
            Assert.Contains("error2", failNonGeneric.Errors);
        }
    }
}
