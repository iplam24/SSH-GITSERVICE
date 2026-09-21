namespace DevDock.Core.Models;

public enum SshAuthType
{
    Password,
    PrivateKey,
    KeyWithPassphrase
}

public class SshProfile
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 22;
    public string Username { get; set; } = "root";
    public SshAuthType AuthType { get; set; } = SshAuthType.Password;
    public string? PrivateKeyPath { get; set; }
    public bool HasPassword { get; set; }
    public bool HasPrivateKey { get; set; }
    public string? Group { get; set; }
    public SshServerMetadata Metadata { get; set; } = new();
    public DateTime? LastConnectedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SshConnectionTestResult
{
    public bool Success { get; set; }
    public long LatencyMs { get; set; }
    public string? ServerVersion { get; set; }
    public string? ErrorMessage { get; set; }
    public string? Details { get; set; }
}

public class SaveSshProfileRequest
{
    public SshProfile Profile { get; set; } = new();
    public string? Password { get; set; }
    public string? PrivateKeyContent { get; set; }
    public string? KeyPassphrase { get; set; }
}

public class RemoteFileItem
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public bool IsDirectory { get; set; }
    public long Size { get; set; }
    public DateTime ModifiedTime { get; set; }
    public string? Permissions { get; set; }
}

public class RemoteFileContent
{
    public string Path { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsBinary { get; set; }
    public long Size { get; set; }
}

public class SftpUploadRequest
{
    public string ProfileId { get; set; } = string.Empty;
    public string RemotePath { get; set; } = string.Empty;
    public string ContentBase64 { get; set; } = string.Empty;
}

public class SftpDeleteRequest
{
    public string ProfileId { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public bool IsDirectory { get; set; }
}

public class SftpCreateDirRequest
{
    public string ProfileId { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
}

public class SshCommandResult
{
    public bool Success { get; set; }
    public int ExitCode { get; set; }
    public string Output { get; set; } = string.Empty;
    public string Error { get; set; } = string.Empty;
    public long ExecutionTimeMs { get; set; }
}

public class SshListeningPortItem
{
    public string Protocol { get; set; } = "tcp";
    public string LocalAddress { get; set; } = string.Empty;
    public int Port { get; set; }
    public string State { get; set; } = "LISTEN";
    public string ProcessName { get; set; } = string.Empty;
    public int Pid { get; set; }
}

public class SshServerOverview
{
    public string OsName { get; set; } = string.Empty;
    public string Uptime { get; set; } = string.Empty;
    public string CpuUsage { get; set; } = string.Empty;
    public long MemTotalMb { get; set; }
    public long MemUsedMb { get; set; }
    public string DiskTotal { get; set; } = string.Empty;
    public string DiskUsed { get; set; } = string.Empty;
    public string DiskPercent { get; set; } = string.Empty;
    public bool UfwActive { get; set; }
    public List<string> UfwRules { get; set; } = new();
}

public class SshDomainItem
{
    public string Domain { get; set; } = string.Empty;
    public string? ResolvedIp { get; set; }
    public bool IsPointingToThisServer { get; set; }
    public bool HasSsl { get; set; }
    public string? SslExpiry { get; set; }
    public string? NginxSiteName { get; set; }
    public int? TargetPort { get; set; }
}

public class SshNginxSiteItem
{
    public string Name { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public string ConfigPath { get; set; } = string.Empty;
    public List<string> DomainNames { get; set; } = new();
    public string? ProxyPassHost { get; set; }
    public int? ProxyPassPort { get; set; }
    public bool IsSslEnabled { get; set; }
    public string RawContent { get; set; } = string.Empty;
}

public class SshNginxSaveRequest
{
    public string SiteName { get; set; } = string.Empty;
    public string DomainNames { get; set; } = string.Empty;
    public string ProxyPassHost { get; set; } = "http://127.0.0.1";
    public int? ProxyPassPort { get; set; }
    public bool IsSpaStatic { get; set; }
    public string StaticRootPath { get; set; } = string.Empty;
    public bool EnableWebSocket { get; set; } = true;
    public bool EnableSsl { get; set; }
    public string MaxBodySizeMb { get; set; } = "50M";
    public string? CustomDirectives { get; set; }
}

public class SshCertbotCertificateItem
{
    public string DomainName { get; set; } = string.Empty;
    public string ExpiryDate { get; set; } = string.Empty;
    public string CertificatePath { get; set; } = string.Empty;
    public int DaysRemaining { get; set; }
}

public class SshGitDeploymentItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string RepoUrl { get; set; } = string.Empty;
    public string TargetPath { get; set; } = string.Empty;
    public string Branch { get; set; } = "main";
    public string? LastCommitHash { get; set; }
    public string? LastCommitMessage { get; set; }
    public string? PostDeployCommand { get; set; }
    public DateTime? LastPulledAt { get; set; }
}

public class SshProcessItem
{
    public string Type { get; set; } = "systemd"; // "systemd" or "pm2"
    public string Name { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public string? Cpu { get; set; }
    public string? Memory { get; set; }
    public string? Uptime { get; set; }
}

public class SshSavedSnippet
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string Command { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class SshServerMetadata
{
    public List<SshDomainItem> Domains { get; set; } = new();
    public List<SshGitDeploymentItem> GitDeployments { get; set; } = new();
    public List<string> TrackedSystemdServices { get; set; } = new();
    public List<SshSavedSnippet> CustomSnippets { get; set; } = new();
}


