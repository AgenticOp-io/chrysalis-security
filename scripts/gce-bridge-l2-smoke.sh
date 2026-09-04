#!/usr/bin/env bash
# Mode B L2 Phase-1 lab prove (GCE Linux / netns) — deepen: nft divert + fail-closed.
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
PUBLIC_PORT=18085
LISTEN=18086
UPSTREAM_PORT=18087
NFT_TABLE="helix_l2_redir"

cleanup() {
  ip netns exec "$NS_HELIX" nft delete table inet "$NFT_TABLE" 2>/dev/null || true
  [[ -n "${HX_PID:-}" ]] && kill "$HX_PID" 2>/dev/null || true
  [[ -n "${UP_PID:-}" ]] && kill "$UP_PID" 2>/dev/null || true
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

# 1) ICMP / non-HTTP across bridge still works
ip netns exec "$NS_HELIX" ping -c 1 -W 2 10.67.0.2 >/dev/null
echo "BRIDGE_L2_ICMP_OK"

# Minimal upstream in server ns
ip netns exec "$NS_SRV" node -e "
const http=require('http');
http.createServer((q,s)=>{s.writeHead(200,{'content-type':'application/json'});s.end(JSON.stringify({ok:true}));}).listen($UPSTREAM_PORT,'0.0.0.0');
" &
UP_PID=$!
sleep 0.4

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

# nft divert: public port → helix listen (Mode A-style redirect inside helix ns)
ip netns exec "$NS_HELIX" nft -f - <<EOF
table inet $NFT_TABLE {
  chain redir {
    type nat hook prerouting priority dstnat; policy accept;
    tcp dport $PUBLIC_PORT redirect to :$LISTEN
  }
  chain redir_out {
    type nat hook output priority -100; policy accept;
    tcp dport $PUBLIC_PORT redirect to :$LISTEN
  }
}
EOF
echo "BRIDGE_L2_DIVERT_OK"

eval_http() {
  local url="$1"
  ip netns exec "$NS_HELIX" node -e "fetch('$url').then(r=>{console.log(r.status);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})"
}

# 2) Learned HTTP path allows; /api/backdoor → 403 (via diverted public port)
CODE=$(eval_http "http://127.0.0.1:${PUBLIC_PORT}/api/health")
BAD=$(eval_http "http://127.0.0.1:${PUBLIC_PORT}/api/backdoor")

if [[ "$CODE" != "200" ]]; then
  echo "BRIDGE_L2_SMOKE_FAIL known route via divert got HTTP $CODE"
  exit 1
fi
if [[ "$BAD" != "403" ]]; then
  echo "BRIDGE_L2_SMOKE_FAIL backdoor via divert got HTTP $BAD (want 403)"
  exit 1
fi
echo "BRIDGE_L2_DNA_OK"

# 3) Stop Helix with divert left on → diverted port fails (no silent allow)
kill "$HX_PID" 2>/dev/null || true
HX_PID=""
sleep 0.3
DEAD=$(eval_http "http://127.0.0.1:${PUBLIC_PORT}/api/health")
if [[ "$DEAD" == "200" ]]; then
  echo "BRIDGE_L2_SMOKE_FAIL divert-to-dead Helix still returned 200 (silent allow)"
  exit 1
fi
echo "BRIDGE_L2_FAILCLOSED_OK (divert→dead got HTTP $DEAD)"

# 4) Teardown divert → ICMP restored path; upstream still reachable direct
ip netns exec "$NS_HELIX" nft delete table inet "$NFT_TABLE" 2>/dev/null || true
ip netns exec "$NS_HELIX" ping -c 1 -W 2 10.67.0.2 >/dev/null
DIRECT=$(ip netns exec "$NS_HELIX" node -e "fetch('http://10.67.0.2:${UPSTREAM_PORT}/').then(r=>{console.log(r.status);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})")
if [[ "$DIRECT" != "200" ]]; then
  echo "BRIDGE_L2_SMOKE_FAIL direct upstream after divert teardown got HTTP $DIRECT"
  exit 1
fi
echo "BRIDGE_L2_TEARDOWN_OK"

kill "$UP_PID" 2>/dev/null || true
UP_PID=""

echo "BRIDGE_L2_SMOKE_OK"
