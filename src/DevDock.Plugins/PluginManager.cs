using DevDock.Core.Models;
using DevDock.Core.Plugins;

namespace DevDock.Plugins;

internal sealed class PluginCommandRegistry : IPluginCommandRegistry
{
    public List<CommandPaletteItem> Commands { get; } = new();

    public void RegisterCommand(CommandPaletteItem command)
    {
        if (command != null && !string.IsNullOrWhiteSpace(command.Id))
        {
            Commands.Add(command);
        }
    }
}

public class PluginManager : IPluginManager
{
    private readonly List<IDevDockPlugin> _plugins = new();
    private readonly List<CommandPaletteItem> _pluginCommands = new();
    private readonly IServiceProvider _serviceProvider;

    public PluginManager(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task LoadPluginsAsync()
    {
        _plugins.Clear();
        _pluginCommands.Clear();

        // Built-in Sample Plugins demonstrating the extension points
        _plugins.Add(new MinecraftPlugin());
        _plugins.Add(new DockerPlugin());

        var registry = new PluginCommandRegistry();

        foreach (var plugin in _plugins)
        {
            if (plugin.Manifest.Enabled)
            {
                await plugin.InitializeAsync(_serviceProvider);
                await plugin.RegisterCommandsAsync(registry);
            }
        }

        _pluginCommands.AddRange(registry.Commands);
    }

    public IReadOnlyList<IDevDockPlugin> GetLoadedPlugins() => _plugins.AsReadOnly();

    public IReadOnlyList<CommandPaletteItem> GetPluginCommands() => _pluginCommands.AsReadOnly();
}

public class MinecraftPlugin : IDevDockPlugin
{
    public PluginManifest Manifest { get; } = new()
    {
        Id = "devdock.plugin.minecraft",
        Name = "Minecraft Server Tools",
        Version = "1.0.0",
        Description = "Monitor and manage local and remote Minecraft server instances.",
        Author = "DevDock",
        Icon = "box",
        Enabled = true
    };

    public Task InitializeAsync(IServiceProvider serviceProvider) => Task.CompletedTask;

    public Task RegisterCommandsAsync(IPluginCommandRegistry registry)
    {
        registry.RegisterCommand(new CommandPaletteItem
        {
            Id = "minecraft:status",
            Title = "Minecraft: Check Server Health",
            Subtitle = "Ping registered Minecraft server instances",
            Category = "Plugins",
            Icon = "box",
            ActionType = "plugin_action",
            Payload = new() { ["pluginId"] = Manifest.Id, ["action"] = "status" }
        });
        registry.RegisterCommand(new CommandPaletteItem
        {
            Id = "minecraft:rcon",
            Title = "Minecraft: Open RCON Console",
            Subtitle = "Direct remote command execution",
            Category = "Plugins",
            Icon = "box",
            ActionType = "plugin_action",
            Payload = new() { ["pluginId"] = Manifest.Id, ["action"] = "rcon" }
        });
        return Task.CompletedTask;
    }

    public Task ShutdownAsync() => Task.CompletedTask;
}

public class DockerPlugin : IDevDockPlugin
{
    public PluginManifest Manifest { get; } = new()
    {
        Id = "devdock.plugin.docker",
        Name = "Docker & Containers",
        Version = "1.0.0",
        Description = "Manage Docker containers, images, and docker-compose stacks via the local Docker CLI.",
        Author = "DevDock",
        Icon = "container",
        Enabled = true
    };

    public Task InitializeAsync(IServiceProvider serviceProvider) => Task.CompletedTask;

    public Task RegisterCommandsAsync(IPluginCommandRegistry registry)
    {
        registry.RegisterCommand(new CommandPaletteItem
        {
            Id = "docker:containers",
            Title = "Docker: List Containers",
            Subtitle = "View active and stopped containers (docker ps)",
            Category = "Plugins",
            Icon = "container",
            ActionType = "plugin_action",
            Payload = new() { ["pluginId"] = Manifest.Id, ["action"] = "containers" }
        });
        registry.RegisterCommand(new CommandPaletteItem
        {
            Id = "docker:images",
            Title = "Docker: List Images",
            Subtitle = "View downloaded images (docker images)",
            Category = "Plugins",
            Icon = "container",
            ActionType = "plugin_action",
            Payload = new() { ["pluginId"] = Manifest.Id, ["action"] = "images" }
        });
        registry.RegisterCommand(new CommandPaletteItem
        {
            Id = "docker:compose_up",
            Title = "Docker: Compose Up Active Project",
            Subtitle = "docker compose up -d",
            Category = "Plugins",
            Icon = "container",
            ActionType = "plugin_action",
            Payload = new() { ["pluginId"] = Manifest.Id, ["action"] = "compose_up" }
        });
        return Task.CompletedTask;
    }

    public Task ShutdownAsync() => Task.CompletedTask;
}
