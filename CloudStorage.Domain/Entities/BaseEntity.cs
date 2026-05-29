namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Abstract base class for all domain entities.
    /// Provides a strongly-typed primary key via generics.
    /// </summary>
    /// <typeparam name="TKey">The type of the entity's primary key (e.g., Guid, int).</typeparam>
    public abstract class BaseEntity<TKey>
    {
        public TKey Id { get; set; } = default!;
    }
}
