using System.Diagnostics;
using System.Text;
using System.Text.Json;
using DevDock.Core.Models;
using DevDock.Core.Services;

namespace DevDock.Projects.Services;

public class ProjectService : IProjectService
{
    private readonly string _storagePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private List<ProjectItem> _projects = new();
    private bool _isLoaded;

    public ProjectService()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var dir = Path.Combine(appData, "DevDock");
        Directory.CreateDirectory(dir);
        _storagePath = Path.Combine(dir, "projects.json");
    }

    private async Task EnsureLoadedAsync()
    {
        if (_isLoaded) return;
        if (File.Exists(_storagePath))
        {
            try
            {
                var json = await File.ReadAllTextAsync(_storagePath, Encoding.UTF8);
                _projects = JsonSerializer.Deserialize<List<ProjectItem>>(json) ?? new();
            }
            catch
            {
                _projects = new();
            }
        }
        _isLoaded = true;
    }

    private async Task SaveAsync()
    {
        var json = JsonSerializer.Serialize(_projects, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(_storagePath, json, Encoding.UTF8);
    }

    public async Task<List<ProjectItem>> GetAllProjectsAsync()
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            return _projects
                .OrderByDescending(p => p.Favorite)
                .ThenByDescending(p => p.LastOpenedAt)
                .ThenBy(p => p.Name)
                .ToList();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<ProjectItem?> GetProjectByIdAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            return _projects.FirstOrDefault(p => p.Id == id);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<ProjectItem> SaveProjectAsync(ProjectItem project)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();

            if (string.IsNullOrWhiteSpace(project.Id))
            {
                project.Id = Guid.NewGuid().ToString("N");
            }

            // Verify git status
            if (Directory.Exists(project.Path))
            {
                project.IsGitRepository = Directory.Exists(Path.Combine(project.Path, ".git"));
            }

            var index = _projects.FindIndex(p => p.Id == project.Id);
            if (index >= 0)
            {
                _projects[index] = project;
            }
            else
            {
                _projects.Add(project);
            }

            await SaveAsync();
            return project;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<bool> DeleteProjectAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            var removed = _projects.RemoveAll(p => p.Id == id) > 0;
            if (removed)
            {
                await SaveAsync();
            }
            return removed;
        }
        finally
        {
            _lock.Release();
        }
    }

    public Task<ProjectItem?> DetectProjectAsync(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || !Directory.Exists(path))
            return Task.FromResult<ProjectItem?>(null);

        var dirInfo = new DirectoryInfo(path);
        var project = new ProjectItem
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = dirInfo.Name,
            Path = dirInfo.FullName,
            IsGitRepository = Directory.Exists(Path.Combine(dirInfo.FullName, ".git")),
            Favorite = false,
            CreatedAt = DateTime.UtcNow
        };

        // Detect project type and pre-fill commands
        var pyFiles = Directory.GetFiles(path, "*.py");
        var hasEcosystem = File.Exists(Path.Combine(path, "ecosystem.config.js"));
        string ecosystemContent = "";
        if (hasEcosystem)
        {
            try { ecosystemContent = File.ReadAllText(Path.Combine(path, "ecosystem.config.js")); } catch { }
        }

        var hasPyManifest = File.Exists(Path.Combine(path, "pyproject.toml")) ||
                            File.Exists(Path.Combine(path, "requirements.txt")) ||
                            File.Exists(Path.Combine(path, "requirements-dev.txt")) ||
                            File.Exists(Path.Combine(path, "Pipfile")) ||
                            File.Exists(Path.Combine(path, "setup.py"));

        var hasPython = hasPyManifest || pyFiles.Length > 0 ||
                        (hasEcosystem && (ecosystemContent.Contains("python", StringComparison.OrdinalIgnoreCase) || ecosystemContent.Contains(".py", StringComparison.OrdinalIgnoreCase))) ||
                        (Directory.Exists(Path.Combine(path, "app")) && Directory.GetFiles(Path.Combine(path, "app"), "*.py").Length > 0);

        var hasPackageJson = File.Exists(Path.Combine(path, "package.json"));
        var hasSlnOrCsproj = Directory.GetFiles(path, "*.sln*").Length > 0 || Directory.GetFiles(path, "*.csproj").Length > 0;
        var hasCargo = File.Exists(Path.Combine(path, "Cargo.toml"));
        var hasGoMod = File.Exists(Path.Combine(path, "go.mod"));

        if (hasPython)
        {
            project.Icon = "python";
            project.Tags.Add("Python");

            if (hasEcosystem && (ecosystemContent.Contains("python", StringComparison.OrdinalIgnoreCase) || ecosystemContent.Contains(".py", StringComparison.OrdinalIgnoreCase)))
            {
                project.Tags.Add("PM2");
                project.Commands["dev"] = "pm2 start ecosystem.config.js";
                project.Commands["build"] = File.Exists(Path.Combine(path, "requirements.txt")) ? "pip install -r requirements.txt" : "pip install -r requirements.txt || true";
                project.Commands["test"] = "pytest";
            }
            else
            {
                var mainFile = File.Exists(Path.Combine(path, "main.py")) ? "main.py" : (File.Exists(Path.Combine(path, "app.py")) ? "app.py" : (pyFiles.Length > 0 ? Path.GetFileName(pyFiles[0]) : "main.py"));
                project.Commands["dev"] = $"python {mainFile}";
                project.Commands["build"] = File.Exists(Path.Combine(path, "requirements.txt")) ? "pip install -r requirements.txt" : "pip install -r requirements.txt || true";
                project.Commands["test"] = "pytest";
            }
        }
        else if (hasSlnOrCsproj)
        {
            project.Icon = "dotnet";
            project.Tags.Add(".NET");
            project.Commands["dev"] = "dotnet watch";
            project.Commands["build"] = "dotnet build";
            project.Commands["test"] = "dotnet test";
        }
        else if (hasPackageJson)
        {
            project.Icon = "node";
            project.Tags.Add("Node");
            try
            {
                var pkgJson = File.ReadAllText(Path.Combine(path, "package.json"));
                using var doc = JsonDocument.Parse(pkgJson);
                if (doc.RootElement.TryGetProperty("scripts", out var scripts))
                {
                    if (scripts.TryGetProperty("dev", out _)) project.Commands["dev"] = "npm run dev";
                    else if (scripts.TryGetProperty("start", out _)) project.Commands["dev"] = "npm start";

                    if (scripts.TryGetProperty("build", out _)) project.Commands["build"] = "npm run build";
                    if (scripts.TryGetProperty("test", out _)) project.Commands["test"] = "npm test";
                }
            }
            catch { }

            if (!project.Commands.ContainsKey("dev")) project.Commands["dev"] = "npm run dev";
            if (!project.Commands.ContainsKey("build")) project.Commands["build"] = "npm run build";
            if (!project.Commands.ContainsKey("test")) project.Commands["test"] = "npm test";
        }
        else if (hasCargo)
        {
            project.Icon = "rust";
            project.Tags.Add("Rust");
            project.Commands["dev"] = "cargo run";
            project.Commands["build"] = "cargo build";
            project.Commands["test"] = "cargo test";
        }
        else if (hasGoMod)
        {
            project.Icon = "go";
            project.Tags.Add("Go");
            project.Commands["dev"] = "go run .";
            project.Commands["build"] = "go build";
            project.Commands["test"] = "go test ./...";
        }
        else
        {
            project.Icon = "folder";
        }

        return Task.FromResult<ProjectItem?>(project);
    }

    public async Task<ProjectCommandResult> RunCommandAsync(ProjectCommandRunRequest request, CancellationToken cancellationToken = default)
    {
        var project = await GetProjectByIdAsync(request.ProjectId);
        if (project == null)
        {
            return new ProjectCommandResult { Success = false, ErrorMessage = "Project not found" };
        }

        string? cmd = request.CustomCommand;
        if (string.IsNullOrWhiteSpace(cmd) && project.Commands.TryGetValue(request.CommandKey, out var foundCmd))
        {
            cmd = foundCmd;
        }

        if (string.IsNullOrWhiteSpace(cmd))
        {
            return new ProjectCommandResult { Success = false, ErrorMessage = $"Command '{request.CommandKey}' not found for project" };
        }

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = $"/c {cmd}",
                WorkingDirectory = project.Path,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8
            };

            using var proc = new Process { StartInfo = psi };
            var output = new StringBuilder();

            proc.OutputDataReceived += (_, e) => { if (e.Data != null) output.AppendLine(e.Data); };
            proc.ErrorDataReceived += (_, e) => { if (e.Data != null) output.AppendLine(e.Data); };

            proc.Start();
            proc.BeginOutputReadLine();
            proc.BeginErrorReadLine();

            await proc.WaitForExitAsync(cancellationToken);

            return new ProjectCommandResult
            {
                Success = proc.ExitCode == 0,
                ExitCode = proc.ExitCode,
                Output = output.ToString()
            };
        }
        catch (Exception ex)
        {
            return new ProjectCommandResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public Task OpenInExplorerAsync(string path)
    {
        if (Directory.Exists(path) || File.Exists(path))
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "explorer.exe",
                Arguments = $"\"{path}\"",
                UseShellExecute = true
            });
        }
        return Task.CompletedTask;
    }

    public Task OpenInEditorAsync(string path, string editor = "code")
    {
        if (Directory.Exists(path) || File.Exists(path))
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = editor,
                    Arguments = $"\"{path}\"",
                    UseShellExecute = true,
                    CreateNoWindow = true
                });
            }
            catch
            {
                // Fallback to cmd start
                Process.Start(new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = $"/c {editor} \"{path}\"",
                    UseShellExecute = true,
                    CreateNoWindow = true
                });
            }
        }
        return Task.CompletedTask;
    }

    public Task OpenInTerminalAsync(string path)
    {
        if (Directory.Exists(path) || File.Exists(path))
        {
            var targetDir = Directory.Exists(path) ? path : Path.GetDirectoryName(path) ?? path;
            try
            {
                // Try Windows Terminal (wt.exe) first
                Process.Start(new ProcessStartInfo
                {
                    FileName = "wt.exe",
                    Arguments = $"-d \"{targetDir}\"",
                    UseShellExecute = true
                });
            }
            catch
            {
                try
                {
                    // Fallback to powershell
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "powershell.exe",
                        WorkingDirectory = targetDir,
                        UseShellExecute = true
                    });
                }
                catch
                {
                    // Fallback to cmd
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        WorkingDirectory = targetDir,
                        UseShellExecute = true
                    });
                }
            }
        }
        return Task.CompletedTask;
    }
}
