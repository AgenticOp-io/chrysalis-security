# Sync Helix to GCE and prove

Preferred host: **agenticop-master** (do not delete). Project `chrysalis-dev-f5x6qv`, zone `us-central1-a`, IP `35.224.146.25`.

Never `gcloud compute instances delete` **agenticop-master** or **fusion-lab**.

## One command (Windows)

From `chrysalis-security`:

```powershell
.\scripts\gce-sync.ps1
.\scripts\gce-sync.ps1 -SkipNft
.\scripts\gce-sync.ps1 -SiteUp          # also bring up persistent mini-site
.\scripts\gce-sync.ps1 -SiteUp -Relearn # re-learn DNA then enforce
.\scripts\gce-sync.ps1 -WithCwl         # sync sibling chrysalis-cwl → CUTOVER_SMOKE_OK on-box
.\scripts\gce-sync.ps1 -SyncOnly        # pack+scp only; no remote smokes
```

`gce-sync` packs this repo, SCPs to the VM, then runs the DNA smoke pack + CWL bridge (when CWL is available on-box) + optional nft/site.

## Local prove (desktop / Linux, no GCE)

Prefer this when iterating; GCE still gates ship.

```bash
# Full DNA + optional CWL bridge pack (CWL absent → SKIP, DNA still gates)
node scripts/gce-smoke.mjs
# or: npm run gce-smoke

npm test                  # DNA + CWL when present; CWL smokes SKIP if pillar absent
npm run cutover-smoke     # → CUTOVER_SMOKE_OK (or CUTOVER_SMOKE_SKIP)
npm run cwl-bridge-smoke  # → CWL_BRIDGE_SMOKE_OK (or CWL_BRIDGE_SMOKE_SKIP)
```

### Prove tokens (sync bar)

| Where | Command | Token |
|-------|---------|--------|
| CWL | `npm run smoke:ut-spine:helix` | `UT_SPINE_OK` |
| Secure | `npm run cutover-smoke` | `CUTOVER_SMOKE_OK` |
| Secure GCE | `.\scripts\gce-sync.ps1 -WithCwl` | `CWL_BRIDGE_SMOKE_OK` + `CUTOVER_SMOKE_OK` + `GCE_SYNC_OK` |

### DNA tokens

| Smoke | Token |
|-------|--------|
| `dna-core-smoke.mjs` | `DNA_CORE_OK` |
| `smoke.mjs` | `SMOKE_OK` |
| `host-smoke.mjs` | `HOST_SMOKE_OK` |
| `static-smoke.mjs` | `STATIC_SMOKE_OK` |
| `schema-drift-smoke.mjs` | `SCHEMA_DRIFT_SMOKE_OK` |
| `sign-smoke.mjs` | (sign promote OK — see script stdout) |
| `bridge-smoke.mjs` | (host-bridge OK — see script stdout) |
| `gce-nft-smoke.sh` | `NFT_SMOKE_OK` |
| `gce-site-up.sh` | `GCE_SITE_UP_OK` |
| pack wrapper | `GCE_SMOKE_OK` / `GCE_SYNC_OK` |

### CWL bridge (RFC-0022)

Needs language pillar gold — **not** required for DNA firewall:

- Sibling `engines/chrysalis-cwl` (AgenticOps layout), **or**
- `CHRYSALIS_CWL_ROOT` pointing at that tree

```bash
# Local (sibling present under AgenticOps/engines)
node scripts/cwl-bridge-smoke.mjs   # → CWL_BRIDGE_SMOKE_OK
node scripts/cutover-smoke.mjs      # → CUTOVER_SMOKE_OK

# Without CWL tree: CWL_BRIDGE_SMOKE_SKIP / CUTOVER_SMOKE_SKIP (honest; DNA still gates)
# GCE with bridge: .\scripts\gce-sync.ps1 -WithCwl
```

### UT ↔ Helix demo (CWL owns spine — not Convert)

```bash
# Local: DNA pack + cutover + CWL smoke:ut-spine (sibling engines)
npm run ut-gce-demo   # → UT_GCE_DEMO_OK

# CWL-side one-shot (from chrysalis-cwl) — authority prove token
npm run smoke:ut-spine:helix
```

Umbrella: [`AgenticOps/docs/UT-CONVERT-SECURE-SPINE.md`](../../docs/UT-CONVERT-SECURE-SPINE.md).

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

## Manual smoke pack (on-box after sync)

```bash
cd ~/chrysalis-security
node scripts/gce-smoke.mjs
# nft / site still separate:
bash scripts/gce-nft-smoke.sh
bash scripts/gce-site-up.sh
```

Proven tokens: `SMOKE_OK` · `HOST_SMOKE_OK` · `NFT_SMOKE_OK` · `STATIC_SMOKE_OK` · `DNA_CORE_OK` · `SCHEMA_DRIFT_SMOKE_OK` · `CWL_BRIDGE_SMOKE_OK` (or `CWL_BRIDGE_SMOKE_SKIP`) · `CUTOVER_SMOKE_OK` · `UT_GCE_DEMO_OK` · `GCE_SITE_UP_OK` · `GCE_SMOKE_OK` / `GCE_SYNC_OK`.
