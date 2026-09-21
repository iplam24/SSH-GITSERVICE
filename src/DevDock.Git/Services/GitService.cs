using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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
            throw new ArgumentException("Thông điệp commit không được để trống.");

        if (string.IsNullOrWhiteSpace(request.RepoPath) || !Directory.Exists(request.RepoPath))
            throw new ArgumentException("Đường dẫn repository Git không hợp lệ.");

        // 1. Tự động stage tất cả nếu được yêu cầu
        if (request.AutoStageAll)
        {
            await RunGitAsync(request.RepoPath, "add -A");
        }

        // 2. Kiểm tra xem có tệp nào đã được Stage chưa
        var (_, stagedFilesOut, _) = await RunGitAsync(request.RepoPath, "diff --cached --name-only");
        if (string.IsNullOrWhiteSpace(stagedFilesOut))
        {
            throw new InvalidOperationException("Chưa có tệp nào được đưa vào hàng đợi (Staged). Vui lòng bấm 'Stage All' hoặc dấu '+' bên cạnh các tệp cần commit trước khi tạo commit.");
        }

        // 3. Sử dụng file tạm UTF-8 để lưu commit message, tránh lỗi command line arguments trên Windows khi có xuống dòng hoặc ký tự đặc biệt
        var tempMsgFile = Path.Combine(Path.GetTempPath(), $"git_commit_{Guid.NewGuid():N}.txt");
        try
        {
            await File.WriteAllTextAsync(tempMsgFile, request.Message.Trim(), new UTF8Encoding(false));
            var args = $"commit -F \"{tempMsgFile}\"";

            if (!string.IsNullOrEmpty(request.AuthorName) && !string.IsNullOrEmpty(request.AuthorEmail))
            {
                args += $" --author=\"{request.AuthorName} <{request.AuthorEmail}>\"";
            }

            var (code, stdout, stderr) = await RunGitAsync(request.RepoPath, args);
            if (code != 0)
            {
                var err = !string.IsNullOrWhiteSpace(stderr) ? stderr : stdout;
                if (err.Contains("no changes added to commit", StringComparison.OrdinalIgnoreCase) ||
                    err.Contains("nothing to commit", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Chưa có tệp nào được đưa vào hàng đợi (Staged). Vui lòng bấm 'Stage All' hoặc dấu '+' trước khi tạo commit.");
                }
                if (err.Contains("Please tell me who you are", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Chưa cấu hình Git User Name hoặc Email. Vui lòng vào Cài đặt -> Git Global Config để thiết lập thông tin tác giả.");
                }
                throw new InvalidOperationException(string.IsNullOrWhiteSpace(err) ? $"Commit thất bại (Mã lỗi: {code})" : err);
            }
            return stdout;
        }
        finally
        {
            try { if (File.Exists(tempMsgFile)) File.Delete(tempMsgFile); } catch { }
        }
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

    public async Task<GitDiffResult> GetFileDiffAsync(string repoPath, string filePath, bool staged = false, int contextLines = 3)
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
        var uFlag = contextLines > 0 ? $"-U{contextLines} " : (contextLines == 0 ? "-U0 " : "");
        var (code, stdout, _) = await RunGitAsync(repoPath, $"diff {flag}{uFlag}-- \"{filePath}\"");

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
        string? targetLocalPath = null;
        if (!string.IsNullOrWhiteSpace(request.RepoPath) && Directory.Exists(request.RepoPath))
        {
            targetLocalPath = request.RepoPath;
            if (!string.IsNullOrWhiteSpace(request.RemoteRepoFullName))
            {
                var matched = await ResolveMatchingLocalPathAsync(request.RepoPath, request.RemoteRepoFullName);
                if (matched != null) targetLocalPath = matched;
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.RemoteRepoFullName))
        {
            targetLocalPath = await ResolveMatchingLocalPathAsync(null, request.RemoteRepoFullName);
        }

        if (targetLocalPath == null)
        {
            if (!string.IsNullOrWhiteSpace(request.AccountId) && !string.IsNullOrWhiteSpace(request.RemoteRepoFullName))
            {
                return await SetupGithubActionDirectlyOnGithubAsync(request);
            }

            return new GithubActionSetupResult
            {
                Success = false,
                Message = $"Thư mục kho lưu trữ '{request.RepoPath}' không tồn tại trên máy tính."
            };
        }

        try
        {
            var generatedFiles = new List<string>();
            var workflowsDir = Path.Combine(targetLocalPath, ".github", "workflows");
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
                var dockerfilePath = Path.Combine(targetLocalPath, "Dockerfile");
                await File.WriteAllTextAsync(dockerfilePath, GenerateDockerfileContent(tech, port), Encoding.UTF8);
                generatedFiles.Add("Dockerfile");
            }

            if (request.GenerateDockerCompose)
            {
                var composePath = Path.Combine(targetLocalPath, "docker-compose.yml");
                await File.WriteAllTextAsync(composePath, GenerateDockerComposeContent(port), Encoding.UTF8);
                generatedFiles.Add("docker-compose.yml");
            }

            if (request.GeneratePm2Config)
            {
                var pm2Path = Path.Combine(targetLocalPath, "ecosystem.config.js");
                await File.WriteAllTextAsync(pm2Path, GeneratePm2Content(port), Encoding.UTF8);
                generatedFiles.Add("ecosystem.config.js");
            }

            if (request.GenerateSystemd)
            {
                var systemdPath = Path.Combine(targetLocalPath, "production-app.service");
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
                        await RunGitAsync(targetLocalPath, $"add \"{gf}\"");
                    }
                    await RunGitAsync(targetLocalPath, "commit -m \"ci: auto setup GitHub Actions deployment workflow & configs via DevDock\"");
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

    private async Task<GithubActionSetupResult> SetupGithubActionDirectlyOnGithubAsync(GithubActionSetupRequest request)
    {
        if (_settingsService == null || _credentialService == null || _httpClient == null)
        {
            return new GithubActionSetupResult
            {
                Success = false,
                Message = "Dịch vụ xác thực GitHub chưa sẵn sàng để thiết lập trực tuyến."
            };
        }

        try
        {
            var account = await _settingsService.GetGitAccountByIdAsync(request.AccountId!);
            var token = await _credentialService.GetSecretAsync($"git:account:{request.AccountId}:token");
            if (account == null || string.IsNullOrWhiteSpace(token))
            {
                return new GithubActionSetupResult
                {
                    Success = false,
                    Message = "Không tìm thấy token của tài khoản GitHub."
                };
            }

            var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://api.github.com" : account.ApiBaseUrl.TrimEnd('/');
            var fileName = string.IsNullOrWhiteSpace(request.WorkflowFileName) ? "deploy.yml" : request.WorkflowFileName.Trim();
            if (!fileName.EndsWith(".yml", StringComparison.OrdinalIgnoreCase) && !fileName.EndsWith(".yaml", StringComparison.OrdinalIgnoreCase))
            {
                fileName += ".yml";
            }

            var path = $".github/workflows/{fileName}";
            var yamlContent = !string.IsNullOrWhiteSpace(request.CustomWorkflowYaml)
                ? request.CustomWorkflowYaml.Trim()
                : GenerateGithubActionYaml(request);

            string? existingSha = null;
            var getReq = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/repos/{request.RemoteRepoFullName}/contents/{path}");
            getReq.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
            getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var getResp = await _httpClient.SendAsync(getReq);
            if (getResp.IsSuccessStatusCode)
            {
                var getJson = await getResp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(getJson);
                if (doc.RootElement.TryGetProperty("sha", out var s))
                {
                    existingSha = s.GetString();
                }
            }

            var targetBranch = string.IsNullOrWhiteSpace(request.TargetBranch) ? "main" : request.TargetBranch.Trim();
            var payload = new Dictionary<string, object>
            {
                ["message"] = "ci: auto setup GitHub Actions deployment workflow via DevDock",
                ["content"] = Convert.ToBase64String(Encoding.UTF8.GetBytes(yamlContent)),
                ["branch"] = targetBranch
            };
            if (!string.IsNullOrEmpty(existingSha))
            {
                payload["sha"] = existingSha;
            }

            var putReq = new HttpRequestMessage(HttpMethod.Put, $"{baseUrl}/repos/{request.RemoteRepoFullName}/contents/{path}");
            putReq.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
            putReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            putReq.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var putResp = await _httpClient.SendAsync(putReq);
            if (!putResp.IsSuccessStatusCode)
            {
                var errText = await putResp.Content.ReadAsStringAsync();
                return new GithubActionSetupResult
                {
                    Success = false,
                    Message = $"GitHub API trả về lỗi ({putResp.StatusCode}): {errText}"
                };
            }

            var secrets = new List<string> { "SSH_HOST", "SSH_USER", "SSH_KEY" };
            if (request.ServerPort != 22) secrets.Add("SSH_PORT");
            if (request.DeployType.Contains("DOCKER", StringComparison.OrdinalIgnoreCase))
            {
                secrets.Add("DOCKER_USERNAME");
                secrets.Add("DOCKER_PASSWORD");
            }

            return new GithubActionSetupResult
            {
                Success = true,
                WorkflowFilePath = path,
                WorkflowContent = yamlContent,
                RequiredSecrets = secrets,
                GeneratedFiles = new List<string> { path },
                Message = $"Đã tự động tạo và đẩy workflow trực tiếp lên kho GitHub '{request.RemoteRepoFullName}' ({path}) thành công!"
            };
        }
        catch (Exception ex)
        {
            return new GithubActionSetupResult
            {
                Success = false,
                Message = $"Lỗi khi đẩy workflow lên GitHub: {ex.Message}"
            };
        }
    }

    private async Task<string?> ResolveMatchingLocalPathAsync(string? repoPath, string remoteRepoFullName)
    {
        var remoteRepoName = remoteRepoFullName.Contains('/') ? remoteRepoFullName.Split('/').Last() : remoteRepoFullName;

        // 1. If repoPath is given and exists, check if it matches the remote repo
        if (!string.IsNullOrWhiteSpace(repoPath) && Directory.Exists(repoPath))
        {
            var dirName = Path.GetFileName(repoPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
            if (dirName.Equals(remoteRepoName, StringComparison.OrdinalIgnoreCase))
            {
                return repoPath;
            }

            // Check if git remote in repoPath matches
            try
            {
                var (code, stdout, _) = await RunGitAsync(repoPath, "remote -v");
                if (code == 0 && stdout.Contains(remoteRepoFullName, StringComparison.OrdinalIgnoreCase))
                {
                    return repoPath;
                }
            }
            catch { }

            // Check if sibling directory matches (e.g. D:\tele-locketvip next to D:\ToolTienich)
            try
            {
                var parent = Path.GetDirectoryName(repoPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
                if (!string.IsNullOrEmpty(parent))
                {
                    var sibling = Path.Combine(parent, remoteRepoName);
                    if (Directory.Exists(sibling))
                    {
                        return sibling;
                    }
                }
            }
            catch { }
        }

        // 2. Check common roots (e.g. D:\, C:\, User Profile)
        var candidateRoots = new[] { @"D:\", @"C:\", Environment.GetFolderPath(Environment.SpecialFolder.UserProfile) };
        foreach (var root in candidateRoots)
        {
            if (string.IsNullOrEmpty(root) || !Directory.Exists(root)) continue;
            try
            {
                var directMatch = Path.Combine(root, remoteRepoName);
                if (Directory.Exists(directMatch))
                {
                    return directMatch;
                }
            }
            catch { }
        }

        return null;
    }

    public async Task<RepoTechInspectionResult> InspectRepositoryTechAsync(InspectRepoRequest request)
    {
        var result = new RepoTechInspectionResult();

        // 1. If remote repo full name is provided, resolve matching local directory or inspect remotely
        if (!string.IsNullOrWhiteSpace(request.RemoteRepoFullName))
        {
            var matchedLocalPath = await ResolveMatchingLocalPathAsync(request.RepoPath, request.RemoteRepoFullName);
            if (matchedLocalPath != null)
            {
                InspectLocalDirectory(matchedLocalPath, result);
                return result;
            }

            // If no matching local directory found on disk, analyze remotely via GitHub API
            if (!string.IsNullOrWhiteSpace(request.AccountId))
            {
                await InspectRemoteGithubRepoAsync(request.AccountId, request.RemoteRepoFullName, result);
                return result;
            }
        }

        // 2. Kiểm tra thư mục cục bộ nếu có
        if (!string.IsNullOrWhiteSpace(request.RepoPath) && Directory.Exists(request.RepoPath))
        {
            InspectLocalDirectory(request.RepoPath, result);
            return result;
        }

        // 3. Kiểm tra kho từ xa qua GitHub REST API
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

        // 4. Kiểm tra Python (requirements.txt / pyproject.toml / main.py / ecosystem.config.js / *.py)
        var pyFiles = Directory.GetFiles(dir, "*.py");
        var hasPyManifest = File.Exists(Path.Combine(dir, "requirements.txt")) ||
                            File.Exists(Path.Combine(dir, "requirements-dev.txt")) ||
                            File.Exists(Path.Combine(dir, "pyproject.toml")) ||
                            File.Exists(Path.Combine(dir, "Pipfile")) ||
                            File.Exists(Path.Combine(dir, "setup.py")) ||
                            File.Exists(Path.Combine(dir, "environment.yml"));

        var ecosystemPath = Path.Combine(dir, "ecosystem.config.js");
        var hasPyEcosystem = false;
        string ecosystemContent = "";
        if (File.Exists(ecosystemPath))
        {
            try
            {
                ecosystemContent = File.ReadAllText(ecosystemPath);
                if (ecosystemContent.Contains("python", StringComparison.OrdinalIgnoreCase) ||
                    ecosystemContent.Contains(".py", StringComparison.OrdinalIgnoreCase) ||
                    ecosystemContent.Contains("uvicorn", StringComparison.OrdinalIgnoreCase))
                {
                    hasPyEcosystem = true;
                }
            }
            catch { }
        }

        var hasPySubdir = (Directory.Exists(Path.Combine(dir, "app")) && Directory.GetFiles(Path.Combine(dir, "app"), "*.py").Length > 0) ||
                          (Directory.Exists(Path.Combine(dir, "web")) && Directory.GetFiles(Path.Combine(dir, "web"), "*.py").Length > 0);

        if (hasPyManifest || pyFiles.Length > 0 || hasPyEcosystem || hasPySubdir)
        {
            res.TechStack = "Python";
            res.PackageManager = File.Exists(Path.Combine(dir, "Pipfile")) ? "pipenv" :
                                 File.Exists(Path.Combine(dir, "poetry.lock")) ? "poetry" : "pip";
            res.BuildCommand = File.Exists(Path.Combine(dir, "requirements.txt"))
                ? "pip install -r requirements.txt"
                : "pip install -r requirements.txt || true";
            res.TestCommand = "pytest";
            res.AppPort = 8000;
            res.Framework = "Python App";
            res.StartCommand = "python main.py";

            // Inspect ecosystem.config.js if present
            if (hasPyEcosystem)
            {
                res.SuggestedDeployType = "SSH_PM2";
                res.StartCommand = "pm2 start ecosystem.config.js || pm2 reload ecosystem.config.js";
                var portMatch = Regex.Match(ecosystemContent, @"--port\s+(\d+)");
                if (!portMatch.Success) portMatch = Regex.Match(ecosystemContent, @"port:\s*(\d+)", RegexOptions.IgnoreCase);
                if (portMatch.Success && int.TryParse(portMatch.Groups[1].Value, out var p))
                {
                    res.AppPort = p;
                }
            }

            // Inspect frameworks
            var isFastApi = false;
            var isDjango = File.Exists(Path.Combine(dir, "manage.py"));
            var isFlask = false;
            var isBot = false;

            if (ecosystemContent.Contains("uvicorn", StringComparison.OrdinalIgnoreCase) ||
                ecosystemContent.Contains("fastapi", StringComparison.OrdinalIgnoreCase))
            {
                isFastApi = true;
            }

            if (File.Exists(Path.Combine(dir, "requirements.txt")))
            {
                try
                {
                    var reqContent = File.ReadAllText(Path.Combine(dir, "requirements.txt")).ToLowerInvariant();
                    if (reqContent.Contains("fastapi")) isFastApi = true;
                    if (reqContent.Contains("django")) isDjango = true;
                    if (reqContent.Contains("flask")) isFlask = true;
                    if (reqContent.Contains("telebot") || reqContent.Contains("aiogram") || reqContent.Contains("telegram")) isBot = true;
                }
                catch { }
            }

            var allPyFiles = pyFiles.Concat(Directory.Exists(Path.Combine(dir, "app")) ? Directory.GetFiles(Path.Combine(dir, "app"), "*.py") : Array.Empty<string>())
                                    .Concat(Directory.Exists(Path.Combine(dir, "web")) ? Directory.GetFiles(Path.Combine(dir, "web"), "*.py") : Array.Empty<string>());

            foreach (var pyFile in allPyFiles.Take(12))
            {
                try
                {
                    var fname = Path.GetFileName(pyFile).ToLowerInvariant();
                    if (fname.Contains("bot")) isBot = true;
                    var content = File.ReadAllText(pyFile);
                    if (content.Contains("from fastapi") || content.Contains("import fastapi")) isFastApi = true;
                    if (content.Contains("from flask") || content.Contains("import flask")) isFlask = true;
                    if (content.Contains("aiogram") || content.Contains("telebot") || content.Contains("telegram")) isBot = true;
                }
                catch { }
            }

            if (isFastApi)
            {
                res.Framework = isBot ? "FastAPI & Telegram Bot" : "FastAPI";
                if (!hasPyEcosystem)
                {
                    var webMain = File.Exists(Path.Combine(dir, "web", "main.py")) ? "web.main:app" : "main:app";
                    res.StartCommand = $"uvicorn {webMain} --host 0.0.0.0 --port {res.AppPort}";
                }
            }
            else if (isDjango)
            {
                res.Framework = "Django";
                res.AppPort = 8000;
                res.StartCommand = "python manage.py runserver 0.0.0.0:8000";
            }
            else if (isFlask)
            {
                res.Framework = "Flask";
                res.AppPort = 5000;
                res.StartCommand = "flask run --host=0.0.0.0";
            }
            else if (isBot)
            {
                res.Framework = "Python Telegram Bot";
                if (!hasPyEcosystem)
                {
                    res.StartCommand = File.Exists(Path.Combine(dir, "main.py")) ? "python main.py" : "python bot.py";
                }
            }
            else
            {
                if (File.Exists(Path.Combine(dir, "main.py"))) res.StartCommand = "python main.py";
                else if (File.Exists(Path.Combine(dir, "app.py"))) res.StartCommand = "python app.py";
            }

            res.Summary = $"Dự án {res.Framework} (Python / {res.PackageManager}) — Nhận diện thành công!";
            res.Recommendation = hasPyEcosystem
                ? $"Dự án có cấu hình ecosystem.config.js. Gợi ý triển khai PM2 tự khởi động qua cổng {res.AppPort}."
                : $"Gợi ý triển khai Systemd hoặc Uvicorn/Gunicorn qua cổng {res.AppPort}.";
            return;
        }

        // 5. Kiểm tra .NET (.csproj / .sln)
        var rootCsproj = Directory.GetFiles(dir, "*.csproj");
        var rootSln = Directory.GetFiles(dir, "*.sln");
        var csprojFiles = new List<string>(rootCsproj);

        if (csprojFiles.Count == 0 && rootSln.Length == 0)
        {
            var candidateDirs = new[] { "src", "server", "backend", "api" };
            foreach (var sub in candidateDirs)
            {
                var subPath = Path.Combine(dir, sub);
                if (Directory.Exists(subPath))
                {
                    try
                    {
                        var found = Directory.GetFiles(subPath, "*.csproj", SearchOption.AllDirectories)
                            .Where(f => !f.Contains("node_modules") && !f.Contains("venv") && !f.Contains("bin") && !f.Contains("obj"))
                            .ToList();
                        csprojFiles.AddRange(found);
                    }
                    catch { }
                }
            }
        }

        if (csprojFiles.Count > 0 || rootSln.Length > 0)
        {
            res.TechStack = "DotNet";
            res.Framework = "ASP.NET Core / .NET 9";
            res.PackageManager = "dotnet";
            res.BuildCommand = "dotnet publish -c Release -o ./publish";
            res.TestCommand = "dotnet test";
            res.StartCommand = "sudo systemctl restart kestrel-app || dotnet ./publish/App.dll";
            res.AppPort = 5000;

            if (csprojFiles.Count > 0)
            {
                try
                {
                    var projText = File.ReadAllText(csprojFiles[0]);
                    if (projText.Contains("net8.0")) res.Framework = "ASP.NET Core (.NET 8)";
                    else if (projText.Contains("net9.0")) res.Framework = "ASP.NET Core (.NET 9)";
                    else if (projText.Contains("net7.0")) res.Framework = "ASP.NET Core (.NET 7)";
                    else if (projText.Contains("net6.0")) res.Framework = "ASP.NET Core (.NET 6)";
                }
                catch { }
            }

            res.Summary = $"Dự án {res.Framework} ({res.PackageManager}) — Nhận diện thành công!";
            res.Recommendation = $"Gợi ý triển khai Systemd hoặc Docker với SDK .NET qua cổng {res.AppPort}.";
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
            string? ecosystemDownloadUrl = null;

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
                    if (name.Equals("ecosystem.config.js", StringComparison.OrdinalIgnoreCase) &&
                        item.TryGetProperty("download_url", out var edu))
                    {
                        ecosystemDownloadUrl = edu.GetString();
                    }
                }
            }

            res.HasDockerfile = fileNames.Contains("Dockerfile");
            res.HasDockerCompose = fileNames.Contains("docker-compose.yml") || fileNames.Contains("docker-compose.yaml") || fileNames.Contains("compose.yaml");
            if (res.HasDockerCompose || res.HasDockerfile) res.SuggestedDeployType = "SSH_DOCKER";

            // Check package.json if present
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

            // Check Python & PM2 (ecosystem.config.js)
            var hasPyFile = fileNames.Any(f => f.EndsWith(".py", StringComparison.OrdinalIgnoreCase)) ||
                            fileNames.Contains("requirements.txt") ||
                            fileNames.Contains("requirements-dev.txt") ||
                            fileNames.Contains("pyproject.toml") ||
                            fileNames.Contains("Pipfile") ||
                            fileNames.Contains("setup.py");

            var hasPyEcosystem = false;
            var ecoPort = 0;
            var isEcoFastApi = false;

            if (fileNames.Contains("ecosystem.config.js") && !string.IsNullOrWhiteSpace(ecosystemDownloadUrl))
            {
                try
                {
                    var ecoReq = new HttpRequestMessage(HttpMethod.Get, ecosystemDownloadUrl);
                    ecoReq.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
                    ecoReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                    var ecoRes = await _httpClient.SendAsync(ecoReq);
                    if (ecoRes.IsSuccessStatusCode)
                    {
                        var ecoText = await ecoRes.Content.ReadAsStringAsync();
                        if (ecoText.Contains("python", StringComparison.OrdinalIgnoreCase) ||
                            ecoText.Contains(".py", StringComparison.OrdinalIgnoreCase) ||
                            ecoText.Contains("uvicorn", StringComparison.OrdinalIgnoreCase))
                        {
                            hasPyEcosystem = true;
                            if (ecoText.Contains("uvicorn", StringComparison.OrdinalIgnoreCase) || ecoText.Contains("fastapi", StringComparison.OrdinalIgnoreCase))
                            {
                                isEcoFastApi = true;
                            }
                            var portMatch = Regex.Match(ecoText, @"--port\s+(\d+)");
                            if (!portMatch.Success) portMatch = Regex.Match(ecoText, @"port:\s*(\d+)", RegexOptions.IgnoreCase);
                            if (portMatch.Success && int.TryParse(portMatch.Groups[1].Value, out var p))
                            {
                                ecoPort = p;
                            }
                        }
                    }
                }
                catch { }
            }

            if (hasPyFile || hasPyEcosystem)
            {
                res.TechStack = "Python";
                res.PackageManager = fileNames.Contains("Pipfile") ? "pipenv" :
                                     fileNames.Contains("poetry.lock") ? "poetry" : "pip";
                res.BuildCommand = fileNames.Contains("requirements.txt")
                    ? "pip install -r requirements.txt"
                    : "pip install -r requirements.txt || true";
                res.AppPort = ecoPort > 0 ? ecoPort : 8000;
                res.StartCommand = hasPyEcosystem
                    ? "pm2 start ecosystem.config.js || pm2 reload ecosystem.config.js"
                    : (fileNames.Contains("main.py") ? "python main.py" : "python app.py");

                if (hasPyEcosystem)
                {
                    res.SuggestedDeployType = "SSH_PM2";
                }

                var isBot = fileNames.Any(f => f.Contains("bot", StringComparison.OrdinalIgnoreCase));
                if (isEcoFastApi)
                {
                    res.Framework = isBot ? "FastAPI & Telegram Bot (PM2)" : "FastAPI (PM2)";
                }
                else if (isBot)
                {
                    res.Framework = "Python Telegram Bot";
                }
                else
                {
                    res.Framework = "Python App";
                }

                res.Summary = $"Dự án {res.Framework} trên GitHub ({remoteRepoFullName})";
                res.Recommendation = hasPyEcosystem
                    ? $"Dự án có ecosystem.config.js. Gợi ý triển khai PM2 tự khởi động qua cổng {res.AppPort}."
                    : $"Khuyên dùng Uvicorn hoặc Systemd service trên server qua cổng {res.AppPort}.";
                return;
            }

            // Check .NET
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

            // Check Go
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

    public async Task<GitIgnoreInfo> GetGitIgnoreAsync(string repoPath)
    {
        var info = new GitIgnoreInfo
        {
            FilePath = Path.Combine(repoPath, ".gitignore"),
            Exists = false,
            Content = string.Empty
        };

        if (File.Exists(info.FilePath))
        {
            info.Exists = true;
            try
            {
                info.Content = await File.ReadAllTextAsync(info.FilePath, Encoding.UTF8);
            }
            catch { }
        }

        // Auto-detect recommended presets based on workspace files
        if (Directory.Exists(repoPath))
        {
            var presets = new List<string>();
            var hasPackageJson = File.Exists(Path.Combine(repoPath, "package.json"));
            var hasDotNet = Directory.GetFiles(repoPath, "*.sln").Length > 0 || Directory.GetFiles(repoPath, "*.csproj", SearchOption.AllDirectories).Length > 0;
            var hasPython = File.Exists(Path.Combine(repoPath, "requirements.txt")) || File.Exists(Path.Combine(repoPath, "pyproject.toml"));
            var hasGo = File.Exists(Path.Combine(repoPath, "go.mod"));
            var hasDocker = File.Exists(Path.Combine(repoPath, "Dockerfile")) || File.Exists(Path.Combine(repoPath, "docker-compose.yml"));

            if (hasDotNet && hasPackageJson) presets.Add("FullStack");
            if (hasDotNet) presets.Add("DotNet");
            if (hasPackageJson) presets.Add("NodeJs");
            if (hasPython) presets.Add("Python");
            if (hasGo) presets.Add("Go");
            if (hasDocker) presets.Add("Docker");
            presets.Add("OS_IDEs");

            info.DetectedPresets = presets;

            if (hasDotNet && hasPackageJson) info.RecommendedTemplate = "FullStack";
            else if (hasDotNet) info.RecommendedTemplate = "DotNet";
            else if (hasPackageJson) info.RecommendedTemplate = "NodeJs";
            else if (hasPython) info.RecommendedTemplate = "Python";
            else if (hasGo) info.RecommendedTemplate = "Go";
            else info.RecommendedTemplate = "OS_IDEs";
        }

        return info;
    }

    public async Task<bool> SaveGitIgnoreAsync(SaveGitIgnoreRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RepoPath)) return false;
        if (!Directory.Exists(request.RepoPath)) Directory.CreateDirectory(request.RepoPath);

        var filePath = Path.Combine(request.RepoPath, ".gitignore");
        await File.WriteAllTextAsync(filePath, request.Content ?? string.Empty, Encoding.UTF8);

        if (request.AutoCommit && Directory.Exists(Path.Combine(request.RepoPath, ".git")))
        {
            try
            {
                await RunGitAsync(request.RepoPath, "add .gitignore");
                var msg = string.IsNullOrWhiteSpace(request.CommitMessage) ? "Update .gitignore" : request.CommitMessage;
                await RunGitAsync(request.RepoPath, $"commit -m \"{msg.Replace("\"", "\\\"")}\"");
            }
            catch { }
        }

        return true;
    }

    public async Task<bool> AddToGitIgnoreAsync(AddToGitIgnoreRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RepoPath) || string.IsNullOrWhiteSpace(request.Pattern)) return false;
        if (!Directory.Exists(request.RepoPath)) Directory.CreateDirectory(request.RepoPath);

        var pattern = request.Pattern.Trim();
        var filePath = Path.Combine(request.RepoPath, ".gitignore");
        var content = File.Exists(filePath) ? await File.ReadAllTextAsync(filePath, Encoding.UTF8) : string.Empty;

        var existingLines = content.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                                   .Select(l => l.Trim())
                                   .ToHashSet();

        if (existingLines.Contains(pattern)) return true; // Already present

        var newContent = content.TrimEnd();
        if (string.IsNullOrWhiteSpace(newContent))
        {
            newContent = pattern + Environment.NewLine;
        }
        else
        {
            newContent += Environment.NewLine + pattern + Environment.NewLine;
        }

        await File.WriteAllTextAsync(filePath, newContent, Encoding.UTF8);

        if (request.AutoCommit && Directory.Exists(Path.Combine(request.RepoPath, ".git")))
        {
            try
            {
                await RunGitAsync(request.RepoPath, "add .gitignore");
                await RunGitAsync(request.RepoPath, $"commit -m \"Add {pattern} to .gitignore\"");
            }
            catch { }
        }

        return true;
    }

    public Task<Dictionary<string, string>> GetGitIgnoreTemplatesAsync()
    {
        var templates = new Dictionary<string, string>
        {
            ["FullStack"] = @"# DevDock Full-Stack .gitignore (.NET + Node/Vite + Windows)

# Build & Publish outputs
[Dd]ebug/
[Rr]elease/
x64/
x86/
[Bb]in/
[Oo]bj/
dist/
build/
out/
publish/

# Visual Studio & IDEs
.vs/
*.suo
*.user
*.userosscache
*.sln.docstates
.idea/
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json

# Node & Frontend
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
.pnpm-store/
.next/
.nuxt/
.output/

# Logs & Temporary
*.log
*.tmp
*.bak
*.swp
Thumbs.db
.DS_Store

# Packaged binaries & installers
*.nupkg
*.snupkg
*.exe
*.msi
*.zip
*.7z

# Secrets & Environment
.env
.env.local
.env.*.local
",
            ["NodeJs"] = @"# Node.js & Modern Frontend (React, Vite, Next.js, Vue)
node_modules/
dist/
build/
out/
.next/
.nuxt/
.output/
.cache/

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Environment & Local Secrets
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Testing & Coverage
coverage/
.nyc_output/

# OS & Editor files
.DS_Store
Thumbs.db
.vscode/*
!.vscode/settings.json
.idea/
",
            ["DotNet"] = @"# .NET & Visual Studio / C#
[Bb]in/
[Oo]bj/
[Dd]ebug/
[Rr]elease/
x64/
x86/
publish/

# Visual Studio cache & user settings
.vs/
*.user
*.userosscache
*.suo
*.sln.docstates
*.userprefs

# Packages
*.nupkg
*.snupkg
packages/

# Rider / JetBrains
.idea/

# OS files
Thumbs.db
.DS_Store
",
            ["Python"] = @"# Python & Virtual Environments
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
env/
ENV/
.venv/
env.bak/
venv.bak/

# Environment variables
.env
.env.local

# Testing & Type checking
.pytest_cache/
.coverage
htmlcov/
.mypy_cache/
",
            ["Go"] = @"# Golang
# Binaries for programs and plugins
*.exe
*.exe~
*.dll
*.so
*.dylib

# Test binary, built with `go test -c`
*.test

# Output of the go coverage tool
*.out

# Dependency directories
vendor/

# Go workspace file
go.work

# Build outputs
bin/
dist/
",
            ["Docker"] = @"# Docker & Container ignores
.docker/
*.tar
*.tar.gz
docker-compose.override.yml
.env
",
            ["OS_IDEs"] = @"# OS & General IDE Files
# Windows
Thumbs.db
Thumbs.db:encryptable
ehthumbs.db
ehthumbs_vista.db
desktop.ini
$RECYCLE.BIN/

# macOS
.DS_Store
.AppleDouble
.LSOverride
Icon
._*

# Visual Studio Code
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json

# JetBrains (IntelliJ, Rider, WebStorm)
.idea/
*.iws
*.iml
"
        };

        return Task.FromResult(templates);
    }

    public async Task<SyncGithubSecretsResult> SyncGithubSecretsAsync(SyncGithubSecretsRequest request)
    {
        if (_settingsService == null || _credentialService == null || _httpClient == null)
        {
            return new SyncGithubSecretsResult
            {
                Success = false,
                Message = "Dịch vụ xác thực GitHub chưa sẵn sàng."
            };
        }

        try
        {
            var account = await _settingsService.GetGitAccountByIdAsync(request.AccountId);
            var token = await _credentialService.GetSecretAsync($"git:account:{request.AccountId}:token");
            if (account == null || string.IsNullOrWhiteSpace(token))
            {
                return new SyncGithubSecretsResult
                {
                    Success = false,
                    Message = "Không tìm thấy token của tài khoản GitHub."
                };
            }

            var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://api.github.com" : account.ApiBaseUrl.TrimEnd('/');

            // 1. Get repository public key for Actions Secrets encryption
            var keyReq = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/repos/{request.RemoteRepoFullName}/actions/secrets/public-key");
            keyReq.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
            keyReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            keyReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

            var keyResp = await _httpClient.SendAsync(keyReq);
            if (!keyResp.IsSuccessStatusCode)
            {
                var err = await keyResp.Content.ReadAsStringAsync();
                return new SyncGithubSecretsResult
                {
                    Success = false,
                    Message = $"Lỗi lấy public key từ GitHub ({keyResp.StatusCode}): {err}"
                };
            }

            var keyJson = await keyResp.Content.ReadAsStringAsync();
            using var keyDoc = JsonDocument.Parse(keyJson);
            var keyId = keyDoc.RootElement.GetProperty("key_id").GetString()!;
            var publicKeyBase64 = keyDoc.RootElement.GetProperty("key").GetString()!;
            var publicKeyBytes = Convert.FromBase64String(publicKeyBase64);

            var synced = new List<string>();
            var failed = new List<string>();

            // 2. Encrypt each secret with libsodium SealedPublicKeyBox and PUT to GitHub
            foreach (var kvp in request.Secrets)
            {
                var secretName = kvp.Key.Trim();
                var secretValue = kvp.Value?.Trim();
                if (string.IsNullOrEmpty(secretName) || string.IsNullOrEmpty(secretValue)) continue;

                try
                {
                    var secretBytes = Encoding.UTF8.GetBytes(secretValue);
                    var encryptedBytes = Sodium.SealedPublicKeyBox.Create(secretBytes, publicKeyBytes);
                    var encryptedBase64 = Convert.ToBase64String(encryptedBytes);

                    var putPayload = new
                    {
                        encrypted_value = encryptedBase64,
                        key_id = keyId
                    };

                    var putReq = new HttpRequestMessage(HttpMethod.Put, $"{baseUrl}/repos/{request.RemoteRepoFullName}/actions/secrets/{secretName}")
                    {
                        Content = new StringContent(JsonSerializer.Serialize(putPayload), Encoding.UTF8, "application/json")
                    };
                    putReq.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
                    putReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                    putReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

                    var putResp = await _httpClient.SendAsync(putReq);
                    if (putResp.IsSuccessStatusCode)
                    {
                        synced.Add(secretName);
                    }
                    else
                    {
                        failed.Add(secretName);
                    }
                }
                catch
                {
                    failed.Add(secretName);
                }
            }

            return new SyncGithubSecretsResult
            {
                Success = synced.Count > 0,
                SyncedSecrets = synced,
                FailedSecrets = failed,
                Message = failed.Count == 0
                    ? $"Đã tự động đẩy thành công toàn bộ {synced.Count} Secrets ({string.Join(", ", synced)}) lên GitHub Repository '{request.RemoteRepoFullName}'!"
                    : $"Đã đồng bộ {synced.Count} Secrets ({string.Join(", ", synced)}), {failed.Count} Secrets thất bại."
            };
        }
        catch (Exception ex)
        {
            return new SyncGithubSecretsResult
            {
                Success = false,
                Message = $"Lỗi khi đồng bộ Secrets: {ex.Message}"
            };
        }
    }

    public async Task<CreateGithubReleaseResult> CreateGithubReleaseAsync(CreateGithubReleaseRequest request)
    {
        try
        {
            var tag = request.TagName.Trim();
            if (string.IsNullOrEmpty(tag))
            {
                return new CreateGithubReleaseResult { Success = false, Message = "Vui lòng nhập tên phiên bản (tag name, ví dụ v1.0.0)" };
            }

            // 1. Create Git tag locally and push to remote if local repoPath is valid
            if (!string.IsNullOrWhiteSpace(request.RepoPath) && Directory.Exists(request.RepoPath))
            {
                var releaseTitle = string.IsNullOrWhiteSpace(request.Name) ? tag : request.Name.Trim();
                await RunGitAsync(request.RepoPath, $"tag -a \"{tag}\" -m \"{releaseTitle}\"");
                await RunGitAsync(request.RepoPath, $"push origin \"{tag}\"");
            }

            // 2. Call GitHub REST API to publish release
            if (!string.IsNullOrWhiteSpace(request.AccountId) &&
                !string.IsNullOrWhiteSpace(request.RemoteRepoFullName) &&
                _settingsService != null && _credentialService != null && _httpClient != null)
            {
                var account = await _settingsService.GetGitAccountByIdAsync(request.AccountId);
                var token = await _credentialService.GetSecretAsync($"git:account:{request.AccountId}:token");
                if (account != null && !string.IsNullOrWhiteSpace(token))
                {
                    var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://api.github.com" : account.ApiBaseUrl.TrimEnd('/');
                    var payload = new
                    {
                        tag_name = tag,
                        target_commitish = string.IsNullOrWhiteSpace(request.TargetBranch) ? "main" : request.TargetBranch.Trim(),
                        name = string.IsNullOrWhiteSpace(request.Name) ? tag : request.Name.Trim(),
                        body = request.Body?.Trim() ?? string.Empty,
                        draft = request.Draft,
                        prerelease = request.Prerelease,
                        generate_release_notes = request.GenerateReleaseNotes
                    };

                    var relReq = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/repos/{request.RemoteRepoFullName}/releases")
                    {
                        Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
                    };
                    relReq.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
                    relReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                    relReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

                    var relResp = await _httpClient.SendAsync(relReq);
                    if (relResp.IsSuccessStatusCode)
                    {
                        var relJson = await relResp.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(relJson);
                        var htmlUrl = doc.RootElement.GetProperty("html_url").GetString();
                        return new CreateGithubReleaseResult
                        {
                            Success = true,
                            TagName = tag,
                            ReleaseUrl = htmlUrl,
                            Message = $"Đã xuất bản thành công bản phát hành GitHub Release '{tag}' tại {htmlUrl}!"
                        };
                    }
                    else
                    {
                        var err = await relResp.Content.ReadAsStringAsync();
                        return new CreateGithubReleaseResult
                        {
                            Success = false,
                            Message = $"Lỗi GitHub API khi tạo Release ({relResp.StatusCode}): {err}"
                        };
                    }
                }
            }

            return new CreateGithubReleaseResult
            {
                Success = true,
                TagName = tag,
                Message = $"Đã tạo và đẩy tag '{tag}' lên kho lưu trữ thành công!"
            };
        }
        catch (Exception ex)
        {
            return new CreateGithubReleaseResult
            {
                Success = false,
                Message = $"Lỗi khi tạo Release: {ex.Message}"
            };
        }
    }

    public async Task<List<GithubReleaseItem>> GetGithubReleasesAsync(string accountId, string remoteRepoFullName)
    {
        var result = new List<GithubReleaseItem>();
        if (_settingsService == null || _credentialService == null || _httpClient == null) return result;

        try
        {
            var account = await _settingsService.GetGitAccountByIdAsync(accountId);
            var token = await _credentialService.GetSecretAsync($"git:account:{accountId}:token");
            if (account == null || string.IsNullOrWhiteSpace(token)) return result;

            var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://api.github.com" : account.ApiBaseUrl.TrimEnd('/');
            var req = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/repos/{remoteRepoFullName}/releases?per_page=20");
            req.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

            var resp = await _httpClient.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return result;

            var json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            foreach (var el in doc.RootElement.EnumerateArray())
            {
                var rel = new GithubReleaseItem
                {
                    Id = el.GetProperty("id").GetInt64(),
                    TagName = el.GetProperty("tag_name").GetString() ?? "",
                    Name = el.TryGetProperty("name", out var n) && n.ValueKind == JsonValueKind.String ? n.GetString() ?? "" : "",
                    Body = el.TryGetProperty("body", out var b) && b.ValueKind == JsonValueKind.String ? b.GetString() ?? "" : "",
                    Draft = el.TryGetProperty("draft", out var dr) && dr.GetBoolean(),
                    Prerelease = el.TryGetProperty("prerelease", out var pr) && pr.GetBoolean(),
                    HtmlUrl = el.TryGetProperty("html_url", out var h) ? h.GetString() ?? "" : "",
                    CreatedAt = el.TryGetProperty("created_at", out var ca) && DateTime.TryParse(ca.GetString(), out var dt) ? dt : DateTime.UtcNow
                };

                if (el.TryGetProperty("assets", out var assets) && assets.ValueKind == JsonValueKind.Array)
                {
                    foreach (var a in assets.EnumerateArray())
                    {
                        rel.Assets.Add(new GithubReleaseAssetItem
                        {
                            Id = a.GetProperty("id").GetInt64(),
                            Name = a.GetProperty("name").GetString() ?? "",
                            Size = a.TryGetProperty("size", out var s) ? s.GetInt64() : 0,
                            DownloadCount = a.TryGetProperty("download_count", out var dc) ? dc.GetInt32() : 0,
                            BrowserDownloadUrl = a.TryGetProperty("browser_download_url", out var du) ? du.GetString() ?? "" : ""
                        });
                    }
                }

                result.Add(rel);
            }
        }
        catch { }

        return result;
    }
}

