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

## Pin (CWL tip @ 1.0.67)

```json
"@agenticop-io/cwl": "file:../chrysalis-cwl/packages/cwl"
```

Follows CWL tip DNA seed (nested FP depth ≤2, request/query name FPs, SSE `cwl_stream`, multipart field/file fingerprints, page/layout HTML surfaces + page-island emit reverse, repeated markup as a CWL surface incl. `if`/`else`/nest, `pathTemplateShapeEqual` SoR, session cookie **names** + **policy attrs** on RFC-0032, CSRF + `auth.require` cookie **names**). Secure thin-wraps path-shape from dna-seed; cutover honors stream/multipart annotations when present. Protect stays DNA / D5.

GitHub Packages — [`.npmrc.example`](../.npmrc.example). Optional registry `@agenticop-io/cwl@1.0.67` ≡ same tip.

| Import | Role |
| --- | --- |
| `@agenticop-io/cwl/dna-seed` | Seed / profile / holes report (SoR) |
| `@agenticop-io/cwl/parser` | Parse fallback |
| Sibling fixtures | Gold `24` · `34` (SSE/multipart) · `36`–`38` (layout/cookie/page-island) · `39`–`45` (repeats / credentials / forwards / host bytes) · `46`–`54` (cookie names/attrs / CSRF / repeats) · `55` (`auth.require cookie`) · `56`–`61` (pin-only intent) · `62`–`63` (session access name / cache.private — pin only) · `64` (cookie purpose) · `65` (same-site redirect) · `66`–`69` (cache intent / page HTML — pin only) · `70` (shared nav id — document text) · `71`–`75` (year, nav list, drawer, assets, script/form — document facts) |

## Genome facts beside the seed (tip 1.0.33–1.0.36)

Some CWL declarations are route meaning that `dna-seed` does not carry as DNA route fields. Helix reads them **from the parsed CWL module** and attaches them to bridge annotations — DNA routes stay dna-seed SoR, so strip / certify / enforce are unchanged.

| Annotation | Source | Use |
| --- | --- | --- |
| `cwl_credential_effects` | RFC-0032 `auth.verify` / `session.mint` / `session.revoke` (+ optional `cookie <name>` from tip **1.0.38**, policy attrs from **1.0.43**) | Login intent is genome data, not a hole |
| `cwl_session_cookies` | `session.mint cookie sid` / `session.revoke cookie sid` | Name only — never seeded into DNA routes |
| `cwl_session_cookie_attrs` | `httponly` / `secure` / `path /` / `samesite lax` on mint/revoke | Flags only — never a token value; cutover notes vs learned `set_cookie_attrs` |
| `cwl_csrf_effects` / `cwl_csrf_cookies` | `csrf.verify` / `csrf.verify cookie csrf` (tip **1.0.46**) | Name only; verified against any cookie the certificate has seen |
| `cwl_auth_require_cookies` | `auth.require cookie sid` (tip **1.0.47**) | Name only; required cookie vs any `set_cookie_names` in the certificate |
| `cwl_session_access_cookies` | `session.read cookie sid` / `session.write cookie sid` (tip **1.0.54**) | Name only — never a token |
| `cwl_cache_private` | `cache.private` (tip **1.0.55**) | Cache intent only — no CDN |
| `cwl_cache_no_store` / `cwl_cache_no_cache` | tips **1.0.58** / **1.0.59** | Genome intent only — no cache engine |
| `cwl_redirect` | `redirect "/path"` (tip **1.0.57**) | Same-site path only; certified as `self` |
| `cwl_open_redirect` | `unsupported:open-redirect` | Off-site genome target is not followed and not copied into DNA |
| `cwl_nav_id` | `nav <id>;` (tip **1.0.62**) | Document text on the annotation. Absent nav keeps the page name. Not a DNA route field |
| `cwl_year_host` | `year host;` (tip **1.0.63**) | Token only. Helix does not read the clock |
| `cwl_nav_links` | `link` rows (tip **1.0.64**) | Document text. Viewport and user agent stay outside the genome |
| `cwl_drawer` / `cwl_device_classes` | `drawer` / `device host` (tip **1.0.65**) | Declared toggle and class tokens. No user-agent read |
| `cwl_styles` / `cwl_images` / `cwl_host_firebase` | tip **1.0.66** | URL, path, and hosting target. CSS bytes, image bytes, and deploy stay outside DNA |
| `cwl_scripts` / `cwl_forms` / `cwl_offsite_form` | tip **1.0.67** | Script URL and same-site form. Off-site form action is a hole; the foreign URL is not copied. Script bytes stay outside DNA |
| `cwl_cookie_purposes` | `cookie <name> purpose session\|csrf\|preference` (tip **1.0.56**) | Class list for preferences; overlay refuses other names and out-of-class values |
| `cwl_tracking_cookie` | `unsupported:tracking-cookie` | Genome already refused a bare name or `samesite none` |
| `cwl_upstream_target` (+ `cwl_upstream_params`) | RFC-0033 `proxy upstream "…"` incl. `:param` targets | A forwarded route names its full destination |
| `cwl_hole_reason` · `cwl_host_bytes` | `hub-cwl:keypair-gen` / `hub-cwl:binary-render` | Bytes stay host-owned |
| `cwl_content_type` · `cwl_declared_content_class` | `content-type "…"` next to a hole | Host-byte routes keep their media type in live-match |

