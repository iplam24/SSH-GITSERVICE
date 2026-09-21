namespace DevDock.Core.Models;

public class ProjectItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public bool IsGitRepository { get; set; }
    public bool Favorite { get; set; }
    public List<string> Tags { get; set; } = new();
    public Dictionary<string, string> Commands { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public DateTime? LastOpenedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ProjectCommandRunRequest
{
    public string ProjectId { get; set; } = string.Empty;
    public string CommandKey { get; set; } = string.Empty;
    public string? CustomCommand { get; set; }
}

public class ProjectCommandResult
{
    public bool Success { get; set; }
    public int ExitCode { get; set; }
    public string Output { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}
