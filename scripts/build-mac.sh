#!/usr/bin/env bash
# CappyCoder WPF — wersja desktopowa dla macOS (uruchom na Macu: Intel lub Apple Silicon)
# Wynik w folderze release/:
#   CappyCoder WPF-1.0.0-universal.dmg        obraz instalacyjny (Intel + Apple Silicon)
#   CappyCoder WPF-1.0.0-universal-mac.zip    aplikacja .app w archiwum
#
# Aplikacja nie jest podpisana certyfikatem Apple. Przy pierwszym uruchomieniu: prawy przycisk → Otwórz.
# Podpisywanie: ustaw CSC_LINK / CSC_KEY_PASSWORD (certyfikat Developer ID) i usuń "identity": null z package.json.
set -euo pipefail
cd "$(dirname "$0")/.."

[ "$(uname -s)" = "Darwin" ] || { echo "✖ Wersję dla macOS trzeba budować na macOS (wymóg Apple: hdiutil, codesign)."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "✖ Brak Node.js. Zainstaluj: brew install node  albo  https://nodejs.org"; exit 1; }

echo "[1/3] Instaluję zależności…";        npm install --no-audit --no-fund
echo "[2/3] Buduję dist/cappycoder-wpf.html…"; node tools/build.mjs
echo "[3/3] Pakuję aplikację dla macOS…";   npx electron-builder --mac --publish never

echo; echo "Gotowe. Pliki są w folderze release/"
open release 2>/dev/null || true
