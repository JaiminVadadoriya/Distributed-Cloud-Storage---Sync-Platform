using System.Threading.Tasks;
using CloudStorage.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.API.Controllers
{
    [ApiController]
    [Route("[controller]")]
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
            return Ok(new { status = "healthy", timestamp = System.DateTime.UtcNow });
        }

        [HttpGet("ready")]
        public async Task<IActionResult> GetReadiness()
        {
            try
            {
                // Check database connectivity
                await _context.Database.CanConnectAsync();
                return Ok(new { status = "ready", database = "connected", timestamp = System.DateTime.UtcNow });
            }
            catch (System.Exception ex)
            {
                return StatusCode(503, new { status = "not ready", database = "disconnected", error = ex.Message });
            }
        }
    }
}
