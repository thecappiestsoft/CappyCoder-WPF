#!/usr/bin/env bash
# Uruchamia wersję desktopową bez pakowania (do pracy nad kodem). Na Windows: npm start
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d node_modules/electron ] || npm install --no-audit --no-fund
npm start
