using System.Diagnostics;
using System.Text;
using System.Text.Json;
using DevDock.Core.Models;
using DevDock.Core.Services;

namespace DevDock.Settings.Services;

/// <summary>
/// N5: One-Click Dev Environment. Lưu profile tại %AppData%/DevDock/dev_profiles.json.
/// Khi Launch: mở editor + terminal đúng cwd + chạy dev command + mở các URL.
/// </summary>
public class DevEnvService : IDevEnvService
{
    private readonly IProjectService _projectService;
    private readonly string _storagePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private List<DevEnvProfile> _profiles = new();
    private bool _isLoaded;

    public DevEnvService(IProjectService projectService, string? storageDirectory = null)
    {
        _projectService = projectService;
        var dir = storageDirectory ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DevDock");
        Directory.CreateDirectory(dir);
        _storagePath = Path.Combine(dir, "dev_profiles.json");
    }

    private async Task EnsureLoadedAsync()
    {
        if (_isLoaded) return;
        if (File.Exists(_storagePath))
        {
            try
            {
                var json = await File.ReadAllTextAsync(_storagePath, Encoding.UTF8);
                _profiles = JsonSerializer.Deserialize<List<DevEnvProfile>>(json) ?? new();
            }
            catch
            {
                _profiles = new();
            }
        }
        _isLoaded = true;
    }

    private async Task SaveInternalAsync()
    {
        var json = JsonSerializer.Serialize(_profiles, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(_storagePath, json, Encoding.UTF8);
    }

    public async Task<List<DevEnvProfile>> GetProfilesAsync(string? projectId = null)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            var query = _profiles.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(projectId))
            {
                query = query.Where(p => p.ProjectId == projectId);
            }
            return query.OrderBy(p => p.Name).ToList();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<DevEnvProfile> SaveProfileAsync(DevEnvProfile profile)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            if (string.IsNullOrWhiteSpace(profile.Id))
            {
                profile.Id = Guid.NewGuid().ToString("N");
            }

            var existing = _profiles.FirstOrDefault(p => p.Id == profile.Id);
            if (existing != null)
            {
                existing.ProjectId = profile.ProjectId;
                existing.Name = profile.Name;
                existing.OpenEditor = profile.OpenEditor;
                existing.Editor = string.IsNullOrWhiteSpace(profile.Editor) ? "code" : profile.Editor;
                existing.OpenTerminal = profile.OpenTerminal;
                existing.DevCommandKey = profile.DevCommandKey;
                existing.Urls = profile.Urls ?? new();
            }
            else
            {
                _profiles.Add(profile);
            }

            await SaveInternalAsync();
            return existing ?? profile;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<bool> DeleteProfileAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            var removed = _profiles.RemoveAll(p => p.Id == id) > 0;
            if (removed) await SaveInternalAsync();
            return removed;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<DevEnvLaunchResult> LaunchAsync(string profileId)
    {
        DevEnvProfile? profile;
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            profile = _profiles.FirstOrDefault(p => p.Id == profileId);
        }
        finally
        {
            _lock.Release();
        }

        if (profile == null)
        {
            return new DevEnvLaunchResult { Success = false, ErrorMessage = "Không tìm thấy profile môi trường." };
        }

        var project = await _projectService.GetProjectByIdAsync(profile.ProjectId);
        if (project == null)
        {
            return new DevEnvLaunchResult { Success = false, ErrorMessage = "Không tìm thấy dự án liên kết." };
        }

        var result = new DevEnvLaunchResult { Success = true };

        // 1. Open editor
        if (profile.OpenEditor)
        {
            try
            {
                await _projectService.OpenInEditorAsync(project.Path, profile.Editor);
                result.Actions.Add($"Đã mở editor ({profile.Editor})");
            }
            catch (Exception ex)
            {
                result.Actions.Add($"Lỗi mở editor: {ex.Message}");
            }
        }

        // 2. Open terminal at cwd
        if (profile.OpenTerminal)
        {
            try
            {
                await _projectService.OpenInTerminalAsync(project.Path);
                result.Actions.Add("Đã mở terminal tại thư mục dự án");
            }
            catch (Exception ex)
            {
                result.Actions.Add($"Lỗi mở terminal: {ex.Message}");
            }
        }

        // 3. Run dev command
        if (!string.IsNullOrWhiteSpace(profile.DevCommandKey) &&
            project.Commands.ContainsKey(profile.DevCommandKey))
        {
            try
            {
                // Chạy nền, không chờ (dev server thường chạy lâu dài)
                _ = _projectService.RunCommandAsync(new ProjectCommandRunRequest
                {
                    ProjectId = project.Id,
                    CommandKey = profile.DevCommandKey
                });
                result.Actions.Add($"Đã khởi chạy lệnh '{profile.DevCommandKey}': {project.Commands[profile.DevCommandKey]}");
            }
            catch (Exception ex)
            {
                result.Actions.Add($"Lỗi chạy dev command: {ex.Message}");
            }
        }

        // 4. Open URLs
        foreach (var url in profile.Urls ?? new())
        {
            if (string.IsNullOrWhiteSpace(url)) continue;
            if (!IsSafeHttpUrl(url))
            {
                result.Actions.Add($"Bỏ qua URL không hợp lệ: {url}");
                continue;
            }
            try
            {
                Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
                result.Actions.Add($"Đã mở URL: {url}");
            }
            catch (Exception ex)
            {
                result.Actions.Add($"Lỗi mở URL {url}: {ex.Message}");
            }
        }

        return result;
    }

    private static bool IsSafeHttpUrl(string url)
        => Uri.TryCreate(url, UriKind.Absolute, out var uri)
           && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
