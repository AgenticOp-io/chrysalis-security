# CWL ↔ DNA bridge (RFC-0022)

Helix protects with traffic DNA out of the box. This bridge is **optional**: seed draft DNA from a CWL module, or compare CWL surface ⊆ certified DNA for cutover.

**Contract owner:** `engines/chrysalis-cwl` — [RFC-0022](../../chrysalis-cwl/docs/language/CWL-RFC-0022-dna-surface-bridge.md)  
**Implementation:** `packages/cwl-bridge` (consumes CWL parser; does not fork grammar)

## Commands

```bash
# Seed draft DNA (+ bridge envelope) from .cwl
npm run helix -- seed-cwl --in path/to/routes.cwl --out data/seeded.dna.json

# Schema-shaped DNA only (no bridge.*)
npm run helix -- seed-cwl --in path/to/routes.cwl --out data/seeded.dna.json --strip-bridge

# Cutover: every CWL route identity appears in certified DNA
npm run helix -- compare-cwl --cwl path/to/routes.cwl --dna certificates/app.json
```

Env: `CHRYSALIS_CWL_ROOT` if the language pillar is not at `../chrysalis-cwl`.  
Dependency pin: `"@chrysalis/cwl": "file:../chrysalis-cwl/packages/cwl"` (resolves pillar via package when installed).

## Pin note (Phase 1.0 — pre-publish)

Secure pins `@chrysalis/cwl` as **`file:../chrysalis-cwl/packages/cwl`** (not a registry release; package stays private). Bridge tools also resolve the language pillar via:

1. Sibling `../chrysalis-cwl` under `AgenticOps/engines/`  
2. Env **`CHRYSALIS_CWL_ROOT`** / CLI `--cwl-root` → absolute path to that repo root

Language version bar: `LANGUAGE_VERSION.md` in chrysalis-cwl (currently **0.1.7**). Full pin / future registry path: [`chrysalis-cwl/docs/language/CWL-PUBLISH.md`](../../chrysalis-cwl/docs/language/CWL-PUBLISH.md). Do not fork grammar here.

## Rules (honest)

| In bridge envelope | In certified `app-dna-v1` |
|--------------------|---------------------------|
| `cwl_effects`, `cwl_surface` | method, path_template, host, content_class, fingerprints |
| Never part of `routeKey` | Identity for enforce |

Promote / sign must use `stripBridgeEnvelope` (or `--strip-bridge`) — schema is `additionalProperties: false`.

## Prove

```bash
npm run cwl-bridge-smoke   # → CWL_BRIDGE_SMOKE_OK
npm run cutover-smoke      # → CUTOVER_SMOKE_OK (seed→strip→promote(+HMAC)→compare→enforce allow/deny)
npm run ut-gce-demo        # → UT_GCE_DEMO_OK (gce-smoke + cutover + CWL smoke:ut-spine when sibling present)
```

Uses language gold `fixtures/language-gold/24-dna-bridge/` from chrysalis-cwl.

**CWL spine:** from `chrysalis-cwl`, `npm run smoke:ut-spine` (or `smoke:ut-spine:helix` with Secure sibling). Convert does not own this prove.
