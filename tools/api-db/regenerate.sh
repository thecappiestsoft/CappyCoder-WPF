#!/usr/bin/env bash
# Odświeża bazę API używaną przez IntelliSense i analizator (src/data/api.txt) z najnowszych plików dotnet/wpf i dotnet/runtime.
set -euo pipefail
cd "$(dirname "$0")"
python3 fetch_refs.py
python3 pack.py
echo "Teraz zbuduj aplikację ponownie: npm run build"
