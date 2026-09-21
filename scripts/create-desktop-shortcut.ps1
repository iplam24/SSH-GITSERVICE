# Create DevDock Desktop Shortcut with High-Res Icon
$desktop = [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory)
$shortcutPath = Join-Path $desktop "DevDock.lnk"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$targetExe = Join-Path $root "dist\DevDock\DevDock.App.exe"
$workingDir = Join-Path $root "dist\DevDock"
$iconPath = Join-Path $root "dist\DevDock\app.ico"

if (-not (Test-Path $targetExe)) {
    Write-Warning "DevDock.App.exe not found at $targetExe. Please build first."
    exit 1
}

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $targetExe
$Shortcut.WorkingDirectory = $workingDir
if (Test-Path $iconPath) {
    $Shortcut.IconLocation = $iconPath
}
$Shortcut.Description = "DevDock - Modern Developer Command Center"
$Shortcut.Save()

Write-Host "Desktop shortcut created successfully at: $shortcutPath" -ForegroundColor Green
