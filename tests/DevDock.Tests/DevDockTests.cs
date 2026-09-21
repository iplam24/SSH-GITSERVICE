using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using DevDock.Core.Models;
using DevDock.Git.Services;
using DevDock.Projects.Services;
using DevDock.Security.Services;
using Xunit;

namespace DevDock.Tests;

public class SecurityTests
{
    [Fact]
    public async Task DpapiEncryption_RoundTrip_PreservesExactSecret()
    {
        var testFile = Path.Combine(Path.GetTempPath(), $"devdock_test_creds_{Guid.NewGuid():N}.dat");
        var credService = new DpapiCredentialService(testFile);
        var key = $"test:key:{Guid.NewGuid():N}";
        var secret = "ghp_VerySuperSecretPersonalAccessToken1234567890";

        try
        {
            await credService.SetSecretAsync(key, secret);
            var exists = await credService.HasSecretAsync(key);
            Assert.True(exists);

            var retrieved = await credService.GetSecretAsync(key);
            Assert.Equal(secret, retrieved);
        }
        finally
        {
            await credService.DeleteSecretAsync(key);
            if (File.Exists(testFile))
            {
                try { File.Delete(testFile); } catch { }
            }
        }
    }

    [Theory]
    [InlineData("ghp_1234567890abcdef1234567890abcdef", "ghp_••••••••••••cdef")]
    [InlineData("glpat-abcdef1234567890123456", "glpat-••••••••••••3456")]
    [InlineData("short", "••••••••")]
    public void MaskSecret_RedactsTokenSafely(string token, string expected)
    {
        var credService = new DpapiCredentialService();
        var masked = credService.MaskSecret(token);
        Assert.Equal(expected, masked);
    }
}

public class GitDiffParserTests
{
    [Fact]
    public void GitDiffParser_ParsesUnifiedDiff_CorrectLineNumbersAndTypes()
    {
        var rawDiff = @"diff --git a/Service.cs b/Service.cs
index 1234567..89abcdef 100644
--- a/Service.cs
+++ b/Service.cs
@@ -10,4 +10,5 @@ namespace App
 context line 1
-var oldVal = 1;
+var newVal = 2;
+var extraVal = 3;
 context line 2";

        var result = GitDiffParser.Parse(rawDiff, "Service.cs");

        Assert.False(result.IsBinary);
        Assert.Single(result.Hunks);

        var hunk = result.Hunks[0];
        Assert.Equal(10, hunk.OldStart);
        Assert.Equal(10, hunk.NewStart);
        Assert.Equal(5, hunk.Lines.Count);

        // Line 0: Context
        Assert.Equal(DiffLineType.Context, hunk.Lines[0].Type);
        Assert.Equal(10, hunk.Lines[0].OldLineNumber);
        Assert.Equal(10, hunk.Lines[0].NewLineNumber);

        // Line 1: Deleted
        Assert.Equal(DiffLineType.Deleted, hunk.Lines[1].Type);
        Assert.Equal(11, hunk.Lines[1].OldLineNumber);

        // Line 2: Added
        Assert.Equal(DiffLineType.Added, hunk.Lines[2].Type);
        Assert.Equal(11, hunk.Lines[2].NewLineNumber);

        // Line 3: Added
        Assert.Equal(DiffLineType.Added, hunk.Lines[3].Type);
        Assert.Equal(12, hunk.Lines[3].NewLineNumber);

        // Line 4: Context
        Assert.Equal(DiffLineType.Context, hunk.Lines[4].Type);
    }

    [Fact]
    public void GitDiffParser_BinaryFiles_FlagsIsBinary()
    {
        var rawDiff = "Binary files a/image.png and b/image.png differ";
        var result = GitDiffParser.Parse(rawDiff, "image.png");
        Assert.True(result.IsBinary);
    }
}

public class ProjectServiceTests
{
    [Fact]
    public async Task ProjectDetector_DetectsCurrentWorkspace_IdentifiesDotnetAndGit()
    {
        var svc = new ProjectService();
        var workspacePath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, @"..\..\..\..\..\"));

        var detected = await svc.DetectProjectAsync(workspacePath);
        Assert.NotNull(detected);
        Assert.Equal("ToolTienich", detected.Name);
        Assert.True(detected.Commands.ContainsKey("dev"));
        Assert.True(detected.Commands.ContainsKey("build"));
        Assert.Equal("dotnet build", detected.Commands["build"]);
    }

