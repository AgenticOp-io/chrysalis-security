#!/usr/bin/env bash
# Mode B L2 Phase 3 lab prove — transparent bridge-nf divert on daddr=server.
# Design: docs/MODE-B-L2.md § Phase 3
#
# Phase 2 asked the client to target the appliance IP. Phase 3 is the real Mode B claim:
# the client keeps using the SERVER's own IP and never learns Helix exists. Bridged frames
# are handed to ip prerouting by br_netfilter, matched on daddr=server, and DNAT'd into
# Helix. The original destination is recovered by provisioning (one rule names one server),
# not by guessing — Node cannot read SO_ORIGINAL_DST, and we do not ship kernel modules.
#
# Requires: root (or CAP_NET_ADMIN), bash, ip, nft, node, br_netfilter.
# Does NOT delete VMs. Does NOT load out-of-tree kernel modules.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NS_HX="hx-l2p3-hx"
NS_A="hx-l2p3-a"
NS_B="hx-l2p3-b"
BR="hx-l2p3-br0"
NIC_A="hx-l2p3-ethA"
NIC_B="hx-l2p3-ethB"
VETH_A="hx-l2p3-va"
VETH_B="hx-l2p3-vb"
PUBLIC_PORT=18095
LISTEN=18096
UPSTREAM_PORT=18097
NFT_TABLE="helix_l2p3_divert"
APPLIANCE_IP="10.69.0.1"
CLIENT_IP="10.69.0.10"
SERVER_IP="10.69.0.20"

