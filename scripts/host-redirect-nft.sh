#!/usr/bin/env bash
# Mode A hard redirect (Linux / GCE) — optional.
# Leaves the public port number the same on the host; redirects into Helix;
# app should listen on APP_PORT on 127.0.0.1 only.
#
# Usage (root):
#   PUBLIC_PORT=80 HELIX_PORT=4080 APP_PORT=8080 bash scripts/host-redirect-nft.sh install
#   bash scripts/host-redirect-nft.sh remove
#
# Does NOT touch NGFW NAT. Requires nftables.
set -euo pipefail

ACTION="${1:-}"
PUBLIC_PORT="${PUBLIC_PORT:-80}"
HELIX_PORT="${HELIX_PORT:-4080}"
TABLE="helix_host"
CHAIN="helix_redir"

export PATH="/usr/sbin:/sbin:$PATH"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "host-redirect-nft.sh is for Linux/GCE only (found $(uname -s))"
  exit 1
fi

command -v nft >/dev/null || { echo "nftables (nft) required — try PATH=/usr/sbin:\$PATH"; exit 1; }
NFT_BIN="$(command -v nft)"

remove_rules() {
  "$NFT_BIN" delete table inet "$TABLE" 2>/dev/null || true
  echo "removed table inet $TABLE"
}

install_rules() {
  remove_rules
  # prerouting = external/internal hits to this host
  # output = locally originated curls/smokes to PUBLIC_PORT
  "$NFT_BIN" -f - <<EOF
table inet $TABLE {
  chain $CHAIN {
    type nat hook prerouting priority dstnat; policy accept;
    tcp dport $PUBLIC_PORT redirect to :$HELIX_PORT
  }
  chain ${CHAIN}_out {
    type nat hook output priority -100; policy accept;
    tcp dport $PUBLIC_PORT redirect to :$HELIX_PORT
  }
}
EOF
  echo "installed: tcp dport $PUBLIC_PORT -> redirect :$HELIX_PORT (table inet $TABLE, prerouting+output)"
  echo "Run helix-agent on LISTEN_PORT=$HELIX_PORT with APP_UPSTREAM=http://127.0.0.1:\$APP_PORT"
  echo "Bind the real app to 127.0.0.1:${APP_PORT:-8080} only."
}

case "$ACTION" in
  install) install_rules ;;
  remove) remove_rules ;;
  *)
    echo "Usage: $0 install|remove"
    exit 1
    ;;
esac
