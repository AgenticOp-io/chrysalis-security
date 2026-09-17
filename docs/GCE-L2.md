# GCE Mode B L2 prove

Local Windows/lab:

- Phase 1: `npm run bridge-l2-smoke` → **SKIP** without Linux root  
- Phase 2: `npm run bridge-l2-p2-smoke` → **SKIP** without Linux root  

## Auth

`gcloud` must already be logged in (`gcloud auth login` / ADC). Non-interactive agents cannot refresh expired tokens — if reauth fails, treat GCE prove as **blocked**, not skipped-as-green.

Green bar on protected host **agenticop-master**:

```powershell
.\scripts\gce-sync.ps1 -WithL2
# DNA pack + nft (unless -SkipNft) + sudo bridge-l2-smoke
# expect BRIDGE_L2_ICMP_OK · DIVERT_OK · DNA_OK · FAILCLOSED_OK · TEARDOWN_OK · BRIDGE_L2_SMOKE_OK
# then GCE_SYNC_OK

.\scripts\gce-sync.ps1 -WithL2P2
# same pack + sudo bridge-l2-p2-smoke (dual-iface NIC-A/NIC-B in appliance ns)
# expect BRIDGE_L2_P2_IFACE_OK · CROSS_OK · DIVERT_OK · DNA_OK · BRIDGE_L2_P2_SMOKE_OK
# then GCE_SYNC_OK

.\scripts\gce-sync.ps1 -WithL2P3
# same pack + sudo bridge-l2-p3-smoke (transparent divert — client keeps the SERVER IP)
# expect BRIDGE_L2_P3_BRNF_OK · CROSS_OK · BASELINE_OK · DIVERT_OK · TRANSPARENT_OK ·
#        DNA_OK · FAILCLOSED_OK · TEARDOWN_OK · BRIDGE_L2_P3_SMOKE_OK
# then GCE_SYNC_OK
```

`gce-sync -WithL2` / `-WithL2P2` / `-WithL2P3` packs sibling `chrysalis-cwl`, symlinks `@agenticop-io/cwl` on the VM, then runs the L2 smoke under `sudo` (netns/nft need root).  
If sudo is denied, you get `BRIDGE_L2_*_SMOKE_SKIP` — fix NOPASSWD for the SSH user or run as root once.  
Phase 3 additionally needs `br_netfilter`; a host that will not let `bridge-nf-call-iptables` be set gets an honest `BRIDGE_L2_P3_SMOKE_SKIP`, not a fake green.

Deepen (2026-08-11): Phase 1 divert fail-closed + teardown; Phase 2 dual-iface pair in helix ns.  
Phase 3 (2026-09-16): transparent `daddr=server` divert — no client reconfiguration.  
Design: [MODE-B-L2.md](./MODE-B-L2.md). Never delete protected GCE VMs.

**Not a customer soak** — soak is real traffic in `shadow` ([SOAK.md](./SOAK.md)).
