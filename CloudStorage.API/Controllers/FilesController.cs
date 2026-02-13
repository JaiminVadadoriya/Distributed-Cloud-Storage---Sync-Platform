using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FilesController : ControllerBase
    {
        private readonly IFileService _fileService;

        public FilesController(IFileService fileService)
        {
            _fileService = fileService;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                throw new UnauthorizedAccessException("User ID not found in token");

            return int.Parse(userIdClaim);
        }

        [HttpGet]
        public async Task<IActionResult> GetUserFiles()
        {
            try
            {
                var userId = GetUserId();
                var files = await _fileService.GetUserFilesAsync(userId);
                return Ok(files);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetFileById(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var file = await _fileService.GetFileByIdAsync(id, userId);

                if (file == null)
                    return NotFound(new { message = "File not found or access denied" });

                return Ok(file);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateFile(FileUploadDto dto)
        {
            try
            {
                var userId = GetUserId();
                var file = await _fileService.CreateFileMetadataAsync(dto, userId);
                return CreatedAtAction(nameof(GetFileById), new { id = file.Id }, file);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFile(Guid id)
        {
            try
            {
                var userId = GetUserId();
                await _fileService.DeleteFileAsync(id, userId);
                return Ok(new { message = "File deleted successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/permissions")]
        public async Task<IActionResult> GrantPermission(Guid id, FilePermissionDto dto)
        {
            try
            {
                var userId = GetUserId();
                
                PermissionType permissionType;
                if (!Enum.TryParse<PermissionType>(dto.PermissionType, true, out permissionType))
                {
                    return BadRequest(new { message = "Invalid permission type" });
                }

                await _fileService.GrantPermissionAsync(id, dto.UserId, userId, permissionType);
                return Ok(new { message = "Permission granted successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
