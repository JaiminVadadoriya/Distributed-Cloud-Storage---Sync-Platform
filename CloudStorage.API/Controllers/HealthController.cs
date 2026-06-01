using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.API.Controllers
{
    /// <summary>
    /// Health check endpoints for liveness and readiness probes.
    /// Does NOT inherit from BaseApiController since it's unauthenticated.
    /// </summary>
    [ApiController]
    [Route("[controller]")]
    [AllowAnonymous]
    public class HealthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public HealthController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetHealth()
        {
            return Ok(ApiResponse<object>.Ok(
                new { status = "healthy", timestamp = System.DateTime.UtcNow },
                "API is healthy"));
        }

        [HttpGet("ready")]
        public async Task<IActionResult> GetReadiness()
        {
            try
            {
                await _context.Database.CanConnectAsync();
                return Ok(ApiResponse<object>.Ok(
                    new { status = "ready", database = "connected", timestamp = System.DateTime.UtcNow },
                    "API is ready"));
            }
            catch (System.Exception ex)
            {
                return StatusCode(503, ApiResponse<object>.Fail(ex.Message));
            }
        }
    }
}
