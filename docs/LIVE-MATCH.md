# Live match — Rosetta path Step 4

**Status:** **Done** (2026-08-09)  
**Path:** CWL [`ROSETTA-UT-PATH.md`](../../chrysalis-cwl/docs/language/ROSETTA-UT-PATH.md) Step 4 — *Live match — traffic DNA ↔ CWL surface*  
**Ask:** CWL [`SECURE-CUTOVER-REQUESTED.md`](../../chrysalis-cwl/docs/history/SECURE-CUTOVER-REQUESTED.md)  
**Tip:** `@agenticop-io/cwl@^1.0.17` · RFC-0022 / RFC-0023

## What Live match means

Helix **cutover default** compares authored CWL surface to certified `app-dna-v1` (CWL ⊆ DNA). Protect / learn / enforce stay **DNA-only** (D5) — no CWL required to block traffic.

## Acceptance (closed)

| Check | Proof |
| --- | --- |
| Tip pin ≥ 1.0.17 | `package.json` `@agenticop-io/cwl` |
| Path-shape SoR | Thin-wrap `pathTemplateShapeEqual` from `@agenticop-io/cwl/dna-seed` |
| Bridge smoke | `npm run cwl-bridge-smoke` → `CWL_BRIDGE_SMOKE_OK` |
| Cutover E2E | `npm run cutover-smoke` → `CUTOVER_MULTIHOST_OK` · `CUTOVER_SMOKE_OK` (default + RFC-0023 `host=api` seed/compare/enforce + `dna_gaps`) |
| No grammar fork | Seed/parse from package or sibling pillar only |

## Gate

```bash
npm run live-match-smoke
# → LIVE_MATCH_OK
```

## Reply shape

```text
SECURE_CUTOVER: ok
LIVE_MATCH: ok
SHA: <security commit>
CWL_PIN: @agenticop-io/cwl@1.0.17
SMOKES: live-match-smoke (cwl-bridge-smoke · cutover-smoke)
RFC: 0022 · 0023
PATH_STEP_4: Live match closed
```
