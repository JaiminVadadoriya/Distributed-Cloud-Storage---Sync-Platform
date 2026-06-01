using System;

namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Represents a one-time password reset token.
    /// Inherits Id and CreatedAt from BaseAuditableEntity.
    /// </summary>
    public class PasswordResetToken : BaseAuditableEntity<Guid>
    {
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public string TokenHash { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public bool IsUsed { get; set; }
        public DateTime? UsedAt { get; set; }
    }
}
