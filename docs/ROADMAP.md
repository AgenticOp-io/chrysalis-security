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

- [x] CWL ↔ DNA bridge (RFC-0022): `packages/cwl-bridge` + `seed-cwl` / `compare-cwl` + `cwl-bridge-smoke`  
- [x] Platform cutover E2E: `cutover-smoke` (CWL gold → strip → promote(+HMAC) → compare → enforce allow/deny)  
- [x] Ed25519 DNA signatures (optional alg beside hmac-sha256)  

## Now

- [ ] Mode B L2 / dual-NIC appliance path (beyond userspace spike) — design: [MODE-B-L2.md](./MODE-B-L2.md)  
- [x] UT ↔ CWL spine demo path: `npm run ut-gce-demo` → `UT_GCE_DEMO_OK` (CWL `smoke:ut-spine`; Convert does not own)  

## Later

- [ ] Mode B L2 **implementation** (design-only until Now clears)  
- [ ] K8s sidecar  
- [ ] Optional TLS terminate  
- [ ] SIEM export  

**Non-goals (locked):** no NGFW TLS dependency (D1); DNA block/alert only (D2); no UEBA/signature-WAF replacement (D3); host augment / no NAT homework (D4).
