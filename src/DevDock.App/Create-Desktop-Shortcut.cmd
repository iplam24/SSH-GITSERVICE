@echo off
setlocal
echo Dang tao bieu tuong DevDock ngoai man hinh Desktop...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\DevDock.lnk'); $s.TargetPath = '%~dp0DevDock.App.exe'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0app.ico'; $s.Description = 'DevDock - Modern Developer Command Center'; $s.Save(); Write-Host 'Tao shortcut thanh cong tren Desktop!' -ForegroundColor Green"
echo Hoan tat!
timeout /t 2 >nul