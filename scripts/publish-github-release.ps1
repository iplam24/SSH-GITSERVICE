# DevDock 1-Click GitHub Release Publisher
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/publish-github-release.ps1 -Version "v1.5.0"
#
param(
    [Parameter(Mandatory = $false)]
    [string]$Version = "v1.5.0",

    [Parameter(Mandatory = $false)]
    [string]$Title = "DevDock Workstation $Version",

    [Parameter(Mandatory = $false)]
    [string]$Notes = "Bản phát hành chính thức của DevDock Workstation dành cho Windows x64. Tải setup-devdock.exe để cài đặt hoặc DevDock-portable-win-x64.zip để chạy ngay."
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  DevDock 1-Click GitHub Release Publisher       " -ForegroundColor Cyan
Write-Host "  Target Release: $Version                       " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# 1. Check for GitHub CLI (gh)
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghInstalled) {
    Write-Host "`n[Cảnh báo] Chưa tìm thấy công cụ GitHub CLI ('gh')." -ForegroundColor Yellow
    Write-Host "Bạn có 2 lựa chọn:" -ForegroundColor White
    Write-Host "  1. Cài GitHub CLI: winget install GitHub.cli" -ForegroundColor Cyan
    Write-Host "  2. Hoặc đóng gói offline rồi kéo thả file lên GitHub web." -ForegroundColor Cyan
    
    $runBuildOnly = Read-Host "Bạn có muốn tiếp tục build file cài đặt offline ngay không? (Y/N)"
    if ($runBuildOnly -notmatch "^[yY]$") {
        Write-Host "Đã hủy thao tác." -ForegroundColor DarkGray
        exit 0
    }
}

# 2. Run Packaging Pipeline
Write-Host "`n[1/3] Khởi chạy đóng gói bộ cài đặt..." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot "build-installer.ps1")

# 3. Verify Artifacts
$distDir = Join-Path $root "dist"
$installerPath = Join-Path $distDir "setup-devdock.exe"
$portablePath = Join-Path $distDir "DevDock-portable-win-x64.zip"
$checksumPath = Join-Path $distDir "checksums.txt"

if (-not (Test-Path $installerPath)) {
    throw "Không tìm thấy file installer: $installerPath"
}

Write-Host "`n[2/3] Các file phát hành đã sẵn sàng:" -ForegroundColor Green
Get-ChildItem -Path $installerPath, $portablePath, $checksumPath | Select-Object Name, @{Name="Kích Thước (MB)"; Expression={[math]::Round($_.Length/1MB, 2)}} | Format-Table -AutoSize

# 4. Publish via GitHub CLI if available
if ($ghInstalled) {
    Write-Host "`n[3/3] Đang tải lên và tạo Release trên GitHub ($Version)..." -ForegroundColor Yellow
    
    try {
        gh release create $Version $installerPath $portablePath $checksumPath `
            --title $Title `
            --notes $Notes
        
        Write-Host "`n================================================" -ForegroundColor Green
        Write-Host "  XUẤT BẢN RELEASE LÊN GITHUB THÀNH CÔNG! 🚀   " -ForegroundColor Green
        Write-Host "================================================" -ForegroundColor Green
        Write-Host "Xem release tại: gh release view $Version --web" -ForegroundColor Cyan
    } catch {
        Write-Host "`nLỗi khi tải lên bằng GitHub CLI: $_" -ForegroundColor Red
        Write-Host "Gợi ý: Hãy đăng nhập GitHub CLI trước bằng lệnh: gh auth login" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n================================================" -ForegroundColor Green
    Write-Host "  ĐÓNG GÓI HOÀN TẤT! (SẴN SÀNG UPLOAD THỦ CÔNG)  " -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "Các bước upload lên GitHub Web:" -ForegroundColor White
    Write-Host "  1. Mở trình duyệt vào repo GitHub của bạn" -ForegroundColor Cyan
    Write-Host "  2. Bấm mục Releases -> 'Draft a new release'" -ForegroundColor Cyan
    Write-Host "  3. Đặt tag '$Version' và kéo thả các file trong thư mục: $distDir" -ForegroundColor Cyan
    Write-Host "  4. Bấm 'Publish release'!" -ForegroundColor Cyan
}
