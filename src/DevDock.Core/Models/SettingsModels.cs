namespace DevDock.Core.Models;

public class AppSettings
{
    public string Theme { get; set; } = "dark"; // dark, light, system
    public string AccentColor { get; set; } = "emerald"; // emerald, blue, violet, amber, rose
    public string AppFontSize { get; set; } = "medium"; // small, medium, large, xlarge
    public int AppFontSizePercent { get; set; } = 100; // 85 to 125 percent
    public int TerminalFontSize { get; set; } = 14;
    public string TerminalFontFamily { get; set; } = "'Cascadia Code', 'Fira Code', Consolas, monospace";
    public TerminalShellType DefaultShell { get; set; } = TerminalShellType.PowerShell;
    public bool StartMinimized { get; set; } = false;
    public bool MinimizeToTray { get; set; } = true;
    public bool GlobalHotkeyEnabled { get; set; } = true;
    public string GlobalHotkey { get; set; } = "Ctrl+Space";
    public string Language { get; set; } = "vi"; // vi, en
    public string? TerminalBackgroundImage { get; set; } = string.Empty;
    public double TerminalBackgroundOpacity { get; set; } = 0.25;
    public double TerminalBackgroundBlur { get; set; } = 2.0;
    public bool AutoFetchGit { get; set; } = true;
    public int GitFetchIntervalMinutes { get; set; } = 10;
    public bool HasCompletedSetup { get; set; } = false;
    public bool AddToPath { get; set; } = true;
    public bool RunAtStartup { get; set; } = false;
    public bool RegisterContextMenu { get; set; } = true;
}

public enum GitProvider
{
    GitHub,
    GitLab,
    Bitbucket,
    Generic
}

public class GitAccount
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public GitProvider Provider { get; set; } = GitProvider.GitHub;
    public string? ApiBaseUrl { get; set; } // Custom API endpoint (e.g. for GitHub Enterprise or Self-hosted GitLab/Gitea)
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public bool HasToken { get; set; }
    public string MaskedToken { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SaveGitAccountRequest
{
    public GitAccount Account { get; set; } = new();
    public string? Token { get; set; }
}

public class TestGitAccountResult
{
    public bool Success { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? ErrorMessage { get; set; }
}

public class SetupDiagnostics
{
    public string OsVersion { get; set; } = string.Empty;
    public string Architecture { get; set; } = "x64";
    public bool IsAdmin { get; set; }
    public bool DotnetInstalled { get; set; } = true;
    public string DotnetVersion { get; set; } = string.Empty;
    public bool Webview2Installed { get; set; } = true;
    public string Webview2Version { get; set; } = string.Empty;
    public bool GitInstalled { get; set; }
    public string GitVersion { get; set; } = string.Empty;
    public string GitPath { get; set; } = string.Empty;
    public bool PowershellInstalled { get; set; }
    public string PowershellVersion { get; set; } = string.Empty;
    public bool WslInstalled { get; set; }
    public bool SshInstalled { get; set; }
}

public class SystemIntegrationStatus
{
    public bool IsInPath { get; set; }
    public string AppDirectory { get; set; } = string.Empty;
    public bool IsContextMenuRegistered { get; set; }
    public bool IsStartupRegistered { get; set; }
    public bool IsProtocolRegistered { get; set; }
}

public class ApplySetupRequest
{
    public bool AddToPath { get; set; } = true;
    public bool RegisterContextMenu { get; set; } = true;
    public bool RunAtStartup { get; set; } = false;
    public bool RegisterProtocol { get; set; } = true;
    public string Language { get; set; } = "vi";
    public string Theme { get; set; } = "dark";
    public string AccentColor { get; set; } = "emerald";
    public TerminalShellType DefaultShell { get; set; } = TerminalShellType.PowerShell;
}

public class SetupActionResult
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = string.Empty;
    public SystemIntegrationStatus? Status { get; set; }
}

