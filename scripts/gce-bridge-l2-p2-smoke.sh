#!/usr/bin/env bash
# Mode B L2 Phase 2 lab prove — dual-iface appliance (NIC-A + NIC-B) in helix ns.
# Design: docs/MODE-B-L2.md § Phase 2
# Requires: root (or CAP_NET_ADMIN), bash, ip, nft, node.
# Does NOT delete VMs. Does NOT load out-of-tree kernel modules.
# DNA worker: helix-bridge (same engine as Mode A); protect stays DNA-only (D5).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NS_HX="hx-l2p2-hx"
NS_A="hx-l2p2-a"
NS_B="hx-l2p2-b"
BR="hx-l2p2-br0"
NIC_A="hx-l2p2-ethA"
NIC_B="hx-l2p2-ethB"
VETH_A="hx-l2p2-va"
VETH_B="hx-l2p2-vb"
PUBLIC_PORT=18085
LISTEN=18086
UPSTREAM_PORT=18087
NFT_TABLE="helix_l2p2_redir"
APPLIANCE_IP="10.68.0.1"
CLIENT_IP="10.68.0.10"
SERVER_IP="10.68.0.20"

cleanup() {
  ip netns exec "$NS_HX" nft delete table inet "$NFT_TABLE" 2>/dev/null || true
  [[ -n "${HX_PID:-}" ]] && kill "$HX_PID" 2>/dev/null || true
  [[ -n "${UP_PID:-}" ]] && kill "$UP_PID" 2>/dev/null || true
  ip netns del "$NS_HX" 2>/dev/null || true
  ip netns del "$NS_A" 2>/dev/null || true
  ip netns del "$NS_B" 2>/dev/null || true
  ip link del "$VETH_A" 2>/dev/null || true
  ip link del "$VETH_B" 2>/dev/null || true
}
trap cleanup EXIT

if [[ "$(id -u)" -ne 0 ]]; then
  echo "BRIDGE_L2_P2_SMOKE_SKIP (need root for netns/nft — design docs/MODE-B-L2.md)"
  exit 0
fi

if ! command -v nft >/dev/null || ! command -v ip >/dev/null; then
  echo "BRIDGE_L2_P2_SMOKE_SKIP (need ip + nft)"
  exit 0
fi

cleanup

# --- dual-NIC appliance: NIC-A (toward NGFW) + NIC-B (toward servers) inside helix ns ---
ip netns add "$NS_HX"
ip netns add "$NS_A"
ip netns add "$NS_B"

# veth pair A: client ns ↔ appliance NIC-A
ip link add "$VETH_A" type veth peer name "$NIC_A"
ip link set "$VETH_A" netns "$NS_A"
ip link set "$NIC_A" netns "$NS_HX"

# veth pair B: server ns ↔ appliance NIC-B
ip link add "$VETH_B" type veth peer name "$NIC_B"
ip link set "$VETH_B" netns "$NS_B"
ip link set "$NIC_B" netns "$NS_HX"

# Bridge both appliance ifaces (kernel L2; Helix stays userspace)
ip -n "$NS_HX" link add "$BR" type bridge
ip -n "$NS_HX" link set "$NIC_A" master "$BR"
ip -n "$NS_HX" link set "$NIC_B" master "$BR"
ip -n "$NS_HX" link set "$NIC_A" up
ip -n "$NS_HX" link set "$NIC_B" up
ip -n "$NS_HX" link set "$BR" up
ip -n "$NS_HX" link set lo up
ip -n "$NS_HX" addr add "${APPLIANCE_IP}/24" dev "$BR"

ip -n "$NS_A" addr add "${CLIENT_IP}/24" dev "$VETH_A"
ip -n "$NS_A" link set "$VETH_A" up
ip -n "$NS_A" link set lo up

ip -n "$NS_B" addr add "${SERVER_IP}/24" dev "$VETH_B"
ip -n "$NS_B" link set "$VETH_B" up
ip -n "$NS_B" link set lo up

# 1) Interface pair present and enslaved to br0
MASTER_A=$(ip -n "$NS_HX" -o link show "$NIC_A" | grep -o 'master [^ ]*' | awk '{print $2}')
MASTER_B=$(ip -n "$NS_HX" -o link show "$NIC_B" | grep -o 'master [^ ]*' | awk '{print $2}')
if [[ "$MASTER_A" != "$BR" || "$MASTER_B" != "$BR" ]]; then
  echo "BRIDGE_L2_P2_SMOKE_FAIL iface pair not bridged (A=$MASTER_A B=$MASTER_B want $BR)"
  exit 1
fi
echo "BRIDGE_L2_P2_IFACE_OK"

# 2) Cross-segment ICMP (client → server across appliance)
ip netns exec "$NS_A" ping -c 1 -W 2 "$SERVER_IP" >/dev/null
echo "BRIDGE_L2_P2_CROSS_OK"

# Upstream only on server ns (not on PUBLIC_PORT — divert must own that hop)
ip netns exec "$NS_B" node -e "
const http=require('http');
http.createServer((q,s)=>{s.writeHead(200,{'content-type':'application/json'});s.end(JSON.stringify({ok:true}));}).listen($UPSTREAM_PORT,'0.0.0.0');
" &
UP_PID=$!
sleep 0.4

DNA_DIR="$ROOT/data/bridge-l2-p2-smoke"
mkdir -p "$DNA_DIR"
cat >"$DNA_DIR/certified.dna.json" <<EOF
{
  "schema": "app-dna-v1",
  "app_id": "bridge-l2-p2",
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

# helix-bridge DNA worker in appliance ns (no CWL required — D5)
ip netns exec "$NS_HX" env \
  MODE=enforce \
  DNA="$DNA_DIR/certified.dna.json" \
  APP_UPSTREAM="http://${SERVER_IP}:${UPSTREAM_PORT}" \
  LISTEN_PORT="$LISTEN" \
  node "$ROOT/packages/helix-bridge/bin/helix-bridge.mjs" &
HX_PID=$!
sleep 0.5

# Mode A-style nft redirect on appliance (client hits appliance:PUBLIC → helix listen)
ip netns exec "$NS_HX" nft -f - <<EOF
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
echo "BRIDGE_L2_P2_DIVERT_OK"

eval_from_client() {
  local url="$1"
  ip netns exec "$NS_A" node -e "fetch('$url').then(r=>{console.log(r.status);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})"
}

# 3) DNA via dual-iface path: client → appliance IP:PUBLIC (on-path) → helix-bridge → server
CODE=$(eval_from_client "http://${APPLIANCE_IP}:${PUBLIC_PORT}/api/health")
BAD=$(eval_from_client "http://${APPLIANCE_IP}:${PUBLIC_PORT}/api/backdoor")

if [[ "$CODE" != "200" ]]; then
  echo "BRIDGE_L2_P2_SMOKE_FAIL known route via dual-iface divert got HTTP $CODE"
  exit 1
fi
if [[ "$BAD" != "403" ]]; then
  echo "BRIDGE_L2_P2_SMOKE_FAIL backdoor via dual-iface divert got HTTP $BAD (want 403)"
  exit 1
fi
echo "BRIDGE_L2_P2_DNA_OK"

kill "$HX_PID" 2>/dev/null || true
HX_PID=""
kill "$UP_PID" 2>/dev/null || true
UP_PID=""

echo "BRIDGE_L2_P2_SMOKE_OK"
