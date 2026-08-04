#!/usr/bin/env bash
# GCE / Linux day-one smoke. Run from repo root:
#   bash scripts/gce-smoke.sh
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo "node required"; exit 1; }
node scripts/smoke.mjs