    [Fact]
    public async Task ProjectDetector_NonExistentPath_ReturnsNull()
    {
        var svc = new ProjectService();
        var detected = await svc.DetectProjectAsync(@"Z:\DefinitelyNonExistentFolder_12345");
        Assert.Null(detected);
    }
}

public class GitAdvancedModelTests
{
    [Fact]
    public void GitModels_InstantiationAndDefaults_Valid()
    {
        var createReq = new CreateRemoteRepoRequest
        {
            AccountId = "acc-1",
            Name = "my-new-repo",
            Description = "Test repo",
            IsPrivate = true,
            AutoInitReadme = true
        };
        Assert.Equal("my-new-repo", createReq.Name);
        Assert.True(createReq.IsPrivate);
        Assert.True(createReq.AutoInitReadme);

        var pubReq = new PublishLocalRepoRequest
        {
            RepoPath = @"D:\Projects\App",
            AccountId = "acc-1",
            RepoName = "App",
            RemoteName = "origin",
            IsPrivate = true
        };
        Assert.Equal("origin", pubReq.RemoteName);
        Assert.Equal("App", pubReq.RepoName);

        var cloneReq = new CloneRepoRequest
        {
            CloneUrl = "https://github.com/org/repo.git",
            DestinationPath = @"D:\Projects\repo",
            AddToProjects = true
        };
        Assert.True(cloneReq.AddToProjects);
    }

    [Fact]
    public void GitCommitDetailResult_HasExpectedStructure()
    {
        var detail = new GitCommitDetailResult
        {
            Commit = new GitCommitItem
            {
                Hash = "abcdef1234567890abcdef1234567890abcdef12",
                ShortHash = "abcdef1",
                Subject = "feat: initial commit",
                AuthorName = "Dev",
                Date = DateTime.UtcNow
            },
            Diff = "diff --git a/file.txt b/file.txt\n+hello world"
        };
        detail.ChangedFiles.Add(new GitCommitFileChange
        {
            FilePath = "file.txt",
            Status = GitFileDeltaType.Added,
            Additions = 1,
            Deletions = 0
        });

        Assert.Equal("abcdef1", detail.Commit.ShortHash);
        Assert.Single(detail.ChangedFiles);
        Assert.Equal(1, detail.ChangedFiles[0].Additions);
        Assert.Contains("+hello world", detail.Diff);
    }
}

public class SetupServiceTests
{
    [Fact]
    public async Task SetupService_GetDiagnostics_ReturnsValidSystemInfo()
    {
        var credSvc = new DpapiCredentialService();
        var settingsSvc = new DevDock.Settings.Services.SettingsService(credSvc);
        var svc = new DevDock.Settings.Services.SetupService(settingsSvc);
        var diag = await svc.GetDiagnosticsAsync();

        Assert.NotNull(diag);
        Assert.Contains("Windows", diag.OsVersion);
        Assert.False(string.IsNullOrWhiteSpace(diag.Architecture));
        Assert.True(diag.DotnetInstalled);
        Assert.Contains("9.", diag.DotnetVersion);
    }

    [Fact]
    public async Task SetupService_GetIntegrationStatus_ReturnsValidAppDirectory()
    {
        var credSvc = new DpapiCredentialService();
        var settingsSvc = new DevDock.Settings.Services.SettingsService(credSvc);
        var svc = new DevDock.Settings.Services.SetupService(settingsSvc);
        var status = await svc.GetIntegrationStatusAsync();

        Assert.NotNull(status);
        Assert.False(string.IsNullOrWhiteSpace(status.AppDirectory));
        Assert.True(Directory.Exists(status.AppDirectory));
    }
}

