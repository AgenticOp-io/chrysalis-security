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

## Pin (CWL tip @ 1.0.37)

```json
"@agenticop-io/cwl": "file:../chrysalis-cwl/packages/cwl"
```

Follows CWL tip DNA seed (nested FP depth ≤2, request/query name FPs, SSE `cwl_stream`, multipart field/file fingerprints, page/layout HTML surfaces + page-island emit reverse, repeated markup as a CWL surface, `pathTemplateShapeEqual` SoR). Secure thin-wraps path-shape from dna-seed; cutover honors stream/multipart annotations when present. Protect stays DNA / D5.

GitHub Packages — [`.npmrc.example`](../.npmrc.example). Optional registry `@agenticop-io/cwl@1.0.37` ≡ same tip.

| Import | Role |
| --- | --- |
| `@agenticop-io/cwl/dna-seed` | Seed / profile / holes report (SoR) |
| `@agenticop-io/cwl/parser` | Parse fallback |
| Sibling fixtures | Gold `24` · `34` (SSE/multipart) · `36`–`38` (layout/cookie/page-island) · `39`–`45` (repeats / credentials / forwards / host bytes) |

## Genome facts beside the seed (tip 1.0.33–1.0.36)

Some CWL declarations are route meaning that `dna-seed` does not carry as DNA route fields. Helix reads them **from the parsed CWL module** and attaches them to bridge annotations — DNA routes stay dna-seed SoR, so strip / certify / enforce are unchanged.

| Annotation | Source | Use |
| --- | --- | --- |
| `cwl_credential_effects` | RFC-0032 `auth.verify` / `session.mint` / `session.revoke` | Login intent is genome data, not a hole |
| `cwl_upstream_target` (+ `cwl_upstream_params`) | RFC-0033 `proxy upstream "…"` incl. `:param` targets | A forwarded route names its full destination |
| `cwl_hole_reason` · `cwl_host_bytes` | `hub-cwl:keypair-gen` / `hub-cwl:binary-render` | Bytes stay host-owned |
| `cwl_content_type` · `cwl_declared_content_class` | `content-type "…"` next to a hole | Host-byte routes keep their media type in live-match |

`buildUpstreamTargetsReport(seed)` lists declared forward origins for the operator's egress review. A target CWL rejected (`cwl:unknown-proxy-param:*`) is reported as **unresolved** and never becomes a destination. Helix scores inbound DNA — **egress filtering is not a Helix control**.

Declared media type vs learned `content_class` is a **note** (`cwl_declared_media_type_vs_dna_content_class`), never a silent DNA rewrite: traffic decides after learn.

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
npm run cutover-smoke      # → CUTOVER_MULTIHOST_OK · CUTOVER_TIP_1_0_37_OK · CUTOVER_SMOKE_OK
                           #   (default + RFC-0023 host=api seed/compare/enforce + dna_gaps)
npm run live-match-smoke   # → LIVE_MATCH_OK (Rosetta Step 4 composite)
```

**Multi-host (RFC-0023):** gold `deploy-profile-api.json` (`host: "api"`) seeds all routes with `host=api`; cutover compare requires host identity; enforce (`scoreRequest`) is host-bound when DNA stamps any non-`default` host (no cross-host path fallback). Protect remains DNA-only (D5).

**CWL spine:** from `chrysalis-cwl`, `npm run smoke:ut-spine:helix`.
