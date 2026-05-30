using System;
using System.Collections.Generic;
using CloudStorage.Application.Interfaces.Gateway;

namespace CloudStorage.Infrastructure.Gateway
{
    public class S3ProtocolTranslator : IProtocolTranslator
    {
        public StorageOperation Translate(GatewayRequest request)
        {
            if (request.Protocol != GatewayProtocol.S3)
                throw new ArgumentException("Invalid protocol, expected S3.");

            // Path format: "/bucket-name/object-key"
            var parts = request.Path.TrimStart('/').Split('/', 2);
            var bucket = parts.Length > 0 ? parts[0] : "default-bucket";
            var key = parts.Length > 1 ? parts[1] : string.Empty;

            string opType = request.Method.ToUpper() switch
            {
                "GET" => "GetObject",
                "PUT" => "PutObject",
                "DELETE" => "DeleteObject",
                "HEAD" => "HeadObject",
                _ => "Unknown"
            };

            var meta = new Dictionary<string, string>();
            foreach (var h in request.Headers)
            {
                meta[h.Key] = h.Value;
            }

            return new StorageOperation(opType, key, bucket, request.Body, meta);
        }

        public GatewayResponse FormatResponse(GatewayProtocol protocol, int statusCode, byte[]? body, Dictionary<string, string>? metadata = null)
        {
            var headers = new Dictionary<string, string>
            {
                { "Server", "AmazonS3" },
                { "x-amz-request-id", Guid.NewGuid().ToString() }
            };

            if (metadata != null)
            {
                foreach (var m in metadata)
                {
                    headers[m.Key] = m.Value;
                }
            }

            return new GatewayResponse(statusCode, body, headers, "application/xml");
        }
    }
}
