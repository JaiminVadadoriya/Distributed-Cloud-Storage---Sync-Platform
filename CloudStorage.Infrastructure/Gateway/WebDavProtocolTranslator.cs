using System;
using System.Collections.Generic;
using CloudStorage.Application.Interfaces.Gateway;

namespace CloudStorage.Infrastructure.Gateway
{
    public class WebDavProtocolTranslator : IProtocolTranslator
    {
        public StorageOperation Translate(GatewayRequest request)
        {
            if (request.Protocol != GatewayProtocol.WebDAV)
                throw new ArgumentException("Invalid protocol, expected WebDAV.");

            var key = request.Path.TrimStart('/');

            string opType = request.Method.ToUpper() switch
            {
                "PROPFIND" => "ListProperties",
                "MKCOL" => "CreateCollection",
                "PUT" => "PutObject",
                "GET" => "GetObject",
                "DELETE" => "DeleteObject",
                "MOVE" => "MoveObject",
                _ => "Unknown"
            };

            var meta = new Dictionary<string, string>();
            foreach (var h in request.Headers)
            {
                meta[h.Key] = h.Value;
            }

            return new StorageOperation(opType, key, "webdav-root", request.Body, meta);
        }

        public GatewayResponse FormatResponse(GatewayProtocol protocol, int statusCode, byte[]? body, Dictionary<string, string>? metadata = null)
        {
            var headers = new Dictionary<string, string>
            {
                { "DAV", "1, 2" },
                { "MS-Author-Via", "DAV" }
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
