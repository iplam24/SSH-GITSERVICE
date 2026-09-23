using DevDock.Core.Models;

namespace DevDock.Core.Services;

public interface IDockerService
{
    Task<DockerAvailabilityResult> CheckAvailabilityAsync();
    Task<List<DockerContainerItem>> ListContainersAsync(bool includeStopped = true);
    Task<List<DockerImageItem>> ListImagesAsync();
    Task<DockerCommandResult> StartContainerAsync(string containerId);
    Task<DockerCommandResult> StopContainerAsync(string containerId);
    Task<DockerCommandResult> RestartContainerAsync(string containerId);
    Task<DockerCommandResult> RemoveContainerAsync(string containerId, bool force = false);
    Task<DockerCommandResult> RemoveImageAsync(string imageId, bool force = false);
    Task<DockerCommandResult> GetContainerLogsAsync(string containerId, int tailLines = 200);
    Task<DockerCommandResult> ComposeUpAsync(string workingDirectory);
    Task<DockerCommandResult> ComposeDownAsync(string workingDirectory);
}