public class IconGeneratorTests
{
    [Fact]
    public void GenerateAppIcon_ProducesValidIcoFile_WithMultipleResolutions()
    {
        int[] sizes = [256, 128, 64, 48, 32, 16];
        var frames = new List<byte[]>();

        foreach (var size in sizes)
        {
            using var bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb);
            using (var g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.Clear(Color.Transparent);

                float scale = size / 256f;

                // Squircle background
                float pad = 12 * scale;
                float r = 50 * scale;
                float w = size - 2 * pad;
                using var path = CreateRoundedRectanglePath(pad, pad, w, w, r);

                // Background gradient fill
                using var bgBrush = new LinearGradientBrush(
                    new PointF(0, 0),
                    new PointF(size, size),
                    Color.FromArgb(255, 15, 23, 42),
                    Color.FromArgb(255, 4, 7, 11));
                g.FillPath(bgBrush, path);

                // Border gradient stroke
                using var borderPen = new Pen(new LinearGradientBrush(
                    new PointF(0, 0),
                    new PointF(size, size),
                    Color.FromArgb(230, 52, 211, 153),
                    Color.FromArgb(230, 6, 182, 212)), Math.Max(1.5f, 6 * scale));
                g.DrawPath(borderPen, path);

                // Inner subtle ring
                if (size >= 32)
                {
                    using var ringPen = new Pen(Color.FromArgb(40, 16, 185, 129), Math.Max(1f, 1.5f * scale));
                    ringPen.DashStyle = DashStyle.Dash;
                    float ringR = 80 * scale;
                    g.DrawEllipse(ringPen, size / 2f - ringR, size / 2f - ringR, ringR * 2, ringR * 2);
                }

                // Prompt '>'
                using var promptPen = new Pen(new LinearGradientBrush(
                    new PointF(60 * scale, 80 * scale),
                    new PointF(120 * scale, 170 * scale),
                    Color.FromArgb(255, 52, 211, 153),
                    Color.FromArgb(255, 16, 185, 129)), Math.Max(2f, 18 * scale));
                promptPen.StartCap = LineCap.Round;
                promptPen.EndCap = LineCap.Round;
                promptPen.LineJoin = LineJoin.Round;

                var p1 = new PointF(68 * scale, 88 * scale);
                var p2 = new PointF(116 * scale, 128 * scale);
                var p3 = new PointF(68 * scale, 168 * scale);
                g.DrawLines(promptPen, [p1, p2, p3]);

                // Dash '_'
                using var dashPen = new Pen(new LinearGradientBrush(
                    new PointF(120 * scale, 168 * scale),
                    new PointF(190 * scale, 168 * scale),
                    Color.FromArgb(255, 6, 182, 212),
                    Color.FromArgb(255, 59, 130, 246)), Math.Max(2f, 18 * scale));
                dashPen.StartCap = LineCap.Round;
                dashPen.EndCap = LineCap.Round;
                g.DrawLine(dashPen, new PointF(126 * scale, 168 * scale), new PointF(186 * scale, 168 * scale));

                // Lightning bolt
                using var boltBrush = new LinearGradientBrush(
                    new PointF(120 * scale, 70 * scale),
                    new PointF(190 * scale, 150 * scale),
                    Color.FromArgb(255, 52, 211, 153),
                    Color.FromArgb(255, 6, 182, 212));

                PointF[] boltPoints =
                [
                    new PointF(148 * scale, 76 * scale),
                    new PointF(176 * scale, 76 * scale),
                    new PointF(158 * scale, 106 * scale),
                    new PointF(190 * scale, 106 * scale),
                    new PointF(138 * scale, 154 * scale),
                    new PointF(150 * scale, 118 * scale),
                    new PointF(126 * scale, 118 * scale)
                ];
                g.FillPolygon(boltBrush, boltPoints);
            }

            using var pngMs = new MemoryStream();
            bmp.Save(pngMs, ImageFormat.Png);
            frames.Add(pngMs.ToArray());
        }

        // Assemble ICO stream
        using var icoMs = new MemoryStream();
        using var bw = new BinaryWriter(icoMs);

        // Header: idReserved (0), idType (1), idCount (N)
        bw.Write((short)0);
        bw.Write((short)1);
        bw.Write((short)sizes.Length);

        // Directory entries offset: 6 + 16 * count
        int dataOffset = 6 + (16 * sizes.Length);

        for (int i = 0; i < sizes.Length; i++)
        {
            int s = sizes[i];
            byte bWidth = s >= 256 ? (byte)0 : (byte)s;
            byte bHeight = s >= 256 ? (byte)0 : (byte)s;
            byte[] data = frames[i];

            bw.Write(bWidth);
            bw.Write(bHeight);
            bw.Write((byte)0); // Color count
            bw.Write((byte)0); // Reserved
            bw.Write((short)1); // Color planes
            bw.Write((short)32); // Bits per pixel
            bw.Write((int)data.Length); // Image size
            bw.Write(dataOffset); // Image offset

            dataOffset += data.Length;
        }

