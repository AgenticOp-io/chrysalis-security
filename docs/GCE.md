# Sync Helix to GCE and prove

Preferred host: **agenticop-master** (do not delete). Project `chrysalis-dev-f5x6qv`, zone `us-central1-a`.

## One command (Windows)

From `chrysalis-security`:

```powershell
.\scripts\gce-sync.ps1
# or: .\scripts\gce-sync.ps1 -SkipNft
# or: .\scripts\gce-sync.ps1 -SyncOnly
```

## Manual

```bash
tar -czf /tmp/chrysalis-security-gce.tgz --exclude=data --exclude=node_modules --exclude=.git -C /path/to/chrysalis-security .

gcloud compute scp /tmp/chrysalis-security-gce.tgz agenticop-master:/tmp/chrysalis-security-gce.tgz \
  --zone=us-central1-a --project=chrysalis-dev-f5x6qv

gcloud compute ssh agenticop-master --zone=us-central1-a --project=chrysalis-dev-f5x6qv --command='
  set -e
  mkdir -p ~/chrysalis-security
  tar -xzf /tmp/chrysalis-security-gce.tgz -C ~/chrysalis-security
  sed -i "s/\r$//" ~/chrysalis-security/scripts/*.sh
  chmod +x ~/chrysalis-security/scripts/*.sh
  cd ~/chrysalis-security
  node scripts/dna-core-smoke.mjs
  node scripts/smoke.mjs
  node scripts/host-smoke.mjs
  node scripts/static-smoke.mjs
  bash scripts/gce-nft-smoke.sh
'
```

Proven: `SMOKE_OK` · `HOST_SMOKE_OK` · `NFT_SMOKE_OK` · `STATIC_SMOKE_OK` · `DNA_CORE_OK`.
