# Helix roadmap

North star: [BEGINNING.md](./BEGINNING.md) · locks: [DECISIONS.md](./DECISIONS.md) · NGFW: [AUGMENT.md](./AUGMENT.md)

## Done

- [x] Three-rule canon + process + beginning  
- [x] D1–D4 decisions (no NGFW TLS dependency; DNA block/alert only; no UEBA; host augment)  
- [x] Proxy learn / enforce / shadow + `smoke.mjs`  
- [x] Mode A soft host agent (`helix-agent`) + `host-smoke.mjs`  
- [x] Linux nft redirect helper (`scripts/host-redirect-nft.sh`)  
- [x] Dockerfile env surface  
- [x] GCE prove: `SMOKE_OK` · `HOST_SMOKE_OK` · `NFT_SMOKE_OK`  
- [x] Static-asset path collapse (`/**/*.<ext>`) + `static-smoke` / `dna-core-smoke`  
- [x] `scripts/gce-sync.ps1` Helix sync+prove  
- [x] JSON schema drift enforce smoke (`schema-drift-smoke`)  
- [x] Persistent mini-site behind helix-agent on GCE (`gce-site-up.sh`, port 18085)  
- [x] Signed DNA (`hmac-sha256`) + `sign-smoke` / `helix verify`  
- [x] Mode B userspace bridge spike (`helix-bridge` + `bridge-smoke`)  

## Done (continued)

- [x] D5 — CWL never required to learn/enforce (SKIP when pillar absent)  
- [x] CWL ↔ DNA bridge (RFC-0022): prefers pillar `cwl-dna-seed.mjs` + `packages/cwl-bridge`  
- [x] Platform cutover E2E: `cutover-smoke` (CWL gold → strip → promote(+HMAC) → compare → enforce allow/deny)  
- [x] Ed25519 DNA signatures (optional alg beside hmac-sha256)  
- [x] Chimera + Helix coexistence playbook: [CHIMERA-HELIX-COEXISTENCE.md](./CHIMERA-HELIX-COEXISTENCE.md)  

## Now

- [ ] Mode B L2 / dual-NIC appliance path — design: [MODE-B-L2.md](./MODE-B-L2.md); lab entry: `npm run bridge-l2-smoke` (SKIP off Linux/root)  
- [x] UT ↔ CWL spine demo path: `npm run ut-gce-demo` → `UT_GCE_DEMO_OK` (CWL `smoke:ut-spine`; Convert does not own)  
- [x] `npm run test:dna` — DNA pack without CWL (BEGINNING / D5)  

## Later

- [ ] Mode B L2 **GCE green** (`BRIDGE_L2_SMOKE_OK` on agenticop-master)  
- [ ] K8s sidecar  
- [ ] Optional TLS terminate  
- [ ] SIEM export  

**Non-goals (locked):** no NGFW TLS dependency (D1); DNA block/alert only (D2); no UEBA/signature-WAF replacement (D3); host augment / no NAT homework (D4); CWL never required to enforce (D5).
