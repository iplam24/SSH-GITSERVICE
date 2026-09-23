using System.Diagnostics;
using System.Text;
using System.Text.Json;
using DevDock.Core.Models;
using DevDock.Core.Services;

namespace DevDock.Settings.Services;

/// <summary>
/// Thực thi Docker CLI thật trên máy Windows thông qua ProcessStartInfo.
/// Chỉ chạy các lệnh cố định; tham số container/image được truyền dưới dạng
/// argument riêng biệt (ArgumentList) để tránh command injection.
/// </summary>
public class DockerService : IDockerService
{
    private const int DefaultTimeoutMs = 30000;

    public async Task<DockerAvailabilityResult> CheckAvailabilityAsync()
    {
        var versionRes = await RunDockerAsync(new[] { "version", "--format", "{{.Server.Version}}" }, timeoutMs: 8000);
        if (versionRes.Success && !string.IsNullOrWhiteSpace(versionRes.Output))
        {
            return new DockerAvailabilityResult
            {
                IsAvailable = true,
                IsDaemonRunning = true,
                Version = versionRes.Output.Trim()
            };
        }

        // Docker CLI có thể tồn tại nhưng daemon chưa chạy
        var cliRes = await RunDockerAsync(new[] { "--version" }, timeoutMs: 8000);
        if (cliRes.Success)
        {
            return new DockerAvailabilityResult
            {
                IsAvailable = true,
                IsDaemonRunning = false,
                Version = cliRes.Output.Trim(),
                ErrorMessage = "Docker CLI đã cài nhưng Docker Engine/daemon chưa chạy. Hãy khởi động Docker Desktop."
            };
        }

        return new DockerAvailabilityResult
        {
            IsAvailable = false,
            IsDaemonRunning = false,
            ErrorMessage = "Không tìm thấy Docker CLI trên máy. Hãy cài đặt Docker Desktop."
        };
    }

    public async Task<List<DockerContainerItem>> ListContainersAsync(bool includeStopped = true)
    {
        var args = new List<string> { "ps", "--no-trunc", "--format", "{{json .}}" };
        if (includeStopped) args.Add("--all");

        var res = await RunDockerAsync(args.ToArray());
        var list = new List<DockerContainerItem>();
        if (!res.Success) return list;

        foreach (var line in res.Output.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var trimmed = line.Trim();
            if (string.IsNullOrEmpty(trimmed) || trimmed[0] != '{') continue;
            try
            {
                using var doc = JsonDocument.Parse(trimmed);
                var root = doc.RootElement;
                list.Add(new DockerContainerItem
                {
                    Id = GetProp(root, "ID"),
                    Name = GetProp(root, "Names"),
                    Image = GetProp(root, "Image"),
                    Command = GetProp(root, "Command"),
                    Status = GetProp(root, "Status"),
                    State = GetProp(root, "State"),
                    Ports = GetProp(root, "Ports"),
                    CreatedAt = GetProp(root, "CreatedAt"),
                    RunningFor = GetProp(root, "RunningFor"),
                    Size = GetProp(root, "Size")
                });
            }
            catch { }
        }
        return list;
    }

    public async Task<List<DockerImageItem>> ListImagesAsync()
    {
        var res = await RunDockerAsync(new[] { "images", "--no-trunc", "--format", "{{json .}}" });
        var list = new List<DockerImageItem>();
        if (!res.Success) return list;

        foreach (var line in res.Output.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var trimmed = line.Trim();
            if (string.IsNullOrEmpty(trimmed) || trimmed[0] != '{') continue;
            try
            {
                using var doc = JsonDocument.Parse(trimmed);
                var root = doc.RootElement;
                list.Add(new DockerImageItem
                {
                    Id = GetProp(root, "ID"),
                    Repository = GetProp(root, "Repository"),
                    Tag = GetProp(root, "Tag"),
                    CreatedSince = GetProp(root, "CreatedSince"),
                    Size = GetProp(root, "Size")
                });
            }
            catch { }
        }
        return list;
    }

    public Task<DockerCommandResult> StartContainerAsync(string containerId) =>
        RunDockerValidatedAsync(new[] { "start", containerId }, containerId);

    public Task<DockerCommandResult> StopContainerAsync(string containerId) =>
        RunDockerValidatedAsync(new[] { "stop", containerId }, containerId);

    public Task<DockerCommandResult> RestartContainerAsync(string containerId) =>
        RunDockerValidatedAsync(new[] { "restart", containerId }, containerId);

