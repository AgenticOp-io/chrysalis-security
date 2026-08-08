#!/usr/bin/env bash
# Persistent mini-site behind helix-agent on GCE (high ports).
# App: 127.0.0.1:APP_PORT  ·  Helix public: 0.0.0.0:LISTEN_PORT
# Default app: fixtures/real-site (Northline catalog)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="${HELIX_SITE_DATA:-$ROOT/data/gce-site}"
APP_PORT="${APP_PORT:-18091}"
LISTEN_PORT="${LISTEN_PORT:-18085}"
MODE="${MODE:-enforce}"
EXTERNAL_IP="${EXTERNAL_IP:-}"
APP_SCRIPT="${APP_SCRIPT:-fixtures/real-site/server.mjs}"
APP_ID="${APP_ID:-gce-real-site}"

mkdir -p "$DATA"
OBSERVE="$DATA/observations.ndjson"
DRAFT="$DATA/draft.dna.json"
CERT="$DATA/certified.dna.json"
APP_LOG="$DATA/app.log"
AGENT_LOG="$DATA/agent.log"
APP_PID="$DATA/app.pid"
AGENT_PID="$DATA/agent.pid"

kill_pidfile() {
  local f="$1"
  if [[ -f "$f" ]]; then
    local pid
    pid="$(cat "$f" || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      sleep 0.3
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$f"
  fi
}

echo "=== gce-site-up: stop previous ==="
kill_pidfile "$AGENT_PID"
kill_pidfile "$APP_PID"
# Prior enforce agent can linger and answer with empty DNA (403 on learn probes)
pkill -f "helix-agent.mjs" 2>/dev/null || true
pkill -f "fixtures/real-site/server.mjs" 2>/dev/null || true
pkill -f "fixtures/static-site/server.mjs" 2>/dev/null || true
sudo fuser -k "${APP_PORT}/tcp" 2>/dev/null || fuser -k "${APP_PORT}/tcp" 2>/dev/null || true
sudo fuser -k "${LISTEN_PORT}/tcp" 2>/dev/null || fuser -k "${LISTEN_PORT}/tcp" 2>/dev/null || true
sleep 1
for i in $(seq 1 20); do
  if ! ss -ltn | grep -q ":${LISTEN_PORT} "; then
    break
  fi
  sudo fuser -k "${LISTEN_PORT}/tcp" 2>/dev/null || fuser -k "${LISTEN_PORT}/tcp" 2>/dev/null || true
  sleep 0.25
done

echo "=== start app (${APP_SCRIPT}) on 127.0.0.1:${APP_PORT} ==="
cd "$ROOT"
PORT="$APP_PORT" HOST=127.0.0.1 nohup node "$APP_SCRIPT" \
  >"$APP_LOG" 2>&1 &
echo $! >"$APP_PID"

for i in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null; then break; fi
  sleep 0.15
done
curl -sf "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null