        // Write image datas
        for (int i = 0; i < sizes.Length; i++)
        {
            bw.Write(frames[i]);
        }

        bw.Flush();
        var icoBytes = icoMs.ToArray();
        Assert.True(icoBytes.Length > 2000);

        // Save to project paths
        var workspaceDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, @"..\..\..\..\..\"));
        var appIcoPath = Path.Combine(workspaceDir, "src", "DevDock.App", "app.ico");
        File.WriteAllBytes(appIcoPath, icoBytes);
        Assert.True(File.Exists(appIcoPath));

        try
        {
            var distDir = Path.Combine(workspaceDir, "dist", "DevDock");
            Directory.CreateDirectory(distDir);
            File.WriteAllBytes(Path.Combine(distDir, "app.ico"), icoBytes);
        }
        catch { }

        try
        {
            var publicDir = Path.Combine(workspaceDir, "src", "DevDock.Frontend", "public");
            Directory.CreateDirectory(publicDir);
            File.WriteAllBytes(Path.Combine(publicDir, "favicon.ico"), icoBytes);
        }
        catch { }
    }

    private static GraphicsPath CreateRoundedRectanglePath(float x, float y, float width, float height, float radius)
    {
        var path = new GraphicsPath();
        float d = radius * 2;
        path.AddArc(x, y, d, d, 180, 90);
        path.AddArc(x + width - d, y, d, d, 270, 90);
        path.AddArc(x + width - d, y + height - d, d, d, 0, 90);
        path.AddArc(x, y + height - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }
}

