#!/usr/bin/env bash
# GCE Mode A hard-redirect proof (high ports — safe beside hub).
# Run on Linux: bash scripts/gce-nft-smoke.sh
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="/usr/sbin:/sbin:$PATH"
PUBLIC_PORT="${PUBLIC_PORT:-18080}"
HELIX_PORT="${HELIX_PORT:-14080}"
APP_PORT="${APP_PORT:-14090}"
DATA="$(pwd)/data/nft-smoke"
rm -rf "$DATA"
mkdir -p "$DATA"

cleanup() {
  kill $(jobs -p) 2>/dev/null || true
  PUBLIC_PORT="$PUBLIC_PORT" HELIX_PORT="$HELIX_PORT" bash scripts/host-redirect-nft.sh remove >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== start app on 127.0.0.1:${APP_PORT} ==="
HOST=127.0.0.1 PORT="$APP_PORT" node fixtures/demo-api/server.mjs &
sleep 0.4

echo "=== learn via agent on ${HELIX_PORT} ==="
LISTEN_HOST=0.0.0.0 LISTEN_PORT="$HELIX_PORT" APP_UPSTREAM="http://127.0.0.1:${APP_PORT}" \
  MODE=learn OBSERVE="$DATA/obs.ndjson" node packages/helix-agent/bin/helix-agent.mjs &
sleep 0.4
curl -fsS "http://127.0.0.1:${HELIX_PORT}/api/health" >/dev/null
curl -fsS "http://127.0.0.1:${HELIX_PORT}/api/items" >/dev/null
kill %2 2>/dev/null || true
sleep 0.2

node packages/helix-cli/bin/helix.mjs learn --in "$DATA/obs.ndjson" --out "$DATA/draft.json" --app-id nft-demo
node packages/helix-cli/bin/helix.mjs promote --in "$DATA/draft.json" --out "$DATA/cert.json"

echo "=== enforce agent on ${HELIX_PORT} ==="
LISTEN_HOST=0.0.0.0 LISTEN_PORT="$HELIX_PORT" APP_UPSTREAM="http://127.0.0.1:${APP_PORT}" \
  MODE=enforce DNA="$DATA/cert.json" node packages/helix-agent/bin/helix-agent.mjs &
sleep 0.4

echo "=== install nft redirect ${PUBLIC_PORT} -> ${HELIX_PORT} ==="
sudo PUBLIC_PORT="$PUBLIC_PORT" HELIX_PORT="$HELIX_PORT" bash scripts/host-redirect-nft.sh install

echo "=== hit PUBLIC_PORT through redirect ==="
ok="$(curl -fsS -o /tmp/helix-nft-ok.json -w '%{http_code}' "http://127.0.0.1:${PUBLIC_PORT}/api/health")"
test "$ok" = "200"
blocked="$(curl -sS -o /tmp/helix-nft-block.json -w '%{http_code}' "http://127.0.0.1:${PUBLIC_PORT}/api/backdoor")"
test "$blocked" = "403"
grep -q HX-ROUTE-UNKNOWN /tmp/helix-nft-block.json

sudo PUBLIC_PORT="$PUBLIC_PORT" HELIX_PORT="$HELIX_PORT" bash scripts/host-redirect-nft.sh remove
echo
echo "NFT_SMOKE_OK public=${PUBLIC_PORT} helix=${HELIX_PORT} app=${APP_PORT}"
