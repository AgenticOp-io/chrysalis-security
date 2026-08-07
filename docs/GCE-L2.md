# GCE Mode B L2 prove

Local Windows/lab: `npm run bridge-l2-smoke` → **SKIP** without Linux root.

Green bar on protected host **agenticop-master** only:

```powershell
# from chrysalis-security on a machine with gcloud + SSH to agenticop-master
.\scripts\gce-sync.ps1 -WithL2
# expect BRIDGE_L2_SMOKE_OK then GCE_SYNC_OK
```

Design: [MODE-B-L2.md](./MODE-B-L2.md). Never delete protected GCE VMs.
