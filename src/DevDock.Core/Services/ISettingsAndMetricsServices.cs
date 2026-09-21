using DevDock.Core.Models;

namespace DevDock.Core.Services;

public interface ISettingsService
{
    Task<AppSettings> GetSettingsAsync();
    Task<AppSettings> SaveSettingsAsync(AppSettings settings);
    Task<List<GitAccount>> GetGitAccountsAsync();
    Task<GitAccount?> GetGitAccountByIdAsync(string id);
    Task<GitAccount> SaveGitAccountAsync(SaveGitAccountRequest request);
    Task<bool> DeleteGitAccountAsync(string id);
    Task<TestGitAccountResult> TestGitAccountAsync(string id);
    Task<TestGitAccountResult> TestDirectGitAccountAsync(SaveGitAccountRequest request);
}

public interface ISystemMetricsService
{
    Task<SystemMetrics> GetCurrentMetricsAsync();
}

public interface ICommandService
{
    Task<List<CommandPaletteItem>> GetCommandsAsync();
}
