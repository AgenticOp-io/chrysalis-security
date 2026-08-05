#!/usr/bin/env bash
# Thin Linux wrapper — canonical pack is scripts/gce-smoke.mjs
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo "node required"; exit 1; }
exec node scripts/gce-smoke.mjs
