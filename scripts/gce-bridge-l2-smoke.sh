#!/usr/bin/env bash
# Mode B L2 Phase-1 lab prove (GCE Linux / netns).
# Design: docs/MODE-B-L2.md
# Requires: root (or CAP_NET_ADMIN), bash, ip, nft, node.
# Does NOT delete VMs. Does NOT load out-of-tree kernel modules.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NS_HELIX="hx-l2-helix"
NS_SRV="hx-l2-srv"
BR="hx-l2-br0"
VETH_H="hx-veth-h"
VETH_S="hx-veth-s"
LISTEN=18086
UPSTREAM_PORT=18087

cleanup() {
  ip netns del "$NS_HELIX" 2>/dev/null || true
  ip netns del "$NS_SRV" 2>/dev/null || true
  ip link del "$BR" 2>/dev/null || true
  ip link del "$VETH_H" 2>/dev/null || true
  ip link del "$VETH_S" 2>/dev/null || true
}
trap cleanup EXIT

if [[ "$(id -u)" -ne 0 ]]; then
  echo "BRIDGE_L2_SMOKE_SKIP (need root for netns/nft — design docs/MODE-B-L2.md)"
  exit 0
fi

if ! command -v nft >/dev/null || ! command -v ip >/dev/null; then
  echo "BRIDGE_L2_SMOKE_SKIP (need ip + nft)"
  exit 0
fi

cleanup

# --- namespace dual-NIC simulation ---
ip netns add "$NS_HELIX"
ip netns add "$NS_SRV"
ip link add "$BR" type bridge
ip link set "$BR" up

ip link add "$VETH_H" type veth peer name "${VETH_H}-ns"
ip link add "$VETH_S" type veth peer name "${VETH_S}-ns"
ip link set "${VETH_H}-ns" netns "$NS_HELIX"
ip link set "${VETH_S}-ns" netns "$NS_SRV"
ip link set "$VETH_H" master "$BR"
ip link set "$VETH_S" master "$BR"
ip link set "$VETH_H" up
ip link set "$VETH_S" up

ip -n "$NS_HELIX" addr add 10.67.0.1/24 dev "${VETH_H}-ns"
ip -n "$NS_HELIX" link set "${VETH_H}-ns" up
ip -n "$NS_HELIX" link set lo up
ip -n "$NS_SRV" addr add 10.67.0.2/24 dev "${VETH_S}-ns"
ip -n "$NS_SRV" link set "${VETH_S}-ns" up
ip -n "$NS_SRV" link set lo up

# Ping across bridge (non-HTTP still works)
ip netns exec "$NS_HELIX" ping -c 1 -W 2 10.67.0.2 >/dev/null

# Minimal upstream in server ns
ip netns exec "$NS_SRV" node -e "
const http=require('http');
http.createServer((q,s)=>{s.writeHead(200,{'content-type':'application/json'});s.end(JSON.stringify({ok:true}));}).listen($UPSTREAM_PORT,'0.0.0.0');
" &
UP_PID=$!
sleep 0.4

# DNA: learn one route then enforce via helix-bridge in helix ns
DNA_DIR="$ROOT/data/bridge-l2-smoke"
mkdir -p "$DNA_DIR"
cat >"$DNA_DIR/certified.dna.json" <<EOF
{
  "schema": "app-dna-v1",
  "app_id": "bridge-l2",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "mode": "certified",
  "parent_hash": null,
  "routes": [
    {
      "host": "default",
      "method": "GET",
      "path_template": "/api/health",
      "content_class": "json",
      "status_classes": [200],
      "response_key_fingerprint": "ok"
    }
  ],
  "holes": []
}
EOF

ip netns exec "$NS_HELIX" env \
  MODE=enforce \
  DNA="$DNA_DIR/certified.dna.json" \
  APP_UPSTREAM="http://10.67.0.2:${UPSTREAM_PORT}" \
  LISTEN_PORT="$LISTEN" \
  node "$ROOT/packages/helix-bridge/bin/helix-bridge.mjs" &
HX_PID=$!
sleep 0.5

# Allow known / deny unknown (node — no curl dependency)
eval_http() {
  local url="$1"
  ip netns exec "$NS_HELIX" node -e "fetch('$url').then(r=>{console.log(r.status);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})"
}
CODE=$(eval_http "http://127.0.0.1:${LISTEN}/api/health")
BAD=$(eval_http "http://127.0.0.1:${LISTEN}/api/backdoor")

kill "$HX_PID" 2>/dev/null || true
kill "$UP_PID" 2>/dev/null || true

if [[ "$CODE" != "200" ]]; then
  echo "BRIDGE_L2_SMOKE_FAIL known route got HTTP $CODE"
  exit 1
fi
if [[ "$BAD" != "403" ]]; then
  echo "BRIDGE_L2_SMOKE_FAIL backdoor got HTTP $BAD (want 403)"
  exit 1
fi

echo "BRIDGE_L2_SMOKE_OK"
