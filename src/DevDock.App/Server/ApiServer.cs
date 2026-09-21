using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using DevDock.Core.Models;
using DevDock.Core.Plugins;
using DevDock.Core.Services;
using DevDock.Git.Services;
using DevDock.Projects.Services;
using DevDock.Security.Services;
using DevDock.Settings.Services;
using DevDock.SSH.Services;
using DevDock.Terminal.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.Net.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DevDock.App.Server;

public class ApiServer
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    private IHost? _host;
    public int Port { get; private set; } = FindAvailablePort(38420);
    public string BaseUrl => $"http://127.0.0.1:{Port}";

    public IServiceProvider? Services => _host?.Services;

    private static int FindAvailablePort(int defaultPort)
    {
        int[] candidates = [defaultPort, 48420, 28420, 18420];
        foreach (var p in candidates)
        {
            try
            {
                var l = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, p);
                l.Start();
                l.Stop();
                return p;
            }
            catch { }
        }

        try
        {
            var fallback = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, 0);
            fallback.Start();
            int freePort = ((System.Net.IPEndPoint)fallback.LocalEndpoint).Port;
            fallback.Stop();
            return freePort;
        }
        catch
        {
            return defaultPort;
        }
    }

    public async Task StartAsync()
    {
        var wwwroot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ContentRootPath = AppContext.BaseDirectory,
            WebRootPath = wwwroot,
            Args = []
        });

        // Bind exclusively to loopback
        builder.WebHost.UseUrls($"http://127.0.0.1:{Port}");

        // Register DevDock services
        builder.Services.AddSingleton<ICredentialService, DpapiCredentialService>();
        builder.Services.AddSingleton<IProjectService, ProjectService>();
        builder.Services.AddSingleton<IGitService, GitService>();
        builder.Services.AddSingleton<IGitProviderService, GitProviderService>();
        builder.Services.AddSingleton<ISshService, SshService>();
        builder.Services.AddSingleton<ITerminalService, TerminalService>();
        builder.Services.AddSingleton<ISettingsService, SettingsService>();
        builder.Services.AddSingleton<IAiService, AiService>();
        builder.Services.AddSingleton<ISetupService, SetupService>();
        builder.Services.AddSingleton<ISystemMetricsService, SystemMetricsService>();
        builder.Services.AddSingleton<ICommandService, CommandService>();
        builder.Services.AddSingleton<IDevOpsService, DevOpsService>();
        builder.Services.AddSingleton<IPluginManager, DevDock.Plugins.PluginManager>();
        builder.Services.AddHttpClient();
        builder.Services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        });

        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
        });

        var app = builder.Build();

        app.UseCors();
        app.UseWebSockets(new WebSocketOptions
        {
            KeepAliveInterval = TimeSpan.FromSeconds(15)
        });

        // Initialize plugins
        var pluginMgr = app.Services.GetRequiredService<IPluginManager>();
        await pluginMgr.LoadPluginsAsync();

        // Configure API routes
        ConfigureRoutes(app);

        // Serve static React app if wwwroot exists
        if (Directory.Exists(wwwroot))
        {
            var fileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(wwwroot);
            app.UseDefaultFiles(new DefaultFilesOptions
            {
                FileProvider = fileProvider
            });
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = fileProvider
            });
            app.MapFallbackToFile("index.html", new StaticFileOptions
            {
                FileProvider = fileProvider
            });
        }

        _host = app;
        await _host.StartAsync();
    }

    private void ConfigureRoutes(WebApplication app)
    {
        var api = app.MapGroup("/api");

        // ------------------ PROJECTS ------------------
        api.MapGet("/projects", async (IProjectService svc) =>
            Results.Ok(await svc.GetAllProjectsAsync()));

        api.MapGet("/projects/{id}", async (string id, IProjectService svc) =>
        {
            var p = await svc.GetProjectByIdAsync(id);
            return p != null ? Results.Ok(p) : Results.NotFound();
        });

        api.MapPost("/projects", async (ProjectItem project, IProjectService svc) =>
            Results.Ok(await svc.SaveProjectAsync(project)));

        api.MapDelete("/projects/{id}", async (string id, IProjectService svc) =>
            Results.Ok(new { success = await svc.DeleteProjectAsync(id) }));

        api.MapPost("/projects/detect", async (DetectPathRequest req, IProjectService svc) =>
        {
            var detected = await svc.DetectProjectAsync(req.Path);
            return detected != null ? Results.Ok(detected) : Results.NotFound();
        });

        api.MapPost("/projects/run", async (ProjectCommandRunRequest req, IProjectService svc) =>
            Results.Ok(await svc.RunCommandAsync(req)));

        api.MapPost("/projects/open-explorer", async (PathRequest req, IProjectService svc) =>
        {
            await svc.OpenInExplorerAsync(req.Path);
            return Results.Ok();
        });

        api.MapPost("/projects/open-editor", async (OpenEditorRequest req, IProjectService svc) =>
        {
            await svc.OpenInEditorAsync(req.Path, req.Editor ?? "code");
            return Results.Ok();
        });

        api.MapPost("/system/browse-folder", async (HttpContext ctx) =>
        {
            string? initialPath = null;
            if (ctx.Request.ContentLength.HasValue && ctx.Request.ContentLength > 0)
            {
                try
                {
                    var req = await ctx.Request.ReadFromJsonAsync<BrowseFolderRequest>();
                    initialPath = req?.InitialPath;
                }
                catch { }
            }

            string? selectedFolder = null;
            var dispatcher = System.Windows.Application.Current?.Dispatcher;
            if (dispatcher != null)
            {
                dispatcher.Invoke(() =>
                {
                    var dlg = new Microsoft.Win32.OpenFolderDialog
                    {
                        Title = "Chọn thư mục dự án mã nguồn",
                        Multiselect = false
                    };
                    if (!string.IsNullOrWhiteSpace(initialPath) && Directory.Exists(initialPath))
                    {
                        dlg.InitialDirectory = initialPath;
                    }

                    var mainWindow = System.Windows.Application.Current?.MainWindow;
                    var result = mainWindow != null ? dlg.ShowDialog(mainWindow) : dlg.ShowDialog();
                    if (result == true)
                    {
                        selectedFolder = dlg.FolderName;
                    }
                });
            }
            else
            {
                var thread = new Thread(() =>
                {
                    var dlg = new Microsoft.Win32.OpenFolderDialog
                    {
                        Title = "Chọn thư mục dự án mã nguồn",
                        Multiselect = false
                    };
                    if (!string.IsNullOrWhiteSpace(initialPath) && Directory.Exists(initialPath))
                    {
                        dlg.InitialDirectory = initialPath;
                    }

                    if (dlg.ShowDialog() == true)
                    {
                        selectedFolder = dlg.FolderName;
                    }
                });
                thread.SetApartmentState(ApartmentState.STA);
                thread.Start();
                thread.Join();
            }

            return Results.Ok(new { folder = selectedFolder, canceled = string.IsNullOrEmpty(selectedFolder) });
        });

        // ------------------ GIT ------------------
        api.MapGet("/git/status", async (string repoPath, IGitService svc) =>
            Results.Ok(await svc.GetStatusAsync(repoPath)));

        api.MapPost("/git/stage", async (GitPathRequest req, IGitService svc) =>
        {
            try
            {
                await svc.StageFileAsync(req.RepoPath, req.FilePath);
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message, error = ex.Message });
            }
        });

        api.MapPost("/git/unstage", async (GitPathRequest req, IGitService svc) =>
        {
            try
            {
                await svc.UnstageFileAsync(req.RepoPath, req.FilePath);
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message, error = ex.Message });
            }
        });

        api.MapPost("/git/stage-all", async (GitRepoRequest req, IGitService svc) =>
        {
            try
            {
                await svc.StageAllAsync(req.RepoPath);
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message, error = ex.Message });
            }
        });

        api.MapPost("/git/unstage-all", async (GitRepoRequest req, IGitService svc) =>
        {
            try
            {
                await svc.UnstageAllAsync(req.RepoPath);
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message, error = ex.Message });
            }
        });

        api.MapPost("/git/discard", async (GitPathRequest req, IGitService svc) =>
        {
            try
            {
                await svc.DiscardChangesAsync(req.RepoPath, req.FilePath);
                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message, error = ex.Message });
            }
        });

        api.MapPost("/git/commit", async (GitCommitRequest req, IGitService svc) =>
        {
            try
            {
                var output = await svc.CommitAsync(req);
                return Results.Ok(new { success = true, output });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message, error = ex.Message });
            }
        });

        api.MapPost("/git/push", async (GitPushPullRequest req, IGitService svc) =>
        {
            try
            {
                var output = await svc.PushAsync(req.RepoPath, req.Remote, req.Branch);
                return Results.Ok(new { success = true, output });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message, error = ex.Message });
            }
        });

        api.MapPost("/git/pull", async (GitPushPullRequest req, IGitService svc) =>
        {
            try
            {
                var output = await svc.PullAsync(req.RepoPath, req.Remote, req.Branch);
                return Results.Ok(new { success = true, output });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message, error = ex.Message });
            }
        });

        api.MapPost("/git/fetch", async (GitPushPullRequest req, IGitService svc) =>
        {
            try
            {
                var output = await svc.FetchAsync(req.RepoPath, req.Remote);
                return Results.Ok(new { success = true, output });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { success = false, message = ex.Message, error = ex.Message });
            }
        });

        api.MapGet("/git/branches", async (string repoPath, IGitService svc) =>
            Results.Ok(await svc.GetBranchesAsync(repoPath)));

        api.MapPost("/git/checkout", async (GitBranchActionRequest req, IGitService svc) =>
        {
            await svc.CheckoutBranchAsync(req.RepoPath, req.BranchName);
            return Results.Ok();
        });

        api.MapPost("/git/create-branch", async (GitBranchActionRequest req, IGitService svc) =>
        {
            await svc.CreateBranchAsync(req.RepoPath, req.BranchName, req.Checkout);
            return Results.Ok();
        });

        api.MapGet("/git/commits", async (string repoPath, int? count, IGitService svc) =>
            Results.Ok(await svc.GetRecentCommitsAsync(repoPath, count ?? 25)));

        api.MapGet("/git/diff", async (string repoPath, string filePath, bool? staged, int? contextLines, IGitService svc) =>
            Results.Ok(await svc.GetFileDiffAsync(repoPath, filePath, staged ?? false, contextLines ?? 3)));

        api.MapPost("/git/stash", async (GitStashRequest req, IGitService svc) =>
        {
            var output = await svc.StashAsync(req.RepoPath, req.Message);
            return Results.Ok(new { output });
        });

        api.MapPost("/git/stash-pop", async (GitRepoRequest req, IGitService svc) =>
        {
            var output = await svc.StashPopAsync(req.RepoPath);
            return Results.Ok(new { output });
        });

        // Stashes
        api.MapGet("/git/stashes", async (string repoPath, IGitService svc) =>
            Results.Ok(await svc.GetStashesAsync(repoPath)));

        api.MapPost("/git/stashes/apply", async (GitStashIndexRequest req, IGitService svc) =>
            Results.Ok(new { output = await svc.ApplyStashAsync(req.RepoPath, req.Index) }));

        api.MapPost("/git/stashes/drop", async (GitStashIndexRequest req, IGitService svc) =>
            Results.Ok(new { output = await svc.DropStashAsync(req.RepoPath, req.Index) }));

        // Branches management
        api.MapPost("/git/branches/delete", async (GitDeleteBranchRequest req, IGitService svc) =>
        {
            await svc.DeleteBranchAsync(req.RepoPath, req.BranchName, req.Force);
            return Results.Ok();
        });

        api.MapPost("/git/branches/rename", async (GitRenameBranchRequest req, IGitService svc) =>
        {
            await svc.RenameBranchAsync(req.RepoPath, req.OldName, req.NewName);
            return Results.Ok();
        });

        // Remotes
        api.MapGet("/git/remotes", async (string repoPath, IGitService svc) =>
            Results.Ok(await svc.GetRemotesAsync(repoPath)));

        api.MapPost("/git/remotes/add", async (GitAddRemoteRequest req, IGitService svc) =>
        {
            await svc.AddRemoteAsync(req.RepoPath, req.Name, req.Url);
            return Results.Ok();
        });

        api.MapPost("/git/remotes/remove", async (GitRemoveRemoteRequest req, IGitService svc) =>
        {
            await svc.RemoveRemoteAsync(req.RepoPath, req.Name);
            return Results.Ok();
        });

        // Tags
        api.MapGet("/git/tags", async (string repoPath, IGitService svc) =>
            Results.Ok(await svc.GetTagsAsync(repoPath)));

        api.MapPost("/git/tags/create", async (GitCreateTagRequest req, IGitService svc) =>
        {
            await svc.CreateTagAsync(req.RepoPath, req.Name, req.Message);
            return Results.Ok();
        });

        api.MapPost("/git/tags/push", async (GitPushTagRequest req, IGitService svc) =>
        {
            await svc.PushTagAsync(req.RepoPath, req.Name, req.Remote);
            return Results.Ok();
        });

        api.MapPost("/git/tags/delete", async (GitDeleteTagRequest req, IGitService svc) =>
        {
            await svc.DeleteTagAsync(req.RepoPath, req.Name);
            return Results.Ok();
        });

        // Operations: Merge, Rebase, Reset, Revert, Cherry-Pick, Commit Details
        api.MapPost("/git/merge", async (GitMergeRequest req, IGitService svc) =>
            Results.Ok(new { output = await svc.MergeAsync(req.RepoPath, req.BranchName) }));

        api.MapPost("/git/rebase", async (GitRebaseRequest req, IGitService svc) =>
            Results.Ok(new { output = await svc.RebaseAsync(req.RepoPath, req.BranchName) }));

        api.MapPost("/git/reset", async (GitResetRequest req, IGitService svc) =>
            Results.Ok(new { output = await svc.ResetAsync(req.RepoPath, req.TargetRef, req.Mode) }));

        api.MapPost("/git/revert", async (GitRevertRequest req, IGitService svc) =>
            Results.Ok(new { output = await svc.RevertAsync(req.RepoPath, req.CommitHash) }));

        api.MapPost("/git/cherry-pick", async (GitCherryPickRequest req, IGitService svc) =>
            Results.Ok(new { output = await svc.CherryPickAsync(req.RepoPath, req.CommitHash) }));

        api.MapGet("/git/commit-details", async (string repoPath, string commitHash, IGitService svc) =>
            Results.Ok(await svc.GetCommitDetailsAsync(repoPath, commitHash)));

        // Cloud Git Providers
        api.MapGet("/git/providers/repos", async (string accountId, string? search, int? page, int? pageSize, IGitProviderService svc) =>
            Results.Ok(await svc.ListRemoteRepositoriesAsync(accountId, search, page ?? 1, pageSize ?? 30)));

        api.MapPost("/git/providers/create", async (CreateRemoteRepoRequest req, IGitProviderService svc) =>
            Results.Ok(await svc.CreateRemoteRepositoryAsync(req)));

        api.MapPost("/git/providers/publish", async (PublishLocalRepoRequest req, IGitProviderService svc) =>
            Results.Ok(await svc.PublishLocalRepositoryAsync(req)));

        api.MapPost("/git/providers/clone", async (CloneRepoRequest req, IGitProviderService svc) =>
            Results.Ok(await svc.CloneRepositoryAsync(req)));

        api.MapPost("/git/providers/push-to-remote", async (PushToRemoteRepoRequest req, IGitProviderService svc) =>
            Results.Ok(await svc.PushToRemoteRepositoryAsync(req)));

        api.MapGet("/git/providers/rate-limit", async (string accountId, IGitProviderService svc) =>
            Results.Ok(await svc.GetRateLimitAsync(accountId)));

        api.MapPost("/git/init", async (GitRepoRequest req, IGitService svc) =>
        {
            var output = await svc.InitRepositoryAsync(req.RepoPath);
            return Results.Ok(new { success = true, output });
        });

        api.MapPost("/git/cicd/inspect", async (InspectRepoRequest req, IGitService svc) =>
            Results.Ok(await svc.InspectRepositoryTechAsync(req)));

        api.MapPost("/git/cicd/setup-github-action", async (GithubActionSetupRequest req, IGitService svc) =>
            Results.Ok(await svc.SetupGithubActionAsync(req)));

        api.MapGet("/git/gitignore", async (string repoPath, IGitService svc) =>
            Results.Ok(await svc.GetGitIgnoreAsync(repoPath)));

        api.MapPost("/git/gitignore", async (SaveGitIgnoreRequest req, IGitService svc) =>
            Results.Ok(new { success = await svc.SaveGitIgnoreAsync(req) }));

        api.MapPost("/git/gitignore/add", async (AddToGitIgnoreRequest req, IGitService svc) =>
            Results.Ok(new { success = await svc.AddToGitIgnoreAsync(req) }));

        api.MapGet("/git/gitignore/templates", async (IGitService svc) =>
            Results.Ok(await svc.GetGitIgnoreTemplatesAsync()));

        // ------------------ SSH ------------------
        api.MapGet("/ssh/profiles", async (ISshService svc) =>
            Results.Ok(await svc.GetAllProfilesAsync()));

        api.MapGet("/ssh/profiles/{id}", async (string id, ISshService svc) =>
        {
            var p = await svc.GetProfileByIdAsync(id);
            return p != null ? Results.Ok(p) : Results.NotFound();
        });

        api.MapPost("/ssh/profiles", async (SaveSshProfileRequest req, ISshService svc) =>
            Results.Ok(await svc.SaveProfileAsync(req)));

        api.MapDelete("/ssh/profiles/{id}", async (string id, ISshService svc) =>
            Results.Ok(new { success = await svc.DeleteProfileAsync(id) }));

        api.MapPost("/ssh/test", async (SaveSshProfileRequest req, ISshService svc) =>
        {
            if (!string.IsNullOrEmpty(req.Profile.Id) && string.IsNullOrEmpty(req.Password) && string.IsNullOrEmpty(req.PrivateKeyContent))
            {
                return Results.Ok(await svc.TestConnectionAsync(req.Profile.Id));
            }
            return Results.Ok(await svc.TestDirectConnectionAsync(req));
        });

        api.MapPost("/ssh/connect-terminal", async (SshConnectTerminalRequest req, ISshService sshSvc, ITerminalService termSvc) =>
        {
            try
            {
                if (sshSvc is SshService concreteSsh && termSvc is TerminalService concreteTerm)
                {
                    var (client, shellStream) = await concreteSsh.CreateInteractiveShellAsync(req.ProfileId, req.Cols, req.Rows);
                    var sessionId = Guid.NewGuid().ToString("N");
                    var profile = await sshSvc.GetProfileByIdAsync(req.ProfileId);

                    var info = new TerminalSessionInfo
                    {
                        SessionId = sessionId,
                        Title = $"SSH: {profile?.Name ?? req.ProfileId}",
                        ShellType = TerminalShellType.Ssh,
                        WorkingDirectory = $"{profile?.Username}@{profile?.Host}",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    concreteTerm.RegisterCustomSession(
                        sessionId,
                        info,
                        shellStream,
                        shellStream,
                        (cols, rows) =>
                        {
                            if (cols > 0 && rows > 0)
                            {
                                try
                                {
                                    var field = typeof(Renci.SshNet.ShellStream).GetField("_channel", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                                    if (field?.GetValue(shellStream) is { } channel)
                                    {
                                        var method = channel.GetType().GetMethod("SendWindowChangeRequest", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                                        method?.Invoke(channel, new object[] { (uint)cols, (uint)rows, (uint)(cols * 8), (uint)(rows * 16) });
                                    }
                                }
                                catch { }
                            }
                        },
                        () =>
                        {
                            try { shellStream.Dispose(); } catch { }
                            try { client.Disconnect(); client.Dispose(); } catch { }
                        });

                    return Results.Ok(info);
                }
                return Results.BadRequest(new { error = "Dịch vụ SSH Terminal stream không khả dụng" });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = $"Lỗi kết nối SSH: {ex.Message}" });
            }
        });

        // ------------------ SFTP REMOTE FILE EXPLORER ------------------
        api.MapGet("/ssh/{id}/sftp/list", async (string id, string? path, ISshService svc) =>
        {
            try
            {
                var files = await svc.SftpListDirectoryAsync(id, path);
                return Results.Ok(new { success = true, files });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message, files = Array.Empty<RemoteFileItem>() });
            }
        });

        api.MapGet("/ssh/{id}/sftp/read", async (string id, string path, ISshService svc) =>
        {
            try
            {
                var file = await svc.SftpReadFileAsync(id, path);
                return Results.Ok(new { success = true, file });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message });
            }
        });

        api.MapPost("/ssh/sftp/upload", async (SftpUploadRequest req, ISshService svc) =>
        {
            try
            {
                var bytes = Convert.FromBase64String(req.ContentBase64);
                var ok = await svc.SftpUploadFileAsync(req.ProfileId, req.RemotePath, bytes);
                return Results.Ok(new { success = ok });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message });
            }
        });

        api.MapPost("/ssh/sftp/delete", async (SftpDeleteRequest req, ISshService svc) =>
        {
            try
            {
                var ok = await svc.SftpDeleteAsync(req.ProfileId, req.Path, req.IsDirectory);
                return Results.Ok(new { success = ok });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message });
            }
        });

        api.MapPost("/ssh/sftp/mkdir", async (SftpCreateDirRequest req, ISshService svc) =>
        {
            try
            {
                var ok = await svc.SftpCreateDirectoryAsync(req.ProfileId, req.Path);
                return Results.Ok(new { success = ok });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message });
            }
        });

        // ------------------ SSH ADVANCED SERVER MANAGEMENT ------------------
        api.MapPost("/ssh/{id}/exec", async (string id, SshExecCommandRequest req, ISshService svc) =>
        {
            try
            {
                var res = await svc.ExecuteCommandAsync(id, req.Command, req.TimeoutSeconds <= 0 ? 60 : req.TimeoutSeconds);
                return Results.Ok(res);
            }
            catch (Exception ex)
            {
                return Results.Ok(new SshCommandResult { Success = false, Error = ex.Message });
            }
        });

        api.MapGet("/ssh/{id}/overview", async (string id, ISshService svc) =>
        {
            try
            {
                var res = await svc.GetServerOverviewAsync(id);
                return Results.Ok(new { success = true, overview = res });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message, overview = new SshServerOverview() });
            }
        });

        api.MapGet("/ssh/{id}/ports", async (string id, ISshService svc) =>
        {
            try
            {
                var ports = await svc.GetListeningPortsAsync(id);
                return Results.Ok(new { success = true, ports });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message, ports = Array.Empty<SshListeningPortItem>() });
            }
        });

        api.MapPost("/ssh/{id}/ports/kill", async (string id, SshKillProcessRequest req, ISshService svc) =>
        {
            try
            {
                var ok = await svc.KillProcessAsync(id, req.Pid, req.Force);
                return Results.Ok(new { success = ok });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message });
            }
        });

        api.MapGet("/ssh/{id}/processes", async (string id, ISshService svc) =>
        {
            try
            {
                var processes = await svc.GetProcessesAsync(id);
                return Results.Ok(new { success = true, processes });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message, processes = Array.Empty<SshProcessItem>() });
            }
        });

        api.MapPost("/ssh/{id}/processes/action", async (string id, SshProcessActionRequest req, ISshService svc) =>
        {
            try
            {
                var res = await svc.ProcessActionAsync(id, req.Type, req.ProcessNameOrId, req.Action);
                return Results.Ok(res);
            }
            catch (Exception ex)
            {
                return Results.Ok(new SshCommandResult { Success = false, Error = ex.Message });
            }
        });

        api.MapPost("/ssh/{id}/processes/create-systemd", async (string id, SshCreateSystemdRequest req, ISshService svc) =>
        {
            try
            {
                var res = await svc.CreateSystemdServiceAsync(id, req.ServiceName, req.ExecStart, req.WorkingDir, req.User, req.EnvVars);
                return Results.Ok(res);
            }
            catch (Exception ex)
            {
                return Results.Ok(new SshCommandResult { Success = false, Error = ex.Message });
            }
        });

        api.MapGet("/ssh/{id}/nginx/status", async (string id, ISshService svc) =>
            Results.Ok(await svc.GetNginxStatusAsync(id)));

        api.MapGet("/ssh/{id}/nginx/sites", async (string id, ISshService svc) =>
        {
            try
            {
                var sites = await svc.GetNginxSitesAsync(id);
                return Results.Ok(new { success = true, sites });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message, sites = Array.Empty<SshNginxSiteItem>() });
            }
        });

        api.MapPost("/ssh/{id}/nginx/sites", async (string id, SshNginxSaveRequest req, ISshService svc) =>
        {
            try
            {
                var res = await svc.SaveNginxSiteAsync(id, req);
                return Results.Ok(res);
            }
            catch (Exception ex)
            {
                return Results.Ok(new SshCommandResult { Success = false, Error = ex.Message });
            }
        });

        api.MapPost("/ssh/{id}/nginx/sites/toggle", async (string id, SshToggleNginxSiteRequest req, ISshService svc) =>
            Results.Ok(await svc.ToggleNginxSiteAsync(id, req.SiteName, req.Enable)));

        api.MapDelete("/ssh/{id}/nginx/sites/{name}", async (string id, string name, ISshService svc) =>
            Results.Ok(await svc.DeleteNginxSiteAsync(id, name)));

        api.MapPost("/ssh/{id}/nginx/reload", async (string id, ISshService svc) =>
            Results.Ok(await svc.ReloadNginxAsync(id)));

        api.MapGet("/ssh/{id}/nginx/logs", async (string id, string? type, int? lines, ISshService svc) =>
            Results.Ok(new { logs = await svc.GetNginxLogsAsync(id, type ?? "error", lines ?? 100) }));

        api.MapGet("/ssh/{id}/certbot/status", async (string id, ISshService svc) =>
        {
            try
            {
                var certs = await svc.GetCertbotCertificatesAsync(id);
                return Results.Ok(new { success = true, certificates = certs });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message, certificates = Array.Empty<SshCertbotCertificateItem>() });
            }
        });

        api.MapPost("/ssh/{id}/certbot/install", async (string id, ISshService svc) =>
            Results.Ok(await svc.InstallCertbotAsync(id)));

        api.MapPost("/ssh/{id}/certbot/issue", async (string id, SshIssueCertbotRequest req, ISshService svc) =>
            Results.Ok(await svc.IssueCertbotSslAsync(id, req.Domain, req.Email)));

        api.MapPost("/ssh/{id}/domains/check", async (string id, SshCheckDomainsRequest req, ISshService svc) =>
        {
            try
            {
                var domains = await svc.CheckDomainsAsync(id, req.Domains);
                return Results.Ok(new { success = true, domains });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message, domains = Array.Empty<SshDomainItem>() });
            }
        });

        api.MapPost("/ssh/{id}/git/clone", async (string id, SshServerGitCloneRequest req, ISshService svc) =>
            Results.Ok(await svc.GitCloneOnServerAsync(id, req.RepoUrl, req.TargetDir, req.Branch)));

        api.MapPost("/ssh/{id}/git/pull", async (string id, SshServerGitPullRequest req, ISshService svc) =>
            Results.Ok(await svc.GitPullOnServerAsync(id, req.TargetDir, req.Branch, req.PostDeployCommand)));

        api.MapPost("/ssh/{id}/git/status", async (string id, SshServerGitStatusRequest req, ISshService svc) =>
            Results.Ok(await svc.GetServerGitStatusAsync(id, req.TargetDir)));

        api.MapGet("/ssh/{id}/metadata", async (string id, ISshService svc) =>
        {
            try
            {
                var meta = await svc.GetServerMetadataAsync(id);
                return Results.Ok(new { success = true, metadata = meta });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message, metadata = new SshServerMetadata() });
            }
        });

        api.MapPost("/ssh/{id}/metadata", async (string id, SshServerMetadata req, ISshService svc) =>
        {
            try
            {
                var ok = await svc.SaveServerMetadataAsync(id, req);
                return Results.Ok(new { success = ok });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, errorMessage = ex.Message });
            }
        });

        // ------------------ TERMINAL ------------------
        api.MapGet("/terminal/shells", async (ITerminalService svc) =>
            Results.Ok(await svc.GetAvailableShellsAsync()));

        api.MapPost("/terminal/create", async (CreateTerminalRequest req, ITerminalService svc) =>
        {
            var info = await svc.CreateLocalSessionAsync(req.ShellType, req.WorkingDirectory, req.Cols, req.Rows);
            return Results.Ok(info);
        });

        api.MapGet("/terminal/sessions", (ITerminalService svc) =>
            Results.Ok(svc.GetActiveSessions()));

        api.MapPost("/terminal/close", async (CloseTerminalRequest req, ITerminalService svc) =>
        {
            await svc.CloseSessionAsync(req.SessionId);
            return Results.Ok();
        });

        // ------------------ SETTINGS & GIT ACCOUNTS ------------------
        api.MapGet("/settings", async (ISettingsService svc) =>
            Results.Ok(await svc.GetSettingsAsync()));

        api.MapPost("/settings", async (AppSettings settings, ISettingsService svc) =>
            Results.Ok(await svc.SaveSettingsAsync(settings)));

        api.MapGet("/settings/git-accounts", async (ISettingsService svc) =>
            Results.Ok(await svc.GetGitAccountsAsync()));

        api.MapPost("/settings/git-accounts", async (SaveGitAccountRequest req, ISettingsService svc) =>
            Results.Ok(await svc.SaveGitAccountAsync(req)));

        api.MapDelete("/settings/git-accounts/{id}", async (string id, ISettingsService svc) =>
            Results.Ok(new { success = await svc.DeleteGitAccountAsync(id) }));

        api.MapPost("/settings/git-accounts/{id}/test", async (string id, ISettingsService svc) =>
            Results.Ok(await svc.TestGitAccountAsync(id)));

        api.MapPost("/settings/git-accounts/test-config", async (SaveGitAccountRequest req, ISettingsService svc) =>
            Results.Ok(await svc.TestDirectGitAccountAsync(req)));

        // ------------------ GIT GLOBAL CONFIG & WINGET ------------------
        api.MapGet("/git/global-config", async (IGitService svc) =>
            Results.Ok(await svc.GetGlobalConfigAsync()));

        api.MapPost("/git/global-config", async (GitGlobalConfig config, IGitService svc) =>
            Results.Ok(new { success = await svc.SetGlobalConfigAsync(config) }));

        api.MapPost("/git/install-winget", async (IGitService svc) =>
            Results.Ok(await svc.InstallGitViaWingetAsync()));

        // ------------------ SETUP & WINDOWS INTEGRATIONS ------------------
        api.MapGet("/setup/diagnostics", async (ISetupService svc) =>
            Results.Ok(await svc.GetDiagnosticsAsync()));

        api.MapGet("/setup/integrations", async (ISetupService svc) =>
            Results.Ok(await svc.GetIntegrationStatusAsync()));

        api.MapPost("/setup/path/add", async (ISetupService svc) =>
            Results.Ok(await svc.AddToPathAsync()));

        api.MapPost("/setup/path/remove", async (ISetupService svc) =>
            Results.Ok(await svc.RemoveFromPathAsync()));

        api.MapPost("/setup/context-menu/register", async (ISetupService svc) =>
            Results.Ok(await svc.RegisterContextMenuAsync()));

        api.MapPost("/setup/context-menu/unregister", async (ISetupService svc) =>
            Results.Ok(await svc.UnregisterContextMenuAsync()));

        api.MapPost("/setup/startup/register", async (ISetupService svc) =>
            Results.Ok(await svc.RegisterStartupAsync()));

        api.MapPost("/setup/startup/unregister", async (ISetupService svc) =>
            Results.Ok(await svc.UnregisterStartupAsync()));

        api.MapPost("/setup/protocol/register", async (ISetupService svc) =>
            Results.Ok(await svc.RegisterProtocolHandlerAsync()));

        api.MapPost("/setup/apply", async (ApplySetupRequest req, ISetupService svc) =>
            Results.Ok(await svc.ApplySetupAsync(req)));

        api.MapPost("/setup/shortcut/desktop", () =>
        {
            try
            {
                MainWindow.EnsureDesktopShortcut(overwrite: true);
                return Results.Ok(new { success = true, message = "Desktop shortcut created" });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { success = false, error = ex.Message });
            }
        });

        // ------------------ METRICS & COMMANDS ------------------
        api.MapGet("/metrics", async (ISystemMetricsService svc) =>
            Results.Ok(await svc.GetCurrentMetricsAsync()));

        // ------------------ AI PROVIDERS & ASSISTANT ------------------
        api.MapGet("/ai/providers", async (IAiService svc) =>
            Results.Ok(await svc.GetProvidersAsync()));

        api.MapGet("/ai/providers/{id}", async (string id, IAiService svc) =>
        {
            var p = await svc.GetProviderByIdAsync(id);
            return p != null ? Results.Ok(p) : Results.NotFound();
        });

        api.MapPost("/ai/providers", async (SaveAiProviderRequest req, IAiService svc) =>
            Results.Ok(await svc.SaveProviderAsync(req.Config, req.ApiKey)));

        api.MapDelete("/ai/providers/{id}", async (string id, IAiService svc) =>
            Results.Ok(new { success = await svc.DeleteProviderAsync(id) }));

        api.MapPost("/ai/providers/{id}/set-default", async (string id, IAiService svc) =>
            Results.Ok(new { success = await svc.SetDefaultProviderAsync(id) }));

        api.MapPost("/ai/providers/{id}/test", async (string id, IAiService svc) =>
            Results.Ok(await svc.TestProviderAsync(id)));

        api.MapPost("/ai/providers/test-config", async (SaveAiProviderRequest req, IAiService svc) =>
            Results.Ok(await svc.TestDirectConfigAsync(req)));

        api.MapPost("/ai/chat", async (AiChatRequest req, IAiService svc) =>
            Results.Ok(await svc.ChatAsync(req)));

        api.MapPost("/ai/git/generate-commit", async (AiGenerateCommitRequest req, IAiService svc) =>
            Results.Ok(await svc.GenerateCommitMessageAsync(req)));

        // ------------------ WINDOWS DEV OPS (PORTS, HOSTS, ENV) ------------------
        api.MapGet("/devops/ports", async (IDevOpsService svc) =>
            Results.Ok(await svc.GetListeningPortsAsync()));

        api.MapPost("/devops/ports/kill", async (KillProcessRequest req, IDevOpsService svc) =>
            Results.Ok(await svc.KillProcessByPidAsync(req.Pid, req.Force)));

        api.MapGet("/devops/hosts", async (IDevOpsService svc) =>
            Results.Ok(await svc.GetHostEntriesAsync()));

        api.MapPost("/devops/hosts", async (SaveHostsRequest req, IDevOpsService svc) =>
            Results.Ok(new { success = await svc.SaveHostEntriesAsync(req.Entries, req.AutoFlushDns) }));

        api.MapPost("/devops/hosts/flush-dns", async (IDevOpsService svc) =>
            Results.Ok(new { success = await svc.FlushDnsCacheAsync() }));

        api.MapGet("/devops/env", async (IDevOpsService svc) =>
            Results.Ok(await svc.GetEnvironmentVariablesAsync()));

        api.MapPost("/devops/dotenv/compare", async (DotEnvCompareRequest req, IDevOpsService svc) =>
            Results.Ok(await svc.CompareDotEnvAsync(req.CurrentEnv, req.ExampleEnv)));

        api.MapGet("/commands", async (ICommandService svc) =>
            Results.Ok(await svc.GetCommandsAsync()));

        api.MapGet("/plugins", (IPluginManager mgr) =>
            Results.Ok(mgr.GetLoadedPlugins().Select(p => p.Manifest)));

        // ------------------ HTTP CLIENT DEVELOPER TOOL PROXY ------------------
        api.MapPost("/tools/http-request", async (HttpRequestProxyModel req, IHttpClientFactory clientFactory) =>
        {
            var client = clientFactory.CreateClient();
            var message = new HttpRequestMessage(new HttpMethod(req.Method.ToUpperInvariant()), req.Url);

            if (req.Headers != null)
            {
                foreach (var (k, v) in req.Headers)
                {
                    if (string.IsNullOrWhiteSpace(k)) continue;
                    message.Headers.TryAddWithoutValidation(k, v);
                }
            }

            if (!string.IsNullOrEmpty(req.Body) && req.Method.ToUpperInvariant() is "POST" or "PUT" or "PATCH")
            {
                message.Content = new StringContent(req.Body, Encoding.UTF8, req.ContentType ?? "application/json");
            }

            var sw = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                var response = await client.SendAsync(message);
                sw.Stop();
                var content = await response.Content.ReadAsStringAsync();

                var responseHeaders = new Dictionary<string, string>();
                foreach (var h in response.Headers)
                {
                    responseHeaders[h.Key] = string.Join(", ", h.Value);
                }
                foreach (var h in response.Content.Headers)
                {
                    responseHeaders[h.Key] = string.Join(", ", h.Value);
                }

                return Results.Ok(new
                {
                    StatusCode = (int)response.StatusCode,
                    StatusText = response.StatusCode.ToString(),
                    DurationMs = sw.ElapsedMilliseconds,
                    Headers = responseHeaders,
                    Body = content,
                    ByteLength = content.Length
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                return Results.Ok(new
                {
                    StatusCode = 0,
                    StatusText = "Error",
                    DurationMs = sw.ElapsedMilliseconds,
                    Headers = new Dictionary<string, string>(),
                    Body = ex.Message,
                    ByteLength = 0,
                    Error = ex.ToString()
                });
            }
        });

        // ------------------ WEBSOCKETS ------------------
        app.Map("/ws/terminal/{sessionId}", async (string sessionId, HttpContext context, ITerminalService termSvc) =>
        {
            if (context.WebSockets.IsWebSocketRequest)
            {
                using var ws = await context.WebSockets.AcceptWebSocketAsync();
                await termSvc.AttachWebSocketAsync(sessionId, ws, context.RequestAborted);
            }
            else
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
            }
        });

        app.Map("/ws/metrics", async (HttpContext context, ISystemMetricsService metricsSvc) =>
        {
            if (context.WebSockets.IsWebSocketRequest)
            {
                using var ws = await context.WebSockets.AcceptWebSocketAsync();

                try
                {
                    while (ws.State == WebSocketState.Open && !context.RequestAborted.IsCancellationRequested)
                    {
                        var metrics = await metricsSvc.GetCurrentMetricsAsync();
                        var json = JsonSerializer.Serialize(metrics, JsonOptions);
                        var bytes = Encoding.UTF8.GetBytes(json);

                        await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, context.RequestAborted);
                        await Task.Delay(1500, context.RequestAborted);
                    }
                }
                catch { }
            }
            else
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
            }
        });
    }

    public async Task StopAsync()
    {
        if (_host != null)
        {
            await _host.StopAsync();
            _host.Dispose();
            _host = null;
        }
    }
}

