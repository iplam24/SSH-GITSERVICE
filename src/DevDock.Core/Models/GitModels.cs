namespace DevDock.Core.Models;

public enum GitFileDeltaType
{
    Untracked,
    Modified,
    Added,
    Deleted,
    Renamed,
    Copied,
    Ignored,
    Conflicted
}

public class GitFileStatus
{
    public string Path { get; set; } = string.Empty;
    public string? OldPath { get; set; }
    public GitFileDeltaType Status { get; set; }
    public bool IsStaged { get; set; }
}

public class GitRepoStatus
{
    public string RepoPath { get; set; } = string.Empty;
    public string CurrentBranch { get; set; } = string.Empty;
    public string? UpstreamBranch { get; set; }
    public int AheadCount { get; set; }
    public int BehindCount { get; set; }
    public bool IsClean => StagedFiles.Count == 0 && UnstagedFiles.Count == 0 && UntrackedFiles.Count == 0;
    public List<GitFileStatus> StagedFiles { get; set; } = new();
    public List<GitFileStatus> UnstagedFiles { get; set; } = new();
    public List<GitFileStatus> UntrackedFiles { get; set; } = new();
}

public class GitCommitItem
{
    public string Hash { get; set; } = string.Empty;
    public string ShortHash { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string AuthorEmail { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string RelativeDate { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}

public class GitBranchItem
{
    public string Name { get; set; } = string.Empty;
    public bool IsCurrent { get; set; }
    public bool IsRemote { get; set; }
    public string? UpstreamBranch { get; set; }
}

public enum DiffLineType
{
    Context,
    Added,
    Deleted,
    Header
}

public class DiffLine
{
    public DiffLineType Type { get; set; }
    public int? OldLineNumber { get; set; }
    public int? NewLineNumber { get; set; }
    public string Content { get; set; } = string.Empty;
}

public class DiffHunk
{
    public string Header { get; set; } = string.Empty;
    public int OldStart { get; set; }
    public int OldLines { get; set; }
    public int NewStart { get; set; }
    public int NewLines { get; set; }
    public List<DiffLine> Lines { get; set; } = new();
}

public class GitDiffResult
{
    public string FilePath { get; set; } = string.Empty;
    public string? OldFilePath { get; set; }
    public bool IsBinary { get; set; }
    public List<DiffHunk> Hunks { get; set; } = new();
    public string RawDiff { get; set; } = string.Empty;
}

public class GitCommitRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? AuthorName { get; set; }
    public string? AuthorEmail { get; set; }
}

public class RemoteRepoItem
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string HtmlUrl { get; set; } = string.Empty;
    public string CloneUrl { get; set; } = string.Empty;
    public string? SshUrl { get; set; }
    public bool IsPrivate { get; set; }
    public string DefaultBranch { get; set; } = "main";
    public int StarsCount { get; set; }
    public int ForksCount { get; set; }
    public string? Language { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public string? OwnerAvatarUrl { get; set; }
}

public class CreateRemoteRepoRequest
{
    public string AccountId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsPrivate { get; set; } = true;
    public bool AutoInitReadme { get; set; } = true;
    public string? GitignoreTemplate { get; set; }
}

public class PublishLocalRepoRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string AccountId { get; set; } = string.Empty;
    public string RemoteName { get; set; } = "origin";
    public string RepoName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsPrivate { get; set; } = true;
}

public class CloneRepoRequest
{
    public string CloneUrl { get; set; } = string.Empty;
    public string DestinationPath { get; set; } = string.Empty;
    public string? ProjectName { get; set; }
    public bool AddToProjects { get; set; } = true;
}

public class PushToRemoteRepoRequest
{
    public string AccountId { get; set; } = string.Empty;
    public string RepoPath { get; set; } = string.Empty;
    public string CloneUrl { get; set; } = string.Empty;
    public string RemoteName { get; set; } = "origin";
    public string Branch { get; set; } = "main";
    public bool AutoCommitAll { get; set; } = true;
    public string CommitMessage { get; set; } = "Update from DevDock";
    public bool ForcePush { get; set; } = false;
}

public class GitPushResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Output { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string RemoteUrl { get; set; } = string.Empty;
}

public class GitRemoteItem
{
    public string Name { get; set; } = string.Empty;
    public string FetchUrl { get; set; } = string.Empty;
    public string PushUrl { get; set; } = string.Empty;
}

public class GitTagItem
{
    public string Name { get; set; } = string.Empty;
    public string CommitHash { get; set; } = string.Empty;
    public string? Message { get; set; }
    public DateTime? Date { get; set; }
}

public class GitStashItem
{
    public int Index { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
}

public class GitCommitFileChange
{
    public string FilePath { get; set; } = string.Empty;
    public GitFileDeltaType Status { get; set; }
    public int Additions { get; set; }
    public int Deletions { get; set; }
}

public class GitCommitDetailResult
{
    public GitCommitItem Commit { get; set; } = new();
    public List<GitCommitFileChange> ChangedFiles { get; set; } = new();
    public string Diff { get; set; } = string.Empty;
}

public class GitMergeRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
}

public class GitRebaseRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
}

