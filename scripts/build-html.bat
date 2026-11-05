@echo off
rem CappyCoder WPF — buduje cala aplikacje do JEDNEGO pliku: dist\cappycoder-wpf.html
rem   scripts\build-html.bat          biblioteki wbudowane (dziala offline)
rem   scripts\build-html.bat --cdn    biblioteki z cdnjs (mniejszy plik)
setlocal
chcp 65001 >nul
cd /d "%~dp0.."

where node >nul 2>nul || (echo Brak Node.js. Zainstaluj Node.js 18 lub nowszy: https://nodejs.org & exit /b 1)

echo %* | findstr /C:"--cdn" >nul
if errorlevel 1 if not exist node_modules\codemirror (
  echo Instaluje biblioteki ^(npm install^)...
  call npm install --no-audit --no-fund || exit /b 1
)

node tools\build.mjs %*
if errorlevel 1 exit /b 1
echo Gotowe. Otworz plik dist\cappycoder-wpf.html w przegladarce.
