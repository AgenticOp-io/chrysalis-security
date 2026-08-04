# Sync Helix to GCE and prove

Preferred host: **agenticop-master** (do not delete). Project `chrysalis-dev-f5x6qv`, zone `us-central1-a`, IP `35.224.146.25`.

## One command (Windows)

From `chrysalis-security`:

```powershell
.\scripts\gce-sync.ps1
.\scripts\gce-sync.ps1 -SkipNft
.\scripts\gce-sync.ps1 -SiteUp          # also bring up persistent mini-site
.\scripts\gce-sync.ps1 -SiteUp -Relearn # re-learn DNA then enforce
```

## Persistent mini-site

High ports (avoid colliding with smokes / nft labs):

| Role | Bind | Port |
|------|------|------|
| App (static-site) | `127.0.0.1` | `18091` |
| Helix agent | `0.0.0.0` | `18085` |

```bash
bash scripts/gce-site-up.sh          # learn once if no cert, then enforce
RELEARN=1 bash scripts/gce-site-up.sh
bash scripts/gce-site-down.sh
```

Public URL (after a project admin opens tcp:18085 — this SA lacks `compute.firewalls.create`):  
`http://35.224.146.25:18085/`

Until then, prove on-box: `curl -s http://127.0.0.1:18085/api/health`.

DNA + pids: `~/chrysalis-security/data/gce-site/`.

Firewall (admin once):

```bash
gcloud compute firewall-rules create allow-helix-lab \
  --project=chrysalis-dev-f5x6qv \
  --allow=tcp:18085 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=agenticop-master \
  --description="Helix persistent mini-site lab port"
```

## Manual smoke pack

```bash
cd ~/chrysalis-security
node scripts/dna-core-smoke.mjs
node scripts/smoke.mjs
node scripts/host-smoke.mjs
node scripts/static-smoke.mjs
node scripts/schema-drift-smoke.mjs
bash scripts/gce-nft-smoke.sh
bash scripts/gce-site-up.sh
```

Proven tokens: `SMOKE_OK` · `HOST_SMOKE_OK` · `NFT_SMOKE_OK` · `STATIC_SMOKE_OK` · `DNA_CORE_OK` · `SCHEMA_DRIFT_SMOKE_OK` · `GCE_SITE_UP_OK`.
