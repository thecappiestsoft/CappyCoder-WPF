@echo off
rem CappyCoder WPF — wersja desktopowa dla Windows (uruchom na Windows 10/11)
rem Wynik w folderze release\:
rem   CappyCoder WPF Setup 1.0.0.exe       instalator (x64 + ARM64)
rem   CappyCoder WPF-1.0.0-portable.exe    wersja przenosna, bez instalacji
setlocal
chcp 65001 >nul
cd /d "%~dp0.."

where node >nul 2>nul || (echo Brak Node.js. Zainstaluj Node.js 18 lub nowszy: https://nodejs.org & exit /b 1)

echo [1/3] Instaluje zaleznosci...
call npm install --no-audit --no-fund || exit /b 1

echo [2/3] Buduje dist\cappycoder-wpf.html...
node tools\build.mjs || exit /b 1

echo [3/3] Pakuje aplikacje Electron dla Windows...
call npx electron-builder --win --publish never || exit /b 1

echo.
echo Gotowe. Pliki instalacyjne sa w folderze release\
explorer release
