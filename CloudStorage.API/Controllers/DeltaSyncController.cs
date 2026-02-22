using System;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    [ApiController]
    [Route("api/sync/delta")]
    [Authorize]
    public class DeltaSyncController : ControllerBase
    {
        private readonly IDeltaSyncService _deltaSyncService;

        public DeltaSyncController(IDeltaSyncService deltaSyncService)
        {
            _deltaSyncService = deltaSyncService;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                throw new UnauthorizedAccessException("User ID not found in token");

            return int.Parse(userIdClaim);
        }

        [HttpGet]
        public async Task<IActionResult> GetChangesSince([FromQuery] DateTime sinceUtc)
        {
            try
            {
                var userId = GetUserId();
                var changes = await _deltaSyncService.GetChangesSinceAsync(userId, sinceUtc);
                return Ok(changes);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
