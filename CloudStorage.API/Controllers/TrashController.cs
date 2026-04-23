using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    /// <summary>
    /// Manages the trash/recycle bin — soft-deleted file recovery and permanent deletion.
    /// Inherits from BaseApiController for shared infrastructure.
    /// </summary>
    [Route("api/[controller]")]
    public class TrashController : BaseApiController
    {
        private readonly IFileMetadataRepository _fileRepository;
        private readonly IFileService _fileService;
        private readonly IActivityService _activityService;

        public TrashController(
            IFileMetadataRepository fileRepository,
            IFileService fileService,
            IActivityService activityService)
        {
            _fileRepository = fileRepository;
            _fileService = fileService;
            _activityService = activityService;
        }

        [HttpGet]
        public Task<IActionResult> GetTrash() => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            var files = await _fileRepository.GetUserFilesAsync(userId, true);
            var trashFiles = files.Where(f => f.IsDeleted);

            var response = trashFiles.Select(f => new
            {
                id = f.Id,
                originalId = f.Id,
                name = f.FileName,
                size = f.Size,
                type = f.ContentType,
                deletedAt = f.LastModifiedAt,
                expiresAt = f.LastModifiedAt.AddDays(30),
                originalPath = f.FolderId.HasValue ? f.FolderId.ToString() : "root"
            });

            return Ok(ApiResponse<IEnumerable<object>>.Ok(response, "Trash items retrieved successfully"));
        });

        [HttpPost("{id}/restore")]
        public Task<IActionResult> RestoreFile(Guid id) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            var file = await _fileRepository.GetByIdAsync(id);

            if (file == null)
                return NotFound(ApiResponse.Fail("File not found"));

            if (file.OwnerId != userId)
                return StatusCode(403, ApiResponse.Fail("Access denied"));

            file.IsDeleted = false;
            file.LastModifiedAt = DateTime.UtcNow;
            await _fileRepository.UpdateAsync(file);

            await _activityService.LogActivityAsync(userId, "RESTORE", "FILE", id.ToString(), $"File '{file.FileName}' restored from trash.");

            return Ok(ApiResponse.Ok("File restored successfully"));
        });

        [HttpDelete("{id}")]
        public Task<IActionResult> PermanentDelete(Guid id) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            var file = await _fileRepository.GetByIdAsync(id);

            if (file == null)
                return NotFound(ApiResponse.Fail("File not found"));

            if (file.OwnerId != userId)
                return StatusCode(403, ApiResponse.Fail("Access denied"));

            if (!file.IsDeleted)
                return BadRequest(ApiResponse.Fail("File is not in trash. Soft delete it first."));

            await _fileRepository.DeleteAsync(file);
            await _activityService.LogActivityAsync(userId, "PERMANENT_DELETE", "FILE", id.ToString(), $"File '{file.FileName}' was permanently deleted.");

            return Ok(ApiResponse.Ok("File permanently deleted"));
        });

        [HttpDelete("empty")]
        public Task<IActionResult> EmptyTrash() => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            var files = await _fileRepository.GetUserFilesAsync(userId, true);
            var trashFiles = files.Where(f => f.IsDeleted).ToList();

            await _fileRepository.DeleteRangeAsync(trashFiles);

            await _activityService.LogActivityAsync(userId, "EMPTY_TRASH", "USER", userId.ToString(), "Trash was emptied.");
            return Ok(ApiResponse.Ok($"Trash emptied. {trashFiles.Count} files permanently deleted."));
        });
    }
}