// DTO helper records
public record PathRequest(string Path);
public record DetectPathRequest(string Path);
public record OpenEditorRequest(string Path, string? Editor);
public record BrowseFolderRequest(string? InitialPath = null);
public record GitRepoRequest(string RepoPath);
public record GitPathRequest(string RepoPath, string FilePath);
public record GitPushPullRequest(string RepoPath, string? Remote, string? Branch);
public record GitBranchActionRequest(string RepoPath, string BranchName, bool Checkout = true);
public record GitStashRequest(string RepoPath, string? Message);
public record CreateTerminalRequest(TerminalShellType ShellType, string? WorkingDirectory, int Cols = 80, int Rows = 24);
public record CloseTerminalRequest(string SessionId);
public record SshConnectTerminalRequest(string ProfileId, int Cols = 80, int Rows = 24);
public record HttpRequestProxyModel(string Method, string Url, Dictionary<string, string>? Headers, string? Body, string? ContentType);
public record SshExecCommandRequest(string Command, int TimeoutSeconds = 60);
public record SshKillProcessRequest(int Pid, bool Force = true);
public record SshProcessActionRequest(string Type, string ProcessNameOrId, string Action);
public record SshCreateSystemdRequest(string ServiceName, string ExecStart, string WorkingDir, string User = "root", string? EnvVars = null);
public record SshToggleNginxSiteRequest(string SiteName, bool Enable);
public record SshIssueCertbotRequest(string Domain, string Email);
public record SshCheckDomainsRequest(List<string> Domains);
public record SshServerGitCloneRequest(string RepoUrl, string TargetDir, string Branch = "main");
public record SshServerGitPullRequest(string TargetDir, string? Branch = "main", string? PostDeployCommand = null);
public record SshServerGitStatusRequest(string TargetDir);
