using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Principal;
using DevDock.Core.Models;
using DevDock.Core.Services;
using Microsoft.Win32;

namespace DevDock.Settings.Services;

public class SetupService : ISetupService
{
    private readonly ISettingsService _settingsService;

    // Win32 broadcast for Environment changes so shells update immediately
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern IntPtr SendMessageTimeout(
        IntPtr hWnd,
        uint Msg,
        UIntPtr wParam,
        string lParam,
        uint fuFlags,
        uint uTimeout,
        out UIntPtr lpdwResult);

    private static readonly IntPtr HWND_BROADCAST = new(0xffff);
    private const uint WM_SETTINGCHANGE = 0x001A;
    private const uint SMTO_ABORTIFHUNG = 0x0002;

    public SetupService(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    private string GetAppDirectory() => AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
    private string GetAppExePath() => Path.Combine(GetAppDirectory(), "DevDock.App.exe");

    public async Task<SetupDiagnostics> GetDiagnosticsAsync()
    {
        var diag = new SetupDiagnostics
        {
            OsVersion = RuntimeInformation.OSDescription,
            Architecture = RuntimeInformation.ProcessArchitecture.ToString(),
            DotnetVersion = Environment.Version.ToString(),
            DotnetInstalled = true,
        };

        // Check Admin Role
        try
        {
            using var id = WindowsIdentity.GetCurrent();
            var principal = new WindowsPrincipal(id);
            diag.IsAdmin = principal.IsInRole(WindowsBuiltInRole.Administrator);
        }
        catch
        {
            diag.IsAdmin = false;
        }

        // Check Git CLI
        try
        {
            var (gitOut, _) = await RunProcessOutputAsync("git", "--version");
            diag.GitInstalled = !string.IsNullOrWhiteSpace(gitOut) && gitOut.Contains("git version");
            diag.GitVersion = gitOut.Trim();

            var (gitPath, _) = await RunProcessOutputAsync("where", "git");
            diag.GitPath = gitPath.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "";
        }
        catch
        {
            diag.GitInstalled = false;
        }

        // Check PowerShell
        try
        {
            var (pwshOut, _) = await RunProcessOutputAsync("pwsh", "-v");
            if (!string.IsNullOrWhiteSpace(pwshOut) && pwshOut.Contains("PowerShell"))
            {
                diag.PowershellInstalled = true;
                diag.PowershellVersion = pwshOut.Trim();
            }
            else
            {
                var winPsPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), @"WindowsPowerShell\v1.0\powershell.exe");
                if (File.Exists(winPsPath))
                {
                    diag.PowershellInstalled = true;
                    diag.PowershellVersion = "Windows PowerShell 5.1";
                }
                else
                {
                    diag.PowershellInstalled = false;
                    diag.PowershellVersion = "Chưa tìm thấy";
                }
            }
        }
        catch
        {
            diag.PowershellInstalled = false;
        }

        // Check WSL
        try
        {
            var sysDir = Environment.GetFolderPath(Environment.SpecialFolder.System);
            var wslPath = Path.Combine(sysDir, "wsl.exe");
            diag.WslInstalled = File.Exists(wslPath);
        }
        catch
        {
            diag.WslInstalled = false;
        }

        // Check SSH
        try
        {
            var (sshOut, _) = await RunProcessOutputAsync("ssh", "-V");
            diag.SshInstalled = true;
        }
        catch
        {
            var sysDir = Environment.GetFolderPath(Environment.SpecialFolder.System);
            diag.SshInstalled = File.Exists(Path.Combine(sysDir, "OpenSSH", "ssh.exe"));
        }

