#!/usr/bin/env bash
# CappyCoder WPF — wersja desktopowa dla Linuksa (uruchom na Linuksie x64)
# Wynik w folderze release/:
#   CappyCoder WPF-1.0.0.AppImage     uruchamia się na większości dystrybucji (chmod +x, potem dwuklik)
#   cappycoder-wpf_1.0.0_amd64.deb    pakiet dla Debiana/Ubuntu/Minta (sudo apt install ./plik.deb)
#   cappycoder-wpf-1.0.0.tar.gz       archiwum do rozpakowania w dowolnym miejscu
set -euo pipefail
cd "$(dirname "$0")/.."

command -v node >/dev/null 2>&1 || { echo "✖ Brak Node.js 18+. Np.: sudo apt install nodejs npm  albo  https://nodejs.org"; exit 1; }

echo "[1/3] Instaluję zależności…";        npm install --no-audit --no-fund
echo "[2/3] Buduję dist/cappycoder-wpf.html…"; node tools/build.mjs
echo "[3/3] Pakuję aplikację dla Linuksa…"; npx electron-builder --linux --publish never "$@"

echo; echo "Gotowe. Pliki są w folderze release/"
