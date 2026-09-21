using DevDock.Core.Models;

namespace DevDock.Core.Services;

public interface IGitProviderService
{
    Task<List<RemoteRepoItem>> ListRemoteRepositoriesAsync(string accountId, string? search = null, int page = 1, int pageSize = 30);
    Task<RemoteRepoItem> CreateRemoteRepositoryAsync(CreateRemoteRepoRequest request);
    Task<RemoteRepoItem> PublishLocalRepositoryAsync(PublishLocalRepoRequest request);
    Task<string> CloneRepositoryAsync(CloneRepoRequest request);
    Task<GitPushResult> PushToRemoteRepositoryAsync(PushToRemoteRepoRequest request);
    Task<GitRateLimitInfo?> GetRateLimitAsync(string accountId);
}
