# CappyCoder WPF — wersja desktopowa dla Windows (PowerShell)
# Uruchom:  powershell -ExecutionPolicy Bypass -File scripts\build-windows.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Brak Node.js. Zainstaluj Node.js 18+: https://nodejs.org' }

Write-Host '[1/3] Instaluję zależności...'
npm install --no-audit --no-fund; if ($LASTEXITCODE) { exit $LASTEXITCODE }
Write-Host '[2/3] Buduję dist\cappycoder-wpf.html...'
node tools\build.mjs; if ($LASTEXITCODE) { exit $LASTEXITCODE }
Write-Host '[3/3] Pakuję aplikację dla Windows...'
npx electron-builder --win --publish never; if ($LASTEXITCODE) { exit $LASTEXITCODE }
Write-Host "`nGotowe. Pliki są w folderze release\"
