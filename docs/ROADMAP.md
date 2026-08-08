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

- [x] Mode B L2 / dual-NIC appliance path — design: [MODE-B-L2.md](./MODE-B-L2.md); GCE green via `gce-sync -WithL2`  
- [x] UT ↔ CWL spine demo path: `npm run ut-gce-demo` → `UT_GCE_DEMO_OK` (CWL `smoke:ut-spine`; Convert does not own)  
- [x] `npm run test:dna` — DNA pack without CWL (BEGINNING / D5)  
- [x] Docker Compose out-of-box lab (`docker-compose.yml` + `compose-smoke`)  
- [x] Request JSON key fingerprint (`request_key_fingerprint` + `HX-REQUEST-SCHEMA-DRIFT`)  
- [x] `/__helix/healthz` + SIEM NDJSON hole export (`SIEM_LOG`)  
- [x] Optional TLS terminate (`HELIX_TLS_CERT`/`KEY` + `tls-smoke`)  
- [x] K8s sidecar sketch (`deploy/k8s/helix-sidecar.yaml`)  
- [x] Enforce `status_classes` / `content_class` + fail-closed JSON (`status-smoke`)  
- [x] Query-name fingerprint (`query_key_fingerprint` + `HX-QUERY-SCHEMA-DRIFT`)  
- [x] Nested JSON key fingerprint depth≤2 (`nested-drift-smoke`)  
- [x] CWL tip sync check (`cwl-sync-check` → `CWL_SYNC_OK`)  
- [x] Filebeat SIEM recipe ([FILEBEAT.md](./FILEBEAT.md))  
- [x] DNA hot reload (`POST /__helix/reload` + SIGHUP) — [MODES.md](./MODES.md)  
- [x] `HELIX_MAX_BODY_BYTES` → `HX-BODY-TOO-LARGE`  
- [x] Product gap map ([PRODUCT.md](./PRODUCT.md)) + `helix report` / `helix ready`  
- [x] Mode A systemd install sketch ([INSTALL-MODE-A.md](./INSTALL-MODE-A.md))  
- [x] Shadow-log hole counter → `helix ready --shadow-log`  
- [x] Real-site beginning pack (`fixtures/real-site` + `real-site-smoke`)  
- [x] K8s image smoke (`k8s-image-smoke` → `helix:local`)  
- [x] Splunk HEC recipe ([SPLUNK.md](./SPLUNK.md))  
- [x] Mode B L2 GCE runbook ([GCE-L2.md](./GCE-L2.md))  
- [x] RFC-0023 deploy profile apply at seed/compare (Secure consumes CWL gold profile)  
- [x] Shadow soak runbook ([SOAK.md](./SOAK.md))  
- [x] GCE sync DNA pack + nft green (`GCE_SYNC_OK` / `NFT_SMOKE_OK`) — L2 via `sudo` on sync  
- [x] Mode B L2 **GCE green** (`BRIDGE_L2_SMOKE_OK` via `gce-sync -WithL2` + sudo)  
- [x] Cert lifecycle UX — `promoteDna` / `verifyParentChain` / [CERT-LIFECYCLE.md](./CERT-LIFECYCLE.md) / `promote-chain-smoke`  
- [x] SIEM dashboards — `deploy/siem/helix-holes.{kibana.ndjson,splunk.json}`  
- [x] K8s push/render — `k8s-push` + [K8S.md](./K8S.md)  
- [x] Control panel — `/__helix/` + `panel-smoke`  

## Later

- [ ] Customer traffic soak (operational — follow [SOAK.md](./SOAK.md))  

**Non-goals (locked):** no NGFW TLS dependency (D1); DNA block/alert only (D2); no UEBA/signature-WAF replacement (D3); host augment / no NAT homework (D4); CWL never required to enforce (D5).
