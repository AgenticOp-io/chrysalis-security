# GCE Mode B L2 prove

Local Windows/lab: `npm run bridge-l2-smoke` → **SKIP** without Linux root.

## Auth

`gcloud` must already be logged in (`gcloud auth login` / ADC). Non-interactive agents cannot refresh expired tokens — if reauth fails, treat GCE prove as **blocked**, not skipped-as-green.

Green bar on protected host **agenticop-master**:

```powershell
.\scripts\gce-sync.ps1 -WithL2
# DNA pack + nft (unless -SkipNft) + sudo bridge-l2-smoke
# expect BRIDGE_L2_ICMP_OK · DIVERT_OK · DNA_OK · FAILCLOSED_OK · TEARDOWN_OK · BRIDGE_L2_SMOKE_OK
# then GCE_SYNC_OK
```

`gce-sync -WithL2` runs `sudo node scripts/bridge-l2-smoke.mjs` (netns/nft need root).  
If sudo is denied, you get `BRIDGE_L2_SMOKE_SKIP` — fix NOPASSWD for the SSH user or run as root once.

Deepen (2026-08-11): divert fail-closed when Helix is down; teardown restores direct upstream.  
Design: [MODE-B-L2.md](./MODE-B-L2.md). Never delete protected GCE VMs.

**Not a customer soak** — soak is real traffic in `shadow` ([SOAK.md](./SOAK.md)).
