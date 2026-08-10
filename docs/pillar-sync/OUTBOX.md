# Secure pillar-sync (git)

**Pull first:** `git pull` + `git -C ../chrysalis-cwl pull --ff-only` + `git -C ../chrysalis-convert pull --ff-only`  
**Read:** CWL `BOARD.md` + `OUTBOX.md`  
**Write:** only this file → commit → `git push` candidate

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
SHA: PENDING
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
