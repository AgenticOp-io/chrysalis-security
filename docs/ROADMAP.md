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

## Now

- [ ] Mode B L2 / dual-NIC appliance path (beyond userspace spike)  
- [ ] Ed25519 DNA signatures (optional alg)  

## Later

- [ ] K8s sidecar  
- [ ] Optional TLS terminate  
- [ ] SIEM export  
