using System.Diagnostics;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using DevDock.Core.Models;
using DevDock.Core.Services;

namespace DevDock.Settings.Services;

public class DevOpsService : IDevOpsService
{
    private static readonly string HostsFilePath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.System),
        "drivers", "etc", "hosts");

    #region Win32 P/Invoke for TCP / UDP Tables

    private const int AF_INET = 2;
    private const int AF_INET6 = 23;
    private const int ERROR_INSUFFICIENT_BUFFER = 122;

    private enum TCP_TABLE_CLASS
    {
        TCP_TABLE_BASIC_LISTENER,
        TCP_TABLE_BASIC_CONNECTIONS,
        TCP_TABLE_BASIC_ALL,
        TCP_TABLE_OWNER_PID_LISTENER,
        TCP_TABLE_OWNER_PID_CONNECTIONS,
        TCP_TABLE_OWNER_PID_ALL,
        TCP_TABLE_OWNER_MODULE_LISTENER,
        TCP_TABLE_OWNER_MODULE_CONNECTIONS,
        TCP_TABLE_OWNER_MODULE_ALL
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MIB_TCPROW_OWNER_PID
    {
        public uint state;
        public uint localAddr;
        public uint localPort;
        public uint remoteAddr;
        public uint remotePort;
        public uint owningPid;
    }

    [DllImport("iphlpapi.dll", SetLastError = true)]
    private static extern uint GetExtendedTcpTable(
        IntPtr pTcpTable,
        ref int pdwSize,
        bool bOrder,
        int ulAf,
        TCP_TABLE_CLASS TableClass,
        uint reserved = 0);

    [DllImport("dnsapi.dll", EntryPoint = "DnsFlushResolverCache", SetLastError = true)]
    private static extern int DnsFlushResolverCache();

    #endregion

    #region 1. Port Inspector & Process Killer

    public async Task<List<PortListeningItem>> GetListeningPortsAsync()
    {
        var results = new List<PortListeningItem>();

        try
        {
            // Attempt Win32 Native P/Invoke
            results.AddRange(GetTcpListeningPortsFromWin32());
        }
        catch
        {
            // Fallback to netstat
            results.Clear();
        }

        if (results.Count == 0)
        {
            results = await GetListeningPortsFromNetstatAsync();
        }

        // Hydrate process details for unique PIDs
        var pidCache = new Dictionary<int, (string Name, string? Path, double MemoryMb, DateTime? StartTime)>();

        foreach (var item in results)
        {
            if (item.Pid <= 0)
            {
                item.ProcessName = item.Pid == 0 ? "System Idle Process" : "Unknown";
                continue;
            }

            if (!pidCache.TryGetValue(item.Pid, out var info))
            {
                info = ResolveProcessInfo(item.Pid);
                pidCache[item.Pid] = info;
            }

            item.ProcessName = info.Name;
            item.ProcessPath = info.Path;
            item.MemoryMb = info.MemoryMb;
            item.StartTime = info.StartTime;
        }

        return results
            .GroupBy(p => new { p.Port, p.Protocol, p.Pid })
            .Select(g => g.First())
            .OrderBy(p => p.Port)
            .ToList();
    }

    private static List<PortListeningItem> GetTcpListeningPortsFromWin32()
    {
        var list = new List<PortListeningItem>();
        int bufferSize = 0;

        // 1. IPv4 TCP Table
        uint ret = GetExtendedTcpTable(IntPtr.Zero, ref bufferSize, true, AF_INET, TCP_TABLE_CLASS.TCP_TABLE_OWNER_PID_ALL);
        if (ret == ERROR_INSUFFICIENT_BUFFER && bufferSize > 0)
        {
            IntPtr tcpTablePtr = Marshal.AllocHGlobal(bufferSize);
            try
            {
                ret = GetExtendedTcpTable(tcpTablePtr, ref bufferSize, true, AF_INET, TCP_TABLE_CLASS.TCP_TABLE_OWNER_PID_ALL);
                if (ret == 0)
                {
                    int numEntries = Marshal.ReadInt32(tcpTablePtr);
                    IntPtr rowPtr = IntPtr.Add(tcpTablePtr, sizeof(int));
                    int rowSize = Marshal.SizeOf<MIB_TCPROW_OWNER_PID>();

                    for (int i = 0; i < numEntries; i++)
                    {
                        var row = Marshal.PtrToStructure<MIB_TCPROW_OWNER_PID>(rowPtr);
                        rowPtr = IntPtr.Add(rowPtr, rowSize);

                        // State 2 = MIB_TCP_STATE_LISTEN
                        if (row.state == 2)
                        {
                            int port = ((int)(row.localPort & 0xFF) << 8) | ((int)(row.localPort >> 8) & 0xFF);
                            var ip = new IPAddress(row.localAddr).ToString();

                            list.Add(new PortListeningItem
                            {
                                Port = port,
                                Protocol = "TCP",
                                LocalAddress = ip,
                                Pid = (int)row.owningPid,
                                State = "LISTENING"
                            });
                        }
                    }
                }
            }
            finally
            {
                Marshal.FreeHGlobal(tcpTablePtr);
            }
        }

        return list;
    }

    private static async Task<List<PortListeningItem>> GetListeningPortsFromNetstatAsync()
    {
        var list = new List<PortListeningItem>();

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "netstat.exe",
                Arguments = "-ano -p tcp",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8
            };

            using var proc = Process.Start(psi);
            if (proc == null) return list;

            var output = await proc.StandardOutput.ReadToEndAsync();
            await proc.WaitForExitAsync();

            var lines = output.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            var regex = new Regex(@"^\s*(TCP|UDP)\s+(\S+):(\d+)\s+(\S+)\s+(\S+)\s+(\d+)\s*$", RegexOptions.IgnoreCase);

            foreach (var line in lines)
            {
                var match = regex.Match(line);
                if (match.Success)
                {
                    var proto = match.Groups[1].Value.ToUpperInvariant();
                    var addr = match.Groups[2].Value;
                    int port = int.Parse(match.Groups[3].Value);
                    var state = match.Groups[5].Value.ToUpperInvariant();
                    int pid = int.Parse(match.Groups[6].Value);

                    if (state == "LISTENING" || proto == "UDP")
                    {
                        list.Add(new PortListeningItem
                        {
                            Port = port,
                            Protocol = proto,
                            LocalAddress = addr,
                            Pid = pid,
                            State = state
                        });
                    }
                }
            }
        }
        catch { }

        return list;
    }

    private static (string Name, string? Path, double MemoryMb, DateTime? StartTime) ResolveProcessInfo(int pid)
    {
        try
        {
            if (pid == 4) return ("System", null, 0, null);

            using var p = Process.GetProcessById(pid);
            string name = p.ProcessName;
            string? path = null;
            double memMb = Math.Round(p.WorkingSet64 / (1024.0 * 1024.0), 1);
            DateTime? startTime = null;

            try { startTime = p.StartTime; } catch { }
            try { path = p.MainModule?.FileName; } catch { }

            return (name, path, memMb, startTime);
        }
        catch
        {
            return ($"PID {pid}", null, 0, null);
        }
    }

    public Task<KillProcessResult> KillProcessByPidAsync(int pid, bool force = true)
    {
        if (pid <= 4)
        {
            return Task.FromResult(new KillProcessResult
            {
                Success = false,
                Message = $"Không thể dừng tiến trình hệ thống quan trọng (PID: {pid}).",
                Pid = pid
            });
        }

        try
        {
            using var proc = Process.GetProcessById(pid);
            var name = proc.ProcessName;
            proc.Kill(entireProcessTree: true);

            return Task.FromResult(new KillProcessResult
            {
                Success = true,
                Message = $"Đã dừng tiến trình '{name}' (PID: {pid}) thành công.",
                Pid = pid
            });
        }
        catch (ArgumentException)
        {
            return Task.FromResult(new KillProcessResult
            {
                Success = true,
                Message = $"Tiến trình (PID: {pid}) đã kết thúc trước đó.",
                Pid = pid
            });
        }
        catch (Exception ex)
        {
            // Fallback to taskkill
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "taskkill.exe",
                    Arguments = $"/F /PID {pid} /T",
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using var p = Process.Start(psi);
                p?.WaitForExit(3000);

                if (p?.ExitCode == 0)
                {
                    return Task.FromResult(new KillProcessResult
                    {
                        Success = true,
                        Message = $"Đã dừng tiến trình (PID: {pid}) qua taskkill.",
                        Pid = pid
                    });
                }
            }
            catch { }

            return Task.FromResult(new KillProcessResult
            {
                Success = false,
                Message = $"Không thể dừng tiến trình (PID: {pid}): {ex.Message}. Vui lòng chạy DevDock với quyền Quản trị viên (Run as Administrator).",
                Pid = pid
            });
        }
    }

    #endregion

    #region 2. Windows Hosts File Manager

    public async Task<List<HostEntryItem>> GetHostEntriesAsync()
    {
        var entries = new List<HostEntryItem>();

        if (!File.Exists(HostsFilePath))
        {
            return entries;
        }

        try
        {
            var lines = await File.ReadAllLinesAsync(HostsFilePath, Encoding.UTF8);
            for (int i = 0; i < lines.Length; i++)
            {
                var line = lines[i].Trim();
                if (string.IsNullOrWhiteSpace(line)) continue;

                // Check if disabled entry: e.g. # [disabled] 127.0.0.1 example.com OR # 127.0.0.1 example.com
                bool isEnabled = true;
                string parseContent = line;

                if (line.StartsWith("#"))
                {
                    var uncommented = line.TrimStart('#', ' ');
                    if (uncommented.StartsWith("[disabled]", StringComparison.OrdinalIgnoreCase))
                    {
                        uncommented = uncommented.Substring("[disabled]".Length).Trim();
                        isEnabled = false;
                        parseContent = uncommented;
                    }
                    else
                    {
                        // Check if uncommented starts with an IP address
                        var tokens = uncommented.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                        if (tokens.Length >= 2 && IPAddress.TryParse(tokens[0], out _))
                        {
                            isEnabled = false;
                            parseContent = uncommented;
                        }
                        else
                        {
                            // Standard comment line, ignore
                            continue;
                        }
                    }
                }

                // Parse IP and Hostnames
                // Format: IP hostname1 hostname2 # comment
                string? comment = null;
                var commentIdx = parseContent.IndexOf('#');
                if (commentIdx >= 0)
                {
                    comment = parseContent.Substring(commentIdx + 1).Trim();
                    parseContent = parseContent.Substring(0, commentIdx).Trim();
                }

                var parts = parseContent.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 2 && IPAddress.TryParse(parts[0], out _))
                {
                    var ip = parts[0];
                    var hostnames = parts.Skip(1).ToList();
                    bool isDefault = hostnames.Any(h => h.Equals("localhost", StringComparison.OrdinalIgnoreCase) || h.Equals("loopback", StringComparison.OrdinalIgnoreCase));

                    entries.Add(new HostEntryItem
                    {
                        Id = Guid.NewGuid().ToString("N"),
                        IpAddress = ip,
                        Hostnames = hostnames,
                        Comment = comment,
                        IsEnabled = isEnabled,
                        LineNumber = i + 1,
                        IsSystemDefault = isDefault
                    });
                }
            }
        }
        catch { }

        return entries;
    }

    public async Task<bool> SaveHostEntriesAsync(List<HostEntryItem> entries, bool flushDns = true)
    {
        try
        {
            // 1. Create a backup before modifying
            await CreateHostsBackupAsync();

            // 2. Build the hosts file content
            var sb = new StringBuilder();
            sb.AppendLine("# DevDock Windows Hosts Configuration");
            sb.AppendLine($"# Generated on {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            sb.AppendLine("#");

            foreach (var entry in entries)
            {
                if (string.IsNullOrWhiteSpace(entry.IpAddress) || entry.Hostnames.Count == 0) continue;

                var line = $"{entry.IpAddress}\t{string.Join(" ", entry.Hostnames)}";
                if (!string.IsNullOrWhiteSpace(entry.Comment))
                {
                    line += $"\t# {entry.Comment}";
                }

                if (!entry.IsEnabled)
                {
                    sb.AppendLine($"# [disabled] {line}");
                }
                else
                {
                    sb.AppendLine(line);
                }
            }

            var newContent = sb.ToString();

            // 3. Write to hosts file
            try
            {
                await File.WriteAllTextAsync(HostsFilePath, newContent, Encoding.UTF8);
            }
            catch (UnauthorizedAccessException)
            {
                // Fallback: Use PowerShell elevated write if DevDock is running without admin
                var tempFile = Path.Combine(Path.GetTempPath(), $"hosts_devdock_{Guid.NewGuid():N}.tmp");
                await File.WriteAllTextAsync(tempFile, newContent, Encoding.UTF8);

                var psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = $"-NoProfile -ExecutionPolicy Bypass -Command \"Copy-Item -Path '{tempFile}' -Destination '{HostsFilePath}' -Force\"",
                    Verb = "runAs",
                    UseShellExecute = true,
                    CreateNoWindow = true
                };

                using var p = Process.Start(psi);
                p?.WaitForExit(5000);
                try { File.Delete(tempFile); } catch { }
            }

            if (flushDns)
            {
                await FlushDnsCacheAsync();
            }

            return true;
        }
        catch
        {
            return false;
        }
    }

    private static async Task CreateHostsBackupAsync()
    {
        try
        {
            if (!File.Exists(HostsFilePath)) return;

            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var backupDir = Path.Combine(appData, "DevDock", "hosts_backups");
            Directory.CreateDirectory(backupDir);

            var backupFile = Path.Combine(backupDir, $"hosts_{DateTime.Now:yyyyMMdd_HHmmss}.bak");
            var content = await File.ReadAllTextAsync(HostsFilePath, Encoding.UTF8);
            await File.WriteAllTextAsync(backupFile, content, Encoding.UTF8);

            // Keep only latest 15 backups
            var dirInfo = new DirectoryInfo(backupDir);
            var files = dirInfo.GetFiles("hosts_*.bak").OrderByDescending(f => f.CreationTime).Skip(15);
            foreach (var oldFile in files)
            {
                try { oldFile.Delete(); } catch { }
            }
        }
        catch { }
    }

    public Task<bool> FlushDnsCacheAsync()
    {
        try
        {
            // P/Invoke DnsFlushResolverCache
            int result = DnsFlushResolverCache();
            if (result != 0) return Task.FromResult(true);
        }
        catch { }

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "ipconfig.exe",
                Arguments = "/flushdns",
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var p = Process.Start(psi);
            p?.WaitForExit(3000);
            return Task.FromResult(p?.ExitCode == 0);
        }
        catch
        {
            return Task.FromResult(false);
        }
    }

    #endregion

    #region 3. Environment & .env Studio

    public Task<List<SystemEnvVariableItem>> GetEnvironmentVariablesAsync()
    {
        var list = new List<SystemEnvVariableItem>();

        void ProcessVars(System.Collections.IDictionary dict, string target)
        {
            foreach (System.Collections.DictionaryEntry entry in dict)
            {
                var name = entry.Key?.ToString() ?? "";
                var val = entry.Value?.ToString() ?? "";
                if (string.IsNullOrWhiteSpace(name)) continue;

                bool isPath = name.Equals("PATH", StringComparison.OrdinalIgnoreCase) ||
                              name.EndsWith("_PATH", StringComparison.OrdinalIgnoreCase) ||
                              name.Contains("PATH", StringComparison.OrdinalIgnoreCase);

                var item = new SystemEnvVariableItem
                {
                    Name = name,
                    Value = val,
                    Target = target,
                    IsPath = isPath
                };

                if (isPath)
                {
                    var split = val.Split(';', StringSplitOptions.RemoveEmptyEntries);
                    foreach (var pathPart in split)
                    {
                        var trimmed = pathPart.Trim();
                        bool exists = false;
                        string? err = null;

                        try
                        {
                            var expanded = Environment.ExpandEnvironmentVariables(trimmed);
                            exists = Directory.Exists(expanded) || File.Exists(expanded);
                            if (!exists) err = "Đường dẫn không tồn tại trên hệ thống";
                        }
                        catch (Exception ex)
                        {
                            err = ex.Message;
                        }

                        item.PathItems.Add(new EnvPathItem
                        {
                            Path = trimmed,
                            Exists = exists,
                            ErrorMessage = err
                        });
                    }
                }

                list.Add(item);
            }
        }

        try
        {
            // User variables
            var userDict = Environment.GetEnvironmentVariables(EnvironmentVariableTarget.User);
            ProcessVars(userDict, "User");

            // Machine variables
            var machineDict = Environment.GetEnvironmentVariables(EnvironmentVariableTarget.Machine);
            ProcessVars(machineDict, "Machine");
        }
        catch { }

        return Task.FromResult(list.OrderBy(x => x.Target).ThenBy(x => x.Name).ToList());
    }

    public Task<DotEnvCompareResult> CompareDotEnvAsync(string currentEnv, string exampleEnv)
    {
        var currentMap = ParseDotEnv(currentEnv);
        var exampleMap = ParseDotEnv(exampleEnv);

        var result = new DotEnvCompareResult();
        var allKeys = new HashSet<string>(currentMap.Keys, StringComparer.OrdinalIgnoreCase);
        allKeys.UnionWith(exampleMap.Keys);

        foreach (var key in allKeys.OrderBy(k => k))
        {
            bool inCurrent = currentMap.TryGetValue(key, out var curVal);
            bool inExample = exampleMap.TryGetValue(key, out var exVal);

            string status;
            if (!inCurrent && inExample)
            {
                status = "missing"; // Key has example but missing in current
                result.MissingKeysCount++;
            }
            else if (inCurrent && !inExample)
            {
                status = "extra"; // Key in current but not in example
                result.ExtraKeysCount++;
            }
            else if (curVal == exVal)
            {
                status = "matched";
            }
            else
            {
                status = "different_value";
            }

            result.DiffEntries.Add(new DotEnvKeyDiff
            {
                Key = key,
                CurrentValue = inCurrent ? curVal : null,
                ExampleValue = inExample ? exVal : null,
                Status = status
            });
        }

        result.TotalKeysCount = allKeys.Count;
        return Task.FromResult(result);
    }

    private static Dictionary<string, string> ParseDotEnv(string content)
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(content)) return map;

        var lines = content.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;

            var eqIdx = line.IndexOf('=');
            if (eqIdx > 0)
            {
                var key = line.Substring(0, eqIdx).Trim();
                var val = line.Substring(eqIdx + 1).Trim();

                // Strip outer quotes if any
                if ((val.StartsWith("\"") && val.EndsWith("\"")) || (val.StartsWith("'") && val.EndsWith("'")))
                {
                    if (val.Length >= 2)
                        val = val.Substring(1, val.Length - 2);
                }

                map[key] = val;
            }
        }

        return map;
    }

    #endregion
}
