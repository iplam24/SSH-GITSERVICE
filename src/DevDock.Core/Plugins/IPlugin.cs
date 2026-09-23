using DevDock.Core.Models;

namespace DevDock.Core.Plugins;

public class PluginManifest
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public string Description { get; set; } = string.Empty;
    public string Author { get; set; } = "DevDock";
    public string? Icon { get; set; }
    public bool Enabled { get; set; } = true;
}

public interface IPluginCommandRegistry
{
    void RegisterCommand(CommandPaletteItem command);
}

public interface IDevDockPlugin
{
    PluginManifest Manifest { get; }
    Task InitializeAsync(IServiceProvider serviceProvider);
    Task RegisterCommandsAsync(IPluginCommandRegistry registry);
    Task ShutdownAsync();
}

public interface IPluginManager
{
    Task LoadPluginsAsync();
    IReadOnlyList<IDevDockPlugin> GetLoadedPlugins();
    IReadOnlyList<CommandPaletteItem> GetPluginCommands();
}
