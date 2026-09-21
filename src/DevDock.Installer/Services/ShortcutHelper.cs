using System.IO;

namespace DevDock.Installer.Services;

public static class ShortcutHelper
{
    public static bool CreateShortcut(string shortcutPath, string targetPath, string workingDirectory, string? iconLocation = null, string? description = null, string? arguments = null)
    {
        try
        {
            var dir = Path.GetDirectoryName(shortcutPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            Type? shellType = Type.GetTypeFromProgID("WScript.Shell");
            if (shellType == null) return false;

            dynamic? shell = Activator.CreateInstance(shellType);
            if (shell == null) return false;

            dynamic shortcut = shell.CreateShortcut(shortcutPath);
            shortcut.TargetPath = targetPath;
            shortcut.WorkingDirectory = workingDirectory;
            if (!string.IsNullOrEmpty(arguments)) shortcut.Arguments = arguments;
            if (!string.IsNullOrEmpty(iconLocation) && File.Exists(iconLocation)) shortcut.IconLocation = iconLocation;
            if (!string.IsNullOrEmpty(description)) shortcut.Description = description;
            shortcut.Save();
            return true;
        }
        catch
        {
            return false;
        }
    }
}
