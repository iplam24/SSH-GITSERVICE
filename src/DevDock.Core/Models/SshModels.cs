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

