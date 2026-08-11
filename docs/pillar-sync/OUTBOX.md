# Secure pillar-sync (git)

**Pull first:** `git pull` + `git -C ../chrysalis-cwl pull --ff-only` + `git -C ../chrysalis-convert pull --ff-only`  
**Read:** CWL `BOARD.md` + `OUTBOX.md`  
**Write:** only this file â†’ commit â†’ `git push` candidate

---

## 2026-08-11 — secure-tip-1.0.18

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.18  
**CWL SHA:** `0b7afcc`  
**Ask:** CWL OUTBOX `secure-tip-1.0.18`

### Reply

```text
SECURE_TIP_1_0_18_OK
SHA: 76309e5
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.18
CWL_SHA: 0b7afcc
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.18)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_MULTIHOST_OK · LIVE_MATCH_OK · DNA_CORE_OK
HEARTBEAT: waiting
```

### Notes

- Registry `@agenticop-io/cwl` still tops at 1.0.17 — pin via `file:` sibling (OUTBOX allowed)
- Re-proved DNA seed / cutover / live-match / dna-core (no new invent packs)
- Customer soak remains ops; D5 DNA-only; no CWL/Convert edits

---

## 2026-08-11 — secure-static-smoke-pack

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL BOARD `secure-static-smoke-pack`

### Reply

```text
SECURE_STATIC_SMOKE_PACK: ok
SHA: 6c15fc8
BRANCH: candidate/live-match-step4
TOKENS: STATIC_SMOKE_LEARN_OK Â· STATIC_SMOKE_COLLAPSE_JS_OK Â· STATIC_SMOKE_COLLAPSE_CSS_OK Â· STATIC_SMOKE_DENY_OK Â· STATIC_SMOKE_OK Â· GCE_SMOKE_OK
HEARTBEAT: waiting
```

### Notes

- Deepened `static-smoke`: unit collapse Â· learn asserts `/**/*.js` + `/**/*.css` Â· enforce never-learned hashed JS+CSS allow Â· `/api/backdoor` deny
- Already in `test:dna` + `gce-smoke` (pack inclusion proved â†’ `GCE_SMOKE_OK`)
- Docs brief: GCE Â· ROADMAP Â· WHITEPAPER
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 â€” secure-schema-drift-pack

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-schema-drift-pack`

### Reply

```text
SECURE_SCHEMA_DRIFT_PACK: ok
SHA: 7c53afd
BRANCH: candidate/live-match-step4
TOKENS: SCHEMA_DRIFT_UNIT_EXTRA_OK Â· SCHEMA_DRIFT_UNIT_MISSING_OK Â· SCHEMA_DRIFT_UNIT_FAILCLOSED_OK Â· SCHEMA_DRIFT_UNIT_ALLOW_OK Â· SCHEMA_DRIFT_FIXTURE_LEARN_OK Â· SCHEMA_DRIFT_ENFORCE_ALLOW_OK Â· SCHEMA_DRIFT_ENFORCE_EXTRA_OK Â· SCHEMA_DRIFT_ENFORCE_MISSING_OK Â· SCHEMA_DRIFT_SHADOW_OK Â· SCHEMA_DRIFT_SMOKE_OK Â· GCE_SMOKE_OK
HEARTBEAT: waiting
```

### Notes

- Deepened `schema-drift-smoke`: fixture `fixtures/schema-drift/observations.ndjson` â†’ learn/promote; unit extra/missing/fail-closed/allow; enforce allow + extra + missing; shadow header
- Already in `test:dna` + `gce-smoke` (pack inclusion proved â†’ `GCE_SMOKE_OK`)
- demo-api `DRIFT=extra|missing` (legacy `DRIFT=1` = extra)
- Docs brief: GCE Â· ROADMAP Â· WHITEPAPER
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 â€” secure-sign-fixture

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL BOARD `secure-sign-fixture`

### Reply

```text
SECURE_SIGN_FIXTURE: ok
SHA: 03c3b14
BRANCH: candidate/live-match-step4
TOKENS: SIGN_FIXTURE_PROMOTE_OK Â· SIGN_FIXTURE_UNSIGNED_REJECT Â· SIGN_FIXTURE_OK Â· SIGN_SMOKE_OK Â· ED25519_SMOKE_OK
HEARTBEAT: waiting
```

### Notes

- Deepened `sign-smoke`: fixture keys `fixtures/sign/hmac.key` + draft â†’ signed promote ok; unsigned promote â†’ `HX-DNA-UNSIGNED` / `HELIX_DNA_REQUIRE` reject
- Already in `test:dna` + `gce-smoke` (pack inclusion proved)
- Docs: SIGNED-DNA Â· GCE Â· ROADMAP brief
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 â€” secure-gce-smoke-pack

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-gce-smoke-pack`

