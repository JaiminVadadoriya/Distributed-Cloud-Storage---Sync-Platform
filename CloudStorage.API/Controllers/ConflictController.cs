using System;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    [ApiController]
    [Route("api/sync")]
    [Authorize]
    public class ConflictController : ControllerBase
    {
        private readonly IConflictDetectionService _conflictService;

        public ConflictController(IConflictDetectionService conflictService)
        {
            _conflictService = conflictService;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                throw new UnauthorizedAccessException("User ID not found in token");

            return int.Parse(userIdClaim);
        }

        /// <summary>
        /// Check if a file has a conflict between the client's version vector and the server's.
        /// </summary>
        [HttpPost("check-conflicts")]
        public async Task<IActionResult> CheckConflicts([FromBody] ConflictCheckRequestDto request)
        {
            try
            {
                var result = await _conflictService.CheckConflictAsync(request.FileId, request.ClientVersionVector);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Resolve a detected conflict by choosing "KeepLocal" or "KeepServer".
        /// </summary>
        [HttpPost("resolve")]
        public async Task<IActionResult> ResolveConflict([FromBody] ConflictResolutionDto request)
        {
            try
            {
                var userId = GetUserId();
                await _conflictService.ResolveConflictAsync(
                    request.FileId,
                    userId,
                    request.Resolution,
                    request.ClientVersionVector);

                return Ok(new { message = "Conflict resolved successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
