namespace CloudStorage.Application.Interfaces.SaaS
{
    public interface ITenantIsolationProvider
    {
        string GetCurrentTenantId();
    }
}
