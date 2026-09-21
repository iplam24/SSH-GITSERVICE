using DevDock.Core.Models;

namespace DevDock.Core.Services;

public interface IProjectService
{
    Task<List<ProjectItem>> GetAllProjectsAsync();
    Task<ProjectItem?> GetProjectByIdAsync(string id);
    Task<ProjectItem> SaveProjectAsync(ProjectItem project);
    Task<bool> DeleteProjectAsync(string id);
    Task<ProjectItem?> DetectProjectAsync(string path);
    Task<ProjectCommandResult> RunCommandAsync(ProjectCommandRunRequest request, CancellationToken cancellationToken = default);
    Task OpenInExplorerAsync(string path);
    Task OpenInEditorAsync(string path, string editor = "code");
}