public class GitResetRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string TargetRef { get; set; } = "HEAD~1";
    public string Mode { get; set; } = "mixed"; // soft, mixed, hard
}

public class GitCherryPickRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string CommitHash { get; set; } = string.Empty;
}

public class GitRateLimitInfo
{
    public int Limit { get; set; }
    public int Remaining { get; set; }
    public DateTime ResetTime { get; set; }
}

public class GitAddRemoteRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

public class GitRemoveRemoteRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class GitCreateTagRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Message { get; set; }
}

public class GitPushTagRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Remote { get; set; }
}

public class GitDeleteTagRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class GitStashIndexRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public int Index { get; set; }
}

public class GitDeleteBranchRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public bool Force { get; set; }
}

public class GitRenameBranchRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string OldName { get; set; } = string.Empty;
    public string NewName { get; set; } = string.Empty;
}

public class GitRevertRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string CommitHash { get; set; } = string.Empty;
}

public class GitGlobalConfig
{
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string DefaultBranch { get; set; } = "main";
    public string AutoCrlf { get; set; } = "true";
    public string CredentialHelper { get; set; } = "manager";
    public bool IsGitInstalled { get; set; }
    public string GitVersion { get; set; } = string.Empty;
}

public class InspectRepoRequest
{
    public string? RepoPath { get; set; }
    public string? AccountId { get; set; }
    public string? RemoteRepoFullName { get; set; }
}

public class RepoTechInspectionResult
{
    public bool Success { get; set; } = true;
    public string TechStack { get; set; } = "NodeJs"; // NodeJs, DotNet, Docker, Python, Go, Static, Java, Rust
    public string Framework { get; set; } = "Unknown"; // e.g. Next.js, Vite + React, ASP.NET Core, FastAPI
    public string PackageManager { get; set; } = "npm"; // npm, pnpm, yarn, bun, dotnet, pip
    public string BuildCommand { get; set; } = "npm run build";
    public string TestCommand { get; set; } = "npm test";
    public string StartCommand { get; set; } = "npm start";
    public int AppPort { get; set; } = 3000;
    public bool HasDockerfile { get; set; }
    public bool HasDockerCompose { get; set; }
    public bool HasExistingWorkflow { get; set; }
    public List<string> ExistingWorkflows { get; set; } = new();
    public string SuggestedDeployType { get; set; } = "SSH_RSYNC"; // SSH_RSYNC, SSH_DOCKER
    public string Recommendation { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
}

public class GithubActionSetupRequest
{
    public string RepoPath { get; set; } = string.Empty;
    public string? AccountId { get; set; }
    public string? RemoteRepoFullName { get; set; }
    public string DeployType { get; set; } = "SSH_RSYNC"; // SSH_RSYNC, SSH_DOCKER, SSH_SCRIPT, DOCKER_BUILD_PUSH
    public string TechStack { get; set; } = "NodeJs"; // NodeJs, DotNet, Docker, Python, Go, Static
    public string TargetBranch { get; set; } = "main";
    public string WorkflowFileName { get; set; } = "deploy.yml";
    public string ServerHost { get; set; } = string.Empty;
    public string ServerUser { get; set; } = "root";
    public int ServerPort { get; set; } = 22;
    public string DeployDirectory { get; set; } = "/var/www/app";
    public string? PostDeployScript { get; set; }
    public bool AutoCommit { get; set; } = true;
    public string? CustomWorkflowYaml { get; set; }
    public bool IncludeCaching { get; set; } = true;
    public bool IncludeHealthCheck { get; set; } = true;
    public int HealthCheckPort { get; set; } = 3000;
    public bool GenerateDockerfile { get; set; } = false;
    public bool GenerateDockerCompose { get; set; } = false;
    public bool GeneratePm2Config { get; set; } = false;
    public bool GenerateSystemd { get; set; } = false;
}

public class GithubActionSetupResult
{
    public bool Success { get; set; }
    public string WorkflowFilePath { get; set; } = string.Empty;
    public string WorkflowContent { get; set; } = string.Empty;
    public List<string> RequiredSecrets { get; set; } = new();
    public List<string> GeneratedFiles { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}
