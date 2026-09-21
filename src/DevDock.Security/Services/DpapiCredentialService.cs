using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DevDock.Core.Services;

namespace DevDock.Security.Services;

public class DpapiCredentialService : ICredentialService
{
    private readonly string _storagePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private Dictionary<string, string> _cachedEncryptedEntries = new(StringComparer.OrdinalIgnoreCase);
    private bool _isLoaded;

    public DpapiCredentialService(string? customStoragePath = null)
    {
        if (!string.IsNullOrWhiteSpace(customStoragePath))
        {
            _storagePath = customStoragePath;
            var dir = Path.GetDirectoryName(_storagePath);
            if (!string.IsNullOrWhiteSpace(dir)) Directory.CreateDirectory(dir);
        }
        else
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var dir = Path.Combine(appData, "DevDock");
            Directory.CreateDirectory(dir);
            _storagePath = Path.Combine(dir, "credentials.dat");
        }
    }

    private async Task EnsureLoadedAsync()
    {
        if (_isLoaded) return;

        if (File.Exists(_storagePath))
        {
            for (int i = 0; i < 5; i++)
            {
                try
                {
                    using var stream = new FileStream(_storagePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite, 4096, useAsync: true);
                    using var reader = new StreamReader(stream, Encoding.UTF8);
                    var json = await reader.ReadToEndAsync();
                    _cachedEncryptedEntries = JsonSerializer.Deserialize<Dictionary<string, string>>(json)
                        ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    break;
                }
                catch (IOException) when (i < 4)
                {
                    await Task.Delay(50 * (i + 1));
                }
                catch
                {
                    _cachedEncryptedEntries = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    break;
                }
            }
        }
        _isLoaded = true;
    }

    private async Task SaveAsync()
    {
        var json = JsonSerializer.Serialize(_cachedEncryptedEntries, new JsonSerializerOptions { WriteIndented = true });
        for (int i = 0; i < 5; i++)
        {
            try
            {
                using var stream = new FileStream(_storagePath, FileMode.Create, FileAccess.Write, FileShare.ReadWrite, 4096, useAsync: true);
                using var writer = new StreamWriter(stream, Encoding.UTF8);
                await writer.WriteAsync(json);
                await writer.FlushAsync();
                return;
            }
            catch (IOException) when (i < 4)
            {
                await Task.Delay(50 * (i + 1));
            }
        }
    }

    public async Task SetSecretAsync(string key, string secret)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("Key cannot be empty", nameof(key));

        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            var rawBytes = Encoding.UTF8.GetBytes(secret);
            var encryptedBytes = ProtectedData.Protect(rawBytes, null, DataProtectionScope.CurrentUser);
            var base64 = Convert.ToBase64String(encryptedBytes);

            _cachedEncryptedEntries[key] = base64;
            await SaveAsync();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<string?> GetSecretAsync(string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return null;

        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            if (!_cachedEncryptedEntries.TryGetValue(key, out var base64))
            {
                return null;
            }

            var encryptedBytes = Convert.FromBase64String(base64);
            var rawBytes = ProtectedData.Unprotect(encryptedBytes, null, DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(rawBytes);
        }
        catch
        {
            return null;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<bool> HasSecretAsync(string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return false;

        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            return _cachedEncryptedEntries.ContainsKey(key);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task DeleteSecretAsync(string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return;

        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            if (_cachedEncryptedEntries.Remove(key))
            {
                await SaveAsync();
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    public string MaskSecret(string? secret)
    {
        if (string.IsNullOrEmpty(secret)) return string.Empty;

        var trimmed = secret.Trim();
        if (trimmed.Length <= 8)
        {
            return "••••••••";
        }

        // Check common prefixes
        var prefixes = new[] { "ghp_", "gho_", "ghu_", "ghs_", "ghr_", "glpat-", "xoxb-", "sk-", "bearer " };
        foreach (var prefix in prefixes)
        {
            if (trimmed.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                var remaining = trimmed.Substring(prefix.Length);
                var last4 = remaining.Length >= 4 ? remaining.Substring(remaining.Length - 4) : "";
                return $"{prefix}••••••••••••{last4}";
            }
        }

        var suffix = trimmed.Substring(trimmed.Length - 4);
        return $"••••••••••••{suffix}";
    }
}
