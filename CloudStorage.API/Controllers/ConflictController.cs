using System;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    /// <summary>
    /// Manages sync conflict detection and resolution.
    /// Inherits from BaseApiController for shared infrastructure.
    /// </summary>
    [Route("api/sync")]
    public class ConflictController : BaseApiController
    {
        private readonly IConflictDetectionService _conflictService;
        private readonly IFileService _fileService;

        public ConflictController(IConflictDetectionService conflictService, IFileService fileService)
        {
            _conflictService = conflictService;
            _fileService = fileService;
        }

        /// <summary>
        /// Check if a file has a conflict between the client's version vector and the server's.
        /// </summary>
        [HttpPost("check-conflicts")]
        public Task<IActionResult> CheckConflicts([FromBody] ConflictCheckRequestDto request) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            if (!await _fileService.HasPermissionAsync(request.FileId, userId, CloudStorage.Domain.Entities.PermissionType.Read))
            {
                return StatusCode(403, ApiResponse.Fail("Access denied"));
            }

            var result = await _conflictService.CheckConflictAsync(request.FileId, request.ClientVersionVector);
            return Ok(ApiResponse<ConflictCheckResponseDto>.Ok(result, "Conflict check completed"));
        });

        /// <summary>
        /// Resolve a detected conflict by choosing "KeepLocal" or "KeepServer".
        /// </summary>
        [HttpPost("resolve")]
        public Task<IActionResult> ResolveConflict([FromBody] ConflictResolutionDto request) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            await _conflictService.ResolveConflictAsync(
                request.FileId,
                userId,
                request.Resolution,
                request.ClientVersionVector);

            return Ok(ApiResponse.Ok("Conflict resolved successfully."));
        });
    }
}
