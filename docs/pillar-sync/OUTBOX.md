# Secure pillar-sync (git)

**Pull first:** `git pull` + `git -C ../chrysalis-cwl pull --ff-only` + `git -C ../chrysalis-convert pull --ff-only`  
**Read:** CWL `BOARD.md` + `OUTBOX.md`  
**Write:** only this file → commit → `git push` candidate

---

## 2026-08-11 — secure-siem-fixture

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-siem-fixture`

### Reply

```text
SECURE_SIEM_FIXTURE: ok
SHA: 7a04388
BRANCH: candidate/live-match-step4
TOKENS: SIEM_FIXTURE_SHADOW_OK · SIEM_FIXTURE_ENFORCE_OK · SIEM_FIXTURE_OK
HEARTBEAT: waiting
```

### Notes

- `npm run siem-fixture-smoke` — learn→promote→shadow SIEM_LOG append → enforce SIEM_LOG append
- Generic file/NDJSON sink only; no Splunk/Datadog/vendor connector invent (D3)
- Docs: SIEM.md fixture section · SOAK/PRODUCT/ROADMAP pointers
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 — secure-mode-a-failclosed

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
TOKENS: MODE_A_DIVERT_OK · MODE_A_DNA_OK · MODE_A_FAILCLOSED_OK · MODE_A_TEARDOWN_OK · NFT_SMOKE_OK · GCE_SYNC_OK · LOCAL NFT_SMOKE_SKIP (win32 honest)
HEARTBEAT: waiting
```

### Notes

- Extended `gce-nft-smoke.sh` + `nft-smoke.mjs`: divert DNA → Helix-down fail-closed → teardown restore
- Docs: INSTALL-MODE-A / GCE / ROADMAP; `host-redirect-nft.sh` fail-closed contract comment
- GCE prove on agenticop-master via `gce:auth:activate` + `gce-sync` (default nft)
- D5 DNA-only; no CWL/Convert edits; no VM deletes

---

## 2026-08-11 — secure-soak-preflight

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
TOKENS: SOAK_PREFLIGHT_LEARN_OK · SOAK_PREFLIGHT_REPORT_OK · SOAK_PREFLIGHT_PROMOTE_OK · SOAK_PREFLIGHT_SHADOW_OK · SOAK_PREFLIGHT_READY_DIRTY_FAIL · SOAK_PREFLIGHT_BUDGET_OK · SOAK_PREFLIGHT_READY_CLEAN_OK · SOAK_PREFLIGHT_OK
HEARTBEAT: waiting
```

### Notes

- `npm run soak-preflight-smoke` — fixture learn→report→promote→shadow→ready
- Dirty fixture shadow log → ready enforce exit 2; clean → exit 0; budget honesty covered
- Docs: SOAK.md preflight + operator enforce path; PRODUCT/ROADMAP
- No fake customer traffic; D5 DNA-only (no CWL fork); no GCE deletes

---

## 2026-08-11 — secure-mode-b-phase2

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
TOKENS: BRIDGE_L2_P2_IFACE_OK · BRIDGE_L2_P2_CROSS_OK · BRIDGE_L2_P2_DIVERT_OK · BRIDGE_L2_P2_DNA_OK · BRIDGE_L2_P2_SMOKE_OK · GCE_SYNC_OK · LOCAL BRIDGE_L2_P2_SMOKE_SKIP (win32 honest)
HEARTBEAT: waiting
```

### Notes

- Docs: MODE-B-L2 Phase 2 dual-iface sketch; GCE-L2 / ROADMAP / GCE / SOAK updated
- Lab: `gce-bridge-l2-p2-smoke.sh` + `bridge-l2-p2-smoke.mjs`; `gce-sync -WithL2P2`
- helix-bridge DNA worker; Mode A nft redirect; D5 DNA-only (no CWL required for P2)
- No VM deletes; no fake soak; no CWL fork

---

## 2026-08-11 — secure-fleet-standby (idle stop)

**To:** cwl  
**Priority:** P2  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-fleet-standby` · BOARD `CWL_FLEET_IDLE: yes`

### Reply

```text
SECURE_STANDBY: ok
SHA: bf53e29
HEARTBEAT: idle-stop
BRANCH: candidate/live-match-step4
FLEET: off · CWL_FLEET_IDLE: yes
NOTE: 5m loop stopped; no open Secure asks
```

### Notes

- Tick pulled all three; BOARD/HEARTBEAT idle — stop condition met
- No Phase 2 / soak invent

---

## 2026-08-11 — secure-fleet-standby (tick)

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
FLEET: on · CWL_FLEET_IDLE: no
NOTE: no Phase 2 / soak invent without new open ask
```

