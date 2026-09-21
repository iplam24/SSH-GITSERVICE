using DevDock.Core.Models;
using DevDock.Core.Services;

namespace DevDock.Settings.Services;

public class CommandService : ICommandService
{
    private readonly IProjectService _projectService;
    private readonly ISshService _sshService;

    public CommandService(IProjectService projectService, ISshService sshService)
    {
        _projectService = projectService;
        _sshService = sshService;
    }

    public async Task<List<CommandPaletteItem>> GetCommandsAsync()
    {
        var items = new List<CommandPaletteItem>();

        // Navigation
        items.Add(new CommandPaletteItem { Id = "nav:home", Title = "Go to Home Dashboard", Category = "Navigation", ActionType = "navigate", Payload = new() { ["route"] = "/" } });
        items.Add(new CommandPaletteItem { Id = "nav:projects", Title = "Go to Projects", Category = "Navigation", ActionType = "navigate", Payload = new() { ["route"] = "/projects" } });
        items.Add(new CommandPaletteItem { Id = "nav:git", Title = "Go to Git", Category = "Navigation", ActionType = "navigate", Shortcut = "Ctrl+Shift+G", Payload = new() { ["route"] = "/git" } });
        items.Add(new CommandPaletteItem { Id = "nav:ssh", Title = "Go to SSH Manager", Category = "Navigation", ActionType = "navigate", Shortcut = "Ctrl+Shift+S", Payload = new() { ["route"] = "/ssh" } });
        items.Add(new CommandPaletteItem { Id = "nav:terminal", Title = "Go to Terminal", Category = "Navigation", ActionType = "navigate", Shortcut = "Ctrl+Shift+T", Payload = new() { ["route"] = "/terminal" } });
        items.Add(new CommandPaletteItem { Id = "nav:tools", Title = "Go to Developer Tools", Category = "Navigation", ActionType = "navigate", Payload = new() { ["route"] = "/tools" } });
        items.Add(new CommandPaletteItem { Id = "nav:settings", Title = "Go to Settings", Category = "Navigation", ActionType = "navigate", Shortcut = "Ctrl+,", Payload = new() { ["route"] = "/settings" } });
        items.Add(new CommandPaletteItem { Id = "setup:wizard", Title = "System: Chạy lại Trình thiết lập hệ thống (Setup Wizard)", Subtitle = "Cấu hình PATH, Context Menu, Shell và Chẩn đoán phần cứng", Category = "System", ActionType = "setup_wizard" });

        // Terminal Actions
        items.Add(new CommandPaletteItem { Id = "term:new:pwsh", Title = "Terminal: New PowerShell Tab", Category = "Terminal", ActionType = "terminal", Payload = new() { ["shell"] = "PowerShell" } });
        items.Add(new CommandPaletteItem { Id = "term:new:cmd", Title = "Terminal: New CMD Tab", Category = "Terminal", ActionType = "terminal", Payload = new() { ["shell"] = "Cmd" } });
        items.Add(new CommandPaletteItem { Id = "term:new:bash", Title = "Terminal: New Git Bash Tab", Category = "Terminal", ActionType = "terminal", Payload = new() { ["shell"] = "GitBash" } });
        items.Add(new CommandPaletteItem { Id = "term:split:horiz", Title = "Terminal: Split Horizontal", Category = "Terminal", ActionType = "terminal_split", Payload = new() { ["direction"] = "horizontal" } });
        items.Add(new CommandPaletteItem { Id = "term:split:vert", Title = "Terminal: Split Vertical", Category = "Terminal", ActionType = "terminal_split", Payload = new() { ["direction"] = "vertical" } });

        // Git Actions
        items.Add(new CommandPaletteItem { Id = "git:stage_all", Title = "Git: Stage All Changes", Category = "Git", ActionType = "git_action", Payload = new() { ["action"] = "stage_all" } });
        items.Add(new CommandPaletteItem { Id = "git:unstage_all", Title = "Git: Unstage All Changes", Category = "Git", ActionType = "git_action", Payload = new() { ["action"] = "unstage_all" } });
        items.Add(new CommandPaletteItem { Id = "git:commit", Title = "Git: Commit Changes", Category = "Git", ActionType = "git_action", Payload = new() { ["action"] = "commit" } });
        items.Add(new CommandPaletteItem { Id = "git:push", Title = "Git: Push to Remote", Category = "Git", ActionType = "git_action", Payload = new() { ["action"] = "push" } });
        items.Add(new CommandPaletteItem { Id = "git:pull", Title = "Git: Pull from Remote", Category = "Git", ActionType = "git_action", Payload = new() { ["action"] = "pull" } });
        items.Add(new CommandPaletteItem { Id = "git:fetch", Title = "Git: Fetch All Remotes", Category = "Git", ActionType = "git_action", Payload = new() { ["action"] = "fetch" } });
        items.Add(new CommandPaletteItem { Id = "git:stash", Title = "Git: Stash Changes", Category = "Git", ActionType = "git_action", Payload = new() { ["action"] = "stash" } });
        items.Add(new CommandPaletteItem { Id = "git:stash_pop", Title = "Git: Pop Latest Stash", Category = "Git", ActionType = "git_action", Payload = new() { ["action"] = "stash_pop" } });

        // Developer Tools
        items.Add(new CommandPaletteItem { Id = "tool:json", Title = "Tool: JSON Formatter & Validator", Category = "Tools", ActionType = "navigate", Payload = new() { ["route"] = "/tools", ["tool"] = "json" } });
        items.Add(new CommandPaletteItem { Id = "tool:jwt", Title = "Tool: JWT Decoder", Category = "Tools", ActionType = "navigate", Payload = new() { ["route"] = "/tools", ["tool"] = "jwt" } });
        items.Add(new CommandPaletteItem { Id = "tool:base64", Title = "Tool: Base64 Encoder / Decoder", Category = "Tools", ActionType = "navigate", Payload = new() { ["route"] = "/tools", ["tool"] = "base64" } });
        items.Add(new CommandPaletteItem { Id = "tool:url", Title = "Tool: URL Encoder / Decoder", Category = "Tools", ActionType = "navigate", Payload = new() { ["route"] = "/tools", ["tool"] = "url" } });
        items.Add(new CommandPaletteItem { Id = "tool:uuid", Title = "Tool: UUID Generator", Category = "Tools", ActionType = "navigate", Payload = new() { ["route"] = "/tools", ["tool"] = "uuid" } });
        items.Add(new CommandPaletteItem { Id = "tool:hash", Title = "Tool: Hash Generator (MD5, SHA256)", Category = "Tools", ActionType = "navigate", Payload = new() { ["route"] = "/tools", ["tool"] = "hash" } });
        items.Add(new CommandPaletteItem { Id = "tool:regex", Title = "Tool: Regex Tester", Category = "Tools", ActionType = "navigate", Payload = new() { ["route"] = "/tools", ["tool"] = "regex" } });
        items.Add(new CommandPaletteItem { Id = "tool:timestamp", Title = "Tool: Unix Timestamp Converter", Category = "Tools", ActionType = "navigate", Payload = new() { ["route"] = "/tools", ["tool"] = "timestamp" } });
        items.Add(new CommandPaletteItem { Id = "tool:color", Title = "Tool: Color Picker & Converter", Category = "Tools", ActionType = "navigate", Payload = new() { ["route"] = "/tools", ["tool"] = "color" } });
        items.Add(new CommandPaletteItem { Id = "tool:diff", Title = "Tool: Text Diff Comparator", Category = "Tools", ActionType = "navigate", Payload = new() { ["route"] = "/tools", ["tool"] = "diff" } });
        items.Add(new CommandPaletteItem { Id = "tool:http", Title = "Tool: HTTP Client", Category = "Tools", ActionType = "navigate", Payload = new() { ["route"] = "/tools", ["tool"] = "http" } });

        // Registered Projects
        var projects = await _projectService.GetAllProjectsAsync();
        foreach (var p in projects)
        {
            items.Add(new CommandPaletteItem
            {
                Id = $"proj:open:{p.Id}",
                Title = $"Project: Open {p.Name}",
                Subtitle = p.Path,
                Category = "Projects",
                ActionType = "project",
                Payload = new() { ["projectId"] = p.Id, ["action"] = "open" }
            });
            items.Add(new CommandPaletteItem
            {
                Id = $"proj:term:{p.Id}",
                Title = $"Project: Open Terminal at {p.Name}",
                Subtitle = p.Path,
                Category = "Projects",
                ActionType = "project",
                Payload = new() { ["projectId"] = p.Id, ["action"] = "terminal" }
            });
            if (p.IsGitRepository)
            {
                items.Add(new CommandPaletteItem
                {
                    Id = $"proj:git:{p.Id}",
                    Title = $"Project: View Git for {p.Name}",
                    Subtitle = p.Path,
                    Category = "Projects",
                    ActionType = "project",
                    Payload = new() { ["projectId"] = p.Id, ["action"] = "git" }
                });
            }
            if (p.Commands.ContainsKey("dev"))
            {
                items.Add(new CommandPaletteItem
                {
                    Id = $"proj:dev:{p.Id}",
                    Title = $"Project: Run Dev ({p.Name})",
                    Subtitle = p.Commands["dev"],
                    Category = "Projects",
                    ActionType = "project",
                    Payload = new() { ["projectId"] = p.Id, ["action"] = "run_dev" }
                });
            }
        }

        // SSH Profiles
        var sshProfiles = await _sshService.GetAllProfilesAsync();
        foreach (var s in sshProfiles)
        {
            items.Add(new CommandPaletteItem
            {
                Id = $"ssh:connect:{s.Id}",
                Title = $"SSH: Connect to {s.Name}",
                Subtitle = $"{s.Username}@{s.Host}:{s.Port}",
                Category = "SSH",
                ActionType = "ssh_connect",
                Payload = new() { ["profileId"] = s.Id }
            });
        }

        return items;
    }
}
