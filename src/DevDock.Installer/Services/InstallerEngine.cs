using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace DevDock.Installer.Services;

public class InstallOptions
{
    public string InstallPath { get; set; } = InstallerEngine.GetDefaultInstallPath();
    public bool CreateDesktopShortcut { get; set; } = true;
    public bool CreateStartMenuShortcut { get; set; } = true;
    public bool AddToPath { get; set; } = true;
    public bool AddContextMenu { get; set; } = true;
    public bool LaunchAfterInstall { get; set; } = true;
}

public class InstallerEngine
{
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern IntPtr SendMessageTimeout(
        IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
        uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);

    private const uint WM_SETTINGCHANGE = 0x001A;
    private const uint SMTO_ABORTIFHUNG = 0x0002;
    private static readonly IntPtr HWND_BROADCAST = new(0xffff);

    public static string GetDefaultInstallPath()
    {
        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "DevDock");
    }

    public async Task<bool> InstallAsync(InstallOptions options, Action<string, double> onProgress)
    {
        return await Task.Run(() =>
        {
            try
            {
                onProgress("Đang chuẩn bị thư mục cài đặt...", 10);
                Directory.CreateDirectory(options.InstallPath);

                // Step 1: Extract payload
                onProgress("Đang giải nén các tệp ứng dụng...", 25);
                ExtractPayload(options.InstallPath, onProgress);

                // Step 2: Ensure devdock.cmd exists in install dir
                var exePath = Path.Combine(options.InstallPath, "DevDock.App.exe");
                var icoPath = Path.Combine(options.InstallPath, "app.ico");
                var cmdPath = Path.Combine(options.InstallPath, "devdock.cmd");
                File.WriteAllText(cmdPath, $"@echo off\r\nstart \"\" \"%~dp0DevDock.App.exe\" %*\r\n");

                // Step 3: Desktop Shortcut
                if (options.CreateDesktopShortcut)
                {
                    onProgress("Đang tạo biểu tượng Desktop...", 65);
                    var desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    var shortcutFile = Path.Combine(desktopPath, "DevDock.lnk");
                    ShortcutHelper.CreateShortcut(shortcutFile, exePath, options.InstallPath, icoPath, "DevDock — Developer Command Center");
                }

                // Step 4: Start Menu Shortcut
                if (options.CreateStartMenuShortcut)
                {
                    onProgress("Đang tạo lối tắt Start Menu...", 75);
                    var startMenuDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");
                    var shortcutFile = Path.Combine(startMenuDir, "DevDock.lnk");
                    ShortcutHelper.CreateShortcut(shortcutFile, exePath, options.InstallPath, icoPath, "DevDock — Developer Command Center");
                }

                // Step 5: PATH Environment Variable
                if (options.AddToPath)
                {
                    onProgress("Đang cấu hình biến môi trường PATH...", 85);
                    AddPathToUserEnvironment(options.InstallPath);
                }

                // Step 6: Explorer Context Menu
                if (options.AddContextMenu)
                {
                    onProgress("Đang đăng ký menu chuột phải Windows Explorer...", 92);
                    RegisterContextMenu(options.InstallPath, exePath, icoPath);
                }

                // Step 7: Register Add/Remove Programs
                RegisterUninstall(options.InstallPath, exePath, icoPath);

                // Step 8: Generate uninstall.cmd
                GenerateUninstallScript(options.InstallPath);

                onProgress("Cài đặt thành công! 🎉", 100);
                return true;
            }
            catch (Exception ex)
            {
                onProgress($"Lỗi cài đặt: {ex.Message}", 0);
                return false;
            }
        });
    }

    private void ExtractPayload(string targetDir, Action<string, double> onProgress)
    {
        var asm = Assembly.GetExecutingAssembly();
        using var stream = asm.GetManifestResourceStream("DevDock.Installer.Resources.payload.zip");

        if (stream != null)
        {
            using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
            int total = archive.Entries.Count;
            int current = 0;

            foreach (var entry in archive.Entries)
            {
                current++;
                if (string.IsNullOrEmpty(entry.Name))
                {
                    // Directory entry
                    Directory.CreateDirectory(Path.Combine(targetDir, entry.FullName));
                    continue;
                }

                var dest = Path.Combine(targetDir, entry.FullName);
                Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
                entry.ExtractToFile(dest, overwrite: true);

                double percent = 25 + ((double)current / Math.Max(total, 1) * 35);
                onProgress($"Đang giải nén: {entry.Name}", percent);
            }
        }
        else
        {
            // Dev fallback: copy from adjacent dist directory if running unbundled
            var baseDir = AppDomain.CurrentDomain.BaseDirectory;
            var candidateDist = Path.GetFullPath(Path.Combine(baseDir, @"..\..\..\..\..\dist\DevDock"));
            if (Directory.Exists(candidateDist))
            {
                CopyDirectory(candidateDist, targetDir);
            }
            else
            {
                throw new FileNotFoundException("Không tìm thấy tệp gói ứng dụng payload.zip được nhúng.");
            }
        }
    }

    private static void CopyDirectory(string sourceDir, string targetDir)
    {
        Directory.CreateDirectory(targetDir);
        foreach (var file in Directory.GetFiles(sourceDir))
        {
            File.Copy(file, Path.Combine(targetDir, Path.GetFileName(file)), true);
        }
        foreach (var sub in Directory.GetDirectories(sourceDir))
        {
            CopyDirectory(sub, Path.Combine(targetDir, Path.GetFileName(sub)));
        }
    }

    private static void AddPathToUserEnvironment(string pathToAdd)
    {
        try
        {
            using var envKey = Registry.CurrentUser.OpenSubKey("Environment", writable: true);
            if (envKey == null) return;

            var current = envKey.GetValue("Path", "", RegistryValueOptions.DoNotExpandEnvironmentNames) as string ?? "";
            var parts = current.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            if (!parts.Any(p => string.Equals(p, pathToAdd, StringComparison.OrdinalIgnoreCase)))
            {
                var updated = string.IsNullOrEmpty(current) ? pathToAdd : $"{current};{pathToAdd}";
                envKey.SetValue("Path", updated, RegistryValueKind.ExpandString);

                // Broadcast WM_SETTINGCHANGE
                SendMessageTimeout(HWND_BROADCAST, WM_SETTINGCHANGE, UIntPtr.Zero, "Environment", SMTO_ABORTIFHUNG, 2000, out _);
            }
        }
        catch { }
    }

    private static void RegisterContextMenu(string installDir, string exePath, string icoPath)
    {
        try
        {
            // 1. Directory Background
            using var bgKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\Directory\Background\shell\DevDock");
            bgKey.SetValue("", "Mở bằng DevDock");
            if (File.Exists(icoPath)) bgKey.SetValue("Icon", icoPath);
            using (var cmd = bgKey.CreateSubKey("command"))
            {
                cmd.SetValue("", $"\"{exePath}\" \"%V\"");
            }

            // 2. Directory Folder
            using var dirKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\Directory\shell\DevDock");
            dirKey.SetValue("", "Mở bằng DevDock");
            if (File.Exists(icoPath)) dirKey.SetValue("Icon", icoPath);
            using (var cmd = dirKey.CreateSubKey("command"))
            {
                cmd.SetValue("", $"\"{exePath}\" \"%1\"");
            }
        }
        catch { }
    }

    private static void RegisterUninstall(string installPath, string exePath, string icoPath)
    {
        try
        {
            using var uninstKey = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\DevDock");
            uninstKey.SetValue("DisplayName", "DevDock — Modern Developer Command Center");
            uninstKey.SetValue("DisplayVersion", "1.0.0");
            uninstKey.SetValue("Publisher", "DevDock Team");
            if (File.Exists(icoPath)) uninstKey.SetValue("DisplayIcon", icoPath);
            uninstKey.SetValue("InstallLocation", installPath);
            uninstKey.SetValue("UninstallString", $"\"{Path.Combine(installPath, "uninstall.cmd")}\"");
            uninstKey.SetValue("NoModify", 1, RegistryValueKind.DWord);
            uninstKey.SetValue("NoRepair", 1, RegistryValueKind.DWord);
        }
        catch { }
    }

    private static void GenerateUninstallScript(string installPath)
    {
        try
        {
            var desktopShortcut = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "DevDock.lnk");
            var startShortcut = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "DevDock.lnk");

            var script = $@"@echo off
title Go cai dat DevDock
echo Dang go cai dat DevDock khoi he thong...

taskkill /f /im DevDock.App.exe >nul 2>&1

if exist ""{desktopShortcut}"" del /f /q ""{desktopShortcut}""
if exist ""{startShortcut}"" del /f /q ""{startShortcut}""

reg delete ""HKCU\Software\Classes\Directory\Background\shell\DevDock"" /f >nul 2>&1
reg delete ""HKCU\Software\Classes\Directory\shell\DevDock"" /f >nul 2>&1
reg delete ""HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\DevDock"" /f >nul 2>&1

echo DevDock da duoc go cai dat thanh cong.
pause
";
            File.WriteAllText(Path.Combine(installPath, "uninstall.cmd"), script);
        }
        catch { }
    }
}
