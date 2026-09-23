namespace DevDock.Core.Models;

public class DockerContainerItem
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public string Command { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty; // running, exited, paused, created
    public string Ports { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string RunningFor { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public bool IsRunning => State.Equals("running", StringComparison.OrdinalIgnoreCase);
}

public class DockerImageItem
{
    public string Id { get; set; } = string.Empty;
    public string Repository { get; set; } = string.Empty;
    public string Tag { get; set; } = string.Empty;
    public string CreatedSince { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
}

public class DockerComposeStackItem
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ConfigFiles { get; set; } = string.Empty;
}

public class DockerCommandResult
{
    public bool Success { get; set; }
    public string Output { get; set; } = string.Empty;
    public string? Error { get; set; }
    public int ExitCode { get; set; }
}

public class DockerAvailabilityResult
{
    public bool IsAvailable { get; set; }
    public bool IsDaemonRunning { get; set; }
    public string Version { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}