### Reply

```text
SECURE_GCE_SMOKE_PACK: ok
SHA: ca0d379
BRANCH: candidate/live-match-step4
TOKENS: SOAK_PREFLIGHT_OK Â· SIEM_FIXTURE_OK Â· RELOAD_FIXTURE_OK Â· GCE_SMOKE_OK
HEARTBEAT: waiting
```

### Notes

- Wired `soak-preflight-smoke` Â· `siem-fixture-smoke` Â· `reload-fixture-smoke` into `scripts/gce-smoke.mjs` (already in `test:dna`)
- Node DNA-only fixtures â€” win32 green (no SKIP needed); nft/L2 remain honest SKIP on win32
- Docs one-liner: GCE.md DNA tokens Â· ROADMAP ship-pack checkbox
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 â€” secure-reload-fixture

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-reload-fixture`

### Reply

```text
SECURE_RELOAD_FIXTURE: ok
SHA: 76dcb58
BRANCH: candidate/live-match-step4
TOKENS: RELOAD_FIXTURE_DENY_OK Â· RELOAD_FIXTURE_HOT_OK Â· RELOAD_FIXTURE_OK
HEARTBEAT: waiting
```

### Notes

- `npm run reload-fixture-smoke` â€” fixture learnâ†’promote DNA A â†’ enforce deny â†’ promote DNA B onto live `DNA=` â†’ `POST /__helix/reload` (same PID) â†’ allow
- Docs brief: MODES / CERT-LIFECYCLE / SOAK / ROADMAP / PRODUCT
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 â€” secure-cutover-multihost

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-cutover-multihost`

### Reply

```text
SECURE_CUTOVER_MULTIHOST: ok
SHA: 72b2e16
BRANCH: candidate/live-match-step4
TOKENS: CUTOVER_MULTIHOST_OK Â· CUTOVER_SMOKE_OK
HEARTBEAT: waiting
```

### Notes

- Extended `cutover-smoke`: RFC-0023 `deploy-profile-api.json` (`host=api`) â†’ seed all routes `host=api` â†’ compare requires host identity â†’ promote/enforce allow `api` / deny `default` â†’ `dna_gaps` carry `host=api`
- Docs: CWL-BRIDGE / LIVE-MATCH / ROADMAP brief
- D5 DNA-only protect; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 â€” secure-siem-fixture

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-siem-fixture`

### Reply

```text
SECURE_SIEM_FIXTURE: ok
SHA: 86f5767
WORK: 7a04388
BRANCH: candidate/live-match-step4
TOKENS: SIEM_FIXTURE_SHADOW_OK Â· SIEM_FIXTURE_ENFORCE_OK Â· SIEM_FIXTURE_OK
HEARTBEAT: waiting
```

### Notes

- `npm run siem-fixture-smoke` â€” learnâ†’promoteâ†’shadow SIEM_LOG append â†’ enforce SIEM_LOG append
- Generic file/NDJSON sink only; no Splunk/Datadog/vendor connector invent (D3)
- Docs: SIEM.md fixture section Â· SOAK/PRODUCT/ROADMAP pointers
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 â€” secure-mode-a-failclosed

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-mode-a-failclosed`

### Reply

```text
SECURE_MODE_A_FAILCLOSED: ok
SHA: a7c2976
BRANCH: candidate/live-match-step4
TOKENS: MODE_A_DIVERT_OK Â· MODE_A_DNA_OK Â· MODE_A_FAILCLOSED_OK Â· MODE_A_TEARDOWN_OK Â· NFT_SMOKE_OK Â· GCE_SYNC_OK Â· LOCAL NFT_SMOKE_SKIP (win32 honest)
HEARTBEAT: waiting
```

### Notes

- Extended `gce-nft-smoke.sh` + `nft-smoke.mjs`: divert DNA â†’ Helix-down fail-closed â†’ teardown restore
- Docs: INSTALL-MODE-A / GCE / ROADMAP; `host-redirect-nft.sh` fail-closed contract comment
- GCE prove on agenticop-master via `gce:auth:activate` + `gce-sync` (default nft)
- D5 DNA-only; no CWL/Convert edits; no VM deletes

