# CWL ↔ DNA bridge (RFC-0022 / 0023)

Helix protects with traffic DNA out of the box. Bridge is **optional for protect**, **required for cutover default**: seed draft DNA from CWL, or compare CWL surface ⊆ certified DNA.

**Contract owner:** `engines/chrysalis-cwl` — [RFC-0022](../../chrysalis-cwl/docs/language/CWL-RFC-0022-dna-surface-bridge.md) · [RFC-0023](../../chrysalis-cwl/docs/language/CWL-RFC-0023-deploy-dna-profiles.md) · [DNA-CWL-COMPLETE.md](../../chrysalis-cwl/docs/history/DNA-CWL-COMPLETE.md)  
**Implementation:** `packages/cwl-bridge` — consumes **`@agenticop-io/cwl/dna-seed`** (single SoR). Helix owns strip / cutover compare / `dna_gaps` fill / enforce only.

## Commands

```bash
npm run helix -- seed-cwl --in path/to/routes.cwl --out data/seeded.dna.json
npm run helix -- seed-cwl --in path/to/routes.cwl --out data/seeded.dna.json --strip-bridge

# Cutover default: CWL surface ⊆ certified DNA (host identity when profile host ≠ default)
npm run helix -- cutover --cwl path/to/routes.cwl --dna certificates/app.json
npm run helix -- cutover --cwl path/to/routes.cwl --dna certificates/app.json \
  --deploy-profile path/to/deploy-profile-api.json
```

Env: `CHRYSALIS_CWL_ROOT` if the language pillar (fixtures) is not at `../chrysalis-cwl`.

## Pin (CWL tip @ 1.0.25)

```json
"@agenticop-io/cwl": "file:../chrysalis-cwl/packages/cwl"
```

Follows CWL tip DNA seed (nested FP depth ≤2, request/query name FPs, SSE `cwl_stream`, multipart field/file fingerprints, `pathTemplateShapeEqual` SoR). Secure thin-wraps path-shape from dna-seed; cutover honors stream/multipart annotations when present. Protect stays DNA / D5.

GitHub Packages — [`.npmrc.example`](../.npmrc.example). Optional registry `@agenticop-io/cwl@1.0.25` ≡ same tip.

| Import | Role |
| --- | --- |
| `@agenticop-io/cwl/dna-seed` | Seed / profile / holes report (SoR) |
| `@agenticop-io/cwl/parser` | Parse fallback |
| Sibling fixtures | Gold `24-dna-bridge` · `34-dna-bridge-surfaces` (SSE/multipart/HEAD) |

## Rules (honest)

| In bridge envelope | In certified `app-dna-v1` |
|--------------------|---------------------------|
| `cwl_effects`, `cwl_surface`, holes report | method, path_template, host, content_class, fingerprints |
| Never part of `routeKey` | Identity for enforce |

`dna_gaps` on the holes bridge report are **filled by Helix** from cutover compare — never auto-merged into DNA `holes[]`.

Promote / sign must use `stripBridgeEnvelope` (or `--strip-bridge`).

## Prove

```bash
npm run cwl-bridge-smoke   # → CWL_BRIDGE_SMOKE_OK
npm run cutover-smoke      # → CUTOVER_MULTIHOST_OK · CUTOVER_SMOKE_OK
                           #   (default + RFC-0023 host=api seed/compare/enforce + dna_gaps)
npm run live-match-smoke   # → LIVE_MATCH_OK (Rosetta Step 4 composite)
```

**Multi-host (RFC-0023):** gold `deploy-profile-api.json` (`host: "api"`) seeds all routes with `host=api`; cutover compare requires host identity; enforce (`scoreRequest`) is host-bound when DNA stamps any non-`default` host (no cross-host path fallback). Protect remains DNA-only (D5).

**CWL spine:** from `chrysalis-cwl`, `npm run smoke:ut-spine:helix`.