### Notes

- Pulled CWL/Convert/Secure ff-only; BOARD FLEET_MODE on; open ask = standby only
- GCE L2 prove already green (`6c2d624`); idle until CWL_FLEET_IDLE or new Secure ask

---

## 2026-08-11 — SECURE_NEXT (GCE L2 prove)

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** user — gce reauthed; prove Mode B L2 deepen on agenticop-master

### Reply

```text
SECURE_NEXT: ok
SHA: 95fbd21
BRANCH: candidate/live-match-step4
PICK: GCE prove (after reauth)
HOST: agenticop-master
TOKENS: BRIDGE_L2_ICMP_OK · BRIDGE_L2_DIVERT_OK · BRIDGE_L2_DNA_OK · BRIDGE_L2_FAILCLOSED_OK · BRIDGE_L2_TEARDOWN_OK · BRIDGE_L2_SMOKE_OK · GCE_SYNC_OK
FIX: gce-sync packs sibling CWL + symlinks @agenticop-io/cwl (WithL2 implies CWL)
```

### Notes

- First post-reauth run failed: remote missing `@agenticop-io/cwl` (tarball excludes `node_modules`)
- Fixed `scripts/gce-sync.ps1`: when sibling CWL present, pack + `ln -sfn` into `node_modules/@agenticop-io/cwl` (+ `@chrysalis/cwl`); `-WithL2` implies CWL pack
- Re-run `.\scripts\gce-sync.ps1 -WithL2` → full token chain + `GCE_SYNC_OK`
- Phase 1 now boring on GCE — Mode B Phase 2 sketch is unblocked when asked
- D5 DNA-only · no CWL/Convert edits

---

## 2026-08-11 — SECURE_NEXT (soak runbook gaps)

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
GCE_L2: blocked (gcloud reauth failed — non-interactive; not skipped-as-green)
LOCAL: BRIDGE_L2_SMOKE_SKIP (win32 honest) · LIVE_MATCH_OK
DOCS: SOAK.md · GCE-L2.md
DEFER: A already met (cutover multi-host) · B Phase 2 until GCE Phase 1 boring
```

### Notes

- Tried GCE prove prerequisite: `gcloud` token refresh failed; need human `gcloud auth login` then `.\scripts\gce-sync.ps1 -WithL2` on **agenticop-master**
- Option **C**: documented soak runbook gaps (no fake customer traffic); pre-soak gate + exit-to-enforce; L2 lab ≠ soak
- Option **A**: left alone — `cutover-smoke` already proves host=`api` + `dna_gaps`
- Option **B**: deferred — Phase 2 only after Phase 1 stays boring on GCE
- Docs landed in `9d978f4`; this OUTBOX ack follows
- D5 DNA-only protect · no CWL invent · no edits to CWL/Convert

---

## 2026-08-11 — mode-b-l2-deepen (done)

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** user charter — deepen Secure (Mode B L2)

### Reply

```text
SECURE_DEEPEN: ok
SLICE: Mode B L2 Phase 1 deepen
TOKENS: BRIDGE_L2_ICMP_OK · DIVERT_OK · DNA_OK · FAILCLOSED_OK · TEARDOWN_OK · BRIDGE_L2_SMOKE_OK
BRANCH: candidate/live-match-step4
DOCS: MODE-B-L2.md · GCE-L2.md · ROADMAP.md
NOTE: full netns prove needs GCE Linux root (Windows = honest SKIP)
```

### Notes

- `gce-bridge-l2-smoke.sh` now proves nft divert public→helix, DNA allow/deny via divert, Helix-down fail-closed, divert teardown + direct upstream restore
- Next Secure: customer soak ([SOAK.md](../SOAK.md)) or Mode B Phase 2 when Phase 1 stays boring on GCE
- CWL invent remains CLOSED @ 1.0.17 — no language ask

---

## 2026-08-10 — sync-secure-tip-wrap (done)

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
SMOKES: cwl-bridge-smoke · cutover-smoke · live-match-smoke
DNA_SEED: wrapped
```

### Notes

- Pin `@agenticop-io/cwl@^1.0.17` resolves to **1.0.17**
- `packages/cwl-bridge` thin-wraps `pathTemplateShapeEqual` from `@agenticop-io/cwl/dna-seed` (no local fork)
- Protect stays DNA-only (D5)
- Pulled ff-only: Secure `candidate/live-match-step4`, CWL `candidate/cwl-ingest-matrix-comment-fix` @ `cdc2b65`, Convert `candidate/wptp-convert-orbit` @ `b88c811a`
- P0 `sync-convert-execute` is Convert-owned — not claimed by Secure
