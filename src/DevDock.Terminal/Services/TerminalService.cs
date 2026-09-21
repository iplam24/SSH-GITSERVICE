using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using DevDock.Core.Models;
using DevDock.Core.Services;
using DevDock.Terminal.ConPty;

namespace DevDock.Terminal.Services;

public class TerminalSessionHolder : IDisposable
{
    public TerminalSessionInfo Info { get; set; } = new();
    public PseudoConsoleProcess? ConPtyProcess { get; set; }
    public Stream? CustomInputStream { get; set; }
    public Stream? CustomOutputStream { get; set; }
    public Action<int, int>? OnResize { get; set; }
    public Action? OnDispose { get; set; }
    public bool IsDisposed { get; private set; }

    public void Resize(int cols, int rows)
    {
        if (ConPtyProcess != null)
        {
            ConPtyProcess.Resize(cols, rows);
        }
        OnResize?.Invoke(cols, rows);
    }

    public void Dispose()
    {
        if (IsDisposed) return;
        IsDisposed = true;
        Info.IsActive = false;
        try { ConPtyProcess?.Dispose(); } catch { }
        try { OnDispose?.Invoke(); } catch { }
    }
}

public class TerminalService : ITerminalService
{
    private readonly ConcurrentDictionary<string, TerminalSessionHolder> _sessions = new();
    private readonly ISshService? _sshService;

    public TerminalService(IServiceProvider serviceProvider)
    {
        // ISshService can be resolved if available
        _sshService = serviceProvider.GetService(typeof(ISshService)) as ISshService;
    }

    public Task<List<ShellDescriptor>> GetAvailableShellsAsync()
    {
        var list = new List<ShellDescriptor>();

        // 1. PowerShell 7 (pwsh)
        var pwshPath = FindInPath("pwsh.exe");
        if (!string.IsNullOrEmpty(pwshPath))
        {
            list.Add(new ShellDescriptor
            {
                Type = TerminalShellType.PowerShell,
                DisplayName = "PowerShell 7",
                ExecutablePath = pwshPath,
                IsAvailable = true
            });
        }
        else
        {
            // Windows PowerShell 5.1
            var winPwsh = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell", "v1.0", "powershell.exe");
            list.Add(new ShellDescriptor
            {
                Type = TerminalShellType.PowerShell,
                DisplayName = "PowerShell",
                ExecutablePath = File.Exists(winPwsh) ? winPwsh : "powershell.exe",
                IsAvailable = File.Exists(winPwsh)
            });
        }

        // 2. Command Prompt
        var cmdPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "cmd.exe");
        list.Add(new ShellDescriptor
        {
            Type = TerminalShellType.Cmd,
            DisplayName = "Command Prompt",
            ExecutablePath = cmdPath,
            IsAvailable = File.Exists(cmdPath)
        });

        // 3. Git Bash
        var gitBashCandidates = new[]
        {
            @"C:\Program Files\Git\bin\bash.exe",
            @"C:\Program Files\Git\usr\bin\bash.exe",
            @"C:\Program Files (x86)\Git\bin\bash.exe",
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Git", "bin", "bash.exe")
        };
        var gitBash = gitBashCandidates.FirstOrDefault(File.Exists) ?? FindInPath("bash.exe");
        if (!string.IsNullOrEmpty(gitBash))
        {
            list.Add(new ShellDescriptor
            {
                Type = TerminalShellType.GitBash,
                DisplayName = "Git Bash",
                ExecutablePath = gitBash,
                Arguments = "--login -i",
                IsAvailable = true
            });
        }

