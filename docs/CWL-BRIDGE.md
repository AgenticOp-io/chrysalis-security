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

## Pin (CWL tip @ 1.0.86)

```json
"@agenticop-io/cwl": "file:../chrysalis-cwl/packages/cwl"
```

Follows CWL tip DNA seed (nested FP depth ≤2, request/query name FPs, SSE/`websocket` `cwl_stream`, multipart field/file fingerprints, page/layout HTML surfaces + page-island emit reverse, repeated markup as a CWL surface incl. `if`/`else`/nest, `pathTemplateShapeEqual` SoR, session cookie **names** + **policy attrs** on RFC-0032, CSRF + `auth.require` cookie **names**, `job.enqueue` effect intent, RFC-0038 framework residual hole catalog, RFC-0039 DNA identity, RFC-0040 progressive asset integrity, RFC-0041 page form multipart, RFC-0042 DNA certificate / fingerprint / bank / `match live`, RFC-0043 DNA fingerprint strength sha384+). Secure thin-wraps path-shape from dna-seed; cutover honors stream/multipart annotations when present. Protect stays DNA / D5.

GitHub Packages — [`.npmrc.example`](../.npmrc.example). Optional registry `@agenticop-io/cwl@1.0.86` ≡ same tip.

| Import | Role |
| --- | --- |
| `@agenticop-io/cwl/dna-seed` | Seed / profile / holes report (SoR) |
| `@agenticop-io/cwl/parser` | Parse fallback |
| Sibling fixtures | Gold `24` · `34` (SSE/multipart) · `36`–`38` (layout/cookie/page-island) · `39`–`45` (repeats / credentials / forwards / host bytes) · `46`–`54` (cookie names/attrs / CSRF / repeats) · `55` (`auth.require cookie`) · `56`–`61` (pin-only intent) · `62`–`63` (session access name / cache.private — pin only) · `64` (cookie purpose) · `65` (same-site redirect) · `66`–`69` (cache intent / page HTML — pin only) · `70` (shared nav id — document text) · `71`–`75` (year, nav list, drawer, assets, script/form — document facts) · `76`–`78` (viewport cut, document identity, social card) · `79`–`82` (head rest, live document, dynamic HTML, database — document facts) · `83` (host site emit — year/device host honesty; demo Hosting not Helix) · `84` (site 100% contract — host effects and off-site fonts) · `85` (owned fonts — `/fonts.css` and face bytes are document/host asset facts) · `86` (site complete — literal year + CSS checkbox menu are document facts, not Helix) · `87`–`89` (`stream websocket`, `job.enqueue`, UI event contracts — document facts; host owns frames/queues/hydration) · tip **1.0.80** site genome messaging (verify dispose / no façades — document text only) · gold `90` (RFC-0038 Nest / LiveView / Flutter / onion / raw-SQL residuals — catalogued holes, not Helix invent) · gold `91` (RFC-0039 `replaces` / `from peel` / `capability` / `works without client` — document facts, not Helix invent) · gold `92` (RFC-0040 `script` / `style` + `integrity` / `module` / `crossorigin` — document facts, not Helix invent) · gold `93` (RFC-0041 page `form … enctype multipart` + `field … "file"` — document facts, not Helix invent) · gold `94` (RFC-0042 `dna certificate` / `dna fingerprint` / `dna bank` / `match live` — document facts for live-match bind, not Helix invent) · gold `95` (RFC-0043 DNA fingerprint sha384/sha512 floor; `sha256` → `cwl:dna-fingerprint-too-weak` — Secure refuse in consume, not CWL crypto invent) |

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
| `cwl_year` | `year 2026;` (tip **1.0.78**) | Literal digit is a document fact. Helix does not read the clock. CSS checkbox menu is chrome HTML + owned CSS — not a Helix drawer |
| `cwl_nav_links` | `link` rows (tip **1.0.64**) | Document text. Viewport and user agent stay outside the genome |
| `cwl_drawer` / `cwl_device_classes` | `drawer` / `device host` (tip **1.0.65**) | Declared toggle and class tokens. No user-agent read |
| `cwl_styles` / `cwl_images` / `cwl_host_firebase` | tip **1.0.66** | URL, path, and hosting target. CSS bytes, image bytes, and deploy stay outside DNA |
| `cwl_scripts` / `cwl_forms` / `cwl_offsite_form` | tip **1.0.67** | Script URL and same-site form. Off-site form action is a hole; the foreign URL is not copied. Script bytes stay outside DNA |
| `cwl_device_below` | `device host … below <px>` (tip **1.0.68**) | Declared cut. Helix does not evaluate a media query |
| `cwl_charset` / `cwl_viewport_device` / `cwl_title` / `cwl_description` / `cwl_canonical` | tip **1.0.69** | Document facts. A non-URL canonical is `cwl_canonical_refused` and the value is not copied |
| `cwl_meta` | robots, author, theme, keywords, Open Graph, Twitter (tips **1.0.70–1.0.71**) | Document facts. A refused theme, card, or non-URL image is `cwl_meta_refused` and is not copied |
| `cwl_icons` / `cwl_alternates` / `cwl_preconnects` / `cwl_page_styles` / `cwl_jsonld` | tip **1.0.71** | Document facts. A non-URL alternate or preconnect is not copied. An unknown icon is `cwl:unknown-icon` in `cwl_head_refused` and is not copied. JSON-LD that is not JSON, or that closes the script, is not copied. Apple touch is copied only when declared |
| `cwl_request_path` / `cwl_request_query` | tip **1.0.72** | A path or query filled into HTML is that request. Helix does not run the live document server |
| `cwl_repeats` / `cwl_branches` | tip **1.0.73** | A repeated row is host data for that request. A branch is a comparison against the request or that data. It is not a media-query evaluation and not a cookie value |
| `cwl_db_engine` / `cwl_db_ops` | tip **1.0.74** | `engine` is sqlite, postgres, mysql, mariadb, sqlserver, or oracle. An unknown engine is `cwl_db_engine_refused` and the name is not copied. A row value is a parameter. Helix does not open a database and does not execute SQL text |
| `cwl_year_host` / `cwl_device_*` / `cwl_host_firebase` (host emit) | tip **1.0.75** | Year and device host passes are host honesty. Demo Hosting `agenticop-cwl-demo` is a document fact. Helix does not fill the calendar year, evaluate a media query, or deploy Hosting |
| `cwl_drawer` / off-site font preconnect and page style | tip **1.0.76** | Year, device, and drawer are certified host effects (host-implemented). Off-site Google Fonts URLs are document facts. Font CSS bytes and live Hosting deploy stay outside Helix |
| `cwl_styles` owned `/fonts.css` (+ host `fonts/*.woff2`) | tip **1.0.77** | Owned font stylesheet URL is a document fact. Face bytes under host assets are not DNA routes. Year/device/drawer stay host effects. Google Fonts CDN is gone. Live Hosting deploy stays outside Helix |
| `cwl_year` (+ CSS checkbox menu in chrome) | tip **1.0.78** | Literal year digit is a document fact. Checkbox menu is chrome HTML + owned CSS. Complete site drops `year host` / `device host` / `drawer`. Helix does not inject menu JS, evaluate a media query, or deploy Hosting |
| `cwl_stream: websocket` / `job.enqueue` / island event contracts | tip **1.0.79** | Declared duplex stream, background enqueue intent, and named island events (`input`/`focus`/`blur`/`keydown`) are document facts. Residual `unsupported:websocket` stays a hole. Helix does not invent WS frames, job queues, or client hydration |
| Marketing genome copy (verify dispose / no façades) | tip **1.0.80** | Page text and meta are document facts. No “honest holes” slogans. Helix does not invent DNA from marketing copy or fill unproven claims |
| `cwl_hole_reason` Nest / LiveView / Flutter / onion / raw-SQL | tip **1.0.81** (RFC-0038 · gold `90`) | Catalogued residuals on annotations. Helix does not invent Nest DI, LiveView, Flutter, middleware onion, or raw-SQL engines |
| `cwl_replaces` / `cwl_from_peel` / `cwl_capabilities` / `cwl_works_without_client` | tip **1.0.82** (RFC-0039 · gold `91`) | DNA identity statements are document facts on annotations. Helix does not invent a capability browser, peel runtime, or progressive certificate engine |
| `cwl_styles` / `cwl_scripts` / `cwl_page_styles` (+ `integrity` / `module` / `crossorigin`) · `cwl_layout_holes` | tip **1.0.83** (RFC-0040 · gold `92`) | Named asset integrity statements are document facts. URL-only stays a string; SRI / module / crossorigin deepen the object. Catalogued `cwl:bad-integrity` / `bad-asset-url` / `bad-asset-tail` are layout holes. Helix does not hash, verify SRI in a browser, or invent a JS/CSS runtime |
| `cwl_forms` (+ `enctype multipart` / `field … "file"`) · `cwl_layout_holes` (`cwl:file-needs-multipart` / `cwl:multipart-not-get`) | tip **1.0.84** (RFC-0041 · gold `93`) | Page form multipart statements are document facts. File fields require `enctype multipart`; GET multipart is refused. Helix does not invent upload middleware, virus scan, transfer, or storage |
| `bridge.cwl_dna_bind` · `cwl_dna_certificate` / `cwl_dna_fingerprint` / `cwl_dna_bank` / `cwl_match_live` | tip **1.0.85** (RFC-0042 · gold `94`) | Declared DNA certificate path, SRI fingerprint, bank, and `match live` are document facts. Route overrides module; bank is module-scope. Helix verifies digests and enforces live-match. Does not invent hash computation or Helix firewall features in CWL. Traffic DNA remains default protect |
| `consumeDnaFingerprint` · `cwl_dna_fingerprint_refused` · `cwl:dna-fingerprint-too-weak` | tip **1.0.86** (RFC-0043 · gold `95`) | Live-match consume accepts `sha384` / `sha512` DNA binds only. `sha256` is refused and not copied. Asset integrity may still use sha256. PQ certificate signatures stay Secure-owned — no CWL crypto invent |
| `cwl_dna_fingerprints[]` · `cwl_match_bank` · `cwl_dna_expect` | tip **1.0.87** (RFC-0044 · gold `96`) | Multi sha384/sha512 fingerprints (primary still `cwl_dna_fingerprint`); `match bank` → `cwl_match_bank`; `dna expect promote\|shadow\|enforce` → `cwl_dna_expect` document fact. Helix owns lifecycle — no CWL crypto invent |
| `cwl_dna_proofs[]` · `cwl_dna_proof` · `cwl_dna_quorum` · `cwl_dna_lineage` · `cwl_dna_supersedes` · `cwl_dna_witness` · `cwl_dna_scope` | tip **1.0.88** (RFC-0045 · gold `97`) | Named DNA proof units beyond flat binds. Route `use dna proof <name>` → `cwl_dna_proof`; module `dnaProofs[]` → `cwl_dna_proofs`. Quorum / lineage / supersedes / witness / scope are document facts. sha384+ floor kept for fingerprints and supersedes. Helix verifies — no CWL crypto invent |
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

