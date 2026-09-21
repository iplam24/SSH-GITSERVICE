using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using DevDock.Core.Models;
using DevDock.Core.Services;

namespace DevDock.Git.Services;

public class GitService : IGitService
{
    private readonly ISettingsService? _settingsService;
    private readonly ICredentialService? _credentialService;
    private readonly HttpClient? _httpClient;

    public GitService(
        ISettingsService? settingsService = null,
        ICredentialService? credentialService = null,
        IHttpClientFactory? httpClientFactory = null)
    {
        _settingsService = settingsService;
        _credentialService = credentialService;
        _httpClient = httpClientFactory?.CreateClient();
    }

    private static async Task<(int ExitCode, string StdOut, string StdErr)> RunGitAsync(string repoPath, string arguments, CancellationToken ct = default)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "git",
            Arguments = arguments,
            WorkingDirectory = string.IsNullOrWhiteSpace(repoPath) ? Environment.CurrentDirectory : repoPath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8
        };

        // Ensure Git uses UTF-8 for paths
        psi.EnvironmentVariables["LC_ALL"] = "C.UTF-8";
        psi.EnvironmentVariables["GIT_PAGER"] = "cat";

        using var process = new Process { StartInfo = psi };
        var stdoutBuilder = new StringBuilder();
        var stderrBuilder = new StringBuilder();

        process.OutputDataReceived += (_, e) => { if (e.Data != null) stdoutBuilder.AppendLine(e.Data); };
        process.ErrorDataReceived += (_, e) => { if (e.Data != null) stderrBuilder.AppendLine(e.Data); };

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        await process.WaitForExitAsync(ct);
        return (process.ExitCode, stdoutBuilder.ToString().TrimEnd(), stderrBuilder.ToString().TrimEnd());
    }

    public async Task<bool> IsGitInstalledAsync()
    {
        try
        {
            var (exitCode, _, _) = await RunGitAsync("", "--version");
            return exitCode == 0;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> IsGitRepositoryAsync(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || !Directory.Exists(path))
            return false;

        try
        {
            var (exitCode, stdout, _) = await RunGitAsync(path, "rev-parse --is-inside-work-tree");
            return exitCode == 0 && stdout.Contains("true", StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    public async Task<GitRepoStatus> GetStatusAsync(string repoPath)
    {
        var status = new GitRepoStatus { RepoPath = repoPath };

        // Branch status
        var (branchExit, branchOut, _) = await RunGitAsync(repoPath, "status --porcelain=v1 -b");
        if (branchExit != 0) return status;

        var lines = branchOut.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        if (lines.Length == 0) return status;

        // First line contains branch info: e.g. ## develop...origin/develop [ahead 1, behind 2]
        var firstLine = lines[0].Trim();
        if (firstLine.StartsWith("##"))
        {
            var header = firstLine.Substring(2).Trim();
            ParseBranchHeader(header, status);
        }

        for (int i = 1; i < lines.Length; i++)
        {
            var line = lines[i];
            if (line.Length < 3) continue;

            char stagedCode = line[0];
            char unstagedCode = line[1];
            string filePath = line.Substring(3).Trim();

            // Untracked
            if (stagedCode == '?' && unstagedCode == '?')
            {
                status.UntrackedFiles.Add(new GitFileStatus
                {
                    Path = filePath,
                    Status = GitFileDeltaType.Untracked,
                    IsStaged = false
                });
                continue;
            }

            // Staged file
            if (stagedCode != ' ' && stagedCode != '?')
            {
                status.StagedFiles.Add(new GitFileStatus
                {
                    Path = filePath,
                    Status = MapGitCode(stagedCode),
                    IsStaged = true
                });
            }

            // Unstaged file
            if (unstagedCode != ' ' && unstagedCode != '?')
            {
                status.UnstagedFiles.Add(new GitFileStatus
                {
                    Path = filePath,
                    Status = MapGitCode(unstagedCode),
                    IsStaged = false
                });
            }
        }

        return status;
    }

    private static void ParseBranchHeader(string header, GitRepoStatus status)
    {
        // e.g. "main...origin/main [ahead 1, behind 2]" or "No commits yet on main"
        if (header.StartsWith("No commits yet on ", StringComparison.OrdinalIgnoreCase))
        {
            status.CurrentBranch = header.Substring("No commits yet on ".Length).Trim();
            return;
        }

        var bracketIndex = header.IndexOf('[');
        if (bracketIndex >= 0)
        {
            var counts = header.Substring(bracketIndex).Trim('[', ']');
            header = header.Substring(0, bracketIndex).Trim();

            if (counts.Contains("ahead"))
            {
                var match = System.Text.RegularExpressions.Regex.Match(counts, @"ahead\s+(\d+)");
                if (match.Success) status.AheadCount = int.Parse(match.Groups[1].Value);
            }
            if (counts.Contains("behind"))
            {
                var match = System.Text.RegularExpressions.Regex.Match(counts, @"behind\s+(\d+)");
                if (match.Success) status.BehindCount = int.Parse(match.Groups[1].Value);
            }
        }

        var parts = header.Split("...", StringSplitOptions.RemoveEmptyEntries);
        status.CurrentBranch = parts[0].Trim();
        if (parts.Length > 1)
        {
            status.UpstreamBranch = parts[1].Trim();
        }
    }

    private static GitFileDeltaType MapGitCode(char code) => code switch
    {
        'M' => GitFileDeltaType.Modified,
        'A' => GitFileDeltaType.Added,
        'D' => GitFileDeltaType.Deleted,
        'R' => GitFileDeltaType.Renamed,
        'C' => GitFileDeltaType.Copied,
        'U' => GitFileDeltaType.Conflicted,
        _ => GitFileDeltaType.Modified
    };

    public async Task StageFileAsync(string repoPath, string filePath)
    {
        var (code, _, err) = await RunGitAsync(repoPath, $"add -- \"{filePath}\"");
        if (code != 0) throw new InvalidOperationException($"Failed to stage file '{filePath}': {err}");
    }

    public async Task UnstageFileAsync(string repoPath, string filePath)
    {
        var (code, _, err) = await RunGitAsync(repoPath, $"restore --staged -- \"{filePath}\"");
        if (code != 0)
        {
            // Fallback for older git
            await RunGitAsync(repoPath, $"reset HEAD -- \"{filePath}\"");
        }
    }

    public async Task StageAllAsync(string repoPath)
    {
        var (code, _, err) = await RunGitAsync(repoPath, "add -A");
        if (code != 0) throw new InvalidOperationException($"Failed to stage all: {err}");
    }

    public async Task UnstageAllAsync(string repoPath)
    {
        var (code, _, _) = await RunGitAsync(repoPath, "restore --staged .");
        if (code != 0)
        {
            await RunGitAsync(repoPath, "reset HEAD");
        }
    }

    public async Task DiscardChangesAsync(string repoPath, string filePath)
    {
        // For tracked files
        await RunGitAsync(repoPath, $"restore -- \"{filePath}\"");
        // For untracked files
        await RunGitAsync(repoPath, $"clean -fd -- \"{filePath}\"");
    }

    public async Task<string> CommitAsync(GitCommitRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            throw new ArgumentException("Commit message cannot be empty");

        var escapedMsg = request.Message.Replace("\"", "\\\"");
        var args = $"commit -m \"{escapedMsg}\"";

        if (!string.IsNullOrEmpty(request.AuthorName) && !string.IsNullOrEmpty(request.AuthorEmail))
        {
            args += $" --author=\"{request.AuthorName} <{request.AuthorEmail}>\"";
        }

        var (code, stdout, stderr) = await RunGitAsync(request.RepoPath, args);
        if (code != 0)
        {
            throw new InvalidOperationException($"Commit failed: {stderr}");
        }
        return stdout;
    }

    public async Task<string> PushAsync(string repoPath, string? remote = null, string? branch = null)
    {
        var r = string.IsNullOrWhiteSpace(remote) ? "origin" : remote;
        var args = string.IsNullOrWhiteSpace(branch) ? $"push {r}" : $"push {r} {branch}";

        var (code, stdout, stderr) = await RunGitAsync(repoPath, args);
        if (code != 0) throw new InvalidOperationException($"Push failed: {stderr}");
        return string.IsNullOrWhiteSpace(stdout) ? stderr : stdout;
    }

    public async Task<string> PullAsync(string repoPath, string? remote = null, string? branch = null)
    {
        var r = string.IsNullOrWhiteSpace(remote) ? "origin" : remote;
        var args = string.IsNullOrWhiteSpace(branch) ? $"pull {r}" : $"pull {r} {branch}";

        var (code, stdout, stderr) = await RunGitAsync(repoPath, args);
        if (code != 0) throw new InvalidOperationException($"Pull failed: {stderr}");
        return stdout;
    }

    public async Task<string> FetchAsync(string repoPath, string? remote = null)
    {
        var args = string.IsNullOrWhiteSpace(remote) ? "fetch --all --prune" : $"fetch {remote} --prune";
        var (code, stdout, stderr) = await RunGitAsync(repoPath, args);
        if (code != 0) throw new InvalidOperationException($"Fetch failed: {stderr}");
        return string.IsNullOrWhiteSpace(stdout) ? stderr : stdout;
    }

    public async Task<List<GitBranchItem>> GetBranchesAsync(string repoPath)
    {
        var list = new List<GitBranchItem>();
        var (code, stdout, _) = await RunGitAsync(repoPath, "branch -a --no-color");
        if (code != 0) return list;

        var lines = stdout.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (string.IsNullOrWhiteSpace(line)) continue;

            bool isCurrent = rawLine.StartsWith("*");
            string branchName = line.TrimStart('*', ' ');

            if (branchName.Contains("->"))
            {
                // Pointer like origin/HEAD -> origin/main
                continue;
            }

            bool isRemote = branchName.StartsWith("remotes/");
            if (isRemote)
            {
                branchName = branchName.Substring("remotes/".Length);
            }

            list.Add(new GitBranchItem
            {
                Name = branchName,
                IsCurrent = isCurrent,
                IsRemote = isRemote
            });
        }

        return list;
    }

    public async Task CheckoutBranchAsync(string repoPath, string branchName)
    {
        var (code, _, stderr) = await RunGitAsync(repoPath, $"checkout \"{branchName}\"");
        if (code != 0) throw new InvalidOperationException($"Checkout failed: {stderr}");
    }

    public async Task CreateBranchAsync(string repoPath, string branchName, bool checkout = true)
    {
        var flag = checkout ? "-b " : "";
        var (code, _, stderr) = await RunGitAsync(repoPath, $"checkout {flag}\"{branchName}\"");
        if (code != 0) throw new InvalidOperationException($"Create branch failed: {stderr}");
    }

    public async Task<List<GitCommitItem>> GetRecentCommitsAsync(string repoPath, int count = 25)
    {
        var list = new List<GitCommitItem>();
        // Format: %H%x00%h%x00%an%x00%ae%x00%aI%x00%ar%x00%s%x00%b%x1e
        var format = "%H%x00%h%x00%an%x00%ae%x00%aI%x00%ar%x00%s%x00%b%x1e";
        var (code, stdout, _) = await RunGitAsync(repoPath, $"log -n {count} --pretty=format:\"{format}\"");
        if (code != 0 || string.IsNullOrWhiteSpace(stdout)) return list;

        var records = stdout.Split('\x1e', StringSplitOptions.RemoveEmptyEntries);
        foreach (var record in records)
        {
            var fields = record.Trim('\r', '\n').Split('\0');
            if (fields.Length < 7) continue;

            DateTime.TryParse(fields[4], out var dt);
            list.Add(new GitCommitItem
            {
                Hash = fields[0],
                ShortHash = fields[1],
                AuthorName = fields[2],
                AuthorEmail = fields[3],
                Date = dt,
                RelativeDate = fields[5],
                Subject = fields[6],
                Body = fields.Length > 7 ? fields[7] : ""
            });
        }

        return list;
    }

    public async Task<GitDiffResult> GetFileDiffAsync(string repoPath, string filePath, bool staged = false)
    {
        // Check if untracked
        var fullPath = Path.IsPathRooted(filePath) ? filePath : Path.Combine(repoPath, filePath);
        if (!staged && File.Exists(fullPath))
        {
            // If it's completely untracked, git diff will return empty, so we generate added diff
            var status = await GetStatusAsync(repoPath);
            if (status.UntrackedFiles.Any(f => f.Path.Equals(filePath, StringComparison.OrdinalIgnoreCase)))
            {
                try
                {
                    var fileContent = await File.ReadAllTextAsync(fullPath, Encoding.UTF8);
                    return GitDiffParser.CreateSyntheticAddedDiff(fileContent, filePath);
                }
                catch { }
            }
        }

        var flag = staged ? "--cached " : "";
        var (code, stdout, _) = await RunGitAsync(repoPath, $"diff {flag}-- \"{filePath}\"");

        return GitDiffParser.Parse(stdout, filePath);
    }

    public async Task<string> StashAsync(string repoPath, string? message = null)
    {
        var args = string.IsNullOrWhiteSpace(message) ? "stash" : $"stash push -m \"{message}\"";
        var (code, stdout, stderr) = await RunGitAsync(repoPath, args);
        if (code != 0) throw new InvalidOperationException($"Stash failed: {stderr}");
        return stdout;
    }

    public async Task<string> StashPopAsync(string repoPath)
    {
        var (code, stdout, stderr) = await RunGitAsync(repoPath, "stash pop");
        if (code != 0) throw new InvalidOperationException($"Stash pop failed: {stderr}");
        return stdout;
    }

    public async Task<List<GitStashItem>> GetStashesAsync(string repoPath)
    {
        var list = new List<GitStashItem>();
        // %gd (stash@{0}), %gs (message), %cr (relative date)
        var (code, stdout, _) = await RunGitAsync(repoPath, "stash list --pretty=format:\"%gd%x00%gs%x00%cr\"");
        if (code != 0 || string.IsNullOrWhiteSpace(stdout)) return list;

        var lines = stdout.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        int idx = 0;
        foreach (var line in lines)
        {
            var parts = line.Trim().Split('\0');
            if (parts.Length < 2) continue;

            var matchIdx = System.Text.RegularExpressions.Regex.Match(parts[0], @"\{(\d+)\}");
            int stashIndex = matchIdx.Success ? int.Parse(matchIdx.Groups[1].Value) : idx++;

            list.Add(new GitStashItem
            {
                Index = stashIndex,
                Branch = parts[0],
                Message = parts[1],
                Date = parts.Length > 2 ? parts[2] : ""
            });
        }
        return list;
    }

    public async Task<string> ApplyStashAsync(string repoPath, int index)
    {
        var (code, stdout, stderr) = await RunGitAsync(repoPath, $"stash apply stash@{{{index}}}");
        if (code != 0) throw new InvalidOperationException($"Apply stash failed: {stderr}");
        return stdout;
    }

    public async Task<string> DropStashAsync(string repoPath, int index)
    {
        var (code, stdout, stderr) = await RunGitAsync(repoPath, $"stash drop stash@{{{index}}}");
        if (code != 0) throw new InvalidOperationException($"Drop stash failed: {stderr}");
        return stdout;
    }

    public async Task DeleteBranchAsync(string repoPath, string branchName, bool force = false)
    {
        var flag = force ? "-D" : "-d";
        var (code, _, stderr) = await RunGitAsync(repoPath, $"branch {flag} \"{branchName}\"");
        if (code != 0) throw new InvalidOperationException($"Delete branch failed: {stderr}");
    }

    public async Task RenameBranchAsync(string repoPath, string oldName, string newName)
    {
        var (code, _, stderr) = await RunGitAsync(repoPath, $"branch -m \"{oldName}\" \"{newName}\"");
        if (code != 0) throw new InvalidOperationException($"Rename branch failed: {stderr}");
    }

    public async Task<List<GitRemoteItem>> GetRemotesAsync(string repoPath)
    {
        var list = new List<GitRemoteItem>();
        var (code, stdout, _) = await RunGitAsync(repoPath, "remote -v");
        if (code != 0 || string.IsNullOrWhiteSpace(stdout)) return list;

        var lines = stdout.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        var dict = new Dictionary<string, GitRemoteItem>(StringComparer.OrdinalIgnoreCase);

        foreach (var line in lines)
        {
            var parts = line.Split('\t', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 2) continue;

            var name = parts[0].Trim();
            var urlAndType = parts[1].Trim().Split(' ');
            var url = urlAndType[0];
            var type = urlAndType.Length > 1 ? urlAndType[1].Trim('(', ')') : "fetch";

            if (!dict.TryGetValue(name, out var item))
            {
                item = new GitRemoteItem { Name = name, FetchUrl = url, PushUrl = url };
                dict[name] = item;
            }

            if (type.Equals("push", StringComparison.OrdinalIgnoreCase))
                item.PushUrl = url;
            else
                item.FetchUrl = url;
        }

        return dict.Values.ToList();
    }

    public async Task AddRemoteAsync(string repoPath, string name, string url)
    {
        var (code, _, stderr) = await RunGitAsync(repoPath, $"remote add \"{name}\" \"{url}\"");
        if (code != 0) throw new InvalidOperationException($"Add remote failed: {stderr}");
    }

    public async Task RemoveRemoteAsync(string repoPath, string name)
    {
        var (code, _, stderr) = await RunGitAsync(repoPath, $"remote remove \"{name}\"");
        if (code != 0) throw new InvalidOperationException($"Remove remote failed: {stderr}");
    }

    public async Task<List<GitTagItem>> GetTagsAsync(string repoPath)
    {
        var list = new List<GitTagItem>();
        var format = "%(refname:short)%00%(objectname:short)%00%(subject)%00%(creatordate:iso8601)";
        var (code, stdout, _) = await RunGitAsync(repoPath, $"tag -l --sort=-creatordate --format=\"{format}\"");
        if (code != 0 || string.IsNullOrWhiteSpace(stdout)) return list;

        var lines = stdout.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        foreach (var line in lines)
        {
            var parts = line.Trim().Split('\0');
            if (parts.Length < 2) continue;

            DateTime? dt = null;
            if (parts.Length > 3 && DateTime.TryParse(parts[3], out var d)) dt = d;

            list.Add(new GitTagItem
            {
                Name = parts[0],
                CommitHash = parts[1],
                Message = parts.Length > 2 ? parts[2] : null,
                Date = dt
            });
        }
        return list;
    }

    public async Task CreateTagAsync(string repoPath, string name, string? message = null)
    {
        var args = string.IsNullOrWhiteSpace(message)
            ? $"tag \"{name}\""
            : $"tag -a \"{name}\" -m \"{message.Replace("\"", "\\\"")}\"";

        var (code, _, stderr) = await RunGitAsync(repoPath, args);
        if (code != 0) throw new InvalidOperationException($"Create tag failed: {stderr}");
    }

    public async Task PushTagAsync(string repoPath, string name, string? remote = null)
    {
        var r = string.IsNullOrWhiteSpace(remote) ? "origin" : remote;
        var (code, stdout, stderr) = await RunGitAsync(repoPath, $"push {r} \"{name}\"");
        if (code != 0) throw new InvalidOperationException($"Push tag failed: {stderr}");
    }

    public async Task DeleteTagAsync(string repoPath, string name)
    {
        var (code, _, stderr) = await RunGitAsync(repoPath, $"tag -d \"{name}\"");
        if (code != 0) throw new InvalidOperationException($"Delete tag failed: {stderr}");
    }

    public async Task<string> MergeAsync(string repoPath, string branchName)
    {
        var (code, stdout, stderr) = await RunGitAsync(repoPath, $"merge \"{branchName}\"");
        if (code != 0) throw new InvalidOperationException($"Merge failed: {stderr}\n{stdout}");
        return stdout;
    }

    public async Task<string> RebaseAsync(string repoPath, string branchName)
    {
        var (code, stdout, stderr) = await RunGitAsync(repoPath, $"rebase \"{branchName}\"");
        if (code != 0) throw new InvalidOperationException($"Rebase failed: {stderr}\n{stdout}");
        return stdout;
    }

    public async Task<string> ResetAsync(string repoPath, string targetRef, string mode)
    {
        var m = mode.ToLowerInvariant() switch
        {
            "soft" => "--soft",
            "hard" => "--hard",
            _ => "--mixed"
        };
        var (code, stdout, stderr) = await RunGitAsync(repoPath, $"reset {m} \"{targetRef}\"");
        if (code != 0) throw new InvalidOperationException($"Reset failed: {stderr}");
        return stdout;
    }

    public async Task<string> RevertAsync(string repoPath, string commitHash)
    {
        var (code, stdout, stderr) = await RunGitAsync(repoPath, $"revert --no-edit \"{commitHash}\"");
        if (code != 0) throw new InvalidOperationException($"Revert failed: {stderr}");
        return stdout;
    }

    public async Task<string> CherryPickAsync(string repoPath, string commitHash)
    {
        var (code, stdout, stderr) = await RunGitAsync(repoPath, $"cherry-pick \"{commitHash}\"");
        if (code != 0) throw new InvalidOperationException($"Cherry-pick failed: {stderr}");
        return stdout;
    }

    public async Task<GitCommitDetailResult> GetCommitDetailsAsync(string repoPath, string commitHash)
    {
        var result = new GitCommitDetailResult();

        // 1. Commit metadata
        var format = "%H%x00%h%x00%an%x00%ae%x00%aI%x00%ar%x00%s%x00%b";
        var (metaCode, metaOut, _) = await RunGitAsync(repoPath, $"show -s --format=\"{format}\" \"{commitHash}\"");
        if (metaCode == 0 && !string.IsNullOrWhiteSpace(metaOut))
        {
            var parts = metaOut.Trim().Split('\0');
            if (parts.Length >= 7)
            {
                DateTime.TryParse(parts[4], out var dt);
                result.Commit = new GitCommitItem
                {
                    Hash = parts[0],
                    ShortHash = parts[1],
                    AuthorName = parts[2],
                    AuthorEmail = parts[3],
                    Date = dt,
                    RelativeDate = parts[5],
                    Subject = parts[6],
                    Body = parts.Length > 7 ? parts[7] : ""
                };
            }
        }

        // 2. Changed files summary: git show --numstat --format="" <commitHash>
        var (statCode, statOut, _) = await RunGitAsync(repoPath, $"show --numstat --format=\"\" \"{commitHash}\"");
        if (statCode == 0 && !string.IsNullOrWhiteSpace(statOut))
        {
            var lines = statOut.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            foreach (var line in lines)
            {
                var parts = line.Split('\t', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 3) continue;

                int.TryParse(parts[0], out var add);
                int.TryParse(parts[1], out var del);
                var fPath = parts[2].Trim();

                result.ChangedFiles.Add(new GitCommitFileChange
                {
                    FilePath = fPath,
                    Additions = add,
                    Deletions = del,
                    Status = GitFileDeltaType.Modified
                });
            }
        }

        // 3. Full diff
        var (diffCode, diffOut, _) = await RunGitAsync(repoPath, $"show \"{commitHash}\"");
        if (diffCode == 0)
        {
            result.Diff = diffOut;
        }

        return result;
    }

    public async Task<GitGlobalConfig> GetGlobalConfigAsync()
    {
        var config = new GitGlobalConfig();
        try
        {
            var (code, version, _) = await RunGitAsync("", "--version");
            if (code == 0)
            {
                config.IsGitInstalled = true;
                config.GitVersion = version;

                var (_, name, _) = await RunGitAsync("", "config --global user.name");
                config.UserName = name.Trim();

                var (_, email, _) = await RunGitAsync("", "config --global user.email");
                config.UserEmail = email.Trim();

                var (_, branch, _) = await RunGitAsync("", "config --global init.defaultBranch");
                config.DefaultBranch = string.IsNullOrWhiteSpace(branch) ? "main" : branch.Trim();

                var (_, crlf, _) = await RunGitAsync("", "config --global core.autocrlf");
                config.AutoCrlf = string.IsNullOrWhiteSpace(crlf) ? "true" : crlf.Trim();

                var (_, cred, _) = await RunGitAsync("", "config --global credential.helper");
                config.CredentialHelper = string.IsNullOrWhiteSpace(cred) ? "manager" : cred.Trim();
            }
        }
        catch
        {
            config.IsGitInstalled = false;
        }
        return config;
    }

    public async Task<bool> SetGlobalConfigAsync(GitGlobalConfig config)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(config.UserName))
                await RunGitAsync("", $"config --global user.name \"{config.UserName.Trim()}\"");

            if (!string.IsNullOrWhiteSpace(config.UserEmail))
                await RunGitAsync("", $"config --global user.email \"{config.UserEmail.Trim()}\"");

            if (!string.IsNullOrWhiteSpace(config.DefaultBranch))
                await RunGitAsync("", $"config --global init.defaultBranch \"{config.DefaultBranch.Trim()}\"");

            if (!string.IsNullOrWhiteSpace(config.AutoCrlf))
                await RunGitAsync("", $"config --global core.autocrlf \"{config.AutoCrlf.Trim()}\"");

            if (!string.IsNullOrWhiteSpace(config.CredentialHelper))
                await RunGitAsync("", $"config --global credential.helper \"{config.CredentialHelper.Trim()}\"");

            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<SetupActionResult> InstallGitViaWingetAsync()
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "winget",
                Arguments = "install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --silent",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            using var proc = Process.Start(psi);
            if (proc == null)
            {
                return new SetupActionResult
                {
                    Success = false,
                    Message = "Không thể khởi động trình quản lý gói winget. Vui lòng kiểm tra Windows Package Manager."
                };
            }

            var stdout = await proc.StandardOutput.ReadToEndAsync();
            var stderr = await proc.StandardError.ReadToEndAsync();
            await proc.WaitForExitAsync();

            return new SetupActionResult
            {
                Success = proc.ExitCode == 0,
                Message = proc.ExitCode == 0
                    ? "Cài đặt Git thành công qua winget! Vui lòng khởi động lại terminal."
                    : $"Cài đặt Git hoàn tất với mã {proc.ExitCode}: {stderr}"
            };
        }
        catch (Exception ex)
        {
            return new SetupActionResult
            {
                Success = false,
                Message = $"Lỗi thực thi winget: {ex.Message}"
            };
        }
    }

    public async Task<string> InitRepositoryAsync(string repoPath)
    {
        if (!Directory.Exists(repoPath)) Directory.CreateDirectory(repoPath);
        var (code, stdout, stderr) = await RunGitAsync(repoPath, "init -b main");
        if (code != 0)
        {
            (code, stdout, stderr) = await RunGitAsync(repoPath, "init");
            if (code != 0) throw new InvalidOperationException($"Git init failed: {stderr}");
        }
        return stdout;
    }

    public async Task<GithubActionSetupResult> SetupGithubActionAsync(GithubActionSetupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RepoPath) || !Directory.Exists(request.RepoPath))
        {
            return new GithubActionSetupResult
            {
                Success = false,
                Message = $"Thư mục kho lưu trữ '{request.RepoPath}' không tồn tại trên máy tính."
            };
        }

        try
        {
            var generatedFiles = new List<string>();
            var workflowsDir = Path.Combine(request.RepoPath, ".github", "workflows");
            if (!Directory.Exists(workflowsDir))
            {
                Directory.CreateDirectory(workflowsDir);
            }

            var fileName = string.IsNullOrWhiteSpace(request.WorkflowFileName) ? "deploy.yml" : request.WorkflowFileName.Trim();
            if (!fileName.EndsWith(".yml", StringComparison.OrdinalIgnoreCase) && !fileName.EndsWith(".yaml", StringComparison.OrdinalIgnoreCase))
            {
                fileName += ".yml";
            }

            var filePath = Path.Combine(workflowsDir, fileName);
            string yamlContent = !string.IsNullOrWhiteSpace(request.CustomWorkflowYaml)
                ? request.CustomWorkflowYaml.Trim()
                : GenerateGithubActionYaml(request);

            await File.WriteAllTextAsync(filePath, yamlContent, Encoding.UTF8);
            generatedFiles.Add($".github/workflows/{fileName}");

            // Generate Auxiliary Deployment Files if requested
            var tech = request.TechStack?.ToLowerInvariant() ?? "nodejs";
            var port = request.HealthCheckPort > 0 ? request.HealthCheckPort : 3000;

            if (request.GenerateDockerfile)
            {
                var dockerfilePath = Path.Combine(request.RepoPath, "Dockerfile");
                await File.WriteAllTextAsync(dockerfilePath, GenerateDockerfileContent(tech, port), Encoding.UTF8);
                generatedFiles.Add("Dockerfile");
            }

            if (request.GenerateDockerCompose)
            {
                var composePath = Path.Combine(request.RepoPath, "docker-compose.yml");
                await File.WriteAllTextAsync(composePath, GenerateDockerComposeContent(port), Encoding.UTF8);
                generatedFiles.Add("docker-compose.yml");
            }

            if (request.GeneratePm2Config)
            {
                var pm2Path = Path.Combine(request.RepoPath, "ecosystem.config.js");
                await File.WriteAllTextAsync(pm2Path, GeneratePm2Content(port), Encoding.UTF8);
                generatedFiles.Add("ecosystem.config.js");
            }

            if (request.GenerateSystemd)
            {
                var systemdPath = Path.Combine(request.RepoPath, "production-app.service");
                await File.WriteAllTextAsync(systemdPath, GenerateSystemdContent(request.DeployDirectory, port), Encoding.UTF8);
                generatedFiles.Add("production-app.service");
            }

            var secrets = new List<string> { "SSH_HOST", "SSH_USER", "SSH_KEY" };
            if (request.ServerPort != 22) secrets.Add("SSH_PORT");
            if (request.DeployType.Contains("DOCKER", StringComparison.OrdinalIgnoreCase))
            {
                secrets.Add("DOCKER_USERNAME");
                secrets.Add("DOCKER_PASSWORD");
            }

            if (request.AutoCommit)
            {
                try
                {
                    foreach (var gf in generatedFiles)
                    {
                        await RunGitAsync(request.RepoPath, $"add \"{gf}\"");
                    }
                    await RunGitAsync(request.RepoPath, "commit -m \"ci: auto setup GitHub Actions deployment workflow & configs via DevDock\"");
                }
                catch { }
            }

            return new GithubActionSetupResult
            {
                Success = true,
                WorkflowFilePath = filePath,
                WorkflowContent = yamlContent,
                RequiredSecrets = secrets,
                GeneratedFiles = generatedFiles,
                Message = $"Đã tự động tạo và cài đặt GitHub Action thành công tại .github/workflows/{fileName} (kèm {generatedFiles.Count} tệp cấu hình)!"
            };
        }
        catch (Exception ex)
        {
            return new GithubActionSetupResult
            {
                Success = false,
                Message = $"Lỗi khi cấu hình GitHub Action: {ex.Message}"
            };
        }
    }

    public async Task<RepoTechInspectionResult> InspectRepositoryTechAsync(InspectRepoRequest request)
    {
        var result = new RepoTechInspectionResult();

        // 1. Kiểm tra thư mục cục bộ nếu có
        if (!string.IsNullOrWhiteSpace(request.RepoPath) && Directory.Exists(request.RepoPath))
        {
            InspectLocalDirectory(request.RepoPath, result);
            return result;
        }

        // 2. Kiểm tra kho từ xa qua GitHub REST API
        if (!string.IsNullOrWhiteSpace(request.AccountId) && !string.IsNullOrWhiteSpace(request.RemoteRepoFullName))
        {
            await InspectRemoteGithubRepoAsync(request.AccountId, request.RemoteRepoFullName, result);
            return result;
        }

        result.Success = false;
        result.Summary = "Vui lòng chọn thư mục cục bộ hoặc kho GitHub để phân tích mã nguồn.";
        return result;
    }

    private void InspectLocalDirectory(string dir, RepoTechInspectionResult res)
    {
        res.Success = true;

        // 1. Kiểm tra workflows có sẵn
        var workflowsDir = Path.Combine(dir, ".github", "workflows");
        if (Directory.Exists(workflowsDir))
        {
            var ymlFiles = Directory.GetFiles(workflowsDir, "*.yml")
                .Concat(Directory.GetFiles(workflowsDir, "*.yaml"))
                .Select(Path.GetFileName)
                .Where(n => !string.IsNullOrEmpty(n))
                .Select(n => n!)
                .ToList();

            if (ymlFiles.Count > 0)
            {
                res.HasExistingWorkflow = true;
                res.ExistingWorkflows = ymlFiles;
            }
        }

        // 2. Kiểm tra Docker
        res.HasDockerfile = File.Exists(Path.Combine(dir, "Dockerfile")) || File.Exists(Path.Combine(dir, "dockerfile"));
        res.HasDockerCompose = File.Exists(Path.Combine(dir, "docker-compose.yml")) || File.Exists(Path.Combine(dir, "docker-compose.yaml")) || File.Exists(Path.Combine(dir, "compose.yaml"));
        if (res.HasDockerCompose || res.HasDockerfile)
        {
            res.SuggestedDeployType = "SSH_DOCKER";
        }

        // 3. Kiểm tra package.json (Node.js / React / Next / Vite / Nest / Express)
        var pkgPath = Path.Combine(dir, "package.json");
        if (File.Exists(pkgPath))
        {
            try
            {
                var pkgContent = File.ReadAllText(pkgPath, Encoding.UTF8);
                ParsePackageJsonContent(pkgContent, dir, res);
                return;
            }
            catch { }
        }

        // 4. Kiểm tra .NET (.csproj / .sln)
        var csprojFiles = Directory.GetFiles(dir, "*.csproj", SearchOption.AllDirectories);
        if (csprojFiles.Length > 0 || Directory.GetFiles(dir, "*.sln").Length > 0)
        {
            res.TechStack = "DotNet";
            res.Framework = "ASP.NET Core / .NET 9";
            res.PackageManager = "dotnet";
            res.BuildCommand = "dotnet publish -c Release -o ./publish";
            res.TestCommand = "dotnet test";
            res.StartCommand = "sudo systemctl restart kestrel-app || dotnet ./publish/App.dll";
            res.AppPort = 5000;

            if (csprojFiles.Length > 0)
            {
                try
                {
                    var projText = File.ReadAllText(csprojFiles[0]);
                    if (projText.Contains("net8.0")) res.Framework = "ASP.NET Core (.NET 8)";
                    else if (projText.Contains("net9.0")) res.Framework = "ASP.NET Core (.NET 9)";
                }
                catch { }
            }

            res.Summary = $"Dự án {res.Framework} ({res.PackageManager}) — Nhận diện thành công!";
            res.Recommendation = $"Gợi ý triển khai Systemd hoặc Docker với SDK .NET qua cổng {res.AppPort}.";
            return;
        }

        // 5. Kiểm tra Python (requirements.txt / pyproject.toml)
        var reqTxt = Path.Combine(dir, "requirements.txt");
        if (File.Exists(reqTxt) || File.Exists(Path.Combine(dir, "pyproject.toml")))
        {
            res.TechStack = "Python";
            res.PackageManager = "pip";
            res.BuildCommand = "pip install -r requirements.txt";
            res.TestCommand = "pytest";
            res.AppPort = 8000;
            res.Framework = "Python App";

            if (File.Exists(reqTxt))
            {
                try
                {
                    var txt = File.ReadAllText(reqTxt).ToLowerInvariant();
                    if (txt.Contains("fastapi"))
                    {
                        res.Framework = "FastAPI";
                        res.StartCommand = "uvicorn main:app --host 0.0.0.0 --port 8000";
                    }
                    else if (txt.Contains("django"))
                    {
                        res.Framework = "Django";
                        res.StartCommand = "python manage.py runserver 0.0.0.0:8000";
                    }
                    else if (txt.Contains("flask"))
                    {
                        res.Framework = "Flask";
                        res.AppPort = 5000;
                        res.StartCommand = "flask run --host=0.0.0.0";
                    }
                }
                catch { }
            }

            res.Summary = $"Ứng dụng {res.Framework} (Python / {res.PackageManager})";
            res.Recommendation = $"Khuyên dùng Gunicorn/Uvicorn qua cổng {res.AppPort}.";
            return;
        }

        // 6. Kiểm tra Go (go.mod)
        var goMod = Path.Combine(dir, "go.mod");
        if (File.Exists(goMod))
        {
            res.TechStack = "Go";
            res.Framework = "Golang Service";
            res.PackageManager = "go";
            res.BuildCommand = "go build -o app";
            res.TestCommand = "go test ./...";
            res.StartCommand = "./app";
            res.AppPort = 8080;
            res.Summary = "Dịch vụ Go (Golang Microservice)";
            res.Recommendation = "Biên dịch nhị phân trực tiếp chạy trên server.";
            return;
        }

        // 7. Static Web
        if (File.Exists(Path.Combine(dir, "index.html")))
        {
            res.TechStack = "Static";
            res.Framework = "Static HTML / Web App";
            res.PackageManager = "none";
            res.BuildCommand = "";
            res.AppPort = 80;
            res.Summary = "Trang Web Tĩnh (Static HTML / CSS / JS)";
            res.Recommendation = "Triển khai Nginx static web root.";
            return;
        }

        res.TechStack = "NodeJs";
        res.Framework = "Khởi tạo mặc định";
        res.Summary = "Chưa phát hiện tệp manifest đặc trưng. Tự động áp dụng cấu hình chuẩn.";
    }

    private static void ParsePackageJsonContent(string pkgJson, string? dir, RepoTechInspectionResult res)
    {
        res.TechStack = "NodeJs";
        res.Framework = "Node.js App";
        res.PackageManager = "npm";
        res.AppPort = 3000;

        if (!string.IsNullOrEmpty(dir))
        {
            if (File.Exists(Path.Combine(dir, "pnpm-lock.yaml"))) res.PackageManager = "pnpm";
            else if (File.Exists(Path.Combine(dir, "yarn.lock"))) res.PackageManager = "yarn";
            else if (File.Exists(Path.Combine(dir, "bun.lockb")) || File.Exists(Path.Combine(dir, "bun.lock"))) res.PackageManager = "bun";
        }

        try
        {
            using var doc = JsonDocument.Parse(pkgJson);
            var root = doc.RootElement;

            var deps = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (root.TryGetProperty("dependencies", out var d) && d.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in d.EnumerateObject()) deps.Add(prop.Name);
            }
            if (root.TryGetProperty("devDependencies", out var dev) && dev.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in dev.EnumerateObject()) deps.Add(prop.Name);
            }

            if (deps.Contains("next"))
            {
                res.Framework = "Next.js (React)";
                res.AppPort = 3000;
            }
            else if (deps.Contains("vite"))
            {
                if (deps.Contains("react")) res.Framework = "Vite + React";
                else if (deps.Contains("vue")) res.Framework = "Vite + Vue";
                else if (deps.Contains("svelte")) res.Framework = "Vite + Svelte";
                else res.Framework = "Vite App";
                res.AppPort = 5173;
            }
            else if (deps.Contains("nuxt"))
            {
                res.Framework = "Nuxt.js (Vue)";
                res.AppPort = 3000;
            }
            else if (deps.Contains("@nestjs/core"))
            {
                res.Framework = "NestJS API";
                res.AppPort = 3000;
            }
            else if (deps.Contains("express"))
            {
                res.Framework = "Express.js API";
                res.AppPort = 3000;
            }
            else if (deps.Contains("@angular/core"))
            {
                res.Framework = "Angular App";
                res.AppPort = 4200;
            }
            else if (deps.Contains("react"))
            {
                res.Framework = "React (CRA/Webpack)";
                res.AppPort = 3000;
            }

            var pm = res.PackageManager;
            if (root.TryGetProperty("scripts", out var s) && s.ValueKind == JsonValueKind.Object)
            {
                if (s.TryGetProperty("build", out _)) res.BuildCommand = $"{pm} run build";
                else res.BuildCommand = $"{pm} install";

                if (s.TryGetProperty("test", out _)) res.TestCommand = $"{pm} test";
                else res.TestCommand = "";

                if (s.TryGetProperty("start", out _)) res.StartCommand = $"{pm} start";
            }
            else
            {
                res.BuildCommand = $"{pm} install";
            }

            res.Summary = $"Dự án {res.Framework} ({res.PackageManager}) — Nhận diện từ package.json";
            res.Recommendation = $"Gợi ý build: '{res.BuildCommand}', triển khai cổng {res.AppPort} qua PM2 hoặc Docker.";
        }
        catch { }
    }

    private async Task InspectRemoteGithubRepoAsync(string accountId, string remoteRepoFullName, RepoTechInspectionResult res)
    {
        if (_settingsService == null || _credentialService == null || _httpClient == null)
        {
            res.Summary = "Dịch vụ cài đặt chưa được kích hoạt để phân tích kho từ xa.";
            return;
        }

        try
        {
            var account = await _settingsService.GetGitAccountByIdAsync(accountId);
            var token = await _credentialService.GetSecretAsync($"git:account:{accountId}:token");
            if (account == null || string.IsNullOrWhiteSpace(token))
            {
                res.Summary = "Không tìm thấy token của tài khoản để phân tích từ xa.";
                return;
            }

            var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://api.github.com" : account.ApiBaseUrl.TrimEnd('/');
            var req = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/repos/{remoteRepoFullName}/contents");
            req.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var resp = await _httpClient.SendAsync(req);
            if (!resp.IsSuccessStatusCode)
            {
                res.Summary = $"Không thể lấy nội dung kho từ xa: HTTP {resp.StatusCode}";
                return;
            }

            var json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return;

            var fileNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            string? pkgDownloadUrl = null;

            foreach (var item in doc.RootElement.EnumerateArray())
            {
                if (item.TryGetProperty("name", out var n))
                {
                    var name = n.GetString() ?? "";
                    fileNames.Add(name);

                    if (name.Equals("package.json", StringComparison.OrdinalIgnoreCase) &&
                        item.TryGetProperty("download_url", out var du))
                    {
                        pkgDownloadUrl = du.GetString();
                    }
                }
            }

            res.HasDockerfile = fileNames.Contains("Dockerfile");
            res.HasDockerCompose = fileNames.Contains("docker-compose.yml") || fileNames.Contains("docker-compose.yaml") || fileNames.Contains("compose.yaml");
            if (res.HasDockerCompose || res.HasDockerfile) res.SuggestedDeployType = "SSH_DOCKER";

            if (fileNames.Contains("package.json") && !string.IsNullOrWhiteSpace(pkgDownloadUrl))
            {
                var pkgReq = new HttpRequestMessage(HttpMethod.Get, pkgDownloadUrl);
                pkgReq.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
                pkgReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                var pkgRes = await _httpClient.SendAsync(pkgReq);
                if (pkgRes.IsSuccessStatusCode)
                {
                    var pkgText = await pkgRes.Content.ReadAsStringAsync();
                    ParsePackageJsonContent(pkgText, null, res);
                    if (fileNames.Contains("pnpm-lock.yaml")) res.PackageManager = "pnpm";
                    else if (fileNames.Contains("yarn.lock")) res.PackageManager = "yarn";
                    return;
                }
            }

            if (fileNames.Any(f => f.EndsWith(".csproj") || f.EndsWith(".sln")))
            {
                res.TechStack = "DotNet";
                res.Framework = "ASP.NET Core (.NET)";
                res.PackageManager = "dotnet";
                res.BuildCommand = "dotnet publish -c Release -o ./publish";
                res.AppPort = 5000;
                res.Summary = $"Dự án .NET trên GitHub ({remoteRepoFullName})";
                return;
            }

            if (fileNames.Contains("requirements.txt") || fileNames.Contains("pyproject.toml"))
            {
                res.TechStack = "Python";
                res.Framework = "Python App";
                res.PackageManager = "pip";
                res.BuildCommand = "pip install -r requirements.txt";
                res.AppPort = 8000;
                res.Summary = $"Dự án Python trên GitHub ({remoteRepoFullName})";
                return;
            }

            if (fileNames.Contains("go.mod"))
            {
                res.TechStack = "Go";
                res.Framework = "Golang Service";
                res.PackageManager = "go";
                res.BuildCommand = "go build -o app";
                res.AppPort = 8080;
                res.Summary = $"Dự án Go trên GitHub ({remoteRepoFullName})";
                return;
            }

            res.Summary = $"Đã kiểm tra kho GitHub {remoteRepoFullName} ({fileNames.Count} tệp).";
        }
        catch (Exception ex)
        {
            res.Summary = $"Lỗi khi phân tích từ xa: {ex.Message}";
        }
    }

    private static string GenerateDockerfileContent(string tech, int port)
    {
        if (tech.Contains("node") || tech.Contains("react") || tech.Contains("vite") || tech.Contains("next"))
        {
            return @"# Multi-stage production build for Node.js Application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build --if-present

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE " + port + @"
CMD [""npm"", ""start""]
";
        }
        if (tech.Contains("dotnet") || tech.Contains("c#") || tech.Contains("asp"))
        {
            return @"# Multi-stage production build for ASP.NET Core (.NET 9)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY *.sln ./*/ *.csproj ./
RUN dotnet restore || true
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE " + port + @"
ENV ASPNETCORE_URLS=http://+:" + port + @"
ENTRYPOINT [""dotnet"", ""DevDock.App.dll""]
";
        }
        if (tech.Contains("python") || tech.Contains("fastapi"))
        {
            return @"# Production build for Python Application
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt || true
COPY . .
EXPOSE " + port + @"
CMD [""uvicorn"", ""main:app"", ""--host"", ""0.0.0.0"", ""--port"", """ + port + @"""]
";
        }
        return @"# Generic Containerfile
FROM alpine:latest
WORKDIR /app
COPY . .
EXPOSE " + port + @"
CMD [""sh""]
";
    }

    private static string GenerateDockerComposeContent(int port)
    {
        return @"services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: production-app
    restart: unless-stopped
    ports:
      - """ + port + @":" + port + @"""
    environment:
      - PORT=" + port + @"
      - NODE_ENV=production
";
    }

    private static string GeneratePm2Content(int port)
    {
        return @"module.exports = {
  apps: [{
    name: 'production-app',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: " + port + @"
    }
  }]
};
";
    }

    private static string GenerateSystemdContent(string deployDir, int port)
    {
        return @"[Unit]
Description=DevDock Production Managed Application Service
After=network.target

[Service]
WorkingDirectory=" + deployDir + @"
ExecStart=/usr/bin/dotnet " + deployDir + @"/publish/app.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=production-app
User=root
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://+:" + port + @"

[Install]
WantedBy=multi-user.target
";
    }

    private static string GenerateGithubActionYaml(GithubActionSetupRequest request)
    {
        var sb = new StringBuilder();
        var branch = string.IsNullOrWhiteSpace(request.TargetBranch) ? "main" : request.TargetBranch.Trim();
        var deployDir = string.IsNullOrWhiteSpace(request.DeployDirectory) ? "/var/www/app" : request.DeployDirectory.Trim();
        var tech = request.TechStack?.ToLowerInvariant() ?? "nodejs";
        var isDocker = request.DeployType.Contains("DOCKER", StringComparison.OrdinalIgnoreCase);
        var port = request.HealthCheckPort > 0 ? request.HealthCheckPort : 3000;

        sb.AppendLine($"# DevDock Workstation — Auto-generated GitHub Actions CI/CD");
        sb.AppendLine($"# Tech Stack: {request.TechStack} | Deploy Target: {request.DeployType}");
        sb.AppendLine($"name: CI/CD Deploy to Server");
        sb.AppendLine();
        sb.AppendLine("on:");
        sb.AppendLine("  push:");
        sb.AppendLine("    branches:");
        sb.AppendLine($"      - {branch}");
        sb.AppendLine("  workflow_dispatch:");
        sb.AppendLine();
        sb.AppendLine("concurrency:");
        sb.AppendLine("  group: production-deployment");
        sb.AppendLine("  cancel-in-progress: false");
        sb.AppendLine();
        sb.AppendLine("jobs:");
        sb.AppendLine("  deploy:");
        sb.AppendLine("    name: Build & Deploy to Server");
        sb.AppendLine("    runs-on: ubuntu-latest");
        sb.AppendLine();
        sb.AppendLine("    steps:");
        sb.AppendLine("      - name: Checkout Source Code");
        sb.AppendLine("        uses: actions/checkout@v4");
        sb.AppendLine();

        if (tech.Contains("node") || tech.Contains("react") || tech.Contains("next") || tech.Contains("vite"))
        {
            sb.AppendLine("      - name: Setup Node.js");
            sb.AppendLine("        uses: actions/setup-node@v4");
            sb.AppendLine("        with:");
            sb.AppendLine("          node-version: 20");
            if (request.IncludeCaching)
            {
                sb.AppendLine("          cache: 'npm'");
            }
            sb.AppendLine();
            sb.AppendLine("      - name: Install Dependencies & Build");
            sb.AppendLine("        run: |");
            sb.AppendLine("          npm ci --prefer-offline || npm install");
            sb.AppendLine("          npm run build --if-present");
            sb.AppendLine();
        }
        else if (tech.Contains("dotnet") || tech.Contains("c#") || tech.Contains("asp"))
        {
            sb.AppendLine("      - name: Setup .NET SDK");
            sb.AppendLine("        uses: actions/setup-dotnet@v4");
            sb.AppendLine("        with:");
            sb.AppendLine("          dotnet-version: '9.0.x'");
            sb.AppendLine();
            if (request.IncludeCaching)
            {
                sb.AppendLine("      - name: Cache NuGet packages");
                sb.AppendLine("        uses: actions/cache@v4");
                sb.AppendLine("        with:");
                sb.AppendLine("          path: ~/.nuget/packages");
                sb.AppendLine("          key: ${{ runner.os }}-nuget-${{ hashFiles('**/*.csproj') }}");
                sb.AppendLine("          restore-keys: |");
                sb.AppendLine("            ${{ runner.os }}-nuget-");
                sb.AppendLine();
            }
            sb.AppendLine("      - name: Restore & Build .NET");
            sb.AppendLine("        run: |");
            sb.AppendLine("          dotnet restore");
            sb.AppendLine("          dotnet build -c Release --no-restore");
            sb.AppendLine();
        }
        else if (tech.Contains("python") || tech.Contains("fastapi"))
        {
            sb.AppendLine("      - name: Setup Python");
            sb.AppendLine("        uses: actions/setup-python@v5");
            sb.AppendLine("        with:");
            sb.AppendLine("          python-version: '3.12'");
            if (request.IncludeCaching)
            {
                sb.AppendLine("          cache: 'pip'");
            }
            sb.AppendLine();
        }

        // SSH deployment execution step
        sb.AppendLine("      - name: Execute Server Deployment via SSH");
        sb.AppendLine("        uses: appleboy/ssh-action@v1.0.3");
        sb.AppendLine("        with:");
        sb.AppendLine("          host: ${{ secrets.SSH_HOST }}");
        sb.AppendLine("          username: ${{ secrets.SSH_USER }}");
        sb.AppendLine("          key: ${{ secrets.SSH_KEY }}");
        sb.AppendLine("          port: ${{ secrets.SSH_PORT || 22 }}");
        sb.AppendLine("          script_stop: true");
        sb.AppendLine("          script: |");
        sb.AppendLine("            set -e");
        sb.AppendLine("            echo \"=== [DevDock CI/CD] Starting Deployment: $(date) ===\"");
        sb.AppendLine($"            mkdir -p {deployDir}");
        sb.AppendLine($"            cd {deployDir}");
        sb.AppendLine();
        sb.AppendLine($"            # 1. Pull latest code");
        sb.AppendLine($"            if [ -d \".git\" ]; then");
        sb.AppendLine($"              git fetch origin {branch}");
        sb.AppendLine($"              git reset --hard origin/{branch}");
        sb.AppendLine($"            fi");
        sb.AppendLine();

        // Custom or generated post-deploy commands
        if (!string.IsNullOrWhiteSpace(request.PostDeployScript))
        {
            sb.AppendLine($"            # 2. Custom Post-deploy commands");
            foreach (var cmdLine in request.PostDeployScript.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
            {
                sb.AppendLine($"            {cmdLine.Trim()}");
            }
        }
        else if (isDocker)
        {
            sb.AppendLine($"            # 2. Docker Compose Deployment");
            sb.AppendLine($"            if [ -f \"docker-compose.yml\" ] || [ -f \"compose.yaml\" ]; then");
            sb.AppendLine($"              docker compose down --remove-orphans || true");
            sb.AppendLine($"              docker compose pull || true");
            sb.AppendLine($"              docker compose up -d --build");
            sb.AppendLine($"            fi");
        }
        else if (tech.Contains("node"))
        {
            sb.AppendLine($"            # 2. Node.js Production reload");
            sb.AppendLine($"            npm install --production");
            sb.AppendLine($"            pm2 reload all || pm2 restart all || npm run start &");
        }
        else if (tech.Contains("dotnet"))
        {
            sb.AppendLine($"            # 2. Restart .NET systemd service");
            sb.AppendLine($"            dotnet publish -c Release -o ./publish");
            sb.AppendLine($"            sudo systemctl restart kestrel-app || true");
        }
        else
        {
            sb.AppendLine($"            # 2. Generic deployment script");
            sb.AppendLine($"            echo \"Repository updated at {deployDir}\"");
        }

        if (request.IncludeHealthCheck)
        {
            sb.AppendLine();
            sb.AppendLine($"            # 3. Post-deployment Health Check");
            sb.AppendLine($"            sleep 4");
            sb.AppendLine($"            echo \"Checking service health on port {port}...\"");
            sb.AppendLine($"            if command -v curl >/dev/null 2>&1; then");
            sb.AppendLine($"              curl -f --retry 3 --retry-delay 2 http://127.0.0.1:{port}/ || echo \"Warning: Healthcheck did not return 200 OK\"");
            sb.AppendLine($"            fi");
        }

        sb.AppendLine();
        sb.AppendLine("            echo \"=== [DevDock CI/CD] Deployment Successfully Finished! ===\"");

        return sb.ToString();
    }
}
