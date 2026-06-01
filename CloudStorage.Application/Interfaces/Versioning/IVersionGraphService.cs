using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Versioning
{
    public record VersionNode(string VersionId, string ParentVersionId, string Hash, string Author, string BranchName);

    public interface IVersionGraphService
    {
        Task<VersionNode> AddVersionAsync(string objectKey, string parentId, string hash, string author, string branch);
        Task<List<VersionNode>> GetHistoryAsync(string objectKey);
        Task<VersionNode> MergeVersionsAsync(string objectKey, string baseBranch, string sourceBranch);
    }
}
