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
- [x] Static-smoke pack harden — learn collapse · never-learned hashed JS+CSS allow · API deny (`STATIC_SMOKE_OK`; in `gce-smoke` + `test:dna`)  
- [x] `scripts/gce-sync.ps1` Helix sync+prove  
- [x] JSON schema drift enforce smoke (`schema-drift-smoke`)  
- [x] Schema-drift fixture pack harden — fixture learn · allow / extra / missing enforce · shadow (`SCHEMA_DRIFT_SMOKE_OK`; in `gce-smoke` + `test:dna`)  
- [x] Persistent mini-site behind helix-agent on GCE (`gce-site-up.sh`, port 18085)  
- [x] Signed DNA (`hmac-sha256`) + `sign-smoke` / `helix verify`  
- [x] Sign/promote fixture deepen — fixture keys · signed promote ok · unsigned reject (`SIGN_FIXTURE_OK`; in `gce-smoke` + `test:dna`) 
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
- [x] GCE DNA ship pack wires soak/SIEM/reload fixtures (`gce-smoke` → `SOAK_PREFLIGHT_OK` · `SIEM_FIXTURE_OK` · `RELOAD_FIXTURE_OK`; also `test:dna`)  
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
- [x] Reload **fixture** smoke (`reload-fixture-smoke` → `RELOAD_FIXTURE_OK`) — promote onto live DNA + hot reload, same PID  
- [x] `HELIX_MAX_BODY_BYTES` → `HX-BODY-TOO-LARGE`  
- [x] Product gap map ([PRODUCT.md](./PRODUCT.md)) + `helix report` / `helix ready`  
- [x] Mode A systemd install sketch ([INSTALL-MODE-A.md](./INSTALL-MODE-A.md))  
- [x] Shadow-log hole counter → `helix ready --shadow-log`  
- [x] Real-site beginning pack (`fixtures/real-site` + `real-site-smoke`)  
- [x] K8s image smoke (`k8s-image-smoke` → `helix:local`)  
- [x] Splunk HEC recipe ([SPLUNK.md](./SPLUNK.md))  
- [x] Mode B L2 GCE runbook ([GCE-L2.md](./GCE-L2.md))  
- [x] RFC-0023 deploy profile apply at seed/compare (Secure consumes CWL gold profile)  
- [x] Cutover multi-host hygiene — `CUTOVER_MULTIHOST_OK` (non-`default` host=api seed → compare → enforce + `dna_gaps`)  
- [x] Shadow soak runbook ([SOAK.md](./SOAK.md))  
- [x] GCE sync DNA pack + nft green (`GCE_SYNC_OK` / `NFT_SMOKE_OK`) — L2 via `sudo` on sync  
- [x] Mode B L2 **GCE green** (`BRIDGE_L2_SMOKE_OK` via `gce-sync -WithL2` + sudo)  
- [x] Cert lifecycle UX — `promoteDna` / `verifyParentChain` / [CERT-LIFECYCLE.md](./CERT-LIFECYCLE.md) / `promote-chain-smoke`  
- [x] SIEM dashboards — `deploy/siem/helix-holes.{kibana.ndjson,splunk.json}`  
- [x] K8s push/render — `k8s-push` + [K8S.md](./K8S.md)  
- [x] Control panel — `/__helix/` + `panel-smoke`  
- [x] Local lab flip — `npm run local-lab` + [LOCAL-LAB.md](./LOCAL-LAB.md)  
- [x] Browser HTML 403 + `/__helix/attack` proof page + `local-lab-tunnel`  

- [x] CWL tip `1.0.17` consume — `@agenticop-io/cwl@1.0.17` (dna-seed path-shape SoR thin-wrap; nested/status/request/query seed parity)
- [x] Rosetta Step 4 Live match — `docs/LIVE-MATCH.md` · `npm run live-match-smoke`  
- [x] Mode B L2 **deepen** — nft divert + fail-closed + teardown (`BRIDGE_L2_FAILCLOSED_OK` / `TEARDOWN_OK`)  
- [x] Mode B L2 **Phase 2** — dual-iface NIC-A/NIC-B in appliance ns (`BRIDGE_L2_P2_IFACE_OK` / `CROSS_OK` / `DNA_OK` / `SMOKE_OK`)  
- [x] Mode A host-redirect **fail-closed** — divert+Helix-down no silent 200 + teardown (`MODE_A_FAILCLOSED_OK` / `MODE_A_TEARDOWN_OK` · `NFT_SMOKE_OK`)  

## Later

- [x] Soak **preflight** smoke (`soak-preflight-smoke` → `SOAK_PREFLIGHT_OK`) — fixture learn→report→shadow→ready; no fake customers  
- [x] SIEM_LOG **fixture** smoke (`siem-fixture-smoke` → `SIEM_FIXTURE_OK`) — shadow/enforce holes → file sink; no vendor invent  
- [x] Credential-surface hole severity ([SEVERITY.md](./SEVERITY.md) · `severity-smoke` → `SEVERITY_SMOKE_OK`) — ops overlay, not certified content; enforce gate blocks on login/session drift  
- [x] Operator egress review + overlay CLI — `helix upstreams` / `helix sensitivity`  
- [x] Cinderpath Mode A runnable lab (`cinderpath-lab` → `CINDERPATH_LAB_OK`) — stub control plane, no WireGuard  
- [x] Certified literal surfaces survive the static-asset collapse (`/connect/qr.png` no longer denied under a CWL-seeded certificate)  
- [x] Mode B transparent bridge-nf divert (daddr=server) — Phase 3 lab + `gce-bridge-l2-p3-smoke.sh`; **GCE prove pending reauth**  
- [ ] Customer traffic soak (operational — follow [SOAK.md](./SOAK.md) after preflight green)  


**Non-goals (locked):** no NGFW TLS dependency (D1); DNA block/alert only (D2); no UEBA/signature-WAF replacement (D3); host augment / no NAT homework (D4); CWL never required to enforce (D5).
