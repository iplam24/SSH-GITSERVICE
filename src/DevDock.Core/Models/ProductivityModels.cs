namespace DevDock.Core.Models;

// ------------------ N4: SNIPPET / COMMAND MANAGER ------------------
public class SnippetItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = string.Empty;
    public string Command { get; set; } = string.Empty;
    public string Group { get; set; } = "General";
    public string? Description { get; set; }
    public string? ProjectId { get; set; } // tùy chọn: gắn với 1 project cụ thể
    public int UseCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// ------------------ N5: ONE-CLICK DEV ENVIRONMENT ------------------
public class DevEnvProfile
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string ProjectId { get; set; } = string.Empty;
    public string Name { get; set; } = "Default";
    public bool OpenEditor { get; set; } = true;
    public string Editor { get; set; } = "code";
    public bool OpenTerminal { get; set; } = true;
    public string? DevCommandKey { get; set; } // key trong ProjectItem.Commands (vd "dev")
    public List<string> Urls { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