        // Check WebView2
        try
        {
            using var edgeKey = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}");
            var pv = edgeKey?.GetValue("pv")?.ToString();
            if (!string.IsNullOrEmpty(pv))
            {
                diag.Webview2Installed = true;
                diag.Webview2Version = pv;
            }
            else
            {
                diag.Webview2Installed = true;
                diag.Webview2Version = "System Evergreen Runtime";
            }
        }
        catch
        {
            diag.Webview2Installed = true;
            diag.Webview2Version = "Embedded";
        }

        return diag;
    }

    public Task<SystemIntegrationStatus> GetIntegrationStatusAsync()
    {
        var appDir = GetAppDirectory();
        var status = new SystemIntegrationStatus
        {
            AppDirectory = appDir
        };

        // Check PATH
        try
        {
            var userPath = Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.User) ?? "";
            var sysPath = Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.Machine) ?? "";
            var allPaths = $"{userPath};{sysPath}"
                .Split(';', StringSplitOptions.RemoveEmptyEntries)
                .Select(p => p.Trim().TrimEnd('\\'))
                .ToList();

            status.IsInPath = allPaths.Any(p => string.Equals(p, appDir, StringComparison.OrdinalIgnoreCase));
        }
        catch
        {
            status.IsInPath = false;
        }

        // Check Context Menu
        try
        {
            using var dirMenu = Registry.CurrentUser.OpenSubKey(@"Software\Classes\Directory\shell\DevDock");
            status.IsContextMenuRegistered = dirMenu != null;
        }
        catch
        {
            status.IsContextMenuRegistered = false;
        }

        // Check Startup
        try
        {
            using var runKey = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run");
            status.IsStartupRegistered = runKey?.GetValue("DevDock") != null;
        }
        catch
        {
            status.IsStartupRegistered = false;
        }

        // Check Protocol
        try
        {
            using var protoKey = Registry.CurrentUser.OpenSubKey(@"Software\Classes\devdock");
            status.IsProtocolRegistered = protoKey != null;
        }
        catch
        {
            status.IsProtocolRegistered = false;
        }

        return Task.FromResult(status);
    }

    public async Task<SetupActionResult> AddToPathAsync()
    {
        var appDir = GetAppDirectory();
        try
        {
            // Ensure devdock.cmd shim exists so typing 'devdock' or 'devdock .' works everywhere
            var cmdShimPath = Path.Combine(appDir, "devdock.cmd");
            var cmdContent = "@echo off\r\nstart \"\" \"%~dp0DevDock.App.exe\" %*\r\n";
            if (!File.Exists(cmdShimPath))
            {
                await File.WriteAllTextAsync(cmdShimPath, cmdContent);
            }

            var currentPath = Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.User) ?? "";
            var paths = currentPath.Split(';', StringSplitOptions.RemoveEmptyEntries)
                .Select(p => p.Trim())
                .ToList();

            if (!paths.Any(p => string.Equals(p.TrimEnd('\\'), appDir, StringComparison.OrdinalIgnoreCase)))
            {
                paths.Add(appDir);
                var updated = string.Join(";", paths);
                Environment.SetEnvironmentVariable("PATH", updated, EnvironmentVariableTarget.User);
                BroadcastEnvironmentChange();
            }

            var stat = await GetIntegrationStatusAsync();
            return new SetupActionResult
            {
                Success = true,
                Message = $"Đã thêm thành công '{appDir}' vào biến môi trường PATH người dùng. Giờ đây bạn có thể mở terminal và gõ 'devdock' bất kỳ lúc nào!",
                Status = stat
            };
        }
        catch (Exception ex)
        {
            return new SetupActionResult
            {
                Success = false,
                Message = $"Không thể cập nhật PATH: {ex.Message}"
            };
        }
    }

    public async Task<SetupActionResult> RemoveFromPathAsync()
    {
        var appDir = GetAppDirectory();
        try
        {
            var currentPath = Environment.GetEnvironmentVariable("PATH", EnvironmentVariableTarget.User) ?? "";
            var paths = currentPath.Split(';', StringSplitOptions.RemoveEmptyEntries)
                .Select(p => p.Trim())
                .Where(p => !string.Equals(p.TrimEnd('\\'), appDir, StringComparison.OrdinalIgnoreCase))
                .ToList();

            var updated = string.Join(";", paths);
            Environment.SetEnvironmentVariable("PATH", updated, EnvironmentVariableTarget.User);
            BroadcastEnvironmentChange();

            var stat = await GetIntegrationStatusAsync();
            return new SetupActionResult
            {
                Success = true,
                Message = "Đã xóa DevDock khỏi biến môi trường PATH.",
                Status = stat
            };
        }
        catch (Exception ex)
        {
            return new SetupActionResult { Success = false, Message = ex.Message };
        }
    }

    public async Task<SetupActionResult> RegisterContextMenuAsync()
    {
        var appExe = GetAppExePath();
        try
        {
            // 1. Right click on Folder
            using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\Directory\shell\DevDock"))
            {
                key.SetValue("", "Mở bằng DevDock");
                key.SetValue("Icon", $"\"{appExe}\"");
                using var cmdKey = key.CreateSubKey("command");
                cmdKey.SetValue("", $"\"{appExe}\" \"%V\"");
            }

            // 2. Right click inside Folder Background
            using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\Directory\Background\shell\DevDock"))
            {
                key.SetValue("", "Mở bằng DevDock");
                key.SetValue("Icon", $"\"{appExe}\"");
                using var cmdKey = key.CreateSubKey("command");
                cmdKey.SetValue("", $"\"{appExe}\" \"%V\"");
            }

            var stat = await GetIntegrationStatusAsync();
            return new SetupActionResult
            {
                Success = true,
                Message = "Đã tích hợp menu ngữ cảnh chuột phải Windows Explorer ('Mở bằng DevDock')!",
                Status = stat
            };
        }
        catch (Exception ex)
        {
            return new SetupActionResult { Success = false, Message = $"Lỗi đăng ký context menu: {ex.Message}" };
        }
    }

    public async Task<SetupActionResult> UnregisterContextMenuAsync()
    {
        try
        {
            Registry.CurrentUser.DeleteSubKeyTree(@"Software\Classes\Directory\shell\DevDock", false);
            Registry.CurrentUser.DeleteSubKeyTree(@"Software\Classes\Directory\Background\shell\DevDock", false);
            var stat = await GetIntegrationStatusAsync();
            return new SetupActionResult { Success = true, Message = "Đã gỡ bỏ menu ngữ cảnh Windows Explorer.", Status = stat };
        }
        catch (Exception ex)
        {
            return new SetupActionResult { Success = false, Message = ex.Message };
        }
    }

    public async Task<SetupActionResult> RegisterStartupAsync()
    {
        var appExe = GetAppExePath();
        try
        {
            using var runKey = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
            if (runKey != null)
            {
                runKey.SetValue("DevDock", $"\"{appExe}\" --minimized");
            }
            var stat = await GetIntegrationStatusAsync();
            return new SetupActionResult { Success = true, Message = "Đã cấu hình DevDock khởi động cùng Windows (chạy nền trên khay hệ thống).", Status = stat };
        }
        catch (Exception ex)
        {
            return new SetupActionResult { Success = false, Message = ex.Message };
        }
    }

    public async Task<SetupActionResult> UnregisterStartupAsync()
    {
        try
        {
            using var runKey = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true);
            runKey?.DeleteValue("DevDock", false);
            var stat = await GetIntegrationStatusAsync();
            return new SetupActionResult { Success = true, Message = "Đã tắt khởi động cùng Windows.", Status = stat };
        }
        catch (Exception ex)
        {
            return new SetupActionResult { Success = false, Message = ex.Message };
        }
    }

    public async Task<SetupActionResult> RegisterProtocolHandlerAsync()
    {
        var appExe = GetAppExePath();
        try
        {
            using var key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\devdock");
            key.SetValue("", "URL:DevDock Protocol");
            key.SetValue("URL Protocol", "");
            using var iconKey = key.CreateSubKey("DefaultIcon");
            iconKey.SetValue("", $"\"{appExe}\",0");
            using var cmdKey = key.CreateSubKey(@"shell\open\command");
            cmdKey.SetValue("", $"\"{appExe}\" \"%1\"");

            var stat = await GetIntegrationStatusAsync();
            return new SetupActionResult { Success = true, Message = "Đã đăng ký giao thức 'devdock://' thành công!", Status = stat };
        }
        catch (Exception ex)
        {
            return new SetupActionResult { Success = false, Message = ex.Message };
        }
    }

    public async Task<SetupActionResult> ApplySetupAsync(ApplySetupRequest request)
    {
        // 1. Path
        if (request.AddToPath)
        {
            await AddToPathAsync();
        }

        // 2. Context menu
        if (request.RegisterContextMenu)
        {
            await RegisterContextMenuAsync();
        }

        // 3. Startup
        if (request.RunAtStartup)
        {
            await RegisterStartupAsync();
        }
        else
        {
            await UnregisterStartupAsync();
        }

        // 4. Protocol
        if (request.RegisterProtocol)
        {
            await RegisterProtocolHandlerAsync();
        }

        // 5. Update settings
        var settings = await _settingsService.GetSettingsAsync();
        settings.Language = request.Language;
        settings.Theme = request.Theme;
        settings.AccentColor = request.AccentColor;
        settings.DefaultShell = request.DefaultShell;
        settings.HasCompletedSetup = true;
        settings.AddToPath = request.AddToPath;
        settings.RunAtStartup = request.RunAtStartup;
        settings.RegisterContextMenu = request.RegisterContextMenu;
        await _settingsService.SaveSettingsAsync(settings);

        var finalStat = await GetIntegrationStatusAsync();
        return new SetupActionResult
        {
            Success = true,
            Message = "Cài đặt & Tích hợp Windows hoàn tất! DevDock đã sẵn sàng phục vụ quy trình lập trình của bạn.",
            Status = finalStat
        };
    }

    private void BroadcastEnvironmentChange()
    {
        try
        {
            SendMessageTimeout(HWND_BROADCAST, WM_SETTINGCHANGE, UIntPtr.Zero, "Environment", SMTO_ABORTIFHUNG, 1000, out _);
        }
        catch { }
    }

    private static async Task<(string stdout, string stderr)> RunProcessOutputAsync(string fileName, string args)
    {
        try
        {
            using var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = fileName,
                    Arguments = args,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };

            process.Start();
            var outTask = process.StandardOutput.ReadToEndAsync();
            var errTask = process.StandardError.ReadToEndAsync();
            var exitTask = process.WaitForExitAsync();

            if (await Task.WhenAny(exitTask, Task.Delay(3000)) != exitTask)
            {
                try { process.Kill(); } catch { }
            }

            return (await outTask, await errTask);
        }
        catch
        {
            return ("", "");
        }
    }
}
