using DevDock.Core.Models;

namespace DevDock.Core.Services;

public interface IGitService
{
    Task<bool> IsGitInstalledAsync();
    Task<bool> IsGitRepositoryAsync(string path);
    Task<GitRepoStatus> GetStatusAsync(string repoPath);
    Task StageFileAsync(string repoPath, string filePath);
    Task UnstageFileAsync(string repoPath, string filePath);
    Task StageAllAsync(string repoPath);
    Task UnstageAllAsync(string repoPath);
    Task DiscardChangesAsync(string repoPath, string filePath);
    Task<string> CommitAsync(GitCommitRequest request);
    Task<string> PushAsync(string repoPath, string? remote = null, string? branch = null);
    Task<string> PullAsync(string repoPath, string? remote = null, string? branch = null);
    Task<string> FetchAsync(string repoPath, string? remote = null);
    Task<List<GitBranchItem>> GetBranchesAsync(string repoPath);
    Task CheckoutBranchAsync(string repoPath, string branchName);
    Task CreateBranchAsync(string repoPath, string branchName, bool checkout = true);
    Task<List<GitCommitItem>> GetRecentCommitsAsync(string repoPath, int count = 25);
    Task<GitDiffResult> GetFileDiffAsync(string repoPath, string filePath, bool staged = false, int contextLines = 3);
    Task<string> StashAsync(string repoPath, string? message = null);
    Task<string> StashPopAsync(string repoPath);
    Task<List<GitStashItem>> GetStashesAsync(string repoPath);
    Task<string> ApplyStashAsync(string repoPath, int index);
    Task<string> DropStashAsync(string repoPath, int index);
    Task DeleteBranchAsync(string repoPath, string branchName, bool force = false);
    Task RenameBranchAsync(string repoPath, string oldName, string newName);
    Task<List<GitRemoteItem>> GetRemotesAsync(string repoPath);
    Task AddRemoteAsync(string repoPath, string name, string url);
    Task RemoveRemoteAsync(string repoPath, string name);
    Task<List<GitTagItem>> GetTagsAsync(string repoPath);
    Task CreateTagAsync(string repoPath, string name, string? message = null);
    Task PushTagAsync(string repoPath, string name, string? remote = null);
    Task DeleteTagAsync(string repoPath, string name);
    Task<string> MergeAsync(string repoPath, string branchName);
    Task<string> RebaseAsync(string repoPath, string branchName);
    Task<string> ResetAsync(string repoPath, string targetRef, string mode);
    Task<string> RevertAsync(string repoPath, string commitHash);
    Task<string> CherryPickAsync(string repoPath, string commitHash);
    Task<GitCommitDetailResult> GetCommitDetailsAsync(string repoPath, string commitHash);
    Task<GitGlobalConfig> GetGlobalConfigAsync();
    Task<bool> SetGlobalConfigAsync(GitGlobalConfig config);
    Task<SetupActionResult> InstallGitViaWingetAsync();
    Task<string> InitRepositoryAsync(string repoPath);
    Task<GithubActionSetupResult> SetupGithubActionAsync(GithubActionSetupRequest request);
    Task<RepoTechInspectionResult> InspectRepositoryTechAsync(InspectRepoRequest request);
    Task<GitIgnoreInfo> GetGitIgnoreAsync(string repoPath);
    Task<bool> SaveGitIgnoreAsync(SaveGitIgnoreRequest request);
    Task<bool> AddToGitIgnoreAsync(AddToGitIgnoreRequest request);
    Task<Dictionary<string, string>> GetGitIgnoreTemplatesAsync();
}
