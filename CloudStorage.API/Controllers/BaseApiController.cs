using System;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    /// <summary>
    /// Abstract base controller providing shared infrastructure for all API controllers.
    /// Eliminates duplicated GetUserId() and provides a Template Method for 
    /// standardized error handling via ExecuteAsync().
    /// </summary>
    [ApiController]
    [Authorize]
    public abstract class BaseApiController : ControllerBase
    {
        /// <summary>
        /// Extracts the authenticated user's ID from the JWT claims.
        /// Shared across all controllers — no more duplication.
        /// </summary>
        protected int GetUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                throw new UnauthorizedAccessException("User ID not found in token");

            return int.Parse(userIdClaim);
        }

        /// <summary>
        /// Template Method: wraps controller action execution with standardized 
        /// error handling. Catches UnauthorizedAccessException → 403, 
        /// and general exceptions → 400 with ApiResponse.
        /// </summary>
        protected async Task<IActionResult> ExecuteAsync(Func<Task<IActionResult>> action)
        {
            try
            {
                return await action();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ApiResponse.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ApiResponse.Fail(ex.Message));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse.Fail(ex.Message));
            }
            catch (Exception)
            {
                return BadRequest(ApiResponse.Fail("An unexpected error occurred."));
            }
        }
    }
}
