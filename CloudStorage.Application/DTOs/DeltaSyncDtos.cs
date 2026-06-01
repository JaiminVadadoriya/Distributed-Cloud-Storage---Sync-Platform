using System;
using System.Collections.Generic;

namespace CloudStorage.Application.DTOs
{
    public class DeltaSyncRequestDto
    {
        public DateTime SinceUtc { get; set; }
    }

    public class DeltaSyncResponseDto
    {
        public DateTime ServerTimestampUtc { get; set; }
        public IEnumerable<FileListDto> ChangedFiles { get; set; } = new List<FileListDto>();
        public IEnumerable<Guid> DeletedFileIds { get; set; } = new List<Guid>();
    }
}
