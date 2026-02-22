using System;

namespace CloudStorage.Application.DTOs
{
    public class FileEventDto
    {
        public Guid FileId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public long Size { get; set; }
        public string EventType { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public int OwnerId { get; set; }
    }
}
