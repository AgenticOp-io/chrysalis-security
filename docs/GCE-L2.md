# GCE Mode B L2 prove

Local Windows/lab: `npm run bridge-l2-smoke` → **SKIP** without Linux root.

Green bar on protected host **agenticop-master**:

```powershell
.\scripts\gce-sync.ps1 -WithL2
# DNA pack + nft (unless -SkipNft) + sudo bridge-l2-smoke
# expect BRIDGE_L2_SMOKE_OK then GCE_SYNC_OK
```

`gce-sync -WithL2` runs `sudo node scripts/bridge-l2-smoke.mjs` (netns/nft need root).  
If sudo is denied, you get `BRIDGE_L2_SMOKE_SKIP` — fix NOPASSWD for the SSH user or run as root once.

Design: [MODE-B-L2.md](./MODE-B-L2.md). Never delete protected GCE VMs.
