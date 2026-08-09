# CWL ↔ DNA bridge (RFC-0022 / 0023)

Helix protects with traffic DNA out of the box. This bridge is **optional for protect**, **required for cutover default**: seed draft DNA from a CWL module, or compare CWL surface ⊆ certified DNA.

**Contract owner:** `engines/chrysalis-cwl` — [RFC-0022](../../chrysalis-cwl/docs/language/CWL-RFC-0022-dna-surface-bridge.md) · [RFC-0023](../../chrysalis-cwl/docs/language/CWL-RFC-0023-deploy-dna-profiles.md)  
**Implementation:** `packages/cwl-bridge` (consumes CWL seed + `@agenticop-io/cwl` parser; does not fork grammar)

Seed prefers language-pillar `scripts/hub-ingest/cwl-dna-seed.mjs` when the pillar tree is present. Parser prefers **`@agenticop-io/cwl/parser`** (published 1.0.0). Helix owns strip / promote / cutover compare / enforce only.

## Commands

```bash
# Seed draft DNA (+ bridge envelope) from .cwl
npm run helix -- seed-cwl --in path/to/routes.cwl --out data/seeded.dna.json

# Schema-shaped DNA only (no bridge.*)
npm run helix -- seed-cwl --in path/to/routes.cwl --out data/seeded.dna.json --strip-bridge

# Cutover default: every CWL route identity appears in certified DNA (RFC-0022)
npm run helix -- cutover --cwl path/to/routes.cwl --dna certificates/app.json
# alias: compare-cwl
```

Env: `CHRYSALIS_CWL_ROOT` if the language pillar (fixtures / hub-ingest) is not at `../chrysalis-cwl`.

## Pin note (Exit 1.0 — published)

```json
"@agenticop-io/cwl": "1.0.0"
```

GitHub Packages only — see [`.npmrc.example`](../.npmrc.example) and [`EXIT-1.0.md`](../../chrysalis-cwl/docs/history/EXIT-1.0.md).

Optional monorepo helper: `"@chrysalis/cwl": "file:../chrysalis-cwl/packages/cwl"` (same tree; used when sibling checkout is present). Gold fixtures still come from the **pillar checkout** (`CHRYSALIS_CWL_ROOT` / sibling), not from the registry tarball.

Bridge resolve order:

1. Package language surface — `@agenticop-io/cwl` then `@chrysalis/cwl`  
2. Sibling `../chrysalis-cwl` for fixtures / `cwl-dna-seed`  
3. Env **`CHRYSALIS_CWL_ROOT`** / CLI `--cwl-root`

Language bar: **1.0.0**. Do not fork grammar here.

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

**CWL spine:** from `chrysalis-cwl`, `npm run smoke:ut-spine` / `smoke:ut-evidence` (or `:helix` with Secure sibling). Convert does not own this prove.

**Before Secure bridge work:** `npm run cwl-sync-check` → `CWL_SYNC_OK` (fetches origin; notes if tip behind).

**RFC-0023:** if `deploy-profile.json` sits beside the `.cwl` (gold `24-dna-bridge`), seed annotates `bridge.deploy_profile` and uses profile `host` / `app_id`. Profile schema owned by CWL; Helix only applies it.
