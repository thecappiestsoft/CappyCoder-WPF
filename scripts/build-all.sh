#!/usr/bin/env bash
# CappyCoder WPF — buduje wszystko, co da się zbudować na tym systemie:
#   zawsze:   dist/cappycoder-wpf.html (pojedynczy plik)
#   Linux:    AppImage, .deb, .tar.gz   (+ Windows, jeśli zainstalowany jest wine)
#   macOS:    .dmg, .zip                (+ Linux; + Windows, jeśli zainstalowany jest wine)
# Wersję dla macOS można zbudować tylko na macOS (ograniczenie Apple).
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null 2>&1 || { echo "✖ Brak Node.js 18+: https://nodejs.org"; exit 1; }

npm install --no-audit --no-fund
node tools/build.mjs

TARGETS=()
case "$(uname -s)" in
  Darwin) TARGETS+=(--mac --linux) ;;
  Linux)  TARGETS+=(--linux) ;;
  *) echo "Na Windows użyj scripts\\build-windows.bat"; exit 0 ;;
esac
if command -v wine >/dev/null 2>&1 || command -v wine64 >/dev/null 2>&1; then TARGETS+=(--win); else echo "ℹ Pomijam Windows (brak wine). Zbuduj na Windows: scripts\\build-windows.bat"; fi

npx electron-builder "${TARGETS[@]}" --publish never
echo; echo "Gotowe. Pliki są w folderze release/"
