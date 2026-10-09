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
- [x] CWL tip `1.0.39` consume — session cookie **names** on RFC-0032 (`CUTOVER_TIP_1_0_39_OK`); repeat `if` pin-only; hole-catalog lookup on upstreams
- [x] CWL tip `1.0.46` consume — session cookie **policy attrs** (`CUTOVER_TIP_1_0_46_OK`); CSRF cookie **names**; golds 48–50/52–53 pin-only
- [x] CWL tip `1.0.51` consume — `auth.require cookie` names (`CUTOVER_TIP_1_0_51_OK`); golds 56–59 pin-only (db/mail/CORS methods/cache)
- [x] CWL tip `1.0.53` consume — golds `60`–`61` pin-only (`io host` / CORS credentials; `CUTOVER_TIP_1_0_53_OK`)
- [x] CWL tip `1.0.56` consume — cookie purpose overlay (`CUTOVER_TIP_1_0_56_OK`); golds `62`–`63` pin-only
- [x] CWL tip `1.0.61` consume — same-site redirect notes (`CUTOVER_TIP_1_0_61_OK`); golds `66`–`69` pin-only (cache intent and page HTML)
- [x] CWL tip `1.0.62` consume — shared nav id is document text (`CUTOVER_TIP_1_0_62_OK`); gold `70` pin-only
- [x] CWL tip `1.0.67` consume — year, nav list, drawer, asset paths, script URL, same-site form (`CUTOVER_TIP_1_0_67_OK`); golds `71`–`75` and the AgenticOps site genome are document facts
- [x] CWL tip `1.0.70` consume — viewport cut, document identity, social card (`CUTOVER_TIP_1_0_70_OK`); golds `76`–`78` are document facts. A media query is not evaluated and a refused URL is not copied
- [x] CWL tip `1.0.74` consume — head rest, live document, dynamic HTML, named database engine (`CUTOVER_TIP_1_0_74_OK`); golds `79`–`82` are document facts. Helix does not run the live document server, evaluate a media query, open a database, or execute SQL text
- [x] CWL tip `1.0.75` consume — host site emit (`CUTOVER_TIP_1_0_75_OK`); gold `83` year/device host passes and demo Hosting `agenticop-cwl-demo` are document facts. Helix does not fill the calendar year, evaluate a media query, or deploy Hosting
- [x] CWL tip `1.0.76` consume — site 100% contract (`CUTOVER_TIP_1_0_76_OK`); gold `84` year/device/drawer host effects and off-site font URLs are document facts. Helix does not fetch font bytes or deploy live Hosting
- [x] CWL tip `1.0.77` consume — owned fonts (`CUTOVER_TIP_1_0_77_OK`); gold `85` `/fonts.css` and `fonts/*.woff2` are document/host asset facts. Year/device/drawer stay host effects. Helix does not fetch face bytes or deploy live Hosting
- [x] CWL tip `1.0.78` consume — site complete (`CUTOVER_TIP_1_0_78_OK`); gold `86` literal `year 2026;` and CSS checkbox menu are document facts, not Helix. Complete genome drops year/device/drawer host effects. Helix does not inject menu JS or deploy live Hosting
- [x] CWL tip `1.0.79` consume — transport / jobs / UI events (`CUTOVER_TIP_1_0_79_OK`); golds `87`–`89` `stream websocket`, `job.enqueue`, and island event contracts are document facts. Helix does not invent WS frames, job queues, or client hydration. Residual `unsupported:websocket` remains for undeclared peels. Traffic DNA stays the default protect path
- [x] CWL tip `1.0.80` consume — verify dispose messaging (`CUTOVER_TIP_1_0_80_OK`); marketing genome copy is document facts only. No “honest holes” slogans; Helix does not invent from unproven claims. Traffic DNA stays the default protect path
- [x] CWL tip `1.0.81` consume — framework residuals (`CUTOVER_TIP_1_0_81_OK`); gold `90` Nest / LiveView / Flutter / onion / raw-SQL are catalogued hole reasons (RFC-0038). Helix does not invent those runtimes. Customer soak → enforce stays operator-only. Traffic DNA stays the default protect path
- [x] CWL tip `1.0.82` consume — DNA identity (`CUTOVER_TIP_1_0_82_OK`); gold `91` `replaces` / `from peel` / `capability` / `works without client` are document facts (RFC-0039). Helix does not invent a capability browser, peel runtime, or progressive certificate engine. Traffic DNA stays the default protect path
- [x] CWL tip `1.0.83` consume — progressive asset integrity (`CUTOVER_TIP_1_0_83_OK`); gold `92` `script` / `style` + `integrity` / `module` / `crossorigin` are document facts (RFC-0040). Helix does not hash, verify SRI in a browser, or invent a JS/CSS runtime. Traffic DNA stays the default protect path
- [x] CWL tip `1.0.84` consume — page form multipart (`CUTOVER_TIP_1_0_84_OK`); gold `93` `form … enctype multipart` + `field … "file"` are document facts (RFC-0041). Helix does not invent upload middleware, transfer, or storage. Traffic DNA stays the default protect path
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
- [x] Mode B transparent bridge-nf divert (daddr=server) — Phase 3 `gce-bridge-l2-p3-smoke.sh`, **GCE proven** on `agenticop-master` (`BRIDGE_L2_P3_SMOKE_OK` + `GCE_SYNC_OK`)  
- [x] Shadow-log triage ([TRIAGE.md](./TRIAGE.md) · `triage-smoke` → `TRIAGE_SMOKE_OK`) — holes group into surfaces + classes; credential drift exits 2; panel shows the same digest live  
- [x] Response surface DNA ([RESPONSE-SURFACE.md](./RESPONSE-SURFACE.md) · `response-surface-smoke`) — `set_cookie_names` / `redirect_targets`; `HX-COOKIE-DRIFT` / `HX-REDIRECT-DRIFT`; names and hostnames only, absent ≠ empty  
- [x] Helix for Windows — Mode A install + system tray + CLI ([INSTALL-MODE-A-WINDOWS.md](./INSTALL-MODE-A-WINDOWS.md) · `windows-app-smoke` → `WINDOWS_APP_SMOKE_OK`)  
- [x] Shippable bar stamp — [SHIPPABLE.md](./SHIPPABLE.md) · full surface [HELIX-SECURITY-SURFACE.md](./HELIX-SECURITY-SURFACE.md)  
- [x] Windows consumer UX — Protect wizard + panel Lock DNA / watch / block + auto-seal (`seal-smoke` → `SEAL_SMOKE_OK`)  

## Post-ship (ops — not engineering)

- [ ] Customer traffic soak → enforce (follow [SOAK.md](./SOAK.md) after preflight green; never synthetic)

**Non-goals (locked):** no NGFW TLS dependency (D1); DNA block/alert only (D2); no UEBA/signature-WAF replacement (D3); host augment / no NAT homework (D4); CWL never required to enforce (D5).
