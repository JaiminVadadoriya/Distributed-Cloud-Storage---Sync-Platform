namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Interface for entities that belong to a specific user.
    /// Enables polymorphic ownership checks across Files, Folders, etc.
    /// </summary>
    public interface IOwnedEntity
    {
        int OwnerId { get; set; }
    }
}