learn_and_promote() {
  echo "=== learn via helix-agent on :${LISTEN_PORT} ==="
  : >"$OBSERVE"
  LISTEN_HOST=0.0.0.0 LISTEN_PORT="$LISTEN_PORT" \
    APP_UPSTREAM="http://127.0.0.1:${APP_PORT}" \
    MODE=learn OBSERVE="$OBSERVE" \
    nohup node packages/helix-agent/bin/helix-agent.mjs >"$AGENT_LOG" 2>&1 &
  echo $! >"$AGENT_PID"
  for i in $(seq 1 40); do
    if curl -sf "http://127.0.0.1:${LISTEN_PORT}/__helix/healthz" >/dev/null; then break; fi
    sleep 0.15
  done
  # Cover real-site surface (never hit /api/backdoor while learning)
  for path in / /catalog.html /about.html /assets/site.css /assets/app.aaaa1111.js /api/health /api/items; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${LISTEN_PORT}${path}" || true)"
    if [[ "$code" != "200" ]]; then
      echo "learn probe ${path} expected 200 got ${code}" >&2
      tail -n 40 "$AGENT_LOG" >&2 || true
      exit 1
    fi
  done
  sleep 0.4
  lines="$(grep -c . "$OBSERVE" 2>/dev/null || echo 0)"
  if [[ "${lines}" -lt 3 ]]; then
    echo "learn produced too few observations (${lines}) at $OBSERVE" >&2
    tail -n 40 "$AGENT_LOG" >&2 || true
    exit 1
  fi
  node packages/helix-cli/bin/helix.mjs learn --in "$OBSERVE" --out "$DRAFT" --app-id "$APP_ID"
  routes="$(node -e "const d=require('$DRAFT'); if(!d.routes||!d.routes.length) process.exit(2)")" || {
    echo "draft DNA has zero routes" >&2
    cat "$DRAFT" >&2
    exit 1
  }
  node packages/helix-cli/bin/helix.mjs promote --in "$DRAFT" --out "$CERT" --no-diff
  kill_pidfile "$AGENT_PID"
  sleep 0.3
}

if [[ ! -f "$CERT" || "${RELEARN:-}" == "1" ]]; then
  learn_and_promote
fi

# Refuse empty / broken certs
node -e "const d=require(process.argv[1]); if(!d.routes||d.routes.length<2) process.exit(2)" "$CERT" || {
  echo "certified DNA missing routes — set RELEARN=1" >&2
  exit 1
}

if [[ "$MODE" != "enforce" && "$MODE" != "shadow" && "$MODE" != "learn" ]]; then
  echo "Invalid MODE=$MODE" >&2
  exit 1
fi

echo "=== start helix-agent mode=${MODE} on 0.0.0.0:${LISTEN_PORT} ==="
LISTEN_HOST=0.0.0.0 LISTEN_PORT="$LISTEN_PORT" \
  APP_UPSTREAM="http://127.0.0.1:${APP_PORT}" \
  MODE="$MODE" DNA="$CERT" OBSERVE="$OBSERVE" \
  nohup node packages/helix-agent/bin/helix-agent.mjs >"$AGENT_LOG" 2>&1 &
echo $! >"$AGENT_PID"
sleep 0.5

ok="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${LISTEN_PORT}/api/health" || true)"
if [[ "$ok" != "200" ]]; then
  echo "health expected 200 got $ok" >&2
  tail -n 40 "$AGENT_LOG" >&2 || true
  exit 1
fi

blocked="$(curl -s -o /tmp/helix-site-backdoor.json -w '%{http_code}' "http://127.0.0.1:${LISTEN_PORT}/api/backdoor" || true)"
if [[ "$MODE" == "enforce" ]]; then
  if [[ "$blocked" != "403" ]] || ! grep -q HX-ROUTE-UNKNOWN /tmp/helix-site-backdoor.json; then
    echo "backdoor expected 403 HX-ROUTE-UNKNOWN got $blocked $(cat /tmp/helix-site-backdoor.json)" >&2
    exit 1
  fi
fi

if [[ -z "$EXTERNAL_IP" ]]; then
  EXTERNAL_IP="$(curl -sf -H 'Metadata-Flavor: Google' \
    http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip 2>/dev/null || true)"
fi

cat >"$DATA/status.json" <<EOF
{
  "ok": true,
  "mode": "$MODE",
  "listen_port": $LISTEN_PORT,
  "app_port": $APP_PORT,
  "app": "$APP_SCRIPT",
  "dna": "$CERT",
  "url": "http://${EXTERNAL_IP:-127.0.0.1}:${LISTEN_PORT}/",
  "pid_app": $(cat "$APP_PID"),
  "pid_agent": $(cat "$AGENT_PID")
}
EOF

echo "GCE_SITE_UP_OK url=http://${EXTERNAL_IP:-127.0.0.1}:${LISTEN_PORT}/ mode=$MODE"
cat "$DATA/status.json"