    public Task<DockerCommandResult> RemoveContainerAsync(string containerId, bool force = false)
    {
        if (!IsValidRef(containerId))
            return Task.FromResult(InvalidRef(containerId));
        var args = force ? new[] { "rm", "-f", containerId } : new[] { "rm", containerId };
        return RunDockerAsync(args);
    }

    public Task<DockerCommandResult> RemoveImageAsync(string imageId, bool force = false)
    {
        if (!IsValidRef(imageId))
            return Task.FromResult(InvalidRef(imageId));
        var args = force ? new[] { "rmi", "-f", imageId } : new[] { "rmi", imageId };
        return RunDockerAsync(args);
    }

    public Task<DockerCommandResult> GetContainerLogsAsync(string containerId, int tailLines = 200)
    {
        if (!IsValidRef(containerId))
            return Task.FromResult(InvalidRef(containerId));
        var tail = tailLines <= 0 ? 200 : Math.Min(tailLines, 5000);
        return RunDockerAsync(new[] { "logs", "--tail", tail.ToString(), containerId });
    }

    public Task<DockerCommandResult> ComposeUpAsync(string workingDirectory) =>
        RunDockerAsync(new[] { "compose", "up", "-d" }, workingDirectory: workingDirectory, timeoutMs: 120000);

    public Task<DockerCommandResult> ComposeDownAsync(string workingDirectory) =>
        RunDockerAsync(new[] { "compose", "down" }, workingDirectory: workingDirectory, timeoutMs: 120000);

    // ---------------- Helpers ----------------

    private Task<DockerCommandResult> RunDockerValidatedAsync(string[] args, string reference)
    {
        if (!IsValidRef(reference))
            return Task.FromResult(InvalidRef(reference));
        return RunDockerAsync(args);
    }

    private static DockerCommandResult InvalidRef(string reference) => new()
    {
        Success = false,
        ExitCode = -1,
        Error = $"Tham chiếu Docker không hợp lệ: '{reference}'"
    };

    // Container/Image id hoặc name hợp lệ: chữ, số, và các ký tự . _ - : / @
    private static bool IsValidRef(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        foreach (var c in value)
        {
            if (!(char.IsLetterOrDigit(c) || c == '.' || c == '_' || c == '-' || c == ':' || c == '/' || c == '@'))
                return false;
        }
        return true;
    }

    private static string GetProp(JsonElement root, string name)
        => root.TryGetProperty(name, out var el) && el.ValueKind == JsonValueKind.String
            ? el.GetString() ?? string.Empty
            : string.Empty;

    private static async Task<DockerCommandResult> RunDockerAsync(
        string[] args,
        string? workingDirectory = null,
        int timeoutMs = DefaultTimeoutMs)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "docker",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8
            };

            foreach (var a in args) psi.ArgumentList.Add(a);

            if (!string.IsNullOrWhiteSpace(workingDirectory) && Directory.Exists(workingDirectory))
            {
                psi.WorkingDirectory = workingDirectory;
            }

            using var proc = new Process { StartInfo = psi };
            var stdout = new StringBuilder();
            var stderr = new StringBuilder();

            proc.OutputDataReceived += (_, e) => { if (e.Data != null) stdout.AppendLine(e.Data); };
            proc.ErrorDataReceived += (_, e) => { if (e.Data != null) stderr.AppendLine(e.Data); };

            proc.Start();
            proc.BeginOutputReadLine();
            proc.BeginErrorReadLine();

            using var cts = new CancellationTokenSource(timeoutMs);
            try
            {
                await proc.WaitForExitAsync(cts.Token);
            }
            catch (OperationCanceledException)
            {
                try { proc.Kill(true); } catch { }
                return new DockerCommandResult
                {
                    Success = false,
                    ExitCode = -1,
                    Error = $"Lệnh docker quá thời gian ({timeoutMs}ms) và đã bị hủy."
                };
            }

            var outText = stdout.ToString();
            var errText = stderr.ToString();

            return new DockerCommandResult
            {
                Success = proc.ExitCode == 0,
                ExitCode = proc.ExitCode,
                Output = outText,
                Error = proc.ExitCode == 0 ? null : (string.IsNullOrWhiteSpace(errText) ? outText : errText)
            };
        }
        catch (Exception ex)
        {
            return new DockerCommandResult
            {
                Success = false,
                ExitCode = -1,
                Error = ex.Message.Contains("cannot find", StringComparison.OrdinalIgnoreCase) ||
                        ex.Message.Contains("not found", StringComparison.OrdinalIgnoreCase) ||
                        ex is System.ComponentModel.Win32Exception
                    ? "Không tìm thấy Docker CLI trên máy. Hãy cài đặt Docker Desktop."
                    : ex.Message
            };
        }
    }
}
