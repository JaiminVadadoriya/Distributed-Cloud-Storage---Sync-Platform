using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Gateway
{
    public enum GatewayProtocol { S3, WebDAV, NFS, SMB }
    public record GatewayRequest(GatewayProtocol Protocol, string Method, string Path, 
        byte[]? Body, Dictionary<string, string> Headers, string TenantId);
    public record GatewayResponse(int StatusCode, byte[]? Body, Dictionary<string, string> Headers, string ContentType);

    public interface IStorageGateway
    {
        Task<GatewayResponse> HandleRequestAsync(GatewayRequest request);
        IReadOnlyList<GatewayProtocol> GetSupportedProtocols();
    }
}
