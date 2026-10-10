# Live match — Rosetta path Step 4

**Status:** **Done** (2026-08-09)  
**Path:** CWL [`ROSETTA-UT-PATH.md`](../../chrysalis-cwl/docs/language/ROSETTA-UT-PATH.md) Step 4 — *Live match — traffic DNA ↔ CWL surface*  
**Ask:** CWL [`SECURE-CUTOVER-REQUESTED.md`](../../chrysalis-cwl/docs/history/SECURE-CUTOVER-REQUESTED.md)  
**Tip (current pin):** `@agenticop-io/cwl@1.0.88` · RFC-0022 / RFC-0023 (+ DNA bind RFC-0042–0045)  
**Minimum for Step 4 close:** tip ≥ 1.0.17 (historical acceptance below).

## What Live match means

Helix **cutover default** compares authored CWL surface to certified `app-dna-v1` (CWL ⊆ DNA). Protect / learn / enforce stay **DNA-only** (D5) — no CWL required to block traffic.

Optional: when a genome declares DNA fingerprints / `match live` (tips **1.0.85–1.0.88**), Helix can verify those digests at runtime via ops overlay `HELIX_DNA_BIND` — see [DNA-BIND.md](./DNA-BIND.md). Absent overlay ⇒ no bind check.

### Tip ladder (bind deepen after Step 4)

| Tip | RFC | Gold | Consume |
| --- | --- | --- | --- |
| **1.0.85** | 0042 | `94` | certificate / fingerprint / bank / `match live` |
| **1.0.86** | 0043 | `95` | sha384+ floor |
| **1.0.87** | 0044 | `96` | multi-fingerprint · bank · expect |
| **1.0.88** | 0045 | `97` | named proof units |

Cross-links: [CWL-BRIDGE.md](./CWL-BRIDGE.md) · [DNA-BIND.md](./DNA-BIND.md) · [SIGNED-DNA.md](./SIGNED-DNA.md) · [SOAK.md](./SOAK.md) · [DOC-MAP.md](./DOC-MAP.md).

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
CWL_PIN: @agenticop-io/cwl@1.0.88
SMOKES: live-match-smoke (cwl-bridge-smoke · cutover-smoke)
RFC: 0022 · 0023 · (bind 0042–0045)
PATH_STEP_4: Live match closed
```

Historical Step 4 acceptance used tip `1.0.17`; current Secure pin is **1.0.88**.
