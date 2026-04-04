using System.Collections.Generic;

namespace CloudStorage.Application.DTOs
{
    /// <summary>
    /// Generic API response wrapper with typed data payload.
    /// Provides factory methods for consistent response construction.
    /// </summary>
    public class ApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public List<string>? Errors { get; set; }

        /// <summary>Creates a successful response with data.</summary>
        public static ApiResponse<T> Ok(T data, string message = "")
            => new() { Success = true, Message = message, Data = data };

        /// <summary>Creates a failed response.</summary>
        public static ApiResponse<T> Fail(string message, List<string>? errors = null)
            => new() { Success = false, Message = message, Errors = errors };
    }

    /// <summary>
    /// Non-generic API response for operations with no data payload.
    /// Provides factory methods for consistent response construction.
    /// </summary>
    public class ApiResponse
    {
        public bool Success { get; set; } = true;
        public string Message { get; set; } = string.Empty;
        public List<string>? Errors { get; set; }

        /// <summary>Creates a successful response.</summary>
        public static ApiResponse Ok(string message = "")
            => new() { Success = true, Message = message };

        /// <summary>Creates a failed response.</summary>
        public static ApiResponse Fail(string message, List<string>? errors = null)
            => new() { Success = false, Message = message, Errors = errors };
    }
}
