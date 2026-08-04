# Sync Helix to GCE and prove

Preferred host: **agenticop-master** (do not delete). Project `chrysalis-dev-f5x6qv`, zone `us-central1-a`.

From a machine with `gcloud` + repo checkout:

```bash
# pack (exclude data/node_modules)
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
  node scripts/smoke.mjs
  node scripts/host-smoke.mjs
  bash scripts/gce-nft-smoke.sh
'
```

Proven on 2026-08-04: `SMOKE_OK` · `HOST_SMOKE_OK` · `NFT_SMOKE_OK`.
