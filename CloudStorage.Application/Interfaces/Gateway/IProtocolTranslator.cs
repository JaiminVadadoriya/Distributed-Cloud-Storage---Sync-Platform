using System.Collections.Generic;

namespace CloudStorage.Application.Interfaces.Gateway
{
    public record StorageOperation(string OperationType, string ObjectKey, string BucketOrPath, 
        byte[]? Payload, Dictionary<string, string> Metadata);

    public interface IProtocolTranslator
    {
        StorageOperation Translate(GatewayRequest request);
        GatewayResponse FormatResponse(GatewayProtocol protocol, int statusCode, byte[]? body, 
            Dictionary<string, string>? metadata = null);
    }
}
