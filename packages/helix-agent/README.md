# Helix agent (Mode A)

Soft host intercept: **NGFW NAT unchanged.**

1. Move the app to `127.0.0.1` only (e.g. port 8080).  
2. Run `helix-agent` on `0.0.0.0:80` (or 443 later) with `APP_UPSTREAM=http://127.0.0.1:8080`.  
3. External and internal clients still use the server’s real IP — Helix sees all of it.

Hard redirect (app still binds the public port): see `scripts/host-redirect-nft.sh` on Linux/GCE.

Decisions: [`docs/DECISIONS.md`](../../docs/DECISIONS.md) · [`docs/AUGMENT.md`](../../docs/AUGMENT.md)
