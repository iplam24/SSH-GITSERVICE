using System.Text.Json.Serialization;

namespace DevDock.Core.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TerminalShellType
{
    PowerShell,
    Cmd,
    GitBash,
    Wsl,
    Ssh,
    Custom
}

public class TerminalSessionInfo
{
    public string SessionId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public TerminalShellType ShellType { get; set; }
    public int? ProcessId { get; set; }
    public string WorkingDirectory { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class TerminalResizeMessage
{
    public int Cols { get; set; } = 80;
    public int Rows { get; set; } = 24;
}

public class ShellDescriptor
{
    public TerminalShellType Type { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string ExecutablePath { get; set; } = string.Empty;
    public string? Arguments { get; set; }
    public bool IsAvailable { get; set; }
}
