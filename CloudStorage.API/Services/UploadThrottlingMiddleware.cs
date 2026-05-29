using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Distributed;

namespace CloudStorage.API.Services
{
    public class UploadThrottlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IDistributedCache _cache;
        private const int MaxConcurrentUploads = 5;

        public UploadThrottlingMiddleware(RequestDelegate next, IDistributedCache cache)
        {
            _next = next;
            _cache = cache;
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

                    // Note: In a real-world scenario with Redis, you'd use a Lua script 
                    // or Redis sorted sets for an exact atomic semaphore.
                    // Here we use a basic string increment via DistributedCache extension 
                    // if it supported it, but we'll manually get/set for simplicity.

                    var currentCountStr = await _cache.GetStringAsync(cacheKey);
                    int currentCount = string.IsNullOrEmpty(currentCountStr) ? 0 : int.Parse(currentCountStr);

                    if (currentCount >= MaxConcurrentUploads)
                    {
                        context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                        await context.Response.WriteAsJsonAsync(new { message = "Maximum concurrent chunk uploads reached. Please try again later." });
                        return;
                    }

                    // Increment
                    await _cache.SetStringAsync(cacheKey, (currentCount + 1).ToString(), new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) });

                    try
                    {
                        await _next(context);
                    }
                    finally
                    {
                        // Decrement
                        var countAfterStr = await _cache.GetStringAsync(cacheKey);
                        if (!string.IsNullOrEmpty(countAfterStr))
                        {
                            int countAfter = int.Parse(countAfterStr);
                            if (countAfter > 0)
                            {
                                await _cache.SetStringAsync(cacheKey, (countAfter - 1).ToString(), new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) });
                            }
                        }
                    }
                    return;
                }
            }

            await _next(context);
        }
    }
}
