using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using DevDock.Core.Models;
using DevDock.Core.Services;

namespace DevDock.Settings.Services;

public class SettingsService : ISettingsService
{
    private readonly ICredentialService _credentialService;
    private readonly string _settingsPath;
    private readonly string _accountsPath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private AppSettings _cachedSettings = new();
    private List<GitAccount> _cachedAccounts = new();
    private bool _isLoaded;
    private static readonly HttpClient HttpClient = new();

    public SettingsService(ICredentialService credentialService)
    {
        _credentialService = credentialService;
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var dir = Path.Combine(appData, "DevDock");
        Directory.CreateDirectory(dir);
        _settingsPath = Path.Combine(dir, "settings.json");
        _accountsPath = Path.Combine(dir, "git_accounts.json");
    }

    private async Task EnsureLoadedAsync()
    {
        if (_isLoaded) return;

        if (File.Exists(_settingsPath))
        {
            try
            {
                var json = await File.ReadAllTextAsync(_settingsPath, Encoding.UTF8);
                _cachedSettings = JsonSerializer.Deserialize<AppSettings>(json) ?? new();
            }
            catch
            {
                _cachedSettings = new();
            }
        }

        if (File.Exists(_accountsPath))
        {
            try
            {
                var json = await File.ReadAllTextAsync(_accountsPath, Encoding.UTF8);
                _cachedAccounts = JsonSerializer.Deserialize<List<GitAccount>>(json) ?? new();
            }
            catch
            {
                _cachedAccounts = new();
            }
        }

        _isLoaded = true;
    }

    public async Task<AppSettings> GetSettingsAsync()
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            return _cachedSettings;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<AppSettings> SaveSettingsAsync(AppSettings settings)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            _cachedSettings = settings;
            var json = JsonSerializer.Serialize(_cachedSettings, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(_settingsPath, json, Encoding.UTF8);
            return _cachedSettings;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<List<GitAccount>> GetGitAccountsAsync()
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            return _cachedAccounts.OrderByDescending(a => a.IsDefault).ThenBy(a => a.Name).ToList();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<GitAccount?> GetGitAccountByIdAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            return _cachedAccounts.FirstOrDefault(a => a.Id == id);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<GitAccount> SaveGitAccountAsync(SaveGitAccountRequest request)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            var account = request.Account;
            if (string.IsNullOrWhiteSpace(account.Id))
            {
                account.Id = Guid.NewGuid().ToString("N");
            }

            if (!string.IsNullOrWhiteSpace(request.Token))
            {
                await _credentialService.SetSecretAsync($"git:account:{account.Id}:token", request.Token);
                account.HasToken = true;
                account.MaskedToken = _credentialService.MaskSecret(request.Token);
            }

            // If marked as default, unmark others
            if (account.IsDefault)
            {
                foreach (var a in _cachedAccounts)
                {
                    a.IsDefault = false;
                }
            }

            var index = _cachedAccounts.FindIndex(a => a.Id == account.Id);
            if (index >= 0)
            {
                if (string.IsNullOrWhiteSpace(request.Token))
                {
                    // Preserve existing token status and mask
                    account.HasToken = _cachedAccounts[index].HasToken;
                    account.MaskedToken = _cachedAccounts[index].MaskedToken;
                }
                _cachedAccounts[index] = account;
            }
            else
            {
                if (_cachedAccounts.Count == 0) account.IsDefault = true;
                _cachedAccounts.Add(account);
            }

            var json = JsonSerializer.Serialize(_cachedAccounts, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(_accountsPath, json, Encoding.UTF8);

            return account;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<bool> DeleteGitAccountAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            var removed = _cachedAccounts.RemoveAll(a => a.Id == id) > 0;
            if (removed)
            {
                var json = JsonSerializer.Serialize(_cachedAccounts, new JsonSerializerOptions { WriteIndented = true });
                await File.WriteAllTextAsync(_accountsPath, json, Encoding.UTF8);
                await _credentialService.DeleteSecretAsync($"git:account:{id}:token");
            }
            return removed;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<TestGitAccountResult> TestGitAccountAsync(string id)
    {
        var account = await GetGitAccountByIdAsync(id);
        if (account == null)
        {
            return new TestGitAccountResult { Success = false, ErrorMessage = "Account not found" };
        }

        var token = await _credentialService.GetSecretAsync($"git:account:{account.Id}:token");
        if (string.IsNullOrWhiteSpace(token))
        {
            return new TestGitAccountResult { Success = false, ErrorMessage = "No Personal Access Token configured for this account" };
        }

        try
        {
            if (account.Provider == GitProvider.GitHub)
            {
                var request = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user");
                request.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var response = await HttpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    var login = doc.RootElement.GetProperty("login").GetString();
                    var name = doc.RootElement.TryGetProperty("name", out var n) ? n.GetString() : login;
                    var avatar = doc.RootElement.TryGetProperty("avatar_url", out var a) ? a.GetString() : null;

                    return new TestGitAccountResult
                    {
                        Success = true,
                        DisplayName = $"{name} (@{login})",
                        AvatarUrl = avatar
                    };
                }
                else
                {
                    return new TestGitAccountResult
                    {
                        Success = false,
                        ErrorMessage = $"GitHub returned HTTP {(int)response.StatusCode}: {response.ReasonPhrase}"
                    };
                }
            }
            else if (account.Provider == GitProvider.GitLab)
            {
                var request = new HttpRequestMessage(HttpMethod.Get, "https://gitlab.com/api/v4/user");
                request.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
                request.Headers.Add("PRIVATE-TOKEN", token);

                var response = await HttpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    var username = doc.RootElement.GetProperty("username").GetString();
                    var name = doc.RootElement.TryGetProperty("name", out var n) ? n.GetString() : username;
                    var avatar = doc.RootElement.TryGetProperty("avatar_url", out var a) ? a.GetString() : null;

                    return new TestGitAccountResult
                    {
                        Success = true,
                        DisplayName = $"{name} (@{username})",
                        AvatarUrl = avatar
                    };
                }
                else
                {
                    return new TestGitAccountResult
                    {
                        Success = false,
                        ErrorMessage = $"GitLab returned HTTP {(int)response.StatusCode}: {response.ReasonPhrase}"
                    };
                }
            }
            else
            {
                // Generic provider: token is stored securely
                return new TestGitAccountResult
                {
                    Success = true,
                    DisplayName = $"{account.Username} ({account.Provider})"
                };
            }
        }
        catch (Exception ex)
        {
            return new TestGitAccountResult
            {
                Success = false,
                ErrorMessage = $"Connection test failed: {ex.Message}"
            };
        }
    }

