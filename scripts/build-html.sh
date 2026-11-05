#!/usr/bin/env bash
# CappyCoder WPF — buduje całą aplikację do JEDNEGO pliku: dist/cappycoder-wpf.html
#   ./scripts/build-html.sh          biblioteki wbudowane (działa offline)
#   ./scripts/build-html.sh --cdn    biblioteki z cdnjs (mniejszy plik, potrzebny internet)
# Dodatkowe opcje są przekazywane do tools/build.mjs (np. --no-fonts, --out plik.html).
set -euo pipefail
cd "$(dirname "$0")/.."

command -v node >/dev/null 2>&1 || { echo "✖ Brak Node.js. Zainstaluj Node.js 18 lub nowszy: https://nodejs.org"; exit 1; }
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 18 ] || { echo "✖ Potrzebny Node.js 18+, masz $(node -v)"; exit 1; }

if [[ " $* " != *" --cdn "* ]] && [ ! -d node_modules/codemirror ]; then
  echo "→ Instaluję biblioteki (npm install)…"
  npm install --no-audit --no-fund
fi

node tools/build.mjs "$@"
echo "Gotowe. Otwórz plik dist/cappycoder-wpf.html w przeglądarce."