---

## 2026-08-11 â€” secure-soak-preflight

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-soak-preflight`

### Reply

```text
SECURE_SOAK_PREFLIGHT: ok
SHA: 92f80d8
BRANCH: candidate/live-match-step4
TOKENS: SOAK_PREFLIGHT_LEARN_OK Â· SOAK_PREFLIGHT_REPORT_OK Â· SOAK_PREFLIGHT_PROMOTE_OK Â· SOAK_PREFLIGHT_SHADOW_OK Â· SOAK_PREFLIGHT_READY_DIRTY_FAIL Â· SOAK_PREFLIGHT_BUDGET_OK Â· SOAK_PREFLIGHT_READY_CLEAN_OK Â· SOAK_PREFLIGHT_OK
HEARTBEAT: waiting
```

### Notes

- `npm run soak-preflight-smoke` â€” fixture learnâ†’reportâ†’promoteâ†’shadowâ†’ready
- Dirty fixture shadow log â†’ ready enforce exit 2; clean â†’ exit 0; budget honesty covered
- Docs: SOAK.md preflight + operator enforce path; PRODUCT/ROADMAP
- No fake customer traffic; D5 DNA-only (no CWL fork); no GCE deletes

---

## 2026-08-11 â€” secure-mode-b-phase2

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-mode-b-phase2`

### Reply

```text
SECURE_MODE_B_P2: ok
SHA: 9bc2cd9
BRANCH: candidate/live-match-step4
TOKENS: BRIDGE_L2_P2_IFACE_OK Â· BRIDGE_L2_P2_CROSS_OK Â· BRIDGE_L2_P2_DIVERT_OK Â· BRIDGE_L2_P2_DNA_OK Â· BRIDGE_L2_P2_SMOKE_OK Â· GCE_SYNC_OK Â· LOCAL BRIDGE_L2_P2_SMOKE_SKIP (win32 honest)
HEARTBEAT: waiting
```

### Notes

- Docs: MODE-B-L2 Phase 2 dual-iface sketch; GCE-L2 / ROADMAP / GCE / SOAK updated
- Lab: `gce-bridge-l2-p2-smoke.sh` + `bridge-l2-p2-smoke.mjs`; `gce-sync -WithL2P2`
- helix-bridge DNA worker; Mode A nft redirect; D5 DNA-only (no CWL required for P2)
- No VM deletes; no fake soak; no CWL fork

---

## 2026-08-11 â€” secure-fleet-standby (idle stop)

**To:** cwl  
**Priority:** P2  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-fleet-standby` Â· BOARD `CWL_FLEET_IDLE: yes`

### Reply

```text
SECURE_STANDBY: ok
SHA: bf53e29
HEARTBEAT: idle-stop
BRANCH: candidate/live-match-step4
FLEET: off Â· CWL_FLEET_IDLE: yes
NOTE: 5m loop stopped; no open Secure asks
```

### Notes

- Tick pulled all three; BOARD/HEARTBEAT idle â€” stop condition met
- No Phase 2 / soak invent

---

## 2026-08-11 â€” secure-fleet-standby (tick)

**To:** cwl  
**Priority:** P2  
**Status:** waiting  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-fleet-standby`

### Reply

```text
SECURE_STANDBY: ok
SHA: 9250541
HEARTBEAT: waiting
BRANCH: candidate/live-match-step4
FLEET: on Â· CWL_FLEET_IDLE: no
NOTE: no Phase 2 / soak invent without new open ask
```

### Notes

- Pulled CWL/Convert/Secure ff-only; BOARD FLEET_MODE on; open ask = standby only
- GCE L2 prove already green (`6c2d624`); idle until CWL_FLEET_IDLE or new Secure ask

---

## 2026-08-11 â€” SECURE_NEXT (GCE L2 prove)

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** user â€” gce reauthed; prove Mode B L2 deepen on agenticop-master

### Reply

```text
SECURE_NEXT: ok
SHA: 95fbd21
BRANCH: candidate/live-match-step4
PICK: GCE prove (after reauth)
HOST: agenticop-master
TOKENS: BRIDGE_L2_ICMP_OK Â· BRIDGE_L2_DIVERT_OK Â· BRIDGE_L2_DNA_OK Â· BRIDGE_L2_FAILCLOSED_OK Â· BRIDGE_L2_TEARDOWN_OK Â· BRIDGE_L2_SMOKE_OK Â· GCE_SYNC_OK
FIX: gce-sync packs sibling CWL + symlinks @agenticop-io/cwl (WithL2 implies CWL)
```

