using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    /// <summary>
    /// Manages the user activity feed.
    /// Inherits from BaseApiController for shared infrastructure.
    /// </summary>
    [Route("api/[controller]")]
    public class ActivityController : BaseApiController
    {
        private readonly IActivityService _activityService;

        public ActivityController(IActivityService activityService)
        {
            _activityService = activityService;
        }

        [HttpGet]
        public Task<IActionResult> GetRecentActivity([FromQuery] int limit = 50) => ExecuteAsync(async () =>
        {
            var activity = await _activityService.GetUserActivityAsync(GetUserId(), limit);
            return Ok(ApiResponse<IEnumerable<ActivityLog>>.Ok(activity, "Activity feed retrieved successfully"));
        });
    }
}
