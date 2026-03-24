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
    public class DevicesController : ControllerBase
    {
        private readonly IDeviceService _deviceService;

        public DevicesController(IDeviceService deviceService)
        {
            _deviceService = deviceService;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                throw new UnauthorizedAccessException("User ID not found in token");
            return int.Parse(userIdClaim);
        }

        /// <summary>
        /// Get all devices registered by the current user.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetDevices()
        {
            try
            {
                var devices = await _deviceService.GetUserDevicesAsync(GetUserId());
                return Ok(new ApiResponse<IEnumerable<DeviceDto>>
                {
                    Success = true,
                    Message = "Devices retrieved successfully",
                    Data = devices
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Register a new device for sync tracking.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> RegisterDevice(RegisterDeviceDto dto)
        {
            try
            {
                var device = await _deviceService.RegisterDeviceAsync(dto, GetUserId());
                return CreatedAtAction(nameof(GetDevices), new ApiResponse<DeviceDto>
                {
                    Success = true,
                    Message = "Device registered successfully",
                    Data = device
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Update the last-sync timestamp for a device (called after each sync cycle).
        /// </summary>
        [HttpPatch("{id}/sync")]
        public async Task<IActionResult> RecordSync(Guid id)
        {
            try
            {
                await _deviceService.UpdateLastSyncAsync(id, GetUserId());
                return Ok(new ApiResponse { Success = true, Message = "Sync timestamp updated" });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Remove a registered device.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> RemoveDevice(Guid id)
        {
            try
            {
                await _deviceService.RemoveDeviceAsync(id, GetUserId());
                return Ok(new ApiResponse { Success = true, Message = "Device removed successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Force a sync cycle for a specific device.
        /// </summary>
        [HttpPost("{id}/force-sync")]
        public async Task<IActionResult> ForceSync(Guid id)
        {
            try
            {
                await _deviceService.ForceSyncAsync(id, GetUserId());
                return Ok(new ApiResponse { Success = true, Message = "Sync triggered successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }
    }
}
