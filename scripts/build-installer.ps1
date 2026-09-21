# DevDock Automated Packaging Pipeline
# Generates both dist/DevDock portable app and dist/setup-devdock.exe standalone installer

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  DevDock Packaging & Installer Build Pipeline  " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Stop running instance to avoid file locks
$running = Get-Process -Name "DevDock.App", "setup-devdock" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "Closing running DevDock process ($($running.Id -join ', '))..." -ForegroundColor DarkYellow
    $running | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# 1. Build Frontend
Write-Host "`n[1/5] Building Frontend (React + TypeScript)..." -ForegroundColor Yellow
Push-Location "src/DevDock.Frontend"
try {
    npm run build
} finally {
    Pop-Location
}

# 2. Publish DevDock.App to dist/DevDock
Write-Host "`n[2/5] Publishing DevDock.App (Release win-x64)..." -ForegroundColor Yellow
$distDir = Join-Path $root "dist\DevDock"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

dotnet publish src/DevDock.App/DevDock.App.csproj -c Release -r win-x64 --self-contained false -o $distDir
if ($LASTEXITCODE -ne 0) { throw "dotnet publish DevDock.App failed." }

# 3. Create payload.zip for installer
Write-Host "`n[3/5] Compressing payload archive for standalone installer..." -ForegroundColor Yellow
$resDir = Join-Path $root "src\DevDock.Installer\Resources"
if (-not (Test-Path $resDir)) {
    New-Item -ItemType Directory -Path $resDir -Force | Out-Null
}

$payloadZip = Join-Path $resDir "payload.zip"
if (Test-Path $payloadZip) {
    Remove-Item $payloadZip -Force
}

Compress-Archive -Path "$distDir\*" -DestinationPath $payloadZip -CompressionLevel Optimal
$payloadSizeMb = [math]::Round(((Get-Item $payloadZip).Length / 1MB), 2)
Write-Host "Payload archive created: $payloadZip ($payloadSizeMb MB)" -ForegroundColor Green

# 4. Publish DevDock.Installer as standalone single-file setup-devdock.exe
Write-Host "`n[4/5] Compiling standalone setup-devdock.exe..." -ForegroundColor Yellow
$tempInstallerOut = Join-Path $root "dist\temp_installer"
if (Test-Path $tempInstallerOut) {
    Remove-Item $tempInstallerOut -Recurse -Force
}

dotnet publish src/DevDock.Installer/DevDock.Installer.csproj `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -o $tempInstallerOut

if ($LASTEXITCODE -ne 0) { throw "dotnet publish DevDock.Installer failed." }

$finalInstaller = Join-Path $root "dist\setup-devdock.exe"
if (Test-Path $finalInstaller) {
    Remove-Item $finalInstaller -Force
}

Copy-Item (Join-Path $tempInstallerOut "setup-devdock.exe") $finalInstaller -Force
Remove-Item $tempInstallerOut -Recurse -Force

# 5. Summary & Verification
Write-Host "`n[5/5] Verifying Artifacts..." -ForegroundColor Yellow
$installerItem = Get-Item $finalInstaller
$installerSizeMb = [math]::Round(($installerItem.Length / 1MB), 2)

Add-Type -AssemblyName System.Drawing
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($finalInstaller)

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL! 🎉" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "Portable App:    $distDir\DevDock.App.exe" -ForegroundColor White
Write-Host "Setup Installer: $finalInstaller ($installerSizeMb MB)" -ForegroundColor White
Write-Host "Embedded Icon:   $($icon.Width)x$($icon.Height) pixels" -ForegroundColor White
Write-Host "Ready for distribution!" -ForegroundColor Cyan