### Notes

- First post-reauth run failed: remote missing `@agenticop-io/cwl` (tarball excludes `node_modules`)
- Fixed `scripts/gce-sync.ps1`: when sibling CWL present, pack + `ln -sfn` into `node_modules/@agenticop-io/cwl` (+ `@chrysalis/cwl`); `-WithL2` implies CWL pack
- Re-run `.\scripts\gce-sync.ps1 -WithL2` â†’ full token chain + `GCE_SYNC_OK`
- Phase 1 now boring on GCE â€” Mode B Phase 2 sketch is unblocked when asked
- D5 DNA-only Â· no CWL/Convert edits

---

## 2026-08-11 â€” SECURE_NEXT (soak runbook gaps)

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** user continue after Mode B L2 deepen

### Reply

```text
SECURE_NEXT: ok
SHA: a9d2910
BRANCH: candidate/live-match-step4
PICK: C (soak runbook gaps)
GCE_L2: blocked (gcloud reauth failed â€” non-interactive; not skipped-as-green)
LOCAL: BRIDGE_L2_SMOKE_SKIP (win32 honest) Â· LIVE_MATCH_OK
DOCS: SOAK.md Â· GCE-L2.md
DEFER: A already met (cutover multi-host) Â· B Phase 2 until GCE Phase 1 boring
```

### Notes

- Tried GCE prove prerequisite: `gcloud` token refresh failed; need human `gcloud auth login` then `.\scripts\gce-sync.ps1 -WithL2` on **agenticop-master**
- Option **C**: documented soak runbook gaps (no fake customer traffic); pre-soak gate + exit-to-enforce; L2 lab â‰  soak
- Option **A**: left alone â€” `cutover-smoke` already proves host=`api` + `dna_gaps`
- Option **B**: deferred â€” Phase 2 only after Phase 1 stays boring on GCE
- Docs landed in `9d978f4`; this OUTBOX ack follows
- D5 DNA-only protect Â· no CWL invent Â· no edits to CWL/Convert

---

## 2026-08-11 â€” mode-b-l2-deepen (done)

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** user charter â€” deepen Secure (Mode B L2)

### Reply

```text
SECURE_DEEPEN: ok
SLICE: Mode B L2 Phase 1 deepen
TOKENS: BRIDGE_L2_ICMP_OK Â· DIVERT_OK Â· DNA_OK Â· FAILCLOSED_OK Â· TEARDOWN_OK Â· BRIDGE_L2_SMOKE_OK
BRANCH: candidate/live-match-step4
DOCS: MODE-B-L2.md Â· GCE-L2.md Â· ROADMAP.md
NOTE: full netns prove needs GCE Linux root (Windows = honest SKIP)
```

### Notes

- `gce-bridge-l2-smoke.sh` now proves nft divert publicâ†’helix, DNA allow/deny via divert, Helix-down fail-closed, divert teardown + direct upstream restore
- Next Secure: customer soak ([SOAK.md](../SOAK.md)) or Mode B Phase 2 when Phase 1 stays boring on GCE
- CWL invent remains CLOSED @ 1.0.17 â€” no language ask

---

## 2026-08-10 â€” sync-secure-tip-wrap (done)

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `sync-secure-tip-wrap`

### Reply

```text
SECURE_SYNC: ok
SHA: bf399ac
BRANCH: candidate/live-match-step4
CWL_PIN: @agenticop-io/cwl@^1.0.17 (resolved 1.0.17)
SMOKES: cwl-bridge-smoke Â· cutover-smoke Â· live-match-smoke
DNA_SEED: wrapped
```

### Notes

- Pin `@agenticop-io/cwl@^1.0.17` resolves to **1.0.17**
- `packages/cwl-bridge` thin-wraps `pathTemplateShapeEqual` from `@agenticop-io/cwl/dna-seed` (no local fork)
- Protect stays DNA-only (D5)
- Pulled ff-only: Secure `candidate/live-match-step4`, CWL `candidate/cwl-ingest-matrix-comment-fix` @ `cdc2b65`, Convert `candidate/wptp-convert-orbit` @ `b88c811a`
- P0 `sync-convert-execute` is Convert-owned â€” not claimed by Secure
