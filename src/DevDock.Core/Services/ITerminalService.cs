using System.Net.WebSockets;
using DevDock.Core.Models;

namespace DevDock.Core.Services;

public interface ITerminalService
{
    Task<List<ShellDescriptor>> GetAvailableShellsAsync();
    Task<TerminalSessionInfo> CreateLocalSessionAsync(TerminalShellType shellType, string? workingDir = null, int cols = 80, int rows = 24);
    Task<TerminalSessionInfo> CreateSshSessionAsync(string profileId, int cols = 80, int rows = 24);
    Task AttachWebSocketAsync(string sessionId, WebSocket webSocket, CancellationToken cancellationToken = default);
    Task ResizeSessionAsync(string sessionId, int cols, int rows);
    Task CloseSessionAsync(string sessionId);
    List<TerminalSessionInfo> GetActiveSessions();
}
