using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace CloudStorage.API.Tests.Helpers
{
    /// <summary>
    /// Helper class for generating test JWT tokens with configurable claims.
    /// </summary>
    public static class JwtTokenHelper
    {
        private const string TestSecret = "ThisIsATestSecretKeyThatIsLongEnoughForHS256AlgorithmEncodingPurposes";
        private const string TestIssuer = "CloudStorageApiTest";
        private const string TestAudience = "CloudStorageClientsTest";

        /// <summary>
        /// Generates a valid JWT token for testing.
        /// </summary>
        public static string GenerateToken(int userId, string username, string email, TimeSpan? expiresIn = null)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestSecret));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Name, username),
                new Claim(ClaimTypes.Email, email)
            };

            var token = new JwtSecurityToken(
                issuer: TestIssuer,
                audience: TestAudience,
                claims: claims,
                expires: DateTime.UtcNow.Add(expiresIn ?? TimeSpan.FromHours(1)),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        /// <summary>
        /// Generates an expired JWT token for testing refresh scenarios.
        /// </summary>
        public static string GenerateExpiredToken(int userId, string username, string email)
        {
            return GenerateToken(userId, username, email, TimeSpan.FromSeconds(-1));
        }

        /// <summary>
        /// Gets the test secret key for use in test appsettings configuration.
        /// </summary>
        public static string GetTestSecret() => TestSecret;

        /// <summary>
        /// Gets the test issuer for use in test appsettings configuration.
        /// </summary>
        public static string GetTestIssuer() => TestIssuer;

        /// <summary>
        /// Gets the test audience for use in test appsettings configuration.
        /// </summary>
        public static string GetTestAudience() => TestAudience;
    }
}
