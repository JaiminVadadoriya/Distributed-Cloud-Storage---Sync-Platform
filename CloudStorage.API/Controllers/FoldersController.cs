using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FoldersController : ControllerBase
    {
        private readonly IFolderService _folderService;

        public FoldersController(IFolderService folderService)
        {
            _folderService = folderService;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                throw new UnauthorizedAccessException("User ID not found in token");

            return int.Parse(userIdClaim);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetFolderById(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var folder = await _folderService.GetFolderByIdAsync(id, userId);

                if (folder == null)
                    return NotFound(new ApiResponse
                    {
                        Success = false,
                        Message = "Folder not found or access denied"
                    });

                return Ok(new ApiResponse<FolderDto>
                {
                    Success = true,
                    Message = "Folder retrieved successfully",
                    Data = folder
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("root")]
        public async Task<IActionResult> GetRootFolders()
        {
            try
            {
                var userId = GetUserId();
                var folders = await _folderService.GetUserRootFoldersAsync(userId);
                return Ok(new ApiResponse<IEnumerable<FolderDto>>
                {
                    Success = true,
                    Message = "Root folders retrieved successfully",
                    Data = folders
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateFolder(CreateFolderDto dto)
        {
            try
            {
                var userId = GetUserId();
                var folder = await _folderService.CreateFolderAsync(dto, userId);
                return CreatedAtAction(nameof(GetFolderById), new { id = folder.Id }, new ApiResponse<FolderDto>
                {
                    Success = true,
                    Message = "Folder created successfully",
                    Data = folder
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPatch("{id}/rename")]
        public async Task<IActionResult> RenameFolder(Guid id, RenameFolderDto dto)
        {
            try
            {
                var userId = GetUserId();
                var folder = await _folderService.RenameFolderAsync(id, dto.NewName, userId);
                return Ok(new ApiResponse<FolderDto>
                {
                    Success = true,
                    Message = "Folder renamed successfully",
                    Data = folder
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPatch("{id}/move")]
        public async Task<IActionResult> MoveFolder(Guid id, MoveFolderDto dto)
        {
            try
            {
                var userId = GetUserId();
                var folder = await _folderService.MoveFolderAsync(id, dto.NewParentFolderId, userId);
                return Ok(new ApiResponse<FolderDto>
                {
                    Success = true,
                    Message = "Folder moved successfully",
                    Data = folder
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFolder(Guid id)
        {
            try
            {
                var userId = GetUserId();
                await _folderService.DeleteFolderAsync(id, userId);
                return Ok(new ApiResponse
                {
                    Success = true,
                    Message = "Folder deleted successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }
        [HttpPost("{id}/share")]
        public async Task<IActionResult> ShareFolder(Guid id, [FromBody] FolderShareDto dto)
        {
            try
            {
                var userId = GetUserId();
                await _folderService.ShareFolderAsync(id, dto.UserId, userId, dto.PermissionType);
                return Ok(new ApiResponse
                {
                    Success = true,
                    Message = "Folder shared successfully — all nested files are now accessible to the user"
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }
    }
}