Two operator commands read these facts:

```bash
npm run helix -- upstreams   --cwl app.cwl                       # declared forwards, exit 2 if any unresolved
npm run helix -- sensitivity --cwl app.cwl --out sensitivity.json # credential surfaces → severity overlay
```

`upstreams` lists declared forward origins for egress review. A target CWL rejected (`cwl:unknown-proxy-param:*`) is reported as **unresolved** and never becomes a destination. Tip **1.0.37** resolves those parameterized reasons through `lookupFullstackHole` so the report carries the catalog `summary` / `rfc` (exact match for non-`param` entries; prefix only when the entry opts in). Helix scores inbound DNA — **egress filtering is not a Helix control**.

`sensitivity` writes the ops overlay described in [SEVERITY.md](./SEVERITY.md). It sits beside the certificate, never inside it.

Declared media type vs learned `content_class` is a **note** (`cwl_declared_media_type_vs_dna_content_class`), never a silent DNA rewrite: traffic decides after learn.

`session.mint` is cross-checked against the certificate's response surface ([RESPONSE-SURFACE.md](./RESPONSE-SURFACE.md)). Tip **1.0.38** may name the cookie (`session.mint cookie sid`); tip **1.0.43** may add policy flags (`httponly secure path / samesite lax`). Cutover reports `session_mint_notes` — `session_mint_honored`, `genome_mints_session_dna_sets_no_cookie`, `genome_cookie_not_in_dna`, `genome_cookie_attrs_not_in_dna`, or `dna_predates_response_surface` — and **never** seeds a cookie name, flag, or value into DNA routes. Tip **1.0.46** names the CSRF cookie (`csrf.verify cookie csrf`) as `csrf_notes` against any `set_cookie_names` in the certificate. Tip **1.0.47** names the required session cookie (`auth.require cookie sid`) as `auth_require_notes` the same way. Tips **1.0.40–1.0.42** / **1.0.44–1.0.45** / **1.0.48–1.0.55** are pin-only where they only name intent (page DNA / CORS / rate / db table / mail / cache / `io host` / session access). Tip **1.0.56** adds a cookie-purpose overlay: `HX-COOKIE-PURPOSE` refuses a live `Set-Cookie` whose name is not session, csrf, or an enumerated preference, and a preference value outside the declared class. The hole records the name only. Tip **1.0.57** notes a same-site `redirect "/path"` against `redirect_targets` (`self`) and refuses to follow or copy an off-site genome target. Tips **1.0.58–1.0.67** stay pin-only: cache intent and page HTML (document shell, page id, active class, shared nav id, year token, nav list, drawer, device class, asset paths, script URL, same-site form). `ao-layout.js`, the clock, the user agent, CSS bytes, image bytes, and script bytes stay outside the genome. An off-site form action is a hole and its URL is not copied. No tracking runtime, limiter, CORS, SQL, SMTP, CDN, cache, or HTTP client is invented.

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
npm run cutover-smoke      # → CUTOVER_TIP_1_0_62_OK · CUTOVER_TIP_1_0_67_OK · CUTOVER_SMOKE_OK
                           #   (default + RFC-0023 host=api seed/compare/enforce + dna_gaps)
npm run live-match-smoke   # → LIVE_MATCH_OK (Rosetta Step 4 composite)
```

**Multi-host (RFC-0023):** gold `deploy-profile-api.json` (`host: "api"`) seeds all routes with `host=api`; cutover compare requires host identity; enforce (`scoreRequest`) is host-bound when DNA stamps any non-`default` host (no cross-host path fallback). Protect remains DNA-only (D5).

**CWL spine:** from `chrysalis-cwl`, `npm run smoke:ut-spine:helix`.
