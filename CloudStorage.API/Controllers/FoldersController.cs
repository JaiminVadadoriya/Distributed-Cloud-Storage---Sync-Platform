using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    /// <summary>
    /// Manages folder hierarchy CRUD, sharing, and permissions.
    /// Inherits from BaseApiController for shared infrastructure.
    /// </summary>
    [Route("api/[controller]")]
    public class FoldersController : BaseApiController
    {
        private readonly IFolderService _folderService;

        public FoldersController(IFolderService folderService)
        {
            _folderService = folderService;
        }

        [HttpGet("{id}")]
        public Task<IActionResult> GetFolderById(Guid id) => ExecuteAsync(async () =>
        {
            var folder = await _folderService.GetFolderByIdAsync(id, GetUserId());
            if (folder == null)
                return NotFound(ApiResponse.Fail("Folder not found or access denied"));

            return Ok(ApiResponse<FolderDto>.Ok(folder, "Folder retrieved successfully"));
        });

        [HttpGet("root")]
        public Task<IActionResult> GetRootFolders() => ExecuteAsync(async () =>
        {
            var folders = await _folderService.GetUserRootFoldersAsync(GetUserId());
            return Ok(ApiResponse<IEnumerable<FolderDto>>.Ok(folders, "Root folders retrieved successfully"));
        });

        [HttpPost]
        public Task<IActionResult> CreateFolder(CreateFolderDto dto) => ExecuteAsync(async () =>
        {
            var folder = await _folderService.CreateFolderAsync(dto, GetUserId());
            return CreatedAtAction(nameof(GetFolderById), new { id = folder.Id },
                ApiResponse<FolderDto>.Ok(folder, "Folder created successfully"));
        });

        [HttpPatch("{id}/rename")]
        public Task<IActionResult> RenameFolder(Guid id, RenameFolderDto dto) => ExecuteAsync(async () =>
        {
            var folder = await _folderService.RenameFolderAsync(id, dto.NewName, GetUserId());
            return Ok(ApiResponse<FolderDto>.Ok(folder, "Folder renamed successfully"));
        });

        [HttpPatch("{id}/move")]
        public Task<IActionResult> MoveFolder(Guid id, MoveFolderDto dto) => ExecuteAsync(async () =>
        {
            var folder = await _folderService.MoveFolderAsync(id, dto.NewParentFolderId, GetUserId());
            return Ok(ApiResponse<FolderDto>.Ok(folder, "Folder moved successfully"));
        });

        [HttpDelete("{id}")]
        public Task<IActionResult> DeleteFolder(Guid id) => ExecuteAsync(async () =>
        {
            await _folderService.DeleteFolderAsync(id, GetUserId());
            return Ok(ApiResponse.Ok("Folder deleted successfully"));
        });

        [HttpPost("{id}/share")]
        public Task<IActionResult> ShareFolder(Guid id, [FromBody] FolderShareDto dto) => ExecuteAsync(async () =>
        {
            await _folderService.ShareFolderAsync(id, dto.UserId, GetUserId(), dto.PermissionType);
            return Ok(ApiResponse.Ok("Folder shared successfully — all nested files are now accessible to the user"));
        });
    }
}
