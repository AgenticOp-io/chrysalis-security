#!/usr/bin/env bash
# GCE Mode A hard-redirect proof (high ports — safe beside hub).
# Deepen: divert on + Helix down → no silent 200; teardown divert → app path restored.
# Tokens: MODE_A_DIVERT_OK · MODE_A_DNA_OK · MODE_A_FAILCLOSED_OK · MODE_A_TEARDOWN_OK · NFT_SMOKE_OK
# Run on Linux: bash scripts/gce-nft-smoke.sh  (or: node scripts/nft-smoke.mjs)
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="/usr/sbin:/sbin:$PATH"
PUBLIC_PORT="${PUBLIC_PORT:-18080}"
HELIX_PORT="${HELIX_PORT:-14080}"
APP_PORT="${APP_PORT:-14090}"
DATA="$(pwd)/data/nft-smoke"
APP_PID=""
HX_PID=""
rm -rf "$DATA"
mkdir -p "$DATA"

http_code() {
  local url="$1"
  node -e "fetch('$url').then(r=>{console.log(r.status);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})"
}

cleanup() {
  [[ -n "${HX_PID}" ]] && kill "$HX_PID" 2>/dev/null || true
  [[ -n "${APP_PID}" ]] && kill "$APP_PID" 2>/dev/null || true
  PUBLIC_PORT="$PUBLIC_PORT" HELIX_PORT="$HELIX_PORT" bash scripts/host-redirect-nft.sh remove >/dev/null 2>&1 || true
}
trap cleanup EXIT

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "NFT_SMOKE_SKIP (need Linux/nft — platform=$(uname -s); see docs/INSTALL-MODE-A.md)"
  exit 0
fi

if ! command -v nft >/dev/null; then
  echo "NFT_SMOKE_SKIP (nftables required)"
  exit 0
fi

echo "=== start app on 127.0.0.1:${APP_PORT} ==="
HOST=127.0.0.1 PORT="$APP_PORT" node fixtures/demo-api/server.mjs &
APP_PID=$!
sleep 0.4

echo "=== learn via agent on ${HELIX_PORT} ==="
LISTEN_HOST=0.0.0.0 LISTEN_PORT="$HELIX_PORT" APP_UPSTREAM="http://127.0.0.1:${APP_PORT}" \
  MODE=learn OBSERVE="$DATA/obs.ndjson" node packages/helix-agent/bin/helix-agent.mjs &
HX_PID=$!
sleep 0.4
curl -fsS "http://127.0.0.1:${HELIX_PORT}/api/health" >/dev/null
curl -fsS "http://127.0.0.1:${HELIX_PORT}/api/items" >/dev/null
kill "$HX_PID" 2>/dev/null || true
HX_PID=""
sleep 0.2

node packages/helix-cli/bin/helix.mjs learn --in "$DATA/obs.ndjson" --out "$DATA/draft.json" --app-id nft-demo
node packages/helix-cli/bin/helix.mjs promote --in "$DATA/draft.json" --out "$DATA/cert.json"

echo "=== enforce agent on ${HELIX_PORT} ==="
LISTEN_HOST=0.0.0.0 LISTEN_PORT="$HELIX_PORT" APP_UPSTREAM="http://127.0.0.1:${APP_PORT}" \
  MODE=enforce DNA="$DATA/cert.json" node packages/helix-agent/bin/helix-agent.mjs &
HX_PID=$!
sleep 0.4

echo "=== install nft redirect ${PUBLIC_PORT} -> ${HELIX_PORT} ==="
if [[ "$(id -u)" -eq 0 ]]; then
  PUBLIC_PORT="$PUBLIC_PORT" HELIX_PORT="$HELIX_PORT" bash scripts/host-redirect-nft.sh install
else
  sudo PUBLIC_PORT="$PUBLIC_PORT" HELIX_PORT="$HELIX_PORT" bash scripts/host-redirect-nft.sh install
fi
echo "MODE_A_DIVERT_OK"

echo "=== hit PUBLIC_PORT through redirect ==="
ok="$(http_code "http://127.0.0.1:${PUBLIC_PORT}/api/health")"
if [[ "$ok" != "200" ]]; then
  echo "NFT_SMOKE_FAIL known route via divert got HTTP $ok"
  exit 1
fi
blocked="$(http_code "http://127.0.0.1:${PUBLIC_PORT}/api/backdoor")"
if [[ "$blocked" != "403" ]]; then
  echo "NFT_SMOKE_FAIL backdoor via divert got HTTP $blocked (want 403)"
  exit 1
fi
# body check for DNA hole marker (curl once for body)
curl -sS -o /tmp/helix-nft-block.json "http://127.0.0.1:${PUBLIC_PORT}/api/backdoor" || true
grep -q HX-ROUTE-UNKNOWN /tmp/helix-nft-block.json
echo "MODE_A_DNA_OK"

# Fail-closed: Helix down + divert still on → no silent 200 through PUBLIC_PORT
echo "=== fail-closed: stop Helix, divert left on ==="
kill "$HX_PID" 2>/dev/null || true
HX_PID=""
sleep 0.3
dead="$(http_code "http://127.0.0.1:${PUBLIC_PORT}/api/health")"
if [[ "$dead" == "200" ]]; then
  echo "NFT_SMOKE_FAIL divert-to-dead Helix still returned 200 (silent allow)"
  exit 1
fi
echo "MODE_A_FAILCLOSED_OK (divert→dead got HTTP $dead)"

# Teardown divert → app path restored (direct APP_PORT); PUBLIC no longer DNA-proxied
echo "=== teardown divert ==="
if [[ "$(id -u)" -eq 0 ]]; then
  PUBLIC_PORT="$PUBLIC_PORT" HELIX_PORT="$HELIX_PORT" bash scripts/host-redirect-nft.sh remove
else
  sudo PUBLIC_PORT="$PUBLIC_PORT" HELIX_PORT="$HELIX_PORT" bash scripts/host-redirect-nft.sh remove
fi
app_ok="$(http_code "http://127.0.0.1:${APP_PORT}/api/health")"
if [[ "$app_ok" != "200" ]]; then
  echo "NFT_SMOKE_FAIL direct app after divert teardown got HTTP $app_ok"
  exit 1
fi
# PUBLIC_PORT must not still DNA-block (divert gone); connection refused / non-403 is fine
pub_after="$(http_code "http://127.0.0.1:${PUBLIC_PORT}/api/backdoor")"
if [[ "$pub_after" == "403" ]]; then
  echo "NFT_SMOKE_FAIL PUBLIC_PORT still DNA-proxied after teardown (HTTP 403)"
  exit 1
fi
echo "MODE_A_TEARDOWN_OK (app=${app_ok} public_after=${pub_after})"

echo
echo "NFT_SMOKE_OK public=${PUBLIC_PORT} helix=${HELIX_PORT} app=${APP_PORT}"
