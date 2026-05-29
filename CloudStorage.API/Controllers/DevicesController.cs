using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    /// <summary>
    /// Manages user device registration, sync tracking, and force-sync.
    /// Inherits from BaseApiController for shared infrastructure.
    /// </summary>
    [Route("api/[controller]")]
    public class DevicesController : BaseApiController
    {
        private readonly IDeviceService _deviceService;

        public DevicesController(IDeviceService deviceService)
        {
            _deviceService = deviceService;
        }

        /// <summary>Get all devices registered by the current user.</summary>
        [HttpGet]
        public Task<IActionResult> GetDevices() => ExecuteAsync(async () =>
        {
            var devices = await _deviceService.GetUserDevicesAsync(GetUserId());
            return Ok(ApiResponse<IEnumerable<DeviceDto>>.Ok(devices, "Devices retrieved successfully"));
        });

        /// <summary>Register a new device for sync tracking.</summary>
        [HttpPost]
        public Task<IActionResult> RegisterDevice(RegisterDeviceDto dto) => ExecuteAsync(async () =>
        {
            var device = await _deviceService.RegisterDeviceAsync(dto, GetUserId());
            return CreatedAtAction(nameof(GetDevices), null,
                ApiResponse<DeviceDto>.Ok(device, "Device registered successfully"));
        });

        /// <summary>Update the last-sync timestamp for a device.</summary>
        [HttpPatch("{id}/sync")]
        public Task<IActionResult> RecordSync(Guid id) => ExecuteAsync(async () =>
        {
            await _deviceService.UpdateLastSyncAsync(id, GetUserId());
            return Ok(ApiResponse.Ok("Sync timestamp updated"));
        });

        /// <summary>Remove a registered device.</summary>
        [HttpDelete("{id}")]
        public Task<IActionResult> RemoveDevice(Guid id) => ExecuteAsync(async () =>
        {
            await _deviceService.RemoveDeviceAsync(id, GetUserId());
            return Ok(ApiResponse.Ok("Device removed successfully"));
        });

        /// <summary>Force a sync cycle for a specific device.</summary>
        [HttpPost("{id}/force-sync")]
        public Task<IActionResult> ForceSync(Guid id) => ExecuteAsync(async () =>
        {
            await _deviceService.ForceSyncAsync(id, GetUserId());
            return Ok(ApiResponse.Ok("Sync triggered successfully"));
        });
    }
}
