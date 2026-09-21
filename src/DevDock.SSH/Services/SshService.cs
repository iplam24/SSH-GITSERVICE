using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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

    // =========================================================================
    // 1. GENERIC COMMAND EXECUTION
    // =========================================================================
    public async Task<SshCommandResult> ExecuteCommandAsync(string profileId, string command, int timeoutSeconds = 60)
    {
        var profile = await GetProfileByIdAsync(profileId)
            ?? throw new InvalidOperationException($"SSH profile '{profileId}' not found");

        var connInfo = await GetConnectionInfoForProfileAsync(profile);
        var sw = Stopwatch.StartNew();

        try
        {
            using var client = new SshClient(connInfo);
            client.ConnectionInfo.Timeout = TimeSpan.FromSeconds(Math.Min(timeoutSeconds, 15));
            await Task.Run(() => client.Connect());

            using var cmd = client.CreateCommand(command);
            cmd.CommandTimeout = TimeSpan.FromSeconds(timeoutSeconds);

            var output = await Task.Run(() => cmd.Execute());
            sw.Stop();

            client.Disconnect();
            return new SshCommandResult
            {
                Success = cmd.ExitStatus == 0,
                ExitCode = cmd.ExitStatus ?? -1,
                Output = output ?? string.Empty,
                Error = cmd.Error ?? string.Empty,
                ExecutionTimeMs = sw.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            sw.Stop();
            return new SshCommandResult
            {
                Success = false,
                ExitCode = -1,
                Output = string.Empty,
                Error = ex.Message,
                ExecutionTimeMs = sw.ElapsedMilliseconds
            };
        }
    }

    // =========================================================================
    // 2. SERVER OVERVIEW & TELEMETRY
    // =========================================================================
    public async Task<SshServerOverview> GetServerOverviewAsync(string profileId)
    {
        var script = @"
echo '===OS==='
cat /etc/os-release 2>/dev/null | grep '^PRETTY_NAME=' | cut -d= -f2 | tr -d '""' || uname -sr
echo '===UPTIME==='
uptime -p 2>/dev/null || uptime
echo '===MEM==='
free -m 2>/dev/null
echo '===DISK==='
df -h / 2>/dev/null
echo '===CPU==='
cat /proc/loadavg 2>/dev/null
echo '===UFW==='
ufw status numbered 2>/dev/null || echo 'inactive'
";
        var res = await ExecuteCommandAsync(profileId, script, 15);
        var overview = new SshServerOverview();
        if (!res.Success && string.IsNullOrEmpty(res.Output))
        {
            overview.OsName = "Unknown (Failed to query)";
            return overview;
        }

        var text = res.Output;
        var osMatch = Regex.Match(text, @"===OS===\s*\r?\n([^\r\n]+)");
        if (osMatch.Success) overview.OsName = osMatch.Groups[1].Value.Trim();

        var uptimeMatch = Regex.Match(text, @"===UPTIME===\s*\r?\n([^\r\n]+)");
        if (uptimeMatch.Success) overview.Uptime = uptimeMatch.Groups[1].Value.Trim();

        var memMatch = Regex.Match(text, @"Mem:\s+(\d+)\s+(\d+)");
        if (memMatch.Success)
        {
            long.TryParse(memMatch.Groups[1].Value, out var total);
            long.TryParse(memMatch.Groups[2].Value, out var used);
            overview.MemTotalMb = total;
            overview.MemUsedMb = used;
        }

        var diskMatch = Regex.Match(text, @"/\s*\r?\n\S+\s+(\S+)\s+(\S+)\s+\S+\s+(\d+%)\s+/");
        if (!diskMatch.Success)
        {
            diskMatch = Regex.Match(text, @"\S+\s+(\S+)\s+(\S+)\s+\S+\s+(\d+%)\s+/");
        }
        if (diskMatch.Success)
        {
            overview.DiskTotal = diskMatch.Groups[1].Value;
            overview.DiskUsed = diskMatch.Groups[2].Value;
            overview.DiskPercent = diskMatch.Groups[3].Value;
        }

        var cpuMatch = Regex.Match(text, @"===CPU===\s*\r?\n([^\r\n]+)");
        if (cpuMatch.Success)
        {
            var parts = cpuMatch.Groups[1].Value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 3)
            {
                overview.CpuUsage = $"Load: {parts[0]} (1m) / {parts[1]} (5m) / {parts[2]} (15m)";
            }
        }

        var ufwSection = Regex.Match(text, @"===UFW===\s*\r?\n([\s\S]+)");
        if (ufwSection.Success)
        {
            var ufwText = ufwSection.Groups[1].Value;
            overview.UfwActive = ufwText.Contains("Status: active", StringComparison.OrdinalIgnoreCase);
            var lines = ufwText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var l in lines)
            {
                var trimmed = l.Trim();
                if (trimmed.StartsWith("[") && trimmed.Contains("ALLOW"))
                {
                    overview.UfwRules.Add(trimmed);
                }
            }
        }

        return overview;
    }

    // =========================================================================
    // 3. PORTS & PROCESS INSPECTION
    // =========================================================================
    public async Task<List<SshListeningPortItem>> GetListeningPortsAsync(string profileId)
    {
        var cmd = "ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null";
        var res = await ExecuteCommandAsync(profileId, cmd, 15);
        var list = new List<SshListeningPortItem>();
        if (string.IsNullOrWhiteSpace(res.Output)) return list;

        var lines = res.Output.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        foreach (var line in lines)
        {
            if (line.StartsWith("Netid") || line.StartsWith("Active") || line.StartsWith("Proto")) continue;

            var proto = line.StartsWith("udp", StringComparison.OrdinalIgnoreCase) ? "udp" : "tcp";

            var addrMatch = Regex.Match(line, @"\s([^\s:]+):(?<port>\d+)\s+");
            if (!addrMatch.Success) continue;

            if (!int.TryParse(addrMatch.Groups["port"].Value, out var port)) continue;
            var localAddr = addrMatch.Groups[1].Value + ":" + port;

            string procName = "system";
            int pid = 0;

            var ssMatch = Regex.Match(line, @"users:\(\(""(?<name>[^""]+)""(?:,pid=(?<pid>\d+))?");
            if (ssMatch.Success)
            {
                procName = ssMatch.Groups["name"].Value;
                int.TryParse(ssMatch.Groups["pid"].Value, out pid);
            }
            else
            {
                var netstatMatch = Regex.Match(line, @"(?<pid>\d+)/(?<name>[^\s]+)");
                if (netstatMatch.Success)
                {
                    procName = netstatMatch.Groups["name"].Value;
                    int.TryParse(netstatMatch.Groups["pid"].Value, out pid);
                }
            }

            list.Add(new SshListeningPortItem
            {
                Protocol = proto,
                LocalAddress = localAddr,
                Port = port,
                State = "LISTEN",
                ProcessName = procName,
                Pid = pid
            });
        }

        return list
            .GroupBy(p => p.Port)
            .Select(g => g.OrderByDescending(p => p.Pid).First())
            .OrderBy(p => p.Port)
            .ToList();
    }

    public async Task<bool> KillProcessAsync(string profileId, int pid, bool force = true)
    {
        if (pid <= 1) return false;
        var cmd = force ? $"kill -9 {pid}" : $"kill {pid}";
        var res = await ExecuteCommandAsync(profileId, cmd, 10);
        return res.Success;
    }

    public async Task<List<SshProcessItem>> GetProcessesAsync(string profileId)
    {
        var script = @"
echo '===SYSTEMD==='
systemctl list-units --type=service --state=running,failed --no-pager --no-legend 2>/dev/null | awk '{print $1 ""|||"" $3 ""|||"" $4}'
echo '===PM2==='
pm2 jlist 2>/dev/null || echo 'NO_PM2'
";
        var res = await ExecuteCommandAsync(profileId, script, 15);
        var result = new List<SshProcessItem>();
        if (string.IsNullOrWhiteSpace(res.Output)) return result;

        var pm2Match = Regex.Match(res.Output, @"===PM2===\s*\r?\n([\s\S]+)");
        if (pm2Match.Success)
        {
            var pm2Json = pm2Match.Groups[1].Value.Trim();
            if (!pm2Json.StartsWith("NO_PM2") && pm2Json.StartsWith("["))
            {
                try
                {
                    using var doc = JsonDocument.Parse(pm2Json);
                    foreach (var el in doc.RootElement.EnumerateArray())
                    {
                        var name = el.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                        var pmId = el.TryGetProperty("pm_id", out var id) ? id.ToString() : "";
                        var status = "unknown";
                        if (el.TryGetProperty("pm2_env", out var env) && env.TryGetProperty("status", out var st))
                        {
                            status = st.GetString() ?? "unknown";
                        }
                        string cpu = "";
                        string memory = "";
                        if (el.TryGetProperty("monit", out var monit))
                        {
                            if (monit.TryGetProperty("cpu", out var c)) cpu = $"{c.GetDouble():F1}%";
                            if (monit.TryGetProperty("memory", out var m)) memory = $"{(m.GetInt64() / (1024 * 1024))} MB";
                        }

                        result.Add(new SshProcessItem
                        {
                            Type = "pm2",
                            Name = name,
                            Id = pmId,
                            Status = status,
                            Cpu = cpu,
                            Memory = memory
                        });
                    }
                }
                catch { }
            }
        }

        var sysMatch = Regex.Match(res.Output, @"===SYSTEMD===\s*\r?\n([\s\S]+?)(?:===PM2===|$)");
        if (sysMatch.Success)
        {
            var lines = sysMatch.Groups[1].Value.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var line in lines)
            {
                var parts = line.Split(new[] { "|||" }, StringSplitOptions.None);
                if (parts.Length >= 2)
                {
                    var unit = parts[0].Trim();
                    var active = parts[1].Trim();
                    result.Add(new SshProcessItem
                    {
                        Type = "systemd",
                        Name = unit,
                        Id = unit,
                        Status = active
                    });
                }
            }
        }

        return result;
    }

    public async Task<SshCommandResult> ProcessActionAsync(string profileId, string type, string processNameOrId, string action)
    {
        string cmd;
        if (type == "pm2")
        {
            if (action == "logs")
            {
                cmd = $"pm2 logs {processNameOrId} --lines 100 --nostream 2>/dev/null";
            }
            else
            {
                cmd = $"pm2 {action} {processNameOrId}";
            }
        }
        else
        {
            if (action == "logs")
            {
                cmd = $"journalctl -u {processNameOrId} -n 100 --no-pager 2>/dev/null";
            }
            else
            {
                cmd = $"systemctl {action} {processNameOrId}";
            }
        }

        return await ExecuteCommandAsync(profileId, cmd, 30);
    }

    public async Task<SshCommandResult> CreateSystemdServiceAsync(string profileId, string serviceName, string execStart, string workingDir, string user, string? envVars)
    {
        var cleanName = Regex.Replace(serviceName, @"[^a-zA-Z0-9_\-]", "");
        if (string.IsNullOrWhiteSpace(cleanName)) cleanName = "myapp";
        var fileName = $"/etc/systemd/system/{cleanName}.service";

        var sb = new StringBuilder();
        sb.AppendLine("[Unit]");
        sb.AppendLine($"Description=DevDock Managed Service - {cleanName}");
        sb.AppendLine("After=network.target");
        sb.AppendLine();
        sb.AppendLine("[Service]");
        sb.AppendLine("Type=simple");
        sb.AppendLine($"User={user}");
        sb.AppendLine($"WorkingDirectory={workingDir}");
        sb.AppendLine($"ExecStart={execStart}");
        sb.AppendLine("Restart=always");
        sb.AppendLine("RestartSec=5");

        if (!string.IsNullOrWhiteSpace(envVars))
        {
            foreach (var env in envVars.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
            {
                sb.AppendLine($"Environment=\"{env.Trim()}\"");
            }
        }

        sb.AppendLine();
        sb.AppendLine("[Install]");
        sb.AppendLine("WantedBy=multi-user.target");

        var contentBytes = Encoding.UTF8.GetBytes(sb.ToString());
        await SftpUploadFileAsync(profileId, fileName, contentBytes);

        var activateCmd = $"systemctl daemon-reload && systemctl enable {cleanName} && systemctl start {cleanName}";
        var res = await ExecuteCommandAsync(profileId, activateCmd, 20);

        var profile = await GetProfileByIdAsync(profileId);
        if (profile != null && !profile.Metadata.TrackedSystemdServices.Contains(cleanName + ".service"))
        {
            profile.Metadata.TrackedSystemdServices.Add(cleanName + ".service");
            await SaveAsync();
        }

        return res;
    }

    // =========================================================================
    // 4. NGINX VIRTUAL HOSTS & REVERSE PROXY
    // =========================================================================
    public async Task<SshCommandResult> GetNginxStatusAsync(string profileId)
    {
        var cmd = "which nginx && systemctl is-active nginx 2>&1 && nginx -v 2>&1";
        return await ExecuteCommandAsync(profileId, cmd, 10);
    }

    public async Task<List<SshNginxSiteItem>> GetNginxSitesAsync(string profileId)
    {
        var script = @"
for f in /etc/nginx/sites-available/*; do
  if [ -f ""$f"" ]; then
    name=$(basename ""$f"")
    enabled=0
    if [ -L ""/etc/nginx/sites-enabled/$name"" ] || [ -f ""/etc/nginx/sites-enabled/$name"" ]; then
      enabled=1
    fi
    echo ""===SITE===$name===$enabled===$f""
    cat ""$f""
  fi
done
for f in /etc/nginx/conf.d/*.conf; do
  if [ -f ""$f"" ]; then
    name=$(basename ""$f"")
    echo ""===SITE===$name===1===$f""
    cat ""$f""
  fi
done
";
        var res = await ExecuteCommandAsync(profileId, script, 15);
        var sites = new List<SshNginxSiteItem>();
        if (string.IsNullOrWhiteSpace(res.Output)) return sites;

        var chunks = res.Output.Split(new[] { "===SITE===" }, StringSplitOptions.RemoveEmptyEntries);
        foreach (var chunk in chunks)
        {
            var headerEnd = chunk.IndexOf('\n');
            if (headerEnd <= 0) continue;
            var header = chunk.Substring(0, headerEnd).Trim();
            var content = chunk.Substring(headerEnd + 1);

            var meta = header.Split(new[] { "===" }, StringSplitOptions.None);
            if (meta.Length >= 3)
            {
                var name = meta[0];
                var isEnabled = meta[1] == "1";
                var path = meta[2];

                var site = new SshNginxSiteItem
                {
                    Name = name,
                    IsEnabled = isEnabled,
                    ConfigPath = path,
                    RawContent = content,
                    IsSslEnabled = content.Contains("ssl_certificate") || content.Contains("443 ssl")
                };

                var snMatch = Regex.Match(content, @"server_name\s+([^;]+);");
                if (snMatch.Success)
                {
                    site.DomainNames = snMatch.Groups[1].Value
                        .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                        .Where(d => d != "_")
                        .ToList();
                }

                var ppMatch = Regex.Match(content, @"proxy_pass\s+(https?://[^\s;]+);");
                if (ppMatch.Success)
                {
                    var uriStr = ppMatch.Groups[1].Value;
                    if (Uri.TryCreate(uriStr, UriKind.Absolute, out var uri))
                    {
                        site.ProxyPassHost = uri.Scheme + "://" + uri.Host;
                        site.ProxyPassPort = uri.Port;
                    }
                }

                sites.Add(site);
            }
        }

        return sites;
    }

    public async Task<SshCommandResult> SaveNginxSiteAsync(string profileId, SshNginxSaveRequest req)
    {
        var cleanSiteName = Regex.Replace(req.SiteName, @"[^a-zA-Z0-9_\-\.]", "");
        if (string.IsNullOrWhiteSpace(cleanSiteName)) cleanSiteName = "default-site";

        var domains = string.IsNullOrWhiteSpace(req.DomainNames) ? "_" : req.DomainNames.Trim();
        var sb = new StringBuilder();
        sb.AppendLine("server {");
        sb.AppendLine("    listen 80;");
        sb.AppendLine($"    server_name {domains};");
        sb.AppendLine($"    client_max_body_size {req.MaxBodySizeMb};");
        sb.AppendLine();

        if (req.IsSpaStatic && !string.IsNullOrWhiteSpace(req.StaticRootPath))
        {
            sb.AppendLine($"    root {req.StaticRootPath.TrimEnd('/')};");
            sb.AppendLine("    index index.html index.htm;");
            sb.AppendLine();
            sb.AppendLine("    location / {");
            sb.AppendLine("        try_files $uri $uri/ /index.html;");
            sb.AppendLine("    }");
        }
        else if (req.ProxyPassPort.HasValue && req.ProxyPassPort.Value > 0)
        {
            var host = string.IsNullOrWhiteSpace(req.ProxyPassHost) ? "http://127.0.0.1" : req.ProxyPassHost.TrimEnd('/');
            var target = $"{host}:{req.ProxyPassPort.Value}";

            sb.AppendLine("    location / {");
            sb.AppendLine($"        proxy_pass {target};");
            sb.AppendLine("        proxy_http_version 1.1;");
            if (req.EnableWebSocket)
            {
                sb.AppendLine("        proxy_set_header Upgrade $http_upgrade;");
                sb.AppendLine("        proxy_set_header Connection \"upgrade\";");
            }
            sb.AppendLine("        proxy_set_header Host $host;");
            sb.AppendLine("        proxy_set_header X-Real-IP $remote_addr;");
            sb.AppendLine("        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;");
            sb.AppendLine("        proxy_set_header X-Forwarded-Proto $scheme;");
            sb.AppendLine("        proxy_cache_bypass $http_upgrade;");
            sb.AppendLine("    }");
        }

        if (!string.IsNullOrWhiteSpace(req.CustomDirectives))
        {
            sb.AppendLine();
            sb.AppendLine("    # Custom Directives");
            sb.AppendLine($"    {req.CustomDirectives.Trim()}");
        }

        sb.AppendLine("}");

        var remoteFilePath = $"/etc/nginx/sites-available/{cleanSiteName}";
        var contentBytes = Encoding.UTF8.GetBytes(sb.ToString());
        await SftpUploadFileAsync(profileId, remoteFilePath, contentBytes);

        var cmd = $"mkdir -p /etc/nginx/sites-enabled && ln -sf {remoteFilePath} /etc/nginx/sites-enabled/{cleanSiteName} && nginx -t 2>&1";
        var testRes = await ExecuteCommandAsync(profileId, cmd, 15);

        if (!testRes.Success)
        {
            await ExecuteCommandAsync(profileId, $"rm -f /etc/nginx/sites-enabled/{cleanSiteName}", 10);
            return new SshCommandResult
            {
                Success = false,
                ExitCode = testRes.ExitCode,
                Output = testRes.Output,
                Error = $"Nginx syntax test failed: {testRes.Output} {testRes.Error}"
            };
        }

        var reloadRes = await ExecuteCommandAsync(profileId, "systemctl reload nginx 2>&1", 10);

        var profile = await GetProfileByIdAsync(profileId);
        if (profile != null)
        {
            var domainList = domains.Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(d => d != "_");
            foreach (var d in domainList)
            {
                var existing = profile.Metadata.Domains.FirstOrDefault(dm => dm.Domain.Equals(d, StringComparison.OrdinalIgnoreCase));
                if (existing == null)
                {
                    profile.Metadata.Domains.Add(new SshDomainItem
                    {
                        Domain = d,
                        NginxSiteName = cleanSiteName,
                        TargetPort = req.ProxyPassPort
                    });
                }
                else
                {
                    existing.NginxSiteName = cleanSiteName;
                    existing.TargetPort = req.ProxyPassPort;
                }
            }
            await SaveAsync();
        }

        return reloadRes;
    }

    public async Task<SshCommandResult> ToggleNginxSiteAsync(string profileId, string siteName, bool enable)
    {
        var cmd = enable
            ? $"ln -sf /etc/nginx/sites-available/{siteName} /etc/nginx/sites-enabled/{siteName} && nginx -t && systemctl reload nginx"
            : $"rm -f /etc/nginx/sites-enabled/{siteName} && nginx -t && systemctl reload nginx";
        return await ExecuteCommandAsync(profileId, cmd, 15);
    }

    public async Task<SshCommandResult> DeleteNginxSiteAsync(string profileId, string siteName)
    {
        var cmd = $"rm -f /etc/nginx/sites-enabled/{siteName} /etc/nginx/sites-available/{siteName} && nginx -t && systemctl reload nginx";
        var res = await ExecuteCommandAsync(profileId, cmd, 15);

        var profile = await GetProfileByIdAsync(profileId);
        if (profile != null)
        {
            profile.Metadata.Domains.RemoveAll(d => d.NginxSiteName == siteName);
            await SaveAsync();
        }

        return res;
    }

    public async Task<SshCommandResult> ReloadNginxAsync(string profileId)
    {
        return await ExecuteCommandAsync(profileId, "nginx -t && systemctl reload nginx", 15);
    }

    public async Task<string> GetNginxLogsAsync(string profileId, string logType, int lines = 100)
    {
        var file = logType == "error" ? "/var/log/nginx/error.log" : "/var/log/nginx/access.log";
        var res = await ExecuteCommandAsync(profileId, $"tail -n {lines} {file} 2>/dev/null", 10);
        return res.Output;
    }

    // =========================================================================
    // 5. CERTBOT SSL & LET'S ENCRYPT
    // =========================================================================
    public async Task<List<SshCertbotCertificateItem>> GetCertbotCertificatesAsync(string profileId)
    {
        var res = await ExecuteCommandAsync(profileId, "certbot certificates 2>/dev/null", 15);
        var certs = new List<SshCertbotCertificateItem>();
        if (string.IsNullOrWhiteSpace(res.Output)) return certs;

        var blocks = Regex.Split(res.Output, @"Certificate Name:\s+");
        foreach (var b in blocks.Skip(1))
        {
            var domMatch = Regex.Match(b, @"Domains:\s+([^\r\n]+)");
            var expMatch = Regex.Match(b, @"Expiry Date:\s+([^\r\n(]+)(?:\(VALID:\s+(\d+)\s+days\))?");
            var certMatch = Regex.Match(b, @"Certificate Path:\s+([^\r\n]+)");

            if (domMatch.Success)
            {
                var domains = domMatch.Groups[1].Value.Trim();
                var expDate = expMatch.Success ? expMatch.Groups[1].Value.Trim() : "";
                int daysRemaining = 0;
                if (expMatch.Groups[2].Success)
                {
                    int.TryParse(expMatch.Groups[2].Value, out daysRemaining);
                }

                certs.Add(new SshCertbotCertificateItem
                {
                    DomainName = domains,
                    ExpiryDate = expDate,
                    CertificatePath = certMatch.Success ? certMatch.Groups[1].Value.Trim() : "",
                    DaysRemaining = daysRemaining
                });
            }
        }

        return certs;
    }

    public async Task<SshCommandResult> InstallCertbotAsync(string profileId)
    {
        var cmd = "apt-get update -y && apt-get install -y certbot python3-certbot-nginx 2>&1 || (dnf install -y certbot python3-certbot-nginx 2>&1 || yum install -y certbot python3-certbot-nginx 2>&1)";
        return await ExecuteCommandAsync(profileId, cmd, 120);
    }

    public async Task<SshCommandResult> IssueCertbotSslAsync(string profileId, string domain, string email)
    {
        var cleanEmail = string.IsNullOrWhiteSpace(email) ? "admin@" + domain : email.Trim();
        var cmd = $"certbot --nginx -d {domain} --non-interactive --agree-tos -m {cleanEmail} --redirect 2>&1";
        var res = await ExecuteCommandAsync(profileId, cmd, 90);

        if (res.Success)
        {
            var profile = await GetProfileByIdAsync(profileId);
            if (profile != null)
            {
                var d = profile.Metadata.Domains.FirstOrDefault(dm => dm.Domain.Equals(domain, StringComparison.OrdinalIgnoreCase));
                if (d != null)
                {
                    d.HasSsl = true;
                    d.SslExpiry = DateTime.UtcNow.AddDays(90).ToString("yyyy-MM-dd");
                }
                else
                {
                    profile.Metadata.Domains.Add(new SshDomainItem
                    {
                        Domain = domain,
                        HasSsl = true,
                        SslExpiry = DateTime.UtcNow.AddDays(90).ToString("yyyy-MM-dd")
                    });
                }
                await SaveAsync();
            }
        }

        return res;
    }

    // =========================================================================
    // 6. DOMAINS VERIFICATION
    // =========================================================================
    public async Task<List<SshDomainItem>> CheckDomainsAsync(string profileId, List<string> domains)
    {
        var profile = await GetProfileByIdAsync(profileId)
            ?? throw new InvalidOperationException($"SSH profile '{profileId}' not found");

        var result = new List<SshDomainItem>();
        var serverHost = profile.Host.Trim();

        foreach (var d in domains.Distinct())
        {
            var item = new SshDomainItem { Domain = d };
            try
            {
                var addresses = await Dns.GetHostAddressesAsync(d);
                var ip = addresses.FirstOrDefault()?.ToString();
                item.ResolvedIp = ip;
                item.IsPointingToThisServer = !string.IsNullOrEmpty(ip) &&
                    (ip == serverHost || serverHost == "localhost" || serverHost == "127.0.0.1");
            }
            catch
            {
                item.ResolvedIp = null;
                item.IsPointingToThisServer = false;
            }

            var matched = profile.Metadata.Domains.FirstOrDefault(dm => dm.Domain.Equals(d, StringComparison.OrdinalIgnoreCase));
            if (matched != null)
            {
                item.HasSsl = matched.HasSsl;
                item.SslExpiry = matched.SslExpiry;
                item.NginxSiteName = matched.NginxSiteName;
                item.TargetPort = matched.TargetPort;
            }

            result.Add(item);
        }

        return result;
    }

    // =========================================================================
    // 7. GIT DEPLOYMENTS ON SERVER
    // =========================================================================
    public async Task<SshCommandResult> GitCloneOnServerAsync(string profileId, string repoUrl, string targetDir, string branch)
    {
        var b = string.IsNullOrWhiteSpace(branch) ? "main" : branch.Trim();
        var cmd = $"mkdir -p $(dirname \"{targetDir}\") && git clone -b {b} {repoUrl} \"{targetDir}\" 2>&1";
        var res = await ExecuteCommandAsync(profileId, cmd, 90);

        if (res.Success)
        {
            var profile = await GetProfileByIdAsync(profileId);
            if (profile != null)
            {
                var name = Path.GetFileName(targetDir.TrimEnd('/'));
                if (string.IsNullOrEmpty(name)) name = "git-app";

                var item = new SshGitDeploymentItem
                {
                    Name = name,
                    RepoUrl = repoUrl,
                    TargetPath = targetDir,
                    Branch = b,
                    LastPulledAt = DateTime.UtcNow
                };

                try
                {
                    var st = await GetServerGitStatusAsync(profileId, targetDir);
                    item.LastCommitHash = st.LastCommitHash;
                    item.LastCommitMessage = st.LastCommitMessage;
                }
                catch { }

                profile.Metadata.GitDeployments.RemoveAll(g => g.TargetPath == targetDir);
                profile.Metadata.GitDeployments.Add(item);
                await SaveAsync();
            }
        }

        return res;
    }

    public async Task<SshCommandResult> GitPullOnServerAsync(string profileId, string targetDir, string? branch, string? postDeployCommand)
    {
        var b = string.IsNullOrWhiteSpace(branch) ? "main" : branch.Trim();
        var cmd = $"cd \"{targetDir}\" && git fetch origin && git checkout {b} && git pull origin {b} 2>&1";
        if (!string.IsNullOrWhiteSpace(postDeployCommand))
        {
            cmd += $" && {postDeployCommand}";
        }

        var res = await ExecuteCommandAsync(profileId, cmd, 120);

        var profile = await GetProfileByIdAsync(profileId);
        if (profile != null)
        {
            var item = profile.Metadata.GitDeployments.FirstOrDefault(g => g.TargetPath == targetDir);
            if (item != null)
            {
                item.LastPulledAt = DateTime.UtcNow;
                try
                {
                    var st = await GetServerGitStatusAsync(profileId, targetDir);
                    item.LastCommitHash = st.LastCommitHash;
                    item.LastCommitMessage = st.LastCommitMessage;
                }
                catch { }
                await SaveAsync();
            }
        }

        return res;
    }

    public async Task<SshGitDeploymentItem> GetServerGitStatusAsync(string profileId, string targetDir)
    {
        var cmd = $"cd \"{targetDir}\" && git branch --show-current && git log -1 --format=\"%H|||%s\" 2>/dev/null";
        var res = await ExecuteCommandAsync(profileId, cmd, 10);
        var item = new SshGitDeploymentItem { TargetPath = targetDir };

        if (!string.IsNullOrWhiteSpace(res.Output))
        {
            var lines = res.Output.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length >= 1) item.Branch = lines[0].Trim();
            if (lines.Length >= 2)
            {
                var commitParts = lines[1].Split(new[] { "|||" }, StringSplitOptions.None);
                if (commitParts.Length >= 2)
                {
                    item.LastCommitHash = commitParts[0].Trim();
                    item.LastCommitMessage = commitParts[1].Trim();
                }
            }
        }

        return item;
    }

    // =========================================================================
    // 8. METADATA PERSISTENCE
    // =========================================================================
    public async Task<SshServerMetadata> GetServerMetadataAsync(string profileId)
    {
        var profile = await GetProfileByIdAsync(profileId)
            ?? throw new InvalidOperationException($"SSH profile '{profileId}' not found");
        return profile.Metadata;
    }

    public async Task<bool> SaveServerMetadataAsync(string profileId, SshServerMetadata metadata)
    {
        await _lock.WaitAsync();
        try
        {
            await EnsureLoadedAsync();
            var profile = _profiles.FirstOrDefault(p => p.Id == profileId);
            if (profile == null) return false;

            profile.Metadata = metadata;
            await SaveAsync();
            return true;
        }
        finally
        {
            _lock.Release();
        }
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
