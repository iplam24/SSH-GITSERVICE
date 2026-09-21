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

    // Generic Command Execution
    Task<SshCommandResult> ExecuteCommandAsync(string profileId, string command, int timeoutSeconds = 60);

    // Server Overview & Telemetry
    Task<SshServerOverview> GetServerOverviewAsync(string profileId);

    // Ports & Processes
    Task<List<SshListeningPortItem>> GetListeningPortsAsync(string profileId);
    Task<bool> KillProcessAsync(string profileId, int pid, bool force = true);
    Task<List<SshProcessItem>> GetProcessesAsync(string profileId);
    Task<SshCommandResult> ProcessActionAsync(string profileId, string type, string processNameOrId, string action);
    Task<SshCommandResult> CreateSystemdServiceAsync(string profileId, string serviceName, string execStart, string workingDir, string user, string? envVars);

    // Nginx Virtual Hosts & Reverse Proxy
    Task<SshCommandResult> GetNginxStatusAsync(string profileId);
    Task<List<SshNginxSiteItem>> GetNginxSitesAsync(string profileId);
    Task<SshCommandResult> SaveNginxSiteAsync(string profileId, SshNginxSaveRequest req);
    Task<SshCommandResult> ToggleNginxSiteAsync(string profileId, string siteName, bool enable);
    Task<SshCommandResult> DeleteNginxSiteAsync(string profileId, string siteName);
    Task<SshCommandResult> ReloadNginxAsync(string profileId);
    Task<string> GetNginxLogsAsync(string profileId, string logType, int lines = 100);

    // Certbot SSL
    Task<List<SshCertbotCertificateItem>> GetCertbotCertificatesAsync(string profileId);
    Task<SshCommandResult> InstallCertbotAsync(string profileId);
    Task<SshCommandResult> IssueCertbotSslAsync(string profileId, string domain, string email);

    // Domains
    Task<List<SshDomainItem>> CheckDomainsAsync(string profileId, List<string> domains);

    // Git Deployments on Server
    Task<SshCommandResult> GitCloneOnServerAsync(string profileId, string repoUrl, string targetDir, string branch);
    Task<SshCommandResult> GitPullOnServerAsync(string profileId, string targetDir, string? branch, string? postDeployCommand);
    Task<SshGitDeploymentItem> GetServerGitStatusAsync(string profileId, string targetDir);

    // Metadata Persistence
    Task<SshServerMetadata> GetServerMetadataAsync(string profileId);
    Task<bool> SaveServerMetadataAsync(string profileId, SshServerMetadata metadata);
}
