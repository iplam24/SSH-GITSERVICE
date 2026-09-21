using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using DevDock.Core.Models;
using DevDock.Core.Services;

namespace DevDock.Git.Services;

public class GitProviderService : IGitProviderService
{
    private readonly ISettingsService _settingsService;
    private readonly ICredentialService _credentialService;
    private readonly IProjectService _projectService;
    private readonly HttpClient _httpClient;

    public GitProviderService(
        ISettingsService settingsService,
        ICredentialService credentialService,
        IProjectService projectService,
        IHttpClientFactory httpClientFactory)
    {
        _settingsService = settingsService;
        _credentialService = credentialService;
        _projectService = projectService;
        _httpClient = httpClientFactory.CreateClient();
    }

    private async Task<(GitAccount Account, string Token)> GetAccountAndTokenAsync(string accountId)
    {
        var account = await _settingsService.GetGitAccountByIdAsync(accountId)
            ?? throw new InvalidOperationException($"Git account '{accountId}' not found");

        var token = await _credentialService.GetSecretAsync($"git:account:{accountId}:token");
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException($"No token found for account '{account.Name}'. Please configure a Personal Access Token in Settings.");
        }

        return (account, token);
    }

    public async Task<List<RemoteRepoItem>> ListRemoteRepositoriesAsync(
        string accountId,
        string? search = null,
        int page = 1,
        int pageSize = 30)
    {
        var (account, token) = await GetAccountAndTokenAsync(accountId);
        var repos = new List<RemoteRepoItem>();

        if (account.Provider == GitProvider.GitHub)
        {
            var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://api.github.com" : account.ApiBaseUrl.TrimEnd('/');
            var url = $"{baseUrl}/user/repos?sort=updated&per_page={pageSize}&page={page}&affiliation=owner,collaborator,organization_member";

            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

            var res = await _httpClient.SendAsync(req);
            if (!res.IsSuccessStatusCode)
            {
                var err = await res.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"GitHub API error ({res.StatusCode}): {err}");
            }

            var json = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            foreach (var el in doc.RootElement.EnumerateArray())
            {
                var name = el.GetProperty("name").GetString() ?? "";
                var desc = el.TryGetProperty("description", out var d) && d.ValueKind == JsonValueKind.String ? d.GetString() : null;

                if (!string.IsNullOrWhiteSpace(search) &&
                    !name.Contains(search, StringComparison.OrdinalIgnoreCase) &&
                    !(desc?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false))
                {
                    continue;
                }

                var ownerName = "";
                string? ownerAvatar = null;
                if (el.TryGetProperty("owner", out var owner))
                {
                    ownerName = owner.TryGetProperty("login", out var l) ? l.GetString() ?? "" : "";
                    ownerAvatar = owner.TryGetProperty("avatar_url", out var av) ? av.GetString() : null;
                }

                DateTime? updated = null;
                if (el.TryGetProperty("updated_at", out var u) && DateTime.TryParse(u.GetString(), out var dt))
                {
                    updated = dt;
                }

                repos.Add(new RemoteRepoItem
                {
                    Id = el.GetProperty("id").ToString(),
                    Name = name,
                    FullName = el.TryGetProperty("full_name", out var fn) ? fn.GetString() ?? name : name,
                    Description = desc,
                    HtmlUrl = el.TryGetProperty("html_url", out var hu) ? hu.GetString() ?? "" : "",
                    CloneUrl = el.TryGetProperty("clone_url", out var cu) ? cu.GetString() ?? "" : "",
                    SshUrl = el.TryGetProperty("ssh_url", out var su) ? su.GetString() : null,
                    IsPrivate = el.TryGetProperty("private", out var priv) && priv.GetBoolean(),
                    DefaultBranch = el.TryGetProperty("default_branch", out var db) ? db.GetString() ?? "main" : "main",
                    StarsCount = el.TryGetProperty("stargazers_count", out var sc) ? sc.GetInt32() : 0,
                    ForksCount = el.TryGetProperty("forks_count", out var fc) ? fc.GetInt32() : 0,
                    Language = el.TryGetProperty("language", out var lang) && lang.ValueKind == JsonValueKind.String ? lang.GetString() : null,
                    UpdatedAt = updated,
                    OwnerName = ownerName,
                    OwnerAvatarUrl = ownerAvatar
                });
            }
        }
        else if (account.Provider == GitProvider.GitLab)
        {
            var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://gitlab.com/api/v4" : account.ApiBaseUrl.TrimEnd('/');
            var url = $"{baseUrl}/projects?membership=true&order_by=updated_at&per_page={pageSize}&page={page}";

            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
            req.Headers.Add("PRIVATE-TOKEN", token);

            var res = await _httpClient.SendAsync(req);
            if (!res.IsSuccessStatusCode)
            {
                var err = await res.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"GitLab API error ({res.StatusCode}): {err}");
            }

            var json = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            foreach (var el in doc.RootElement.EnumerateArray())
            {
                var name = el.GetProperty("name").GetString() ?? "";
                var desc = el.TryGetProperty("description", out var d) && d.ValueKind == JsonValueKind.String ? d.GetString() : null;

                if (!string.IsNullOrWhiteSpace(search) &&
                    !name.Contains(search, StringComparison.OrdinalIgnoreCase) &&
                    !(desc?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false))
                {
                    continue;
                }

                DateTime? updated = null;
                if (el.TryGetProperty("last_activity_at", out var u) && DateTime.TryParse(u.GetString(), out var dt))
                {
                    updated = dt;
                }

                repos.Add(new RemoteRepoItem
                {
                    Id = el.GetProperty("id").ToString(),
                    Name = name,
                    FullName = el.TryGetProperty("path_with_namespace", out var fn) ? fn.GetString() ?? name : name,
                    Description = desc,
                    HtmlUrl = el.TryGetProperty("web_url", out var hu) ? hu.GetString() ?? "" : "",
                    CloneUrl = el.TryGetProperty("http_url_to_repo", out var cu) ? cu.GetString() ?? "" : "",
                    SshUrl = el.TryGetProperty("ssh_url_to_repo", out var su) ? su.GetString() : null,
                    IsPrivate = el.TryGetProperty("visibility", out var vis) && vis.GetString() == "private",
                    DefaultBranch = el.TryGetProperty("default_branch", out var db) ? db.GetString() ?? "main" : "main",
                    StarsCount = el.TryGetProperty("star_count", out var sc) ? sc.GetInt32() : 0,
                    ForksCount = el.TryGetProperty("forks_count", out var fc) ? fc.GetInt32() : 0,
                    UpdatedAt = updated,
                    OwnerName = account.Username
                });
            }
        }
        else
        {
            // Generic / Gitea / Forgejo
            var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://gitea.com/api/v1" : account.ApiBaseUrl.TrimEnd('/');
            var url = $"{baseUrl}/user/repos?limit={pageSize}&page={page}";

            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
            req.Headers.Authorization = new AuthenticationHeaderValue("token", token);

            var res = await _httpClient.SendAsync(req);
            if (!res.IsSuccessStatusCode)
            {
                var err = await res.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"Git API error ({res.StatusCode}): {err}");
            }

            var json = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            foreach (var el in doc.RootElement.EnumerateArray())
            {
                var name = el.GetProperty("name").GetString() ?? "";
                repos.Add(new RemoteRepoItem
                {
                    Id = el.GetProperty("id").ToString(),
                    Name = name,
                    FullName = el.TryGetProperty("full_name", out var fn) ? fn.GetString() ?? name : name,
                    Description = el.TryGetProperty("description", out var d) && d.ValueKind == JsonValueKind.String ? d.GetString() : null,
                    HtmlUrl = el.TryGetProperty("html_url", out var hu) ? hu.GetString() ?? "" : "",
                    CloneUrl = el.TryGetProperty("clone_url", out var cu) ? cu.GetString() ?? "" : "",
                    IsPrivate = el.TryGetProperty("private", out var priv) && priv.GetBoolean(),
                    DefaultBranch = el.TryGetProperty("default_branch", out var db) ? db.GetString() ?? "main" : "main",
                    OwnerName = account.Username
                });
            }
        }

        return repos;
    }

    public async Task<RemoteRepoItem> CreateRemoteRepositoryAsync(CreateRemoteRepoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("Repository name cannot be empty", nameof(request.Name));

        var (account, token) = await GetAccountAndTokenAsync(request.AccountId);

        if (account.Provider == GitProvider.GitHub)
        {
            var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://api.github.com" : account.ApiBaseUrl.TrimEnd('/');
            var url = $"{baseUrl}/user/repos";

            var payload = new
            {
                name = request.Name,
                description = request.Description,
                @private = request.IsPrivate,
                auto_init = request.AutoInitReadme,
                gitignore_template = request.GitignoreTemplate
            };

            var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
            req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var res = await _httpClient.SendAsync(req);
            var content = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"GitHub failed to create repository ({res.StatusCode}): {content}");
            }

            using var doc = JsonDocument.Parse(content);
            var el = doc.RootElement;
            return new RemoteRepoItem
            {
                Id = el.GetProperty("id").ToString(),
                Name = el.GetProperty("name").GetString() ?? request.Name,
                FullName = el.TryGetProperty("full_name", out var fn) ? fn.GetString() ?? request.Name : request.Name,
                Description = request.Description,
                HtmlUrl = el.TryGetProperty("html_url", out var hu) ? hu.GetString() ?? "" : "",
                CloneUrl = el.TryGetProperty("clone_url", out var cu) ? cu.GetString() ?? "" : "",
                SshUrl = el.TryGetProperty("ssh_url", out var su) ? su.GetString() : null,
                IsPrivate = request.IsPrivate,
                DefaultBranch = el.TryGetProperty("default_branch", out var db) ? db.GetString() ?? "main" : "main",
                OwnerName = account.Username
            };
        }
        else if (account.Provider == GitProvider.GitLab)
        {
            var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://gitlab.com/api/v4" : account.ApiBaseUrl.TrimEnd('/');
            var url = $"{baseUrl}/projects";

            var payload = new
            {
                name = request.Name,
                description = request.Description,
                visibility = request.IsPrivate ? "private" : "public",
                initialize_with_readme = request.AutoInitReadme
            };

            var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
            req.Headers.Add("PRIVATE-TOKEN", token);
            req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var res = await _httpClient.SendAsync(req);
            var content = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"GitLab failed to create project ({res.StatusCode}): {content}");
            }

            using var doc = JsonDocument.Parse(content);
            var el = doc.RootElement;
            return new RemoteRepoItem
            {
                Id = el.GetProperty("id").ToString(),
                Name = el.GetProperty("name").GetString() ?? request.Name,
                FullName = el.TryGetProperty("path_with_namespace", out var fn) ? fn.GetString() ?? request.Name : request.Name,
                Description = request.Description,
                HtmlUrl = el.TryGetProperty("web_url", out var hu) ? hu.GetString() ?? "" : "",
                CloneUrl = el.TryGetProperty("http_url_to_repo", out var cu) ? cu.GetString() ?? "" : "",
                SshUrl = el.TryGetProperty("ssh_url_to_repo", out var su) ? su.GetString() : null,
                IsPrivate = request.IsPrivate,
                DefaultBranch = el.TryGetProperty("default_branch", out var db) ? db.GetString() ?? "main" : "main",
                OwnerName = account.Username
            };
        }
        else
        {
            // Generic / Gitea
            var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://gitea.com/api/v1" : account.ApiBaseUrl.TrimEnd('/');
            var url = $"{baseUrl}/user/repos";

            var payload = new
            {
                name = request.Name,
                description = request.Description,
                @private = request.IsPrivate,
                auto_init = request.AutoInitReadme
            };

            var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
            req.Headers.Authorization = new AuthenticationHeaderValue("token", token);
            req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var res = await _httpClient.SendAsync(req);
            var content = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Git server failed to create repository ({res.StatusCode}): {content}");
            }

            using var doc = JsonDocument.Parse(content);
            var el = doc.RootElement;
            return new RemoteRepoItem
            {
                Id = el.GetProperty("id").ToString(),
                Name = el.GetProperty("name").GetString() ?? request.Name,
                FullName = el.TryGetProperty("full_name", out var fn) ? fn.GetString() ?? request.Name : request.Name,
                Description = request.Description,
                HtmlUrl = el.TryGetProperty("html_url", out var hu) ? hu.GetString() ?? "" : "",
                CloneUrl = el.TryGetProperty("clone_url", out var cu) ? cu.GetString() ?? "" : "",
                IsPrivate = request.IsPrivate,
                DefaultBranch = el.TryGetProperty("default_branch", out var db) ? db.GetString() ?? "main" : "main",
                OwnerName = account.Username
            };
        }
    }

    public async Task<RemoteRepoItem> PublishLocalRepositoryAsync(PublishLocalRepoRequest request)
    {
        if (!Directory.Exists(request.RepoPath))
            throw new DirectoryNotFoundException($"Local repository directory '{request.RepoPath}' not found");

        var repoName = string.IsNullOrWhiteSpace(request.RepoName)
            ? new DirectoryInfo(request.RepoPath).Name
            : request.RepoName;

        // 1. Create remote repo on GitHub/GitLab
        var createReq = new CreateRemoteRepoRequest
        {
            AccountId = request.AccountId,
            Name = repoName,
            Description = request.Description,
            IsPrivate = request.IsPrivate,
            AutoInitReadme = false // Do not initialize README so local repo can be pushed directly!
        };

        var remoteRepo = await CreateRemoteRepositoryAsync(createReq);

        // 2. Add remote origin to local git repo
        var (account, token) = await GetAccountAndTokenAsync(request.AccountId);

        // Inject credentials into clone URL if pushing over HTTPS
        string authedCloneUrl = remoteRepo.CloneUrl;
        if (authedCloneUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            authedCloneUrl = authedCloneUrl.Replace("https://", $"https://{account.Username}:{token}@");
        }

        var remoteName = string.IsNullOrWhiteSpace(request.RemoteName) ? "origin" : request.RemoteName;

        // Run git remote add
        await RunGitDirectAsync(request.RepoPath, $"remote remove {remoteName}"); // Remove old if exists
        await RunGitDirectAsync(request.RepoPath, $"remote add {remoteName} \"{authedCloneUrl}\"");

        // 3. Detect current branch
        var (_, currentBranch, _) = await RunGitDirectAsync(request.RepoPath, "branch --show-current");
        if (string.IsNullOrWhiteSpace(currentBranch))
        {
            currentBranch = "main";
            await RunGitDirectAsync(request.RepoPath, "branch -M main");
        }

        // 4. Push local repo to remote
        var (pushCode, pushOut, pushErr) = await RunGitDirectAsync(request.RepoPath, $"push -u {remoteName} {currentBranch}");
        if (pushCode != 0)
        {
            throw new InvalidOperationException($"Remote repository '{remoteRepo.FullName}' was created on cloud, but initial push failed: {pushErr}");
        }

        return remoteRepo;
    }

    public async Task<string> CloneRepositoryAsync(CloneRepoRequest request)
    {
        var targetDir = request.DestinationPath;
        if (string.IsNullOrWhiteSpace(targetDir))
        {
            var userDir = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var repoName = request.ProjectName ?? Path.GetFileNameWithoutExtension(request.CloneUrl);
            targetDir = Path.Combine(userDir, "source", "repos", repoName);
        }

        var parent = Path.GetDirectoryName(targetDir);
        if (!string.IsNullOrEmpty(parent)) Directory.CreateDirectory(parent);

        var (code, stdout, stderr) = await RunGitDirectAsync(parent ?? Environment.CurrentDirectory, $"clone \"{request.CloneUrl}\" \"{targetDir}\"");
        if (code != 0)
        {
            throw new InvalidOperationException($"Clone failed: {stderr}");
        }

        if (request.AddToProjects)
        {
            var detected = await _projectService.DetectProjectAsync(targetDir);
            if (detected != null)
            {
                if (!string.IsNullOrWhiteSpace(request.ProjectName)) detected.Name = request.ProjectName;
                await _projectService.SaveProjectAsync(detected);
            }
        }

        return targetDir;
    }

    public async Task<GitPushResult> PushToRemoteRepositoryAsync(PushToRemoteRepoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RepoPath) || !Directory.Exists(request.RepoPath))
            throw new DirectoryNotFoundException($"Thư mục cục bộ '{request.RepoPath}' không tồn tại");

        var (account, token) = await GetAccountAndTokenAsync(request.AccountId);

        // 1. Kiểm tra kho git đã khởi tạo chưa
        var gitDir = Path.Combine(request.RepoPath, ".git");
        if (!Directory.Exists(gitDir))
        {
            var (initCode, _, initErr) = await RunGitDirectAsync(request.RepoPath, "init -b main");
            if (initCode != 0)
            {
                (initCode, _, initErr) = await RunGitDirectAsync(request.RepoPath, "init");
                if (initCode != 0)
                    throw new InvalidOperationException($"Không thể khởi tạo kho Git: {initErr}");
            }
        }

        // Tự động đảm bảo có tệp .gitignore chuẩn (tránh lock file .vs/bin/obj/dist và tránh commit file nặng vượt quá 100MB của GitHub)
        var gitignorePath = Path.Combine(request.RepoPath, ".gitignore");
        if (!File.Exists(gitignorePath))
        {
            var standardGitignore = @"# DevDock Auto-generated .gitignore
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
.vs/
*.suo
*.user
*.userosscache
*.sln.docstates
.idea/
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
*.log
*.tmp
*.bak
Thumbs.db
.DS_Store
*.nupkg
*.snupkg
*.exe
*.msi
*.zip
.env
.env.local
";
            try { await File.WriteAllTextAsync(gitignorePath, standardGitignore, Encoding.UTF8); } catch { }
        }

        // Tự động cấu hình user.name và user.email nếu chưa có
        var (_, userName, _) = await RunGitDirectAsync(request.RepoPath, "config user.name");
        if (string.IsNullOrWhiteSpace(userName))
        {
            var nameToUse = string.IsNullOrWhiteSpace(account.Username) ? "DevDock User" : account.Username;
            await RunGitDirectAsync(request.RepoPath, $"config user.name \"{nameToUse}\"");
        }

        var (_, userEmail, _) = await RunGitDirectAsync(request.RepoPath, "config user.email");
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            var emailToUse = string.IsNullOrWhiteSpace(account.Email) ? $"{account.Username}@users.noreply.github.com" : account.Email;
            await RunGitDirectAsync(request.RepoPath, $"config user.email \"{emailToUse}\"");
        }

        // 2. Commit tất cả tệp nếu AutoCommitAll = true
        if (request.AutoCommitAll)
        {
            await RunGitDirectAsync(request.RepoPath, "add .gitignore");
            var (addCode, _, _) = await RunGitDirectAsync(request.RepoPath, "add -A");
            if (addCode != 0)
            {
                // Fallback nếu có file bị permission denied / lock bởi IDE
                await RunGitDirectAsync(request.RepoPath, "add --ignore-errors .");
            }

            var (_, statOut, _) = await RunGitDirectAsync(request.RepoPath, "status --porcelain");
            if (!string.IsNullOrWhiteSpace(statOut))
            {
                var msg = string.IsNullOrWhiteSpace(request.CommitMessage) ? "Initial commit from DevDock" : request.CommitMessage;
                await RunGitDirectAsync(request.RepoPath, $"commit -m \"{msg.Replace("\"", "\\\"")}\"");
            }
        }

        // 3. Đảm bảo kho lưu trữ đã có ít nhất một commit trước khi tạo nhánh & đẩy code
        var (revCheckCode, _, _) = await RunGitDirectAsync(request.RepoPath, "rev-parse --verify HEAD");
        if (revCheckCode != 0)
        {
            // Kho chưa có commit nào (unborn branch) -> tiến hành commit tệp tin hiện có hoặc tạo README.md
            await RunGitDirectAsync(request.RepoPath, "add -A");
            var readmePath = Path.Combine(request.RepoPath, "README.md");
            if (!File.Exists(readmePath))
            {
                var repoName = Path.GetFileName(request.RepoPath);
                try { await File.WriteAllTextAsync(readmePath, $"# {repoName}\n\nProject initialized with DevDock.\n", Encoding.UTF8); } catch { }
                await RunGitDirectAsync(request.RepoPath, "add README.md");
            }

            var msg = string.IsNullOrWhiteSpace(request.CommitMessage) ? "Initial commit from DevDock" : request.CommitMessage;
            await RunGitDirectAsync(request.RepoPath, $"commit -m \"{msg.Replace("\"", "\\\"")}\"");

            // Kiểm tra lại sau khi commit
            var (revRetry, _, revErr) = await RunGitDirectAsync(request.RepoPath, "rev-parse --verify HEAD");
            if (revRetry != 0)
            {
                return new GitPushResult
                {
                    Success = false,
                    Message = $"Kho lưu trữ chưa có commit nào và không thể tự động tạo commit: {revErr}. Vui lòng kiểm tra quyền truy cập thư mục.",
                    Branch = request.Branch ?? "main",
                    RemoteUrl = request.CloneUrl
                };
            }
        }

        // 4. Chuẩn bị remote URL có gắn Token PAT để tự động xác thực không hỏi mật khẩu
        string authedCloneUrl = request.CloneUrl;
        if (authedCloneUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            authedCloneUrl = authedCloneUrl.Replace("https://", $"https://{account.Username}:{token}@");
        }

        var remoteName = string.IsNullOrWhiteSpace(request.RemoteName) ? "origin" : request.RemoteName.Trim();
        var branch = string.IsNullOrWhiteSpace(request.Branch) ? "main" : request.Branch.Trim();

        // 5. Gán hoặc cập nhật remote origin
        await RunGitDirectAsync(request.RepoPath, $"remote remove {remoteName}");
        var (remoteCode, _, remoteErr) = await RunGitDirectAsync(request.RepoPath, $"remote add {remoteName} \"{authedCloneUrl}\"");
        if (remoteCode != 0)
        {
            throw new InvalidOperationException($"Lỗi thiết lập remote '{remoteName}': {remoteErr}");
        }

        // 6. Đổi tên nhánh mặc định
        await RunGitDirectAsync(request.RepoPath, $"branch -M {branch}");

        // 7. Thực hiện push
        var forceFlag = request.ForcePush ? "-f " : "";
        var (pushCode, pushOut, pushErr) = await RunGitDirectAsync(request.RepoPath, $"push -u {forceFlag}{remoteName} {branch}");

        // Giấu token PAT khỏi output để bảo mật
        var cleanOut = (pushOut ?? "").Replace(token, "******");
        var cleanErr = (pushErr ?? "").Replace(token, "******");
        var fullOutput = string.IsNullOrWhiteSpace(cleanOut) ? cleanErr : $"{cleanOut}\n{cleanErr}".Trim();

        if (pushCode != 0)
        {
            var friendlyMsg = cleanErr;
            if (cleanErr.Contains("non-fast-forward", StringComparison.OrdinalIgnoreCase) ||
                cleanErr.Contains("fetch first", StringComparison.OrdinalIgnoreCase) ||
                cleanErr.Contains("rejected", StringComparison.OrdinalIgnoreCase))
            {
                friendlyMsg = "Kho trên GitHub đã có commit từ trước. Hãy tích chọn 'Ghi đè nhánh từ xa (--force)' để đẩy đè lên, hoặc thực hiện kéo (pull) trước.";
            }
            else if (cleanErr.Contains("src refspec", StringComparison.OrdinalIgnoreCase))
            {
                friendlyMsg = $"Nhánh '{branch}' không có commit hợp lệ nào để đẩy lên. Hãy kiểm tra các tệp tin trong thư mục đã được commit.";
            }

            return new GitPushResult
            {
                Success = false,
                Message = $"Đẩy mã nguồn lên remote thất bại: {friendlyMsg}",
                Output = fullOutput,
                Branch = branch,
                RemoteUrl = request.CloneUrl
            };
        }

        // Tự động nhận diện và lưu vào danh sách dự án nếu chưa có
        try
        {
            var detected = await _projectService.DetectProjectAsync(request.RepoPath);
            if (detected != null)
            {
                await _projectService.SaveProjectAsync(detected);
            }
        }
        catch { }

        return new GitPushResult
        {
            Success = true,
            Message = $"Đã đẩy code thành công lên {request.CloneUrl} (nhánh {branch})!",
            Output = fullOutput,
            Branch = branch,
            RemoteUrl = request.CloneUrl
        };
    }

    public async Task<GitRateLimitInfo?> GetRateLimitAsync(string accountId)
    {
        var (account, token) = await GetAccountAndTokenAsync(accountId);
        if (account.Provider != GitProvider.GitHub) return null;

        var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://api.github.com" : account.ApiBaseUrl.TrimEnd('/');
        var req = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/rate_limit");
        req.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var res = await _httpClient.SendAsync(req);
        if (!res.IsSuccessStatusCode) return null;

        var json = await res.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var core = doc.RootElement.GetProperty("resources").GetProperty("core");

        return new GitRateLimitInfo
        {
            Limit = core.GetProperty("limit").GetInt32(),
            Remaining = core.GetProperty("remaining").GetInt32(),
            ResetTime = DateTimeOffset.FromUnixTimeSeconds(core.GetProperty("reset").GetInt64()).LocalDateTime
        };
    }

    private static async Task<(int ExitCode, string StdOut, string StdErr)> RunGitDirectAsync(string workingDir, string arguments)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "git",
            Arguments = arguments,
            WorkingDirectory = workingDir,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8
        };

        psi.EnvironmentVariables["LC_ALL"] = "C.UTF-8";
        psi.EnvironmentVariables["GIT_PAGER"] = "cat";

        using var proc = new Process { StartInfo = psi };
        var stdout = new StringBuilder();
        var stderr = new StringBuilder();

        proc.OutputDataReceived += (_, e) => { if (e.Data != null) stdout.AppendLine(e.Data); };
        proc.ErrorDataReceived += (_, e) => { if (e.Data != null) stderr.AppendLine(e.Data); };

        proc.Start();
        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();

        await proc.WaitForExitAsync();
        return (proc.ExitCode, stdout.ToString().TrimEnd(), stderr.ToString().TrimEnd());
    }
}
