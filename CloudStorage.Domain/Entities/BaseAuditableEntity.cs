using System;

namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Extends BaseEntity with a CreatedAt timestamp for audit tracking.
    /// Most entities in the system require creation-time tracking.
    /// </summary>
    /// <typeparam name="TKey">The type of the entity's primary key.</typeparam>
    public abstract class BaseAuditableEntity<TKey> : BaseEntity<TKey>
    {
        public DateTime CreatedAt { get; set; }
    }
}
