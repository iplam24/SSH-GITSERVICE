using DevDock.Core.Models;

namespace DevDock.Core.Services;

public interface ISshService
{
    Task<List<SshProfile>> GetAllProfilesAsync();
    Task<SshProfile?> GetProfileByIdAsync(string id);
    Task<SshProfile> SaveProfileAsync(SaveSshProfileRequest request);
    Task<bool> DeleteProfileAsync(string id);
    Task<SshConnectionTestResult> TestConnectionAsync(string profileId);
    Task<SshConnectionTestResult> TestDirectConnectionAsync(SaveSshProfileRequest request);
    Task<List<RemoteFileItem>> SftpListDirectoryAsync(string profileId, string? path = null);
    Task<RemoteFileContent> SftpReadFileAsync(string profileId, string path);
    Task<bool> SftpUploadFileAsync(string profileId, string remotePath, byte[] content);
    Task<bool> SftpDeleteAsync(string profileId, string path, bool isDirectory);
    Task<bool> SftpCreateDirectoryAsync(string profileId, string path);
}
