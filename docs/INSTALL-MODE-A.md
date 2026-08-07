# Helix Mode A — systemd install (soft host intercept)

Goal: NGFW keeps the same host VIP. Helix owns the public port; the app binds localhost only (D4).

## Layout

```text
Internet / LAN → host :443/:80 (Helix) → 127.0.0.1:APP_PORT (app)
```

## Files

- Unit: [`deploy/systemd/helix-agent.service`](../deploy/systemd/helix-agent.service)
- Env example: [`deploy/systemd/helix-agent.env.example`](../deploy/systemd/helix-agent.env.example)

## Steps (Linux)

1. Install Node ≥20 and copy this repo (or container image) to `/opt/helix`.
2. Move the real app listener to `127.0.0.1` only (nginx `listen 127.0.0.1:8080`, etc.).
3. Copy env → `/etc/helix/helix-agent.env` and edit `APP_UPSTREAM`, `MODE`, `DNA`.
4. Install unit:

```bash
sudo cp deploy/systemd/helix-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now helix-agent
curl -sS http://127.0.0.1:4080/__helix/healthz
```

5. Operator path: `learn` → `helix report` → `helix promote` → `shadow` → `helix ready --target enforce` → `enforce` → `POST /__helix/reload` on promote.

Optional nft redirect instead of rebinding the app: `scripts/host-redirect-nft.sh` (root). Soft bind (this unit) needs no nft.

## Prove

Local: `npm run ready-smoke` · host path: `npm run host-smoke`  
GCE: `docs/GCE.md`