public class InstallerTests
{
    [Fact]
    public void PayloadZip_ContainsRequiredAppFiles()
    {
        var workspaceDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, @"..\..\..\..\..\"));
        var payloadPath = Path.Combine(workspaceDir, "src", "DevDock.Installer", "Resources", "payload.zip");

        Assert.True(File.Exists(payloadPath), "payload.zip must exist in DevDock.Installer/Resources");

        using var zip = System.IO.Compression.ZipFile.OpenRead(payloadPath);
        var entries = zip.Entries.Select(e => e.FullName).ToList();

        Assert.Contains(entries, e => e.EndsWith("DevDock.App.exe", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(entries, e => e.EndsWith("app.ico", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(entries, e => e.Contains("wwwroot", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void SetupDevDockExe_ExistsAndHasIcon()
    {
        var workspaceDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, @"..\..\..\..\..\"));
        var exePath = Path.Combine(workspaceDir, "dist", "setup-devdock.exe");

        Assert.True(File.Exists(exePath), "dist/setup-devdock.exe must exist");
        var fi = new FileInfo(exePath);
        Assert.True(fi.Length > 10_000_000, "setup-devdock.exe must be self-contained (>10MB)");

        using var icon = Icon.ExtractAssociatedIcon(exePath);
        Assert.NotNull(icon);
        Assert.True(icon.Width > 0 && icon.Height > 0);
    }
}

public class AiServiceTests
{
    [Fact]
    public async Task AiService_GetProviders_SeedsDefaultPresets()
    {
        var cred = new DpapiCredentialService();
        var git = new GitService();
        var aiService = new DevDock.Settings.Services.AiService(cred, git);

        var providers = await aiService.GetProvidersAsync();
        Assert.NotEmpty(providers);
        Assert.Contains(providers, p => p.ProviderType == AiProviderType.DeepSeek);
        Assert.Contains(providers, p => p.ProviderType == AiProviderType.OpenAI);
        Assert.Contains(providers, p => p.ProviderType == AiProviderType.Ollama);
    }

    [Fact]
    public async Task AiService_SaveProvider_EncryptsApiKeyAndMasks()
    {
        var cred = new DpapiCredentialService();
        var git = new GitService();
        var aiService = new DevDock.Settings.Services.AiService(cred, git);

        var config = new AiProviderConfig
        {
            Id = $"test_ai_{Guid.NewGuid():N}",
            Name = "Unit Test AI",
            ProviderType = AiProviderType.DeepSeek,
            ApiBaseUrl = "https://api.deepseek.com",
            DefaultModel = "deepseek-chat"
        };

        var secretKey = "sk-test1234567890abcdef1234567890abcdef";

        try
        {
            var saved = await aiService.SaveProviderAsync(config, secretKey);
            Assert.True(saved.HasKey);
            Assert.Contains("sk-", saved.MaskedKey);
            Assert.NotEqual(secretKey, saved.MaskedKey);

            var keyStored = await cred.GetSecretAsync($"devdock_ai_{config.Id}");
            Assert.Equal(secretKey, keyStored);
        }
        finally
        {
            await aiService.DeleteProviderAsync(config.Id);
        }
    }
}

public class GitGlobalConfigTests
{
    [Fact]
    public async Task GitService_GetGlobalConfig_ReturnsDetectedStatus()
    {
        var gitService = new GitService();
        var config = await gitService.GetGlobalConfigAsync();

        Assert.NotNull(config);
        Assert.True(config.IsGitInstalled);
        Assert.NotEmpty(config.GitVersion);
        Assert.NotNull(config.UserName);
        Assert.NotNull(config.UserEmail);
    }

    [Fact]
    public async Task SettingsService_TestDirectGitAccount_FailsWithoutToken()
    {
        var cred = new DpapiCredentialService();
        var settingsService = new DevDock.Settings.Services.SettingsService(cred);

        var request = new SaveGitAccountRequest
        {
            Account = new GitAccount
            {
                Name = "Test Account",
                Username = "testuser",
                Provider = GitProvider.GitHub
            },
            Token = ""
        };

        var result = await settingsService.TestDirectGitAccountAsync(request);
        Assert.False(result.Success);
        Assert.Contains("Personal Access Token", result.ErrorMessage);
    }

    [Fact]
    public async Task GitService_SetupGithubAction_GeneratesValidWorkflowFile()
    {
        var gitService = new GitService();
        var tempDir = Path.Combine(Path.GetTempPath(), "devdock_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);

        try
        {
            var req = new GithubActionSetupRequest
            {
                RepoPath = tempDir,
                TechStack = "NodeJs",
                DeployType = "SSH_RSYNC",
                TargetBranch = "main",
                ServerHost = "192.168.1.100",
                ServerUser = "deployer",
                ServerPort = 2222,
                DeployDirectory = "/var/www/my-node-app",
                AutoCommit = false
            };

            var res = await gitService.SetupGithubActionAsync(req);

            Assert.True(res.Success);
            Assert.True(File.Exists(res.WorkflowFilePath));
            Assert.Contains("SSH_HOST", res.RequiredSecrets);
            Assert.Contains("SSH_PORT", res.RequiredSecrets);
            Assert.Contains("appleboy/ssh-action", res.WorkflowContent);
            Assert.Contains("npm run build", res.WorkflowContent);
            Assert.Contains("/var/www/my-node-app", res.WorkflowContent);
        }
        finally
        {
            if (Directory.Exists(tempDir))
            {
                Directory.Delete(tempDir, true);
            }
        }
    }

    [Fact]
    public async Task GitService_SetupGithubAction_DotNetStack_IncludesDotnetSteps()
    {
        var gitService = new GitService();
        var tempDir = Path.Combine(Path.GetTempPath(), "devdock_test_dotnet_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);

        try
        {
            var req = new GithubActionSetupRequest
            {
                RepoPath = tempDir,
                TechStack = "DotNet",
                DeployType = "SSH_RSYNC",
                TargetBranch = "production",
                ServerHost = "myserver.com",
                ServerUser = "ubuntu",
                DeployDirectory = "/opt/dotnet-api",
                AutoCommit = false
            };

            var res = await gitService.SetupGithubActionAsync(req);

            Assert.True(res.Success);
            Assert.Contains("actions/setup-dotnet", res.WorkflowContent);
            Assert.Contains("dotnet restore", res.WorkflowContent);
            Assert.Contains("dotnet build", res.WorkflowContent);
        }
        finally
        {
            if (Directory.Exists(tempDir))
            {
                Directory.Delete(tempDir, true);
            }
        }
    }

    private class SimpleHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }

    [Fact]
    public async Task GitProviderService_PushToRemote_ThrowsIfDirectoryNotFound()
    {
        var cred = new DpapiCredentialService();
        var settingsService = new DevDock.Settings.Services.SettingsService(cred);
        var projectService = new ProjectService();
        var providerService = new GitProviderService(settingsService, cred, projectService, new SimpleHttpClientFactory());

        var request = new PushToRemoteRepoRequest
        {
            AccountId = "fake-account",
            RepoPath = Path.Combine(Path.GetTempPath(), "non_existent_folder_" + Guid.NewGuid().ToString("N")),
            CloneUrl = "https://github.com/iplam24/test.git"
        };

        await Assert.ThrowsAsync<DirectoryNotFoundException>(() =>
            providerService.PushToRemoteRepositoryAsync(request));
    }

    [Fact]
    public async Task GitService_InspectRepositoryTech_DetectsDotNetProject()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "test_repo_dotnet_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
        try
        {
            await File.WriteAllTextAsync(Path.Combine(tempDir, "MyApp.csproj"), "<Project Sdk=\"Microsoft.NET.Sdk.Web\"></Project>");

            var gitService = new GitService();
            var inspectResult = await gitService.InspectRepositoryTechAsync(new InspectRepoRequest { RepoPath = tempDir });

            Assert.True(inspectResult.Success);
            Assert.Equal("DotNet", inspectResult.TechStack);
            Assert.Equal("dotnet", inspectResult.PackageManager);
            Assert.Equal(5000, inspectResult.AppPort);
            Assert.False(inspectResult.HasDockerfile);
        }
        finally
        {
            if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
        }
    }

    [Fact]
    public async Task GitService_InspectRepositoryTech_DetectsNextJsProject()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "test_repo_node_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
        try
        {
            var packageJson = """
            {
              "name": "my-web-app",
              "scripts": {
                "build": "next build",
                "test": "jest"
              },
              "dependencies": {
                "next": "14.0.0",
                "react": "^18.2.0"
              }
            }
            """;
            await File.WriteAllTextAsync(Path.Combine(tempDir, "package.json"), packageJson);

            var gitService = new GitService();
            var inspectResult = await gitService.InspectRepositoryTechAsync(new InspectRepoRequest { RepoPath = tempDir });

            Assert.True(inspectResult.Success);
            Assert.Equal("NodeJs", inspectResult.TechStack);
            Assert.Equal("npm", inspectResult.PackageManager);
            Assert.Contains("Next.js", inspectResult.Framework);
            Assert.Equal(3000, inspectResult.AppPort);
            Assert.Equal("npm run build", inspectResult.BuildCommand);
            Assert.Equal("npm test", inspectResult.TestCommand);
        }
        finally
        {
            if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
        }
    }

    [Fact]
    public async Task GitService_SetupGithubAction_GeneratesComplexProductionScaffolding()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "test_repo_cicd_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
        try
        {
            var gitService = new GitService();
            var req = new GithubActionSetupRequest
            {
                RepoPath = tempDir,
                ServerHost = "192.168.1.100",
                ServerPort = 22,
                ServerUser = "deployer",
                DeployDirectory = "/var/www/myapp",
                TechStack = "NodeJs",
                TargetBranch = "main",
                IncludeCaching = true,
                IncludeHealthCheck = true,
                HealthCheckPort = 3000,
                GenerateDockerfile = true,
                GenerateDockerCompose = true,
                GeneratePm2Config = true,
                AutoCommit = false
            };

            var res = await gitService.SetupGithubActionAsync(req);

            Assert.True(res.Success);
            Assert.NotNull(res.WorkflowContent);
            Assert.Contains("Post-deployment Health Check", res.WorkflowContent);
            Assert.Contains("cache: 'npm'", res.WorkflowContent);

            // Verify production scaffolding files were created
            Assert.True(File.Exists(Path.Combine(tempDir, "Dockerfile")));
            Assert.True(File.Exists(Path.Combine(tempDir, "docker-compose.yml")));
            Assert.True(File.Exists(Path.Combine(tempDir, "ecosystem.config.js")));

            var dockerfileContent = await File.ReadAllTextAsync(Path.Combine(tempDir, "Dockerfile"));
            Assert.Contains("FROM node:20-alpine", dockerfileContent);

            var composeContent = await File.ReadAllTextAsync(Path.Combine(tempDir, "docker-compose.yml"));
            Assert.Contains("restart: unless-stopped", composeContent);
        }
        finally
        {
            if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
        }
    }
}

