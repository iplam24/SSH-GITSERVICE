using DevDock.Core.Models;

namespace DevDock.Core.Services;

public class DevEnvLaunchResult
{
    public bool Success { get; set; }
    public List<string> Actions { get; set; } = new();
    public string? ErrorMessage { get; set; }
}

public interface IDevEnvService
{
    Task<List<DevEnvProfile>> GetProfilesAsync(string? projectId = null);
    Task<DevEnvProfile> SaveProfileAsync(DevEnvProfile profile);
    Task<bool> DeleteProfileAsync(string id);
    Task<DevEnvLaunchResult> LaunchAsync(string profileId);
}
