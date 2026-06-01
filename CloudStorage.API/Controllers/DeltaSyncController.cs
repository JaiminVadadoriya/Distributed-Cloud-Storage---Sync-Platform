using System;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    /// <summary>
    /// Provides delta sync endpoints for efficient synchronization.
    /// Inherits from BaseApiController for shared infrastructure.
    /// </summary>
    [Route("api/sync/delta")]
    public class DeltaSyncController : BaseApiController
    {
        private readonly IDeltaSyncService _deltaSyncService;

        public DeltaSyncController(IDeltaSyncService deltaSyncService)
        {
            _deltaSyncService = deltaSyncService;
        }

        [HttpGet]
        public Task<IActionResult> GetChangesSince([FromQuery] DateTime sinceUtc) => ExecuteAsync(async () =>
        {
            var changes = await _deltaSyncService.GetChangesSinceAsync(GetUserId(), sinceUtc);
            return Ok(ApiResponse<DeltaSyncResponseDto>.Ok(changes, "Changes retrieved successfully"));
        });
    }
}
