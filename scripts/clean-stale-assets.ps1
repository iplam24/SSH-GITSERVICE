$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$assetsDir = Join-Path $root "dist\DevDock\wwwroot\assets"
$htmlFile = Join-Path $root "dist\DevDock\wwwroot\index.html"
if ((Test-Path $assetsDir) -and (Test-Path $htmlFile)) {
    $html = Get-Content $htmlFile -Raw
    $refs = @([regex]::Matches($html, "assets/([^""']+)") | ForEach-Object { $_.Groups[1].Value })
    Get-ChildItem $assetsDir -File | Where-Object { $refs -notcontains $_.Name } | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host ("  cleaned stale asset: " + $_.Name)
    }
}
