using DevDock.Core.Models;
using DevDock.Core.Services;
using DevDock.Settings.Services;
using Xunit;

namespace DevDock.Tests;

public class DevEnvServiceTests
{
    // Fake project service tối giản để test DevEnvService không phụ thuộc IO thật
    private class FakeProjectService : IProjectService
    {
        private readonly ProjectItem? _project;
        public FakeProjectService(ProjectItem? project) => _project = project;

        public Task<List<ProjectItem>> GetAllProjectsAsync() => Task.FromResult(_project == null ? new() : new List<ProjectItem> { _project });
        public Task<ProjectItem?> GetProjectByIdAsync(string id) => Task.FromResult(_project?.Id == id ? _project : null);
        public Task<ProjectItem> SaveProjectAsync(ProjectItem project) => Task.FromResult(project);
        public Task<bool> DeleteProjectAsync(string id) => Task.FromResult(true);
        public Task<ProjectItem?> DetectProjectAsync(string path) => Task.FromResult<ProjectItem?>(null);
        public Task<ProjectCommandResult> RunCommandAsync(ProjectCommandRunRequest request, CancellationToken ct = default)
            => Task.FromResult(new ProjectCommandResult { Success = true });
        public Task OpenInExplorerAsync(string path) => Task.CompletedTask;
        public Task OpenInEditorAsync(string path, string editor = "code") => Task.CompletedTask;
        public Task OpenInTerminalAsync(string path) => Task.CompletedTask;
    }

    private static (DevEnvService svc, string dir) CreateService(ProjectItem? project)
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"devdock_devenv_{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        return (new DevEnvService(new FakeProjectService(project), tempDir), tempDir);
    }

    [Fact]
    public async Task SaveAndGetProfiles_FiltersByProject()
    {
        var (svc, _) = CreateService(null);
        await svc.SaveProfileAsync(new DevEnvProfile { ProjectId = "p1", Name = "A" });
        await svc.SaveProfileAsync(new DevEnvProfile { ProjectId = "p2", Name = "B" });

        var p1 = await svc.GetProfilesAsync("p1");
        Assert.Single(p1);
        Assert.Equal("A", p1[0].Name);
    }

    [Fact]
    public async Task Launch_MissingProfile_ReturnsFailure()
    {
        var (svc, _) = CreateService(null);
        var res = await svc.LaunchAsync("nonexistent");
        Assert.False(res.Success);
        Assert.False(string.IsNullOrWhiteSpace(res.ErrorMessage));
    }

    [Fact]
    public async Task Launch_WithProject_RecordsActions()
    {
        var project = new ProjectItem { Id = "p1", Name = "Demo", Path = Path.GetTempPath() };
        var (svc, _) = CreateService(project);
        var profile = await svc.SaveProfileAsync(new DevEnvProfile
        {
            ProjectId = "p1",
            Name = "Full",
            OpenEditor = true,
            OpenTerminal = true,
            Urls = new() { "http://localhost:3000", "not-a-url" }
        });

        var res = await svc.LaunchAsync(profile.Id);
        Assert.True(res.Success);
        Assert.Contains(res.Actions, a => a.Contains("editor"));
        Assert.Contains(res.Actions, a => a.Contains("terminal"));
        // URL không hợp lệ phải bị bỏ qua
        Assert.Contains(res.Actions, a => a.Contains("Bỏ qua URL không hợp lệ"));
    }
}
