using System;

namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Represents a JWT refresh token for session management.
    /// Inherits Id and CreatedAt from BaseAuditableEntity.
    /// </summary>
    public class RefreshToken : BaseAuditableEntity<Guid>
    {
        public string Token { get; set; } = string.Empty;
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public DateTime ExpiresAt { get; set; }
        public bool IsRevoked { get; set; }
        public DateTime? RevokedAt { get; set; }
    }
}