    public async Task<TestGitAccountResult> TestDirectGitAccountAsync(SaveGitAccountRequest request)
    {
        var account = request.Account;
        var token = request.Token;
        if (string.IsNullOrWhiteSpace(token) && !string.IsNullOrWhiteSpace(account.Id))
        {
            token = await _credentialService.GetSecretAsync($"git:account:{account.Id}:token");
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return new TestGitAccountResult { Success = false, ErrorMessage = "Vui lòng nhập Personal Access Token (PAT) để kiểm tra" };
        }

        try
        {
            if (account.Provider == GitProvider.GitHub)
            {
                var req = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user");
                req.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var response = await HttpClient.SendAsync(req);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    var login = doc.RootElement.GetProperty("login").GetString();
                    var name = doc.RootElement.TryGetProperty("name", out var n) ? n.GetString() : login;
                    var avatar = doc.RootElement.TryGetProperty("avatar_url", out var a) ? a.GetString() : null;

                    return new TestGitAccountResult
                    {
                        Success = true,
                        DisplayName = $"{name} (@{login})",
                        AvatarUrl = avatar
                    };
                }
                else
                {
                    return new TestGitAccountResult
                    {
                        Success = false,
                        ErrorMessage = $"GitHub trả về HTTP {(int)response.StatusCode}: {response.ReasonPhrase}. Token có thể đã hết hạn hoặc thiếu quyền."
                    };
                }
            }
            else if (account.Provider == GitProvider.GitLab)
            {
                var baseUrl = string.IsNullOrWhiteSpace(account.ApiBaseUrl) ? "https://gitlab.com" : account.ApiBaseUrl.TrimEnd('/');
                var req = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/api/v4/user");
                req.Headers.UserAgent.Add(new ProductInfoHeaderValue("DevDock", "1.0"));
                req.Headers.Add("PRIVATE-TOKEN", token);

                var response = await HttpClient.SendAsync(req);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    var username = doc.RootElement.GetProperty("username").GetString();
                    var name = doc.RootElement.TryGetProperty("name", out var n) ? n.GetString() : username;
                    var avatar = doc.RootElement.TryGetProperty("avatar_url", out var a) ? a.GetString() : null;

                    return new TestGitAccountResult
                    {
                        Success = true,
                        DisplayName = $"{name} (@{username})",
                        AvatarUrl = avatar
                    };
                }
                else
                {
                    return new TestGitAccountResult
                    {
                        Success = false,
                        ErrorMessage = $"GitLab trả về HTTP {(int)response.StatusCode}: {response.ReasonPhrase}"
                    };
                }
            }
            else
            {
                return new TestGitAccountResult
                {
                    Success = true,
                    DisplayName = $"{account.Username} ({account.Provider})"
                };
            }
        }
        catch (Exception ex)
        {
            return new TestGitAccountResult
            {
                Success = false,
                ErrorMessage = $"Kiểm tra kết nối thất bại: {ex.Message}"
            };
        }
    }
}
