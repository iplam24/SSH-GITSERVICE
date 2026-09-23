using DevDock.Core.Models;
using DevDock.Core.Plugins;
using DevDock.Plugins;
using DevDock.Security.Services;
using DevDock.Projects.Services;
using DevDock.SSH.Services;
using DevDock.Settings.Services;
using Xunit;

namespace DevDock.Tests;

public class PluginSystemTests
{
    [Fact]
    public async Task PluginManager_LoadPlugins_RegistersPluginCommands()
    {
        var mgr = new PluginManager(new EmptyServiceProvider());
        await mgr.LoadPluginsAsync();

        var loaded = mgr.GetLoadedPlugins();
        Assert.NotEmpty(loaded);
        Assert.Contains(loaded, p => p.Manifest.Id == "devdock.plugin.docker");

        var commands = mgr.GetPluginCommands();
        Assert.NotEmpty(commands);
        // Docker plugin must contribute the "list containers" command
        Assert.Contains(commands, c => c.Id == "docker:containers");
        Assert.Contains(commands, c => c.Id == "docker:images");
        // All plugin commands use the plugin_action action type
        Assert.All(commands, c => Assert.Equal("plugin_action", c.ActionType));
    }

    [Fact]
    public async Task CommandService_MergesPluginCommands()
    {
        var mgr = new PluginManager(new EmptyServiceProvider());
        await mgr.LoadPluginsAsync();

        var projectService = new ProjectService();
        var sshService = new SshService(new DpapiCredentialService());
        var cmdService = new CommandService(projectService, sshService, mgr);

        var items = await cmdService.GetCommandsAsync();

        Assert.NotEmpty(items);
        // Built-in git action still present
        Assert.Contains(items, c => c.Id == "git:push");
        // Plugin command merged in
        Assert.Contains(items, c => c.Id == "docker:containers");
    }

    private sealed class EmptyServiceProvider : IServiceProvider
    {
        public object? GetService(Type serviceType) => null;
    }
}

public class DockerServiceTests
{
    [Fact]
    public async Task DockerService_CheckAvailability_DoesNotThrow_WhenDockerMissing()
    {
        var svc = new DockerService();
        var result = await svc.CheckAvailabilityAsync();

        // Regardless of Docker being installed, we must get a structured result (no exception)
        Assert.NotNull(result);
        if (!result.IsAvailable)
        {
            Assert.False(string.IsNullOrWhiteSpace(result.ErrorMessage));
        }
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("bad;rm -rf")]
    [InlineData("name`with`backtick")]
    [InlineData("$(whoami)")]
    public async Task DockerService_RejectsInvalidContainerReferences(string badRef)
    {
        var svc = new DockerService();
        var result = await svc.StopContainerAsync(badRef);

        Assert.False(result.Success);
        Assert.Equal(-1, result.ExitCode);
        Assert.Contains("không hợp lệ", result.Error ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }
}
