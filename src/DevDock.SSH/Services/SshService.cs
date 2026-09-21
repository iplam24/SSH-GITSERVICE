using System.Diagnostics;
using System.Text;
using System.Text.Json;
using DevDock.Core.Models;
using DevDock.Core.Services;
using Renci.SshNet;
using Renci.SshNet.Common;

namespace DevDock.SSH.Services;

public class SshService : ISshService
{
    private readonly ICredentialService _credentialService;
    private readonly string _storagePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private List<SshProfile> _profiles = new();
    private bool _isLoaded;

    public SshService(ICredentialService credentialService)
    {
        _credentialService = credentialService;
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var dir = Path.Combine(appData, "DevDock");
        Directory.CreateDirectory(dir);
        _storagePath = Path.Combine(dir, "ssh_profiles.json");
    }

    private async Task EnsureLoadedAsync()
    {
        if (_isLoaded) return;
        if (File.Exists(_storagePath))
        {
            try
            {
                var json = await File.ReadAllTextAsync(_storagePath, Encoding.UTF8);
                _profiles = JsonSerializer.Deserialize<List<SshProfile>>(json) ?? new();
            }
            catch
            {
                _profiles = new();
            }
        }
        _isLoaded = true;
    }

    private async Task SaveAsync()
    {
        var json = JsonSerializer.Serialize(_profiles, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(_storagePath, json, Encoding.UTF8);
    }

    public async Task<List<SshProfile>> GetAllProfilesAsync()
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            return _profiles.OrderByDescending(p => p.LastConnectedAt).ThenBy(p => p.Name).ToList();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<SshProfile?> GetProfileByIdAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            return _profiles.FirstOrDefault(p => p.Id == id);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<SshProfile> SaveProfileAsync(SaveSshProfileRequest request)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            var profile = request.Profile;
            if (string.IsNullOrWhiteSpace(profile.Id))
            {
                profile.Id = Guid.NewGuid().ToString("N");
            }

            // Save secrets in DPAPI
            if (!string.IsNullOrEmpty(request.Password))
            {
                await _credentialService.SetSecretAsync($"ssh:{profile.Id}:password", request.Password);
                profile.HasPassword = true;
            }
            if (!string.IsNullOrEmpty(request.PrivateKeyContent))
            {
                await _credentialService.SetSecretAsync($"ssh:{profile.Id}:key", request.PrivateKeyContent);
                profile.HasPrivateKey = true;
            }
            if (!string.IsNullOrEmpty(request.KeyPassphrase))
            {
                await _credentialService.SetSecretAsync($"ssh:{profile.Id}:passphrase", request.KeyPassphrase);
            }

            var index = _profiles.FindIndex(p => p.Id == profile.Id);
            if (index >= 0)
            {
                _profiles[index] = profile;
            }
            else
            {
                _profiles.Add(profile);
            }

            await SaveAsync();
            return profile;
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
            if (removed)
            {
                await SaveAsync();
                await _credentialService.DeleteSecretAsync($"ssh:{id}:password");
                await _credentialService.DeleteSecretAsync($"ssh:{id}:key");
                await _credentialService.DeleteSecretAsync($"ssh:{id}:passphrase");
            }
            return removed;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<SshConnectionTestResult> TestConnectionAsync(string profileId)
    {
        var profile = await GetProfileByIdAsync(profileId);
        if (profile == null)
        {
            return new SshConnectionTestResult
            {
                Success = false,
                ErrorMessage = "Profile not found"
            };
        }

        var password = await _credentialService.GetSecretAsync($"ssh:{profile.Id}:password");
        var keyContent = await _credentialService.GetSecretAsync($"ssh:{profile.Id}:key");
        var passphrase = await _credentialService.GetSecretAsync($"ssh:{profile.Id}:passphrase");

        var req = new SaveSshProfileRequest
        {
            Profile = profile,
            Password = password,
            PrivateKeyContent = keyContent,
            KeyPassphrase = passphrase
        };

        return await TestDirectConnectionAsync(req);
    }

    public async Task<SshConnectionTestResult> TestDirectConnectionAsync(SaveSshProfileRequest request)
    {
        var profile = request.Profile;
        var sw = Stopwatch.StartNew();

        try
        {
            using var client = await CreateClientAsync(profile, request.Password, request.PrivateKeyContent, request.KeyPassphrase);
            client.ConnectionInfo.Timeout = TimeSpan.FromSeconds(5);

            await Task.Run(() => client.Connect());
            sw.Stop();

            var serverVersion = client.ConnectionInfo.ServerVersion;
            client.Disconnect();

            return new SshConnectionTestResult
            {
                Success = true,
                LatencyMs = sw.ElapsedMilliseconds,
                ServerVersion = serverVersion,
                Details = $"Successfully connected to {profile.Username}@{profile.Host}:{profile.Port}"
            };
        }
        catch (SshAuthenticationException ex)
        {
            sw.Stop();
            return new SshConnectionTestResult
            {
                Success = false,
                LatencyMs = sw.ElapsedMilliseconds,
                ErrorMessage = "Authentication failed. Please verify your username, password, or SSH key.",
                Details = ex.Message
            };
        }
        catch (SshConnectionException ex)
        {
            sw.Stop();
            return new SshConnectionTestResult
            {
                Success = false,
                LatencyMs = sw.ElapsedMilliseconds,
                ErrorMessage = $"Connection to {profile.Host}:{profile.Port} failed. Ensure the server is online and port {profile.Port} is reachable.",
                Details = ex.Message
            };
        }
        catch (Exception ex)
        {
            sw.Stop();
            return new SshConnectionTestResult
            {
                Success = false,
                LatencyMs = sw.ElapsedMilliseconds,
                ErrorMessage = $"Failed to connect: {ex.Message}",
                Details = ex.ToString()
            };
        }
    }

    public async Task<(SshClient Client, ShellStream ShellStream)> CreateInteractiveShellAsync(string profileId, int cols, int rows)
    {
        var profile = await GetProfileByIdAsync(profileId)
            ?? throw new InvalidOperationException($"SSH profile '{profileId}' not found");

        var password = await _credentialService.GetSecretAsync($"ssh:{profile.Id}:password");
        var keyContent = await _credentialService.GetSecretAsync($"ssh:{profile.Id}:key");
        var passphrase = await _credentialService.GetSecretAsync($"ssh:{profile.Id}:passphrase");

        var client = await CreateClientAsync(profile, password, keyContent, passphrase);
        client.ConnectionInfo.Timeout = TimeSpan.FromSeconds(10);
        await Task.Run(() => client.Connect());

        var termModes = new Dictionary<TerminalModes, uint>
        {
            { TerminalModes.ECHO, 1 }
        };

        var shellStream = client.CreateShellStream(
            "xterm-256color",
            (uint)Math.Max(cols, 10),
            (uint)Math.Max(rows, 5),
            800,
            600,
            8192,
            termModes);

        // Update last connected time
        profile.LastConnectedAt = DateTime.UtcNow;
        await SaveAsync();

        return (client, shellStream);
    }

    public async Task<List<RemoteFileItem>> SftpListDirectoryAsync(string profileId, string? path = null)
    {
        var profile = await GetProfileByIdAsync(profileId)
            ?? throw new InvalidOperationException($"SSH profile '{profileId}' not found");

        var connInfo = await GetConnectionInfoForProfileAsync(profile);
        return await Task.Run(() =>
        {
            using var sftp = new SftpClient(connInfo);
            sftp.Connect();

            var targetPath = string.IsNullOrWhiteSpace(path) ? sftp.WorkingDirectory : path;
            var entries = sftp.ListDirectory(targetPath);

            var result = new List<RemoteFileItem>();
            foreach (var entry in entries)
            {
                if (entry.Name == "." || entry.Name == "..") continue;

                result.Add(new RemoteFileItem
                {
                    Name = entry.Name,
                    Path = entry.FullName,
                    IsDirectory = entry.IsDirectory,
                    Size = entry.Length,
                    ModifiedTime = entry.LastWriteTimeUtc,
                    Permissions = entry.Attributes?.ToString()
                });
            }

            sftp.Disconnect();
            return result.OrderByDescending(r => r.IsDirectory).ThenBy(r => r.Name).ToList();
        });
    }

    public async Task<RemoteFileContent> SftpReadFileAsync(string profileId, string path)
    {
        var profile = await GetProfileByIdAsync(profileId)
            ?? throw new InvalidOperationException($"SSH profile '{profileId}' not found");

        var connInfo = await GetConnectionInfoForProfileAsync(profile);
        return await Task.Run(() =>
        {
            using var sftp = new SftpClient(connInfo);
            sftp.Connect();

            using var ms = new MemoryStream();
            sftp.DownloadFile(path, ms);
            var bytes = ms.ToArray();
            sftp.Disconnect();

            bool isBinary = bytes.Take(Math.Min(bytes.Length, 512)).Any(b => b == 0);
            string content;
            if (isBinary)
            {
                content = Convert.ToBase64String(bytes);
            }
            else
            {
                content = Encoding.UTF8.GetString(bytes);
            }

            return new RemoteFileContent
            {
                Path = path,
                Content = content,
                IsBinary = isBinary,
                Size = bytes.Length
            };
        });
    }

    public async Task<bool> SftpUploadFileAsync(string profileId, string remotePath, byte[] content)
    {
        var profile = await GetProfileByIdAsync(profileId)
            ?? throw new InvalidOperationException($"SSH profile '{profileId}' not found");

        var connInfo = await GetConnectionInfoForProfileAsync(profile);
        return await Task.Run(() =>
        {
            using var sftp = new SftpClient(connInfo);
            sftp.Connect();

            using var ms = new MemoryStream(content);
            sftp.UploadFile(ms, remotePath, canOverride: true);
            sftp.Disconnect();
            return true;
        });
    }

    public async Task<bool> SftpDeleteAsync(string profileId, string path, bool isDirectory)
    {
        var profile = await GetProfileByIdAsync(profileId)
            ?? throw new InvalidOperationException($"SSH profile '{profileId}' not found");

        var connInfo = await GetConnectionInfoForProfileAsync(profile);
        return await Task.Run(() =>
        {
            using var sftp = new SftpClient(connInfo);
            sftp.Connect();

            if (isDirectory)
            {
                sftp.DeleteDirectory(path);
            }
            else
            {
                sftp.DeleteFile(path);
            }

            sftp.Disconnect();
            return true;
        });
    }

    public async Task<bool> SftpCreateDirectoryAsync(string profileId, string path)
    {
        var profile = await GetProfileByIdAsync(profileId)
            ?? throw new InvalidOperationException($"SSH profile '{profileId}' not found");

        var connInfo = await GetConnectionInfoForProfileAsync(profile);
        return await Task.Run(() =>
        {
            using var sftp = new SftpClient(connInfo);
            sftp.Connect();
            sftp.CreateDirectory(path);
            sftp.Disconnect();
            return true;
        });
    }

    private async Task<ConnectionInfo> GetConnectionInfoForProfileAsync(SshProfile profile)
    {
        var password = await _credentialService.GetSecretAsync($"ssh:{profile.Id}:password");
        var keyContent = await _credentialService.GetSecretAsync($"ssh:{profile.Id}:key");
        var passphrase = await _credentialService.GetSecretAsync($"ssh:{profile.Id}:passphrase");

        return CreateConnectionInfo(profile, password, keyContent, passphrase);
    }

    private Task<SshClient> CreateClientAsync(SshProfile profile, string? password, string? keyContent, string? passphrase)
    {
        var connInfo = CreateConnectionInfo(profile, password, keyContent, passphrase);
        return Task.FromResult(new SshClient(connInfo));
    }

    private ConnectionInfo CreateConnectionInfo(SshProfile profile, string? password, string? keyContent, string? passphrase)
    {
        var authMethods = new List<AuthenticationMethod>();

        if (profile.AuthType == SshAuthType.Password && !string.IsNullOrEmpty(password))
        {
            authMethods.Add(new PasswordAuthenticationMethod(profile.Username, password));
        }
        else if (profile.AuthType is SshAuthType.PrivateKey or SshAuthType.KeyWithPassphrase)
        {
            PrivateKeyFile? pkFile = null;

            if (!string.IsNullOrWhiteSpace(keyContent))
            {
                using var ms = new MemoryStream(Encoding.UTF8.GetBytes(keyContent));
                pkFile = string.IsNullOrEmpty(passphrase)
                    ? new PrivateKeyFile(ms)
                    : new PrivateKeyFile(ms, passphrase);
            }
            else if (!string.IsNullOrWhiteSpace(profile.PrivateKeyPath) && File.Exists(profile.PrivateKeyPath))
            {
                pkFile = string.IsNullOrEmpty(passphrase)
                    ? new PrivateKeyFile(profile.PrivateKeyPath)
                    : new PrivateKeyFile(profile.PrivateKeyPath, passphrase);
            }

            if (pkFile != null)
            {
                authMethods.Add(new PrivateKeyAuthenticationMethod(profile.Username, pkFile));
            }
            else if (!string.IsNullOrEmpty(password))
            {
                authMethods.Add(new PasswordAuthenticationMethod(profile.Username, password));
            }
        }
        else if (!string.IsNullOrEmpty(password))
        {
            authMethods.Add(new PasswordAuthenticationMethod(profile.Username, password));
        }

        if (authMethods.Count == 0)
        {
            // Try default id_rsa / id_ed25519 if present
            var userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var defaultKeys = new[]
            {
                Path.Combine(userProfile, ".ssh", "id_ed25519"),
                Path.Combine(userProfile, ".ssh", "id_rsa")
            };

            foreach (var dk in defaultKeys)
            {
                if (File.Exists(dk))
                {
                    try
                    {
                        var pk = new PrivateKeyFile(dk);
                        authMethods.Add(new PrivateKeyAuthenticationMethod(profile.Username, pk));
                        break;
                    }
                    catch { }
                }
            }
        }

        if (authMethods.Count == 0)
        {
            throw new InvalidOperationException("No authentication method provided (password or private key is required).");
        }

        return new ConnectionInfo(profile.Host, profile.Port, profile.Username, authMethods.ToArray())
        {
            Timeout = TimeSpan.FromSeconds(10)
        };
    }
}