cleanup() {
  ip netns exec "$NS_HX" nft delete table ip "$NFT_TABLE" 2>/dev/null || true
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
  echo "BRIDGE_L2_P3_SMOKE_SKIP (need root for netns/nft — design docs/MODE-B-L2.md Phase 3)"
  exit 0
fi
if ! command -v nft >/dev/null || ! command -v ip >/dev/null; then
  echo "BRIDGE_L2_P3_SMOKE_SKIP (need ip + nft)"
  exit 0
fi

# br_netfilter is what makes a bridged frame visible to ip prerouting. In-tree module only.
modprobe br_netfilter 2>/dev/null || true
if [[ ! -d /proc/sys/net/bridge ]]; then
  echo "BRIDGE_L2_P3_SMOKE_SKIP (br_netfilter unavailable — transparent divert needs it; Phase 2 path still green)"
  exit 0
fi

cleanup

ip netns add "$NS_HX"
ip netns add "$NS_A"
ip netns add "$NS_B"

ip link add "$VETH_A" type veth peer name "$NIC_A"
ip link set "$VETH_A" netns "$NS_A"
ip link set "$NIC_A" netns "$NS_HX"

ip link add "$VETH_B" type veth peer name "$NIC_B"
ip link set "$VETH_B" netns "$NS_B"
ip link set "$NIC_B" netns "$NS_HX"

ip -n "$NS_HX" link add "$BR" type bridge
ip -n "$NS_HX" link set "$NIC_A" master "$BR"
ip -n "$NS_HX" link set "$NIC_B" master "$BR"
ip -n "$NS_HX" link set "$NIC_A" up
ip -n "$NS_HX" link set "$NIC_B" up
ip -n "$NS_HX" link set "$BR" up
ip -n "$NS_HX" link set lo up
# Management IP on the bridge — the DNAT target. Server IPs stay untouched (D4).
ip -n "$NS_HX" addr add "${APPLIANCE_IP}/24" dev "$BR"

ip -n "$NS_A" addr add "${CLIENT_IP}/24" dev "$VETH_A"
ip -n "$NS_A" link set "$VETH_A" up
ip -n "$NS_A" link set lo up

ip -n "$NS_B" addr add "${SERVER_IP}/24" dev "$VETH_B"
ip -n "$NS_B" link set "$VETH_B" up
ip -n "$NS_B" link set lo up

# Hand bridged frames to ip prerouting (namespaced on modern kernels; tolerate read-only).
if ! ip netns exec "$NS_HX" sysctl -qw net.bridge.bridge-nf-call-iptables=1 2>/dev/null; then
  sysctl -qw net.bridge.bridge-nf-call-iptables=1 2>/dev/null || true
fi
BRNF=$(ip netns exec "$NS_HX" sysctl -n net.bridge.bridge-nf-call-iptables 2>/dev/null || \
       sysctl -n net.bridge.bridge-nf-call-iptables 2>/dev/null || echo 0)
if [[ "$BRNF" != "1" ]]; then
  echo "BRIDGE_L2_P3_SMOKE_SKIP (bridge-nf-call-iptables not settable here — needs a host that allows it)"
  exit 0
fi
echo "BRIDGE_L2_P3_BRNF_OK"

ip netns exec "$NS_A" ping -c 1 -W 2 "$SERVER_IP" >/dev/null
echo "BRIDGE_L2_P3_CROSS_OK"

# Server answers ONLY on UPSTREAM_PORT. Nothing anywhere listens on the public port, so a
# 200 later can only mean the divert put Helix in the path.
ip netns exec "$NS_B" node -e "
const http=require('http');
http.createServer((q,s)=>{s.writeHead(200,{'content-type':'application/json'});s.end(JSON.stringify({ok:true}));}).listen($UPSTREAM_PORT,'0.0.0.0');
" &
UP_PID=$!
sleep 0.4

from_client() {
  ip netns exec "$NS_A" node -e "fetch('$1').then(r=>{console.log(r.status);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})"
}

# Baseline: server IP + public port is dead before divert. Proves transparency is not an illusion.
BASE=$(from_client "http://${SERVER_IP}:${PUBLIC_PORT}/api/health")
if [[ "$BASE" != "0" ]]; then
  echo "BRIDGE_L2_P3_SMOKE_FAIL baseline http://${SERVER_IP}:${PUBLIC_PORT} answered $BASE before divert"
  exit 1
fi
echo "BRIDGE_L2_P3_BASELINE_OK"

DNA_DIR="$ROOT/data/bridge-l2-p3-smoke"
mkdir -p "$DNA_DIR"
cat >"$DNA_DIR/certified.dna.json" <<EOF
{
  "schema": "app-dna-v1",
  "app_id": "bridge-l2-p3",
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

ip netns exec "$NS_HX" env \
  MODE=enforce \
  DNA="$DNA_DIR/certified.dna.json" \
  APP_UPSTREAM="http://${SERVER_IP}:${UPSTREAM_PORT}" \
  LISTEN_PORT="$LISTEN" \
  node "$ROOT/packages/helix-bridge/bin/helix-bridge.mjs" &
HX_PID=$!
sleep 0.5

# Transparent divert: frames arriving on NIC-A addressed to the SERVER are handed to Helix.
# iifname pins the rule to the client side, so Helix's own upstream connection (locally
# generated, output chain) can never re-enter the divert — no loop.
ip netns exec "$NS_HX" nft -f - <<EOF
table ip $NFT_TABLE {
  chain divert {
    type nat hook prerouting priority dstnat; policy accept;
    iifname "$NIC_A" ip daddr $SERVER_IP tcp dport $PUBLIC_PORT dnat to ${APPLIANCE_IP}:${LISTEN}
  }
}
EOF
echo "BRIDGE_L2_P3_DIVERT_OK"

# Client still speaks to the SERVER IP — no client reconfiguration, no NGFW NAT homework (D4).
CODE=$(from_client "http://${SERVER_IP}:${PUBLIC_PORT}/api/health")
BAD=$(from_client "http://${SERVER_IP}:${PUBLIC_PORT}/api/backdoor")

if [[ "$CODE" != "200" ]]; then
  echo "BRIDGE_L2_P3_SMOKE_FAIL known route via transparent divert got HTTP $CODE"
  exit 1
fi
echo "BRIDGE_L2_P3_TRANSPARENT_OK"

if [[ "$BAD" != "403" ]]; then
  echo "BRIDGE_L2_P3_SMOKE_FAIL backdoor via transparent divert got HTTP $BAD (want 403)"
  exit 1
fi
echo "BRIDGE_L2_P3_DNA_OK"

# Helix down, divert still installed → must NOT silently pass to the server.
kill "$HX_PID" 2>/dev/null || true
HX_PID=""
sleep 0.4
DOWN=$(from_client "http://${SERVER_IP}:${PUBLIC_PORT}/api/health")
if [[ "$DOWN" == "200" ]]; then
  echo "BRIDGE_L2_P3_SMOKE_FAIL silent allow with Helix down (got 200)"
  exit 1
fi
echo "BRIDGE_L2_P3_FAILCLOSED_OK"

# Teardown restores the wire: public port dead again, server's own port still serving.
ip netns exec "$NS_HX" nft delete table ip "$NFT_TABLE"
AFTER=$(from_client "http://${SERVER_IP}:${PUBLIC_PORT}/api/health")
DIRECT=$(from_client "http://${SERVER_IP}:${UPSTREAM_PORT}/api/health")
if [[ "$AFTER" == "200" ]]; then
  echo "BRIDGE_L2_P3_SMOKE_FAIL divert removed but public port still answering"
  exit 1
fi
if [[ "$DIRECT" != "200" ]]; then
  echo "BRIDGE_L2_P3_SMOKE_FAIL direct server port broken after teardown (got $DIRECT)"
  exit 1
fi
echo "BRIDGE_L2_P3_TEARDOWN_OK"

kill "$UP_PID" 2>/dev/null || true
UP_PID=""

echo "BRIDGE_L2_P3_SMOKE_OK"