`session.mint` is cross-checked against the certificate's response surface ([RESPONSE-SURFACE.md](./RESPONSE-SURFACE.md)). Tip **1.0.38** may name the cookie (`session.mint cookie sid`); tip **1.0.43** may add policy flags (`httponly secure path / samesite lax`). Cutover reports `session_mint_notes` — `session_mint_honored`, `genome_mints_session_dna_sets_no_cookie`, `genome_cookie_not_in_dna`, `genome_cookie_attrs_not_in_dna`, or `dna_predates_response_surface` — and **never** seeds a cookie name, flag, or value into DNA routes. Tip **1.0.46** names the CSRF cookie (`csrf.verify cookie csrf`) as `csrf_notes` against any `set_cookie_names` in the certificate. Tip **1.0.47** names the required session cookie (`auth.require cookie sid`) as `auth_require_notes` the same way. Tips **1.0.40–1.0.42** / **1.0.44–1.0.45** / **1.0.48–1.0.55** are pin-only where they only name intent (page DNA / CORS / rate / db table / mail / cache / `io host` / session access). Tip **1.0.56** adds a cookie-purpose overlay: `HX-COOKIE-PURPOSE` refuses a live `Set-Cookie` whose name is not session, csrf, or an enumerated preference, and a preference value outside the declared class. The hole records the name only. Tip **1.0.57** notes a same-site `redirect "/path"` against `redirect_targets` (`self`) and refuses to follow or copy an off-site genome target. Tips **1.0.58–1.0.87** stay document facts: cache intent and page HTML (document shell, nav id, year token, literal year, nav list, drawer, device class, viewport cut, charset, title, canonical, social card, asset paths, script URL, same-site form, keywords, icon, alternate, preconnect, page style, JSON-LD, request path and query names, repeated host rows, branches, a named database engine, host site emit, owned fonts, CSS checkbox menu, WebSocket duplex declaration, job enqueue intent, broader island event names, marketing verify-dispose copy, RFC-0038 framework residual hole reasons, RFC-0039 DNA identity, RFC-0040 progressive asset integrity, and RFC-0041 page form multipart). `ao-layout.js`, the clock, the user agent, a media-query evaluation, CSS bytes, image bytes, font face bytes, and script bytes stay outside the genome. An off-site form action and a non-URL card image are holes and their values are not copied. A non-URL alternate or preconnect, an unknown icon, JSON-LD that is not JSON, and JSON-LD that closes the script are not copied. Apple touch is copied only when declared. A path or query name filled into HTML is that request. Helix does not run the live document server. A repeated row is host data for that request. A branch is a comparison against the request or that data. It is not a media-query evaluation and not a cookie value. `engine` is sqlite, postgres, mysql, mariadb, sqlserver, or oracle. An unknown engine is a hole. A row value is a parameter. Helix does not open a database and does not execute SQL text. Tip **1.0.75** year and device host passes are host honesty; demo Hosting `agenticop-cwl-demo` is not Helix. Tip **1.0.76** keeps year/device/drawer as host effects and off-site font URLs as document facts — Helix does not fetch font bytes or deploy live Hosting. Tip **1.0.77** records owned `/fonts.css` (and host `fonts/*.woff2`) as document/host asset facts — Helix does not serve face bytes or deploy live Hosting. Tip **1.0.78** records `year 2026;` as a document digit and treats the CSS checkbox menu as chrome HTML — not a Helix drawer or media-query evaluation. Tip **1.0.79** records `stream websocket;` as `cwl_stream: websocket`, `job.enqueue` / `job.enqueue name <id>` as effect intent, and island `on input|focus|blur|keydown` contracts as page DNA — Helix does not invent WS frames, job queues, or client hydration. Residual `unsupported:websocket` remains for undeclared peels. Tip **1.0.80** records marketing genome copy under verify dispose / no façades — page text only; Helix does not invent from slogans or fill unproven claims. Tip **1.0.81** records Nest / LiveView / Flutter / middleware-onion / raw-SQL as catalogued `unsupported:*` hole reasons (gold `90`) — Helix does not invent those framework runtimes. Tip **1.0.82** records `replaces` / `from peel` / `capability` / `works without client` as annotation document facts (gold `91`) — Helix does not invent a capability browser, peel runtime, or progressive certificate engine. Tip **1.0.83** records `script` / `style` `integrity` / `module` / `crossorigin` as annotation document facts (gold `92`) — Helix does not hash, verify SRI in a browser, or invent a JS/CSS runtime. Tip **1.0.84** records page `form … enctype multipart` and `field … "file"` as annotation document facts (gold `93`) — Helix does not invent upload middleware, transfer, or storage. Tip **1.0.85** records `dna certificate` / `dna fingerprint` / `dna bank` / `match live` as bridge/annotation document facts (gold `94`) — Helix binds live-match and cutover to the declared certificate + SRI fingerprint; it does not invent digest computation or Helix firewall features inside CWL. Tip **1.0.86** raises the DNA fingerprint floor to `sha384` / `sha512` (gold `95`) — live-match consume refuses `sha256` DNA binds (`cwl:dna-fingerprint-too-weak`); asset integrity may still use sha256; PQ certificate signatures stay Secure-owned (no CWL crypto invent). Tip **1.0.87** expands DNA bind consume (gold `96`) — multi-fingerprint `cwl_dna_fingerprints[]`, `cwl_match_bank`, and `cwl_dna_expect` (`promote` / `shadow` / `enforce`) are document facts; Helix owns lifecycle and does not invent digest computation or PQ crypto in CWL. Customer soak → enforce stays operator-owned. Traffic DNA remains the default out-of-box protect path. No tracking runtime, limiter, CORS, SQL engine, SMTP, CDN, cache, HTTP client, WebSocket pump, Nest DI, LiveView, Flutter, middleware onion, worker pool, capability browser, SRI verifier, upload middleware, or CWL-side hash engine is invented.

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
npm run cutover-smoke      # → CUTOVER_TIP_1_0_67_OK · CUTOVER_TIP_1_0_70_OK · CUTOVER_TIP_1_0_74_OK · CUTOVER_TIP_1_0_75_OK · CUTOVER_TIP_1_0_76_OK · CUTOVER_TIP_1_0_77_OK · CUTOVER_TIP_1_0_78_OK · CUTOVER_TIP_1_0_79_OK · CUTOVER_TIP_1_0_80_OK · CUTOVER_TIP_1_0_81_OK · CUTOVER_TIP_1_0_82_OK · CUTOVER_TIP_1_0_83_OK · CUTOVER_SMOKE_OK
                           #   (default + RFC-0023 host=api seed/compare/enforce + dna_gaps)
npm run live-match-smoke   # → LIVE_MATCH_OK (Rosetta Step 4 composite)
```

**Multi-host (RFC-0023):** gold `deploy-profile-api.json` (`host: "api"`) seeds all routes with `host=api`; cutover compare requires host identity; enforce (`scoreRequest`) is host-bound when DNA stamps any non-`default` host (no cross-host path fallback). Protect remains DNA-only (D5).

**CWL spine:** from `chrysalis-cwl`, `npm run smoke:ut-spine:helix`.
