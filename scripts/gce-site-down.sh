#!/usr/bin/env bash
# Stop persistent Helix mini-site started by gce-site-up.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="${HELIX_SITE_DATA:-$ROOT/data/gce-site}"
APP_PORT="${APP_PORT:-18091}"
LISTEN_PORT="${LISTEN_PORT:-18085}"

kill_pidfile() {
  local f="$1"
  if [[ -f "$f" ]]; then
    local pid
    pid="$(cat "$f" || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      sleep 0.2
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$f"
  fi
}

kill_pidfile "$DATA/agent.pid"
kill_pidfile "$DATA/app.pid"
fuser -k "${LISTEN_PORT}/tcp" 2>/dev/null || true
fuser -k "${APP_PORT}/tcp" 2>/dev/null || true
rm -f "$DATA/status.json"
echo "GCE_SITE_DOWN_OK"
