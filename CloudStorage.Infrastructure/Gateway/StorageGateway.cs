using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Gateway;
using CloudStorage.Application.Interfaces.Metadata;

namespace CloudStorage.Infrastructure.Gateway
{
    public class StorageGateway : IStorageGateway
    {
        private readonly IMetadataService _metadataService;
        private readonly S3ProtocolTranslator _s3Translator;
        private readonly WebDavProtocolTranslator _webDavTranslator;

        // Static in-memory mock storage backend for gateway interactions
        public static ConcurrentDictionary<string, byte[]> MockStorageBackend { get; } = new();

        public StorageGateway(IMetadataService metadataService)
        {
            _metadataService = metadataService;
            _s3Translator = new S3ProtocolTranslator();
            _webDavTranslator = new WebDavProtocolTranslator();
        }

        public async Task<GatewayResponse> HandleRequestAsync(GatewayRequest request)
        {
            IProtocolTranslator translator = request.Protocol switch
            {
                GatewayProtocol.S3 => _s3Translator,
                GatewayProtocol.WebDAV => _webDavTranslator,
                _ => throw new NotSupportedException($"Protocol {request.Protocol} not supported.")
            };

            try
            {
                var operation = translator.Translate(request);
                string fullKey = $"{request.TenantId}:{operation.ObjectKey}";

                if (operation.OperationType == "PutObject")
                {
                    if (operation.Payload == null)
                    {
                        return translator.FormatResponse(request.Protocol, 400, Encoding.UTF8.GetBytes("<Error><Message>Empty payload</Message></Error>"));
                    }

                    MockStorageBackend[fullKey] = operation.Payload;
                    
                    // Create mock metadata record
                    var metadata = new ObjectMetadata(
                        Guid.NewGuid(),
                        operation.ObjectKey,
                        operation.Payload.Length,
                        "mock-hash",
                        new List<string> { "mock-chunk" },
                        request.TenantId,
                        "Hot",
                        operation.Metadata,
                        DateTime.UtcNow
                    );
                    await _metadataService.CreateObjectAsync(metadata);

                    return translator.FormatResponse(request.Protocol, 200, Encoding.UTF8.GetBytes("<Success/>"));
                }
                else if (operation.OperationType == "GetObject")
                {
                    if (MockStorageBackend.TryGetValue(fullKey, out var val))
                    {
                        var meta = await _metadataService.GetObjectAsync(operation.ObjectKey, request.TenantId);
                        var headers = new Dictionary<string, string>();
                        if (meta != null)
                        {
                            headers["Content-Length"] = meta.Size.ToString();
                        }
                        return translator.FormatResponse(request.Protocol, 200, val, headers);
                    }
                    return translator.FormatResponse(request.Protocol, 404, Encoding.UTF8.GetBytes("<Error><Message>Not Found</Message></Error>"));
                }
                else if (operation.OperationType == "DeleteObject")
                {
                    MockStorageBackend.TryRemove(fullKey, out _);
                    await _metadataService.DeleteObjectAsync(operation.ObjectKey, request.TenantId);
                    return translator.FormatResponse(request.Protocol, 204, null);
                }
                else if (operation.OperationType == "HeadObject" || operation.OperationType == "ListProperties")
                {
                    var meta = await _metadataService.GetObjectAsync(operation.ObjectKey, request.TenantId);
                    if (meta != null)
                    {
                        var headers = new Dictionary<string, string>
                        {
                            { "Content-Length", meta.Size.ToString() },
                            { "Last-Modified", meta.LastModified.ToString("R") }
                        };
                        return translator.FormatResponse(request.Protocol, 200, null, headers);
                    }
                    return translator.FormatResponse(request.Protocol, 404, null);
                }

                return translator.FormatResponse(request.Protocol, 400, Encoding.UTF8.GetBytes("<Error><Message>Unknown operation</Message></Error>"));
            }
            catch (Exception ex)
            {
                return translator.FormatResponse(request.Protocol, 500, Encoding.UTF8.GetBytes($"<Error><Message>{ex.Message}</Message></Error>"));
            }
        }

        public IReadOnlyList<GatewayProtocol> GetSupportedProtocols()
        {
            return new List<GatewayProtocol> { GatewayProtocol.S3, GatewayProtocol.WebDAV };
        }
    }
}
