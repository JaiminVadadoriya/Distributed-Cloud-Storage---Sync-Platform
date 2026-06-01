using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using StackExchange.Redis;

namespace CloudStorage.API.Services
{
    public class UploadThrottlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IConnectionMultiplexer _redis;
        private const int MaxConcurrentUploads = 5;

        public UploadThrottlingMiddleware(RequestDelegate next, IConnectionMultiplexer redis)
        {
            _next = next;
            _redis = redis;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (context.Request.Path.StartsWithSegments("/api/files/chunks", StringComparison.OrdinalIgnoreCase) &&
                context.Request.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
            {
                var userId = context.User.FindFirst("id")?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    var cacheKey = $"upload_throttle:{userId}";
                    var db = _redis.GetDatabase();

                    // Increment atomically
                    long currentCount = await db.StringIncrementAsync(cacheKey);

                    // Set TTL on first increment
                    if (currentCount == 1)
                    {
                        await db.KeyExpireAsync(cacheKey, TimeSpan.FromMinutes(5));
                    }

                    if (currentCount > MaxConcurrentUploads)
                    {
                        // Rollback increment and reject
                        await db.StringDecrementAsync(cacheKey);
                        context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                        await context.Response.WriteAsJsonAsync(new { message = "Maximum concurrent chunk uploads reached. Please try again later." });
                        return;
                    }

                    try
                    {
                        await _next(context);
                    }
                    finally
                    {
                        // Decrement atomically
                        await db.StringDecrementAsync(cacheKey);
                    }
                    return;
                }
            }

            await _next(context);
        }
    }
}
