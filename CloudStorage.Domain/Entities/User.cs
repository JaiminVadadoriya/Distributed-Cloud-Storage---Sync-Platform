using System;
using System.Collections.Generic;

namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Represents a registered user in the system.
    /// Inherits Id and CreatedAt from BaseAuditableEntity.
    /// </summary>
    public class User : BaseAuditableEntity<int>
    {
        public User()
        {
            RefreshTokens = new List<RefreshToken>();
            Devices = new List<Device>();
            FilePermissions = new List<FilePermission>();
            Notifications = new List<Notification>();
        }

        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public bool EmailVerified { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public bool IsActive { get; set; } = true;
        public string Role { get; set; } = "User"; // e.g., "Admin", "User"

        // Navigation properties
        public virtual ICollection<RefreshToken> RefreshTokens { get; set; }
        public virtual ICollection<Device> Devices { get; set; }
        public virtual ICollection<FilePermission> FilePermissions { get; set; }
        public virtual ICollection<Notification> Notifications { get; set; }
    }
}
