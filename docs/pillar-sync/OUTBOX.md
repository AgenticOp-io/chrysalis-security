# Secure pillar-sync (git)

**Pull first:** `git pull` + `git -C ../chrysalis-cwl pull --ff-only` + `git -C ../chrysalis-convert pull --ff-only`  
**Read:** CWL `BOARD.md` + `OUTBOX.md`  
**Write:** only this file → commit → `git push` candidate

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