        // 4. WSL
        var wslPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "wsl.exe");
        if (File.Exists(wslPath))
        {
            list.Add(new ShellDescriptor
            {
                Type = TerminalShellType.Wsl,
                DisplayName = "WSL (Linux)",
                ExecutablePath = wslPath,
                IsAvailable = true
            });
        }

        return Task.FromResult(list);
    }

    private static string? FindInPath(string filename)
    {
        var pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
        var paths = pathEnv.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries);
        foreach (var dir in paths)
        {
            try
            {
                var full = Path.Combine(dir.Trim(), filename);
                if (File.Exists(full)) return full;
            }
            catch { }
        }
        return null;
    }

    public async Task<TerminalSessionInfo> CreateLocalSessionAsync(TerminalShellType shellType, string? workingDir = null, int cols = 80, int rows = 24)
    {
        var shells = await GetAvailableShellsAsync();
        var shell = shells.FirstOrDefault(s => s.Type == shellType) ?? shells.First();

        var cmdLine = string.IsNullOrWhiteSpace(shell.Arguments)
            ? $"\"{shell.ExecutablePath}\""
            : $"\"{shell.ExecutablePath}\" {shell.Arguments}";

        var cwd = !string.IsNullOrWhiteSpace(workingDir) && Directory.Exists(workingDir)
            ? workingDir
            : Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

        var pty = PseudoConsoleProcess.Start(cmdLine, cwd, cols, rows);

        var sessionId = Guid.NewGuid().ToString("N");
        var session = new TerminalSessionHolder
        {
            Info = new TerminalSessionInfo
            {
                SessionId = sessionId,
                Title = shell.DisplayName,
                ShellType = shellType,
                ProcessId = pty.ProcessId,
                WorkingDirectory = cwd,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            ConPtyProcess = pty
        };

        _sessions[sessionId] = session;
        return session.Info;
    }

    public Task<TerminalSessionInfo> CreateSshSessionAsync(string profileId, int cols = 80, int rows = 24)
    {
        // SshService will plug its ShellStream into this session upon creation
        var sessionId = Guid.NewGuid().ToString("N");
        var session = new TerminalSessionHolder
        {
            Info = new TerminalSessionInfo
            {
                SessionId = sessionId,
                Title = $"SSH: {profileId}",
                ShellType = TerminalShellType.Ssh,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        };

        _sessions[sessionId] = session;
        return Task.FromResult(session.Info);
    }

    public void RegisterCustomSession(string sessionId, TerminalSessionInfo info, Stream inputStream, Stream outputStream, Action<int, int>? onResize, Action? onDispose)
    {
        var session = new TerminalSessionHolder
        {
            Info = info,
            CustomInputStream = inputStream,
            CustomOutputStream = outputStream,
            OnResize = onResize,
            OnDispose = onDispose
        };
        _sessions[sessionId] = session;
    }

    public async Task AttachWebSocketAsync(string sessionId, WebSocket webSocket, CancellationToken cancellationToken = default)
    {
        if (!_sessions.TryGetValue(sessionId, out var session))
        {
            await webSocket.CloseAsync(WebSocketCloseStatus.InvalidPayloadData, "Session not found", cancellationToken);
            return;
        }

        var inStream = session.ConPtyProcess?.InputStream ?? session.CustomInputStream;
        var outStream = session.ConPtyProcess?.OutputStream ?? session.CustomOutputStream;

        if (inStream == null || outStream == null)
        {
            await webSocket.CloseAsync(WebSocketCloseStatus.InternalServerError, "Streams not initialized", cancellationToken);
            return;
        }

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

        // Task 1: Read from PTY / SSH OutputStream and send to WebSocket
        var readFromPtyTask = Task.Run(async () =>
        {
            var buffer = new byte[8192];
            try
            {
                while (!cts.Token.IsCancellationRequested && webSocket.State == WebSocketState.Open)
                {
                    int bytesRead = await outStream.ReadAsync(buffer, 0, buffer.Length, cts.Token);
                    if (bytesRead <= 0) break;

                    await webSocket.SendAsync(
                        new ArraySegment<byte>(buffer, 0, bytesRead),
                        WebSocketMessageType.Text,
                        true,
                        cts.Token);
                }
            }
            catch (OperationCanceledException) { }
            catch (Exception) { }
            finally
            {
                cts.Cancel();
            }
        }, cts.Token);

        // Task 2: Read from WebSocket and write to PTY / SSH InputStream
        var readFromWsTask = Task.Run(async () =>
        {
            var buffer = new byte[8192];
            try
            {
                while (!cts.Token.IsCancellationRequested && webSocket.State == WebSocketState.Open)
                {
                    var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        break;
                    }

                    if (result.Count > 0)
                    {
                        // Check if it's a resize control message: e.g. {"type":"resize","cols":120,"rows":30}
                        var text = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        if (text.StartsWith("{\"type\":\"resize\"", StringComparison.OrdinalIgnoreCase))
                        {
                            try
                            {
                                using var doc = JsonDocument.Parse(text);
                                int cols = doc.RootElement.GetProperty("cols").GetInt32();
                                int rows = doc.RootElement.GetProperty("rows").GetInt32();
                                session.Resize(cols, rows);
                                continue;
                            }
                            catch { }
                        }
                        else if (text.StartsWith("{\"type\":\"input\"", StringComparison.OrdinalIgnoreCase))
                        {
                            try
                            {
                                using var doc = JsonDocument.Parse(text);
                                var inputData = doc.RootElement.GetProperty("data").GetString() ?? string.Empty;
                                var inputBytes = Encoding.UTF8.GetBytes(inputData);
                                await inStream.WriteAsync(inputBytes, 0, inputBytes.Length, cts.Token);
                                await inStream.FlushAsync(cts.Token);
                                continue;
                            }
                            catch { }
                        }

                        // Regular terminal input
                        await inStream.WriteAsync(buffer, 0, result.Count, cts.Token);
                        await inStream.FlushAsync(cts.Token);
                    }
                }
            }
            catch (OperationCanceledException) { }
            catch (Exception) { }
            finally
            {
                cts.Cancel();
            }
        }, cts.Token);

        await Task.WhenAny(readFromPtyTask, readFromWsTask);
        cts.Cancel();

        if (webSocket.State == WebSocketState.Open)
        {
            try
            {
                await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Session ended", CancellationToken.None);
            }
            catch { }
        }

        CloseSessionAsync(sessionId).GetAwaiter().GetResult();
    }

    public Task ResizeSessionAsync(string sessionId, int cols, int rows)
    {
        if (_sessions.TryGetValue(sessionId, out var session))
        {
            session.Resize(cols, rows);
        }
        return Task.CompletedTask;
    }

    public Task CloseSessionAsync(string sessionId)
    {
        if (_sessions.TryRemove(sessionId, out var session))
        {
            session.Dispose();
        }
        return Task.CompletedTask;
    }

    public List<TerminalSessionInfo> GetActiveSessions()
    {
        return _sessions.Values
            .Where(s => !s.IsDisposed)
            .Select(s => s.Info)
            .ToList();
    }
}
