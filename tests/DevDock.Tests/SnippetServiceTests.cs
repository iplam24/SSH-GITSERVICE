using DevDock.Core.Models;
using DevDock.Settings.Services;
using Xunit;

namespace DevDock.Tests;

public class SnippetServiceTests
{
    private static SnippetService CreateService()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"devdock_snip_{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        return new SnippetService(tempDir);
    }

    [Fact]
    public async Task Save_Then_GetAll_ReturnsSnippet()
    {
        var svc = CreateService();
        var saved = await svc.SaveAsync(new SnippetItem { Title = "List files", Command = "ls -la", Group = "Shell" });

        Assert.False(string.IsNullOrWhiteSpace(saved.Id));
        var all = await svc.GetAllAsync();
        Assert.Single(all);
        Assert.Equal("List files", all[0].Title);
    }

    [Fact]
    public async Task Save_EmptyGroup_DefaultsToGeneral()
    {
        var svc = CreateService();
        var saved = await svc.SaveAsync(new SnippetItem { Title = "x", Command = "echo hi", Group = "" });
        Assert.Equal("General", saved.Group);
    }

    [Fact]
    public async Task IncrementUse_RaisesUseCount()
    {
        var svc = CreateService();
        var saved = await svc.SaveAsync(new SnippetItem { Title = "x", Command = "echo hi" });
        var updated = await svc.IncrementUseAsync(saved.Id);
        Assert.NotNull(updated);
        Assert.Equal(1, updated!.UseCount);
    }

    [Fact]
    public async Task Delete_RemovesSnippet()
    {
        var svc = CreateService();
        var saved = await svc.SaveAsync(new SnippetItem { Title = "x", Command = "echo hi" });
        Assert.True(await svc.DeleteAsync(saved.Id));
        Assert.Empty(await svc.GetAllAsync());
    }

    [Fact]
    public async Task Persistence_ReloadsFromDisk()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"devdock_snip_{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        var svc1 = new SnippetService(tempDir);
        await svc1.SaveAsync(new SnippetItem { Title = "persisted", Command = "git status" });

        var svc2 = new SnippetService(tempDir);
        var all = await svc2.GetAllAsync();
        Assert.Single(all);
        Assert.Equal("persisted", all[0].Title);
    }
}
