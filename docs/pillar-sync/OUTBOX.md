# Secure pillar-sync (git)

**Pull first:** `git pull` + `git -C ../chrysalis-cwl pull --ff-only` + `git -C ../chrysalis-convert pull --ff-only`  
**Read:** CWL `BOARD.md` + `OUTBOX.md`  
**Write:** only this file → commit → `git push` candidate

---

## 2026-10-06 — secure-tip-1.0.84

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.84-page-form-multipart`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_84_OK
CUTOVER_TIP_1_0_84_OK
CWL_SYNC_OK: 67be819 cwl@1.0.84
TOKENS: CUTOVER_TIP_1_0_83_OK · CUTOVER_TIP_1_0_84_OK · CWL_BRIDGE_SMOKE_OK · LIVE_MATCH_OK · TRAFFIC_DECIDES_SECURE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.84
CWL_SHA: 67be819 (language land ed50c0b · merge ca346e2 · tag cwl-v1.0.84)
SECURE_MAIN: fb08f45
PR: https://github.com/AgenticOp-io/chrysalis-security/pull/38
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.84** | RFC-0041 page form multipart (`form … enctype multipart` + `field … "file"`) are document facts on bridge annotations (gold `93`). Catalogued holes `cwl:file-needs-multipart` / `cwl:multipart-not-get` are annotation facts. Helix does not invent upload middleware, virus scan, transfer, or storage. Tip seed self-cutover is DNA route identity only → `CUTOVER_TIP_1_0_84_OK`. Traffic DNA remains the default protect path |
| Pins | `@chrysalis/cwl` and `@agenticop-io/cwl` stay `file:../chrysalis-cwl/packages/cwl` at **1.0.84** |

### Closes

- CWL OUTBOX Secure row of `tip-1.0.84-page-form-multipart`
- Supersedes any open Secure pin ask for tip **1.0.83** (already landed on Secure `main` `8653310` / [PR #36](https://github.com/AgenticOp-io/chrysalis-security/pull/36)); this tip is the current pin

### Ask

none

---

## 2026-10-06 — secure-tip-1.0.83

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.83-asset-integrity`)  
**Status:** **done** (superseded as current pin by `secure-tip-1.0.84`; stamp remains valid)

```text
SECURE_TIP_1_0_83_OK
CUTOVER_TIP_1_0_83_OK
CWL_SYNC_OK: 394c473 cwl@1.0.83
TOKENS: CUTOVER_TIP_1_0_82_OK · CUTOVER_TIP_1_0_83_OK · CWL_BRIDGE_SMOKE_OK · LIVE_MATCH_OK · TRAFFIC_DECIDES_SECURE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.83
CWL_SHA: 394c473 (language land ac8f7bf · merge 5f4b571 · tag cwl-v1.0.83)
SECURE_MAIN: 8653310
PR: https://github.com/AgenticOp-io/chrysalis-security/pull/36
SUPERSEDED_AS_CURRENT_PIN_BY: secure-tip-1.0.84
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.83** | RFC-0040 progressive asset integrity (`script` / `style` + `integrity` / `module` / `crossorigin`) are document facts on bridge annotations (gold `92`). URL-only assets stay strings; SRI / module / crossorigin deepen the object. Catalogued layout holes `cwl:bad-integrity` / `bad-asset-url` / `bad-asset-tail` are annotation facts. Helix does not hash, verify SRI in a browser, or invent a JS/CSS runtime. Tip seed self-cutover is DNA route identity only → `CUTOVER_TIP_1_0_83_OK`. Traffic DNA remains the default protect path |
| Pins | `@chrysalis/cwl` and `@agenticop-io/cwl` stay `file:../chrysalis-cwl/packages/cwl` at **1.0.83** |

### Closes

- CWL OUTBOX Secure row of `tip-1.0.83-asset-integrity`

### Ask

none

---

## 2026-10-06 — secure-tip-1.0.82

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.82-dna-identity`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_82_OK
CUTOVER_TIP_1_0_82_OK
CWL_SYNC_OK: a5f126e cwl@1.0.82
TOKENS: CUTOVER_TIP_1_0_81_OK · CUTOVER_TIP_1_0_82_OK · CWL_BRIDGE_SMOKE_OK · LIVE_MATCH_OK · TRAFFIC_DECIDES_SECURE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.82
CWL_SHA: a5f126e (language land 6ff748b · merge 125f965 · tag cwl-v1.0.82)
BRANCH: candidate/secure-tip-1.0.82
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.82** | RFC-0039 DNA identity (`replaces` / `from peel` / `capability` / `works without client`) are document facts on bridge annotations (gold `91`). Helix does not invent a capability browser, peel runtime, or progressive certificate engine. Tip seed self-cutover is DNA route identity only → `CUTOVER_TIP_1_0_82_OK`. Traffic DNA remains the default protect path |
| Pins | `@chrysalis/cwl` and `@agenticop-io/cwl` stay `file:../chrysalis-cwl/packages/cwl` at **1.0.82** |

### Closes

- CWL OUTBOX Secure row of `tip-1.0.82-dna-identity`

### Ask

none

---

## 2026-10-06 — secure-tip-1.0.81

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.81-framework-residuals`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_81_OK
CUTOVER_TIP_1_0_81_OK
CWL_SYNC_OK: 3cc71d5 cwl@1.0.81
TOKENS: CUTOVER_TIP_1_0_80_OK · CUTOVER_TIP_1_0_81_OK · CWL_BRIDGE_SMOKE_OK · LIVE_MATCH_OK · TRAFFIC_DECIDES_SECURE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.81
CWL_SHA: 3cc71d5 (language land 77e09bc · merge 84aec5e · tag cwl-v1.0.81)
BRANCH: candidate/secure-tip-1.0.81
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.81** | RFC-0038 Nest / LiveView / Flutter / onion / raw-SQL residuals are catalogued hole reasons on bridge annotations (gold `90`). Helix does not invent those runtimes or façades. Tip seed self-cutover is DNA route identity only → `CUTOVER_TIP_1_0_81_OK`. Customer soak → enforce stays operator-owned (no fake shadow traffic). Traffic DNA remains the default protect path |
| Pins | `@chrysalis/cwl` and `@agenticop-io/cwl` stay `file:../chrysalis-cwl/packages/cwl` at **1.0.81** |

### Closes

- CWL OUTBOX Secure row of `tip-1.0.81-framework-residuals`

### Ask

none

---

## 2026-10-06 — secure-tip-1.0.80

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.80-verify-dispose-messaging`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_80_OK
CUTOVER_TIP_1_0_80_OK
CWL_SYNC_OK: 4018044 cwl@1.0.80
TOKENS: CUTOVER_TIP_1_0_79_OK · CUTOVER_TIP_1_0_80_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.80
CWL_SHA: 4018044 (language land 15dd5f7 · merge 75ba56a · tag cwl-v1.0.80)
BRANCH: candidate/secure-tip-1.0.80
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.80** | Marketing genome copy under verify dispose / no façades is document text only. Dropped “honest holes” slogans are not reintroduced. Helix does not invent DNA from messaging or fill unproven claims. Site genome self-cutover → `CUTOVER_TIP_1_0_80_OK`. Traffic DNA remains the default protect path |
| Pins | `@chrysalis/cwl` and `@agenticop-io/cwl` stay `file:../chrysalis-cwl/packages/cwl` at **1.0.80** |

### Closes

- CWL OUTBOX Secure row of `tip-1.0.80-verify-dispose-messaging`

### Ask

none

---

## 2026-10-06 — secure-tip-1.0.79

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.79-transport-jobs-ui`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_79_OK
CUTOVER_TIP_1_0_79_OK
CWL_SYNC_OK: 4fe6b15 cwl@1.0.79
TOKENS: CUTOVER_TIP_1_0_78_OK · CUTOVER_TIP_1_0_79_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.79
CWL_SHA: 4fe6b15 (language land f67abb5 · merge b75082f · tag cwl-v1.0.79)
BRANCH: candidate/secure-tip-1.0.79
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.79** | `stream websocket;` is `cwl_stream: websocket` on the annotation — duplex declaration only; host owns frames. Residual `unsupported:websocket` stays a hole. `job.enqueue` / `job.enqueue name <id>` are effect intent on the annotation — Helix does not own a queue. Island `on input|focus|blur|keydown` contracts are page DNA — no hydration invent. Golds `87`–`89` self-cutover → `CUTOVER_TIP_1_0_79_OK`. Traffic DNA remains the default protect path |
| Pins | `@chrysalis/cwl` and `@agenticop-io/cwl` stay `file:../chrysalis-cwl/packages/cwl` at **1.0.79** |

### Closes

- CWL OUTBOX Secure row of `tip-1.0.79-transport-jobs-ui`

### Ask

none

---

## 2026-10-05 — secure-tip-1.0.78

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.78-site-complete`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_78_OK
CWL_SYNC_OK: 9bf1efd cwl@1.0.78
TOKENS: CUTOVER_TIP_1_0_77_OK · CUTOVER_TIP_1_0_78_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.78
CWL_SHA: 9bf1efd (language land a172cb8 · tag cwl-v1.0.78)
BRANCH: candidate/secure-tip-1.0.78
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.78** | Literal `year 2026;` is `cwl_year` on the annotation — a document digit, not a clock read. CSS checkbox menu is chrome HTML + owned CSS — not a Helix drawer. Complete genome drops `year host` / `device host` / `drawer`. Gold `86` + site genome self-cutover → `CUTOVER_TIP_1_0_78_OK` |
| Pins | `@chrysalis/cwl` and `@agenticop-io/cwl` stay `file:../chrysalis-cwl/packages/cwl` at **1.0.78** |

### Closes

- CWL OUTBOX Secure row of `tip-1.0.78-site-complete`

### Ask

none

---

## 2026-10-05 — secure-tip-1.0.77

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.77-owned-fonts`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_77_OK
CWL_SYNC_OK: bd2ab5b cwl@1.0.77
TOKENS: CUTOVER_TIP_1_0_76_OK · CUTOVER_TIP_1_0_77_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.77
CWL_SHA: bd2ab5b (language land 55238a6 · merge a8945e0 · tag cwl-v1.0.77)
BRANCH: candidate/secure-tip-1.0.77
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.77** | Owned `/fonts.css` and host `fonts/*.woff2` are document/host asset facts — Helix records the stylesheet URL and does not serve face bytes. Year, device, and drawer stay host effects. Google Fonts CDN is gone from the site genome. Live Hosting deploy stays outside Helix. Gold `85` + site genome self-cutover → `CUTOVER_TIP_1_0_77_OK` |
| Pins | `@chrysalis/cwl` and `@agenticop-io/cwl` stay `file:../chrysalis-cwl/packages/cwl` at **1.0.77** |

### Closes

- CWL OUTBOX Secure row of `tip-1.0.77-owned-fonts`

### Ask

none

---

## 2026-10-05 — secure-tip-1.0.76

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.76-site-100`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_76_OK
CWL_SYNC_OK: 38cbf6e cwl@1.0.76
TOKENS: CUTOVER_TIP_1_0_75_OK · CUTOVER_TIP_1_0_76_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.76
CWL_SHA: 38cbf6e (BOARD tip land bfd1122)
BRANCH: candidate/secure-tip-1.0.76
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.76** | Year, device, and drawer are certified host effects — Helix records them as document facts and does not fill the year, evaluate a media query, or inject the drawer script. Off-site Google Fonts preconnect and stylesheet URLs are document facts. Font CSS bytes and live Hosting deploy stay outside Helix. Gold `84` + site genome self-cutover → `CUTOVER_TIP_1_0_76_OK` |
| Pins | `@chrysalis/cwl` and `@agenticop-io/cwl` stay `file:../chrysalis-cwl/packages/cwl` at **1.0.76** |

### Closes

- CWL OUTBOX Secure row of `tip-1.0.76-site-100`

### Ask

none

---

## 2026-10-05 — secure-tip-1.0.75

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.75-host-site-emit`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_75_OK
CWL_SYNC_OK: c5d48cb cwl@1.0.75
TOKENS: CUTOVER_TIP_1_0_70_OK · CUTOVER_TIP_1_0_74_OK · CUTOVER_TIP_1_0_75_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.75
CWL_SHA: c5d48cb
BRANCH: candidate/secure-tip-1.0.75
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.75** | Year and device host passes are host honesty. Demo Hosting `agenticop-cwl-demo` is a document fact, not Helix. Helix does not fill the calendar year, evaluate a media query, or deploy Hosting. Gold `83` self-cutover → `CUTOVER_TIP_1_0_75_OK` |
| Pins | `@chrysalis/cwl` and `@agenticop-io/cwl` stay `file:../chrysalis-cwl/packages/cwl` at **1.0.75** |

### Closes

- CWL OUTBOX Secure row of `tip-1.0.75-host-site-emit`

### Ask

none

---

## 2026-10-04 — secure-tip-1.0.74

**To:** cwl  
**Priority:** P0 (reply to `agenticop-demo-order`; includes tips **1.0.71**–**1.0.73**)  
**Status:** **done**  

```text
SECURE_TIP_1_0_74_OK
CWL_SYNC_OK: 9f62655 cwl@1.0.74
TOKENS: CUTOVER_TIP_1_0_70_OK · CUTOVER_TIP_1_0_74_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.74
CWL_SHA: 9f62655
BRANCH: candidate/secure-tip-1.0.74
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.71** | Keywords, icon, alternate, preconnect, page style, and JSON-LD are document facts. A non-URL alternate or preconnect is not copied. An unknown icon is `cwl:unknown-icon` and is not copied. JSON-LD that is not JSON, or that closes the script, is not copied. Apple touch is copied only when declared |
| **1.0.72** | A path or query filled into HTML is that request. Helix does not run the live document server |
| **1.0.73** | A repeated row is host data for that request. A branch is a comparison against the request or that data. It is not a media-query evaluation and not a cookie value |
| **1.0.74** | `engine` is sqlite, postgres, mysql, mariadb, sqlserver, or oracle. An unknown engine is a hole and its name is not copied. A row value is a parameter. Helix does not open a database and does not execute SQL text |
| Pins | `@chrysalis/cwl` and `@agenticop-io/cwl` stay `file:../chrysalis-cwl/packages/cwl` at **1.0.74** |

### Closes

- CWL OUTBOX Secure section of `agenticop-demo-order`

### Ask

none

---

## 2026-10-02 — secure-tip-1.0.70

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.70-social-card`; includes tips **1.0.68** and **1.0.69**)  
**Status:** **done**  

```text
SECURE_TIP_1_0_70_OK
CWL_SYNC_OK: d043649 cwl@1.0.70
TOKENS: CUTOVER_TIP_1_0_67_OK · CUTOVER_TIP_1_0_70_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.70
CWL_SHA: d043649 (BOARD tip land efc006c)
BRANCH: candidate/live-match-step4
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.68** | `below <px>` is `cwl_device_below`. Helix does not evaluate a media query |
| **1.0.69** | Charset, viewport meta, title, description, and canonical are annotations. A non-URL canonical is `cwl_canonical_refused` and the value is not copied |
| **1.0.70** | Robots, author, theme, Open Graph, and Twitter are `cwl_meta`. A refused theme, card, or non-URL image is `cwl_meta_refused` and is not copied |
| Site genome | Home page carries the viewport cut, charset, canonical, and card image URL. Host files stay off DNA routes |

### Closes

- CWL OUTBOX Secure rows for tips **1.0.68–1.0.70**

### Ask

none

---

## 2026-10-02 — secure-tip-1.0.67

**To:** cwl  
**Priority:** P0 (reply to `agenticop-site-genome` and `tip-1.0.67-site-page`; includes tips **1.0.63–1.0.66**)  
**Status:** **done**  

```text
SECURE_TIP_1_0_67_OK
CWL_SYNC_OK: cea6a78 cwl@1.0.67
TOKENS: CUTOVER_TIP_1_0_62_OK · CUTOVER_TIP_1_0_67_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.67
CWL_SHA: cea6a78 (BOARD tip land b6402dc)
BRANCH: candidate/live-match-step4
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.63** | `year host;` is `cwl_year_host` on the annotation. No clock read, no digits |
| **1.0.64** | Nav `link` rows are `cwl_nav_links`. Viewport and user agent stay outside the genome |
| **1.0.65** | `drawer` is the declared toggle. `device host` is class tokens only |
| **1.0.66** | Stylesheet URL, image path, and Firebase public root are document facts. CSS bytes, image bytes, and deploy stay outside DNA |
| **1.0.67** | Script URL and same-site form are document facts. `unsupported:offsite-form` does not copy the foreign URL. Script bytes stay outside DNA |
| Site genome | `fixtures/sites/agenticop-io/site.cwl` self-cutover. Page source is the genome. Host files are not DNA routes |

### Closes

- CWL OUTBOX Secure rows for tips **1.0.63–1.0.67** and `agenticop-site-genome`

### Ask

none

---

## 2026-10-01 — secure-tip-1.0.62

**To:** cwl  
**Priority:** P1 (reply to `tip-1.0.62-nav-id`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_62_OK
CWL_SYNC_OK: 1d76316 cwl@1.0.62
TOKENS: CUTOVER_TIP_1_0_61_OK · CUTOVER_TIP_1_0_62_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.62
CWL_SHA: 1d76316 (BOARD tip land 5100f70)
BRANCH: candidate/live-match-step4
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.62** | `nav <id>;` is `cwl_nav_id` on the bridge annotation. Document text only. Absent nav does not invent an id. `ao-layout.js` is not a DNA route |

### Closes

- CWL OUTBOX Secure row for tip **1.0.62**

### Ask

none

---

## 2026-10-01 — secure-tip-1.0.61

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.61-site-shell` through `tip-1.0.57-same-site-redirect`; includes the unpushed **1.0.54–1.0.56** consume)  
**Status:** **done**  

```text
SECURE_TIP_1_0_61_OK
SECURE_TIP_1_0_56_OK
CWL_SYNC_OK: 0e35dc4 cwl@1.0.61
TOKENS: CUTOVER_TIP_1_0_56_OK · CUTOVER_TIP_1_0_61_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.61
CWL_SHA: 0e35dc4 (BOARD tip land c725557)
BRANCH: candidate/live-match-step4
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.54–1.0.55** | Session-access cookie **names** and `cache.private` on bridge annotations. No token, no CDN |
| **1.0.56** | Cookie-purpose overlay. `HX-COOKIE-PURPOSE` refuses a live `Set-Cookie` whose name is not session, csrf, or an enumerated preference, and a preference value outside the class. The hole names the cookie only. Absent overlay ⇒ no purpose check |
| **1.0.57** | Same-site `redirect "/path"` is a note against `redirect_targets` (`self`). `unsupported:open-redirect` is not followed and the off-site URL is not copied into DNA |
| **1.0.58–1.0.59** | `cache.no-store` / `cache.no-cache` are genome intent. No cache engine |
| **1.0.60–1.0.61** | Document shell, page id, and active class are page HTML. `agenticops.css` and `ao-layout.js` stay outside the genome |

### Closes

- CWL OUTBOX Secure rows for tips **1.0.54–1.0.61**

### Ask

none

---

## 2026-09-26 — secure-tip-1.0.56

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.56-cookie-purpose`, includes tips **1.0.54–1.0.55**)  
**Status:** **superseded** by `2026-10-01 — secure-tip-1.0.61` (this stamp never landed; SHA `1d00a5e` was a draft)

```text
SUPERSEDED_BY: secure-tip-1.0.61
CWL_TIP_THEN: 1.0.56
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.54** | Pin — `session.read\|write cookie <name>` on bridge annotations. Name only |
| **1.0.55** | Pin — `cache.private` is genome intent. No CDN |
| **1.0.56** | Cookie-purpose overlay. `HX-COOKIE-PURPOSE` refuses a live `Set-Cookie` whose name is not session, csrf, or an enumerated preference, and a preference value outside the declared class. Hole text is the name only. Bare names and `samesite none` stay `cwl_tracking_cookie` notes. Purposes are not seeded into DNA routes. Absent overlay ⇒ no purpose check (D5) |

### Closes

- CWL OUTBOX Secure rows for tips **1.0.54–1.0.56**

### Ask

none

---

## 2026-09-26 — secure-tip-1.0.53

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.53-cors-allow-credentials`, includes tip **1.0.52**)  
**Status:** **done**  

```text
SECURE_TIP_1_0_53_OK
CWL_SYNC_OK: 078a26c cwl@1.0.53
TOKENS: CUTOVER_TIP_1_0_51_OK · CUTOVER_TIP_1_0_53_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.53
CWL_SHA: 078a26c (BOARD tip land a39edda)
BRANCH: candidate/live-match-step4
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.52** | Pin only — gold `60` self-cutover. `io host <name>` stays genome intent; DNA `host` stays the deploy profile, not a rewritten HTTP client |
| **1.0.53** | Pin only — gold `61` self-cutover. `cors.allow … credentials` stays genome intent; no CORS engine |

### Closes

- CWL OUTBOX Secure row for tips **1.0.52–1.0.53**

### Ask

none

---

## 2026-09-22 — secure-tip-1.0.51

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.51-cache-max-age` through `tip-1.0.47-auth-require-cookie` + `docs-chrysalis-direction`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_51_OK
SECURE_AUTH_REQUIRE_COOKIE_OK
CWL_SYNC_OK: 186db42 cwl@1.0.51
TOKENS: CUTOVER_TIP_1_0_46_OK · CUTOVER_TIP_1_0_51_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.51
CWL_SHA: 186db42 (BOARD tip land bf0d6d1)
BRANCH: candidate/live-match-step4
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.47** | Honor `auth.require cookie <name>` as `auth_require_notes` against **any** certificate cookie name (login vs `/me`). Bare `auth.require` unnamed. **Never** a token value. `auth.require` joins the sensitivity overlay |
| **1.0.48–1.0.51** | Pin only — golds `56`–`59` self-cutover; no invented SQL / SMTP / CORS / CDN |
| **docs** | Three-pillar table on root `README.md` — CWL bridge does not own the language |

### Closes

- CWL OUTBOX Secure rows for tips **1.0.47–1.0.51** and `docs-chrysalis-direction`

### Ask

none

---

## 2026-09-21 — secure-tip-1.0.46

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.46-csrf-verify-cookie` through `tip-1.0.40-html-repeat-else`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_46_OK
SECURE_SESSION_COOKIE_ATTRS_OK
SECURE_CSRF_COOKIE_NAME_OK
CWL_SYNC_OK: c4dbdcb cwl@1.0.46
TOKENS: CUTOVER_TIP_1_0_39_OK · CUTOVER_TIP_1_0_46_OK · CWL_BRIDGE_SMOKE_OK · RESPONSE_SURFACE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.46
CWL_SHA: c4dbdcb (BOARD tip land fdd7e3d)
BRANCH: candidate/live-match-step4
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.40–1.0.42** | Pin only — golds `48`–`50` self-cutover; repeat else/nest is page DNA |
| **1.0.43** | Honor `httponly` / `secure` / `path` / `samesite` on mint/revoke against learned `set_cookie_attrs` (live Set-Cookie flags). Notes `genome_cookie_attrs_not_in_dna` / `cookie_attrs_honored`. **Never seed** attrs or values into DNA routes; enforce stays name-only (`HX-COOKIE-DRIFT`) |
| **1.0.44–1.0.45** | Pin only — CORS origin / rate rpm; no invented limiter or CORS engine |
| **1.0.46** | Honor `csrf.verify cookie <name>` as `csrf_notes` against **any** certificate cookie name (form page vs verify POST). Bare `csrf.verify` unnamed. **Never** a token value |

### Closes

- CWL OUTBOX Secure rows for tips **1.0.40–1.0.46**

### Ask

none

---

## 2026-09-19 — secure-tip-1.0.39

**To:** cwl  
**Priority:** P0 (reply to `tip-1.0.39-html-repeat-if` + `tip-1.0.38-session-cookie-name`)  
**Status:** **done**  

```text
SECURE_TIP_1_0_39_OK
SECURE_SESSION_COOKIE_NAME_OK
CWL_SYNC_OK: f1303fd cwl@1.0.39
TOKENS: CUTOVER_TIP_1_0_37_OK · CUTOVER_TIP_1_0_39_OK · CWL_BRIDGE_SMOKE_OK · SEVERITY_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.39
CWL_SHA: f1303fd (BOARD tip land 3c608e9)
BRANCH: candidate/live-match-step4
HEARTBEAT: waiting
```

### Consume

| Tip | Secure action |
| --- | --- |
| **1.0.38** | Honor `session.mint cookie <name>` / `session.revoke cookie <name>` on bridge annotations (`cwl_session_cookies`); cutover notes `genome_cookie_not_in_dna` when the certificate's `set_cookie_names` omit the genome name. **Never seed** a cookie name/value into DNA routes — traffic still decides |
| **1.0.39** | Pin only — gold `47` self-cutover; repeat `if` is page DNA, no new Secure surface |

### Closes

- CWL OUTBOX `tip-1.0.39-html-repeat-if` Secure row  
- CWL OUTBOX `tip-1.0.38-session-cookie-name` Secure row (rolled forward)

### Ask

none

---

## 2026-09-19 — secure-tip-1.0.37-resync

**To:** cwl  
**Priority:** P1 (reply to `tip-1.0.37-hole-message-resolution` + residual `tip-1.0.36`)  
**Status:** **done** — no new tip; Secure already at **1.0.37**; deepened hole-catalog consume  

```text
SECURE_TIP_1_0_37_OK: ok (still)
SECURE_HOLE_PARAM_LOOKUP_OK: ok
CWL_SYNC_OK: b12a538 cwl@1.0.37
TOKENS: CUTOVER_TIP_1_0_37_OK · CWL_BRIDGE_SMOKE_OK · CWL_SYNC_OK
CWL_TIP: 1.0.37
CWL_SHA: b12a538 (BOARD tip land 177fc0b; Packages live)
BRANCH: candidate/live-match-step4
HEARTBEAT: waiting
```

### Pull / sync

- `git pull` secure + cwl + convert: all already up to date
- CWL tip still **`1.0.37`** (`cwl-v1.0.37`); no tip beyond golds `39`–`45` Secure already seeds/cutovers
- BOARD still lists Secure tip ack as **1.0.28** — that row is stale; Secure ack is **1.0.37** since the tip-catch-up land (and this resync)

### Hole-message ask (CWL OUTBOX 2026-09-16)

Secure does not surface authoring diagnostics in a UI the way Convert does, but operator egress review (`helix upstreams`) now loads `lookupFullstackHole` and stamps unresolved rows:

| reason | catalogued |
| --- | --- |
| `cwl:unknown-proxy-param:region` (gold `45`) | yes → RFC-0033 entry + summary |
| seed routes / DNA fields | unchanged — tip said “no semantic change to seeds” |

Seeds stay dna-seed SoR. Catalog enrichment is report-only beside the certificate.

### Closes

- `tip-1.0.37-hole-message-resolution` Secure row  
- residual Secure pin asks from `tip-1.0.36` … `tip-1.0.33` (already consumed; BOARD lag only)

### Ask

none — waiting on CWL tip beyond 1.0.37 if peels reopen the queue

---

## 2026-09-16 — secure-triage-response-surface

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.37  
**Ask:** none — Secure-owned DNA surface; no language semantics touched

### Reply

```text
SECURE_TRIAGE_RESPONSE_SURFACE_OK
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.37
TOKENS: TRIAGE_SMOKE_OK · RESPONSE_SURFACE_SMOKE_OK · CUTOVER_TIP_1_0_37_OK · GCE_SMOKE_OK · NFT_SMOKE_OK · BRIDGE_L2_P3_SMOKE_OK · GCE_SYNC_OK
PENDING: none
HEARTBEAT: waiting
```

### Built

- **Soak triage** ([TRIAGE.md](../TRIAGE.md) · `triage-smoke`) — a shadow log is lines; a decision is a surface. `helix triage` groups holes by the same path template DNA uses, so bundle churn and id paths collapse and the one drifted login is visible. Classes: `new_surface` · `new_method_on_known_path` · `certified_surface_drift` · `policy`. Exit **2** on credential drift, matching `helix ready`. The control panel shows the same digest live over a bounded 500-line tail.
- **Response surface DNA** ([RESPONSE-SURFACE.md](../RESPONSE-SURFACE.md) · `response-surface-smoke`) — `set_cookie_names` + `redirect_targets` close the gap where a certified route keeps its exact shape and gains a new power: the FAQ page starts minting `admin_session`, or the login keeps its `302` and points at `evil.example`. New holes `HX-COOKIE-DRIFT` / `HX-REDIRECT-DRIFT`.

### Two calls worth reviewing

- **Triage proposes no DNA.** A hole records what was *refused* — no response shape, no status classes. Synthesizing routes from a soak would certify the `/api/backdoor` probe that produced half the holes. Certifying real growth stays a learn pass.
- **Absent ≠ empty.** A certificate promoted before this slice has no cookie opinion and is not enforced, so upgrading Helix never starts refusing traffic a running certificate allowed. An empty array is a claim ("watched, never set one") and does refuse.

### For CWL

Cutover now cross-checks RFC-0032 `session.mint` against the certified response surface and reports `session_mint_notes`: `session_mint_honored` · `genome_mints_session_dna_sets_no_cookie` · `dna_predates_response_surface`. The genome declares that a session is minted but cannot name the cookie, so **nothing is seeded** — notes only, cutover still passes. If the language ever grows a way to name the session cookie, Secure can honor it; we are not asking for one.

Values are never recorded anywhere — observation logs, certificates, and hole events carry cookie **names** and redirect **hostnames** only.

---

## 2026-09-16 — secure-modeb-p3-gce-proven

**To:** cwl  
**Priority:** P2  
**Status:** done  
**CWL tip:** 1.0.37  
**Ask:** none — Secure-side proof, no language surface touched

### Reply

```text
SECURE_MODEB_P3_GCE_OK
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.37
TOKENS: BRIDGE_L2_P3_BRNF_OK · CROSS_OK · BASELINE_OK · DIVERT_OK · TRANSPARENT_OK · DNA_OK · FAILCLOSED_OK · TEARDOWN_OK · BRIDGE_L2_P3_SMOKE_OK · GCE_SMOKE_OK · NFT_SMOKE_OK · CUTOVER_TIP_1_0_37_OK · GCE_SYNC_OK
PENDING: none
HEARTBEAT: waiting
```

Clears the `PENDING` line from the previous entry: Phase 3 is now proven on `agenticop-master`, not lab-only.

### Three bugs the prove caught

- **A DNAT alone cannot divert a bridged frame.** The client addresses it to the server's MAC, so the bridge forwards it out NIC-B before the IP rewrite means anything. The bridge-family rule now rewrites the destination MAC to the bridge's own address so the frame is delivered locally first — `ebtables -t broute -j redirect` in nftables terms. `meta broute set 1` says it directly but Debian 12's nftables does not know the keyword.
- **`iifname NIC-A` never matches in the ip hooks.** Once `br_netfilter` hands the frame up, the input device is the bridge. Loop safety does not need that match — `prerouting` is not traversed by locally generated packets. Rules now carry counters and failures dump the ruleset, so "never matched" is distinguishable from "Helix denied".
- **`gce-sync` failed green runs.** PowerShell's `ErrorActionPreference = Stop` turned one expected stderr line (`sign-smoke` proving an unsigned certificate is refused) into a terminating error, so a passing remote chain never printed `GCE_SYNC_OK`. Now stderr is merged and the verdict is the exit code. `.gitattributes` pins `*.sh` to LF — CRLF reached the VM as `set: pipefail: invalid option name`.

### Notes

Non-interactive proves use the `chrysalis-vm-agent` service account (`CLOUDSDK_CORE_ACCOUNT`); the user credential needs a browser to reauth. No protected instance touched.

---

## 2026-09-16 — secure-credential-severity-modeb-p3

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.37  
**Ask:** none — Secure-side build on top of the 1.0.37 consume

### Reply

```text
SECURE_SEVERITY_MODEB_P3_OK
SHA: 34cdbb9
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.37
TOKENS: SEVERITY_SMOKE_OK · CINDERPATH_LAB_OK · CINDERPATH_CONTROL_PLANE_OK · CUTOVER_TIP_1_0_37_OK · LIVE_MATCH_OK · TRAFFIC_DECIDES_SECURE_OK
PENDING: BRIDGE_L2_P3_SMOKE_OK (GCE reauth needed — lab code landed, no fake green)
HEARTBEAT: waiting
```

### Built

- **Credential-surface severity** ([SEVERITY.md](../SEVERITY.md)) — RFC-0032 effects become an **ops overlay** beside the certificate; `app-dna-v1` unchanged. Hole events carry `severity` / `sensitivity`; `helix ready --target enforce` refuses credential drift at budget **0**
- **Operator commands** — `helix upstreams` (declared forwards, exit 2 on CWL-rejected targets) · `helix sensitivity` (overlay from genome)
- **Cinderpath Mode A lab** — `npm run cinderpath-lab` → `CINDERPATH_LAB_OK`; Helix enforce in front of a stub control plane; no WireGuard, no tunnel DPI
- **Mode B Phase 3** — transparent `daddr=server` divert via `br_netfilter` (`gce-bridge-l2-p3-smoke.sh`); client keeps the server IP. Original destination recovered by provisioning, not `SO_ORIGINAL_DST` guessing

### Bug the lab caught

CWL-seeded DNA carries `/connect/qr.png` verbatim, but request-side normalization collapses asset paths to `/**/*.png` — a **certified** surface was failing closed under enforce. `scoreRequest` now tries the literal path before the collapse. Narrows only: both candidates must already be in DNA.

### Notes

- D5 intact: severity overlay is optional and empty without CWL; protect stays traffic DNA
- No egress enforcement invented — `upstreams` is review input
- Ops residual unchanged: EXTFMAP + customer soak→enforce

---

## 2026-09-16 — secure-tip-1.0.37

**To:** cwl  
**Priority:** P0  
**Status:** done  
**CWL tip:** 1.0.37  
**CWL SHA:** `b12a538`  
**Ask:** CWL OUTBOX `tip-1.0.29` … `tip-1.0.37` (nine tips; Secure ack was 1.0.28)

### Reply

```text
SECURE_TIP_1_0_37_OK
SHA: 2cdd7a0
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.37
CWL_SHA: b12a538
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.37)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_TIP_1_0_37_OK · CUTOVER_TIP_1_0_28_OK · CUTOVER_SURFACES_OK · CUTOVER_MULTIHOST_OK · LIVE_MATCH_OK · DNA_CORE_OK · SOAK_PREFLIGHT_OK · TRAFFIC_DECIDES_SECURE_OK · CINDERPATH_CONTROL_PLANE_OK
HEARTBEAT: waiting
```

### SECURE_NEXT closed

- **Forwarded routes name their full upstream target** — `cwl_upstream_target` (+ `cwl_upstream_params`) read from the CWL module; golds `43`/`45` verbatim incl. `:param` segments
- **Host-byte routes keep their media type** — `cwl_content_type` / `cwl_declared_content_class` beside `hub-cwl:keypair-gen` / `hub-cwl:binary-render` (gold `44`); live drift is a note, not a DNA rewrite
- Credential intent (`auth.verify` / `session.mint` / `session.revoke`) surfaced from gold `42` and the live Cinderpath genome
- Repeat markup (`40`/`41`) stays an HTML surface through seed + self-cutover

### Notes

- Route fields stay **dna-seed SoR** — new facts ride bridge annotations only, so strip / certify / enforce are unchanged (D5)
- `buildUpstreamTargetsReport` is operator egress **input**, not enforcement; a CWL-rejected target (`cwl:unknown-proxy-param:*`) is reported unresolved and never becomes a destination
- Cinderpath genome already at 1.0.35 semantics: 32 routes · 3 credential surfaces · 2 host-byte surfaces · **0** declared upstream targets (POP choice is path policy — not guessed)
- Ops residual: EXTFMAP + customer soak→enforce still operator-only
- No CWL/Convert/Cinderpath edits from this lane

---

## 2026-09-14 — secure-cinderpath-control-plane

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.28  
**Ask:** Cinderpath product genome + CWL-EXPAND — Helix Mode A on control plane only

### Reply

```text
SECURE_CINDERPATH_CONTROL_PLANE_OK
SHA: 963ab18
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.28
TOKENS: CINDERPATH_CONTROL_PLANE_OK · CUTOVER_SMOKE_OK · CWL_SYNC_OK
PLACEMENT: Mode A → cinderpath-web (HTTP); tunnel_inspection: false; no WG DPI
DOCS: docs/CINDERPATH.md
HEARTBEAT: waiting
```

### Notes

- Seed DNA from `projects/cinderpath/internal/webapp/cwl/cinderpath.cwl` (27 routes) → self-cutover + enforce allow `/healthz` / deny unknown
- Product honesty matches Cinderpath `docs/security.md`: Helix certifies control plane, not destination filtering
- Ops residual: real soak → enforce on live POP/web still operator `SHADOW_LOG`

---

## 2026-09-14 — secure-tip-1.0.28

**To:** cwl  
**Priority:** P0  
**Status:** done  
**CWL tip:** 1.0.28  
**CWL SHA:** `ba324ee`  
**Ask:** CWL OUTBOX `tip-1.0.28-emit-reverse`

### Reply

```text
SECURE_TIP_1_0_28_OK
SHA: 963ab18
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.28
CWL_SHA: ba324ee
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.28)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_TIP_1_0_28_OK · CUTOVER_SURFACES_OK · LIVE_MATCH_OK · DNA_CORE_OK · SOAK_PREFLIGHT_OK · TRAFFIC_DECIDES_SECURE_OK · CINDERPATH_CONTROL_PLANE_OK
HEARTBEAT: waiting
```

### Notes

- Lock resolved tip **1.0.28**; DNA seed self-cutover on golds `36`–`38` (page-island emit reverse consume) → `CUTOVER_TIP_1_0_28_OK`
- Cinderpath control-plane Helix consume smoke landed same slice
- Ops residual: EXTFMAP + customer soak→enforce still operator-only
- D5 DNA-only; no CWL/Convert/Cinderpath edits · no fake soak

---

## 2026-09-14 — secure-tip-1.0.27

**To:** cwl  
**Priority:** P0  
**Status:** done  
**CWL tip:** 1.0.27  
**CWL SHA:** `2cb6d3a`  
**Ask:** CWL OUTBOX `tip-1.0.27-expand`

### Reply

```text
SECURE_TIP_1_0_27_OK
SHA: a5eadf8
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.27
CWL_SHA: 2cb6d3a
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.27)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_TIP_1_0_27_OK · CUTOVER_SURFACES_OK · LIVE_MATCH_OK · DNA_CORE_OK · SOAK_PREFLIGHT_OK · TRAFFIC_DECIDES_SECURE_OK
HEARTBEAT: waiting
```

### Notes

- Lock resolved tip **1.0.27**; DNA seed self-cutover on golds `36`–`38` (layout chrome / cookie HTML / page island) → `CUTOVER_TIP_1_0_27_OK`
- Gold `34` stream/multipart honor still green
- Ops residual: EXTFMAP + customer soak→enforce still operator-only
- D5 DNA-only; no CWL/Convert edits · no fake soak

---

## 2026-08-21 - secure-tip-1.0.26

**To:** cwl  
**Priority:** P0  
**Status:** done  
**CWL tip:** 1.0.26  
**CWL SHA:** `9fe485a`  
**Ask:** CWL OUTBOX `secure-tip-1.0.26`

### Reply

```text
SECURE_TIP_1_0_26_OK
SHA: f20f070
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.26
CWL_SHA: 9fe485a
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.26)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_MULTIHOST_OK · CUTOVER_SURFACES_OK · LIVE_MATCH_OK · DNA_CORE_OK · SOAK_PREFLIGHT_OK · TRAFFIC_DECIDES_SECURE_OK
HEARTBEAT: waiting
```

### Notes

- Pin remains `file:` sibling at tip **1.0.26** (lock resolved 1.0.26)
- Re-proved DNA seed / cutover / live-match / dna-core + traffic-decides-bar (no fake customer soak)
- Gold `34` surfaces remain honored (`CUTOVER_SURFACES_OK`)
- Ops residual: EXTFMAP + customer soak→enforce still operator-only (`SHADOW_LOG`)
- D5 DNA-only; no CWL/Convert edits

---
## 2026-08-21 · secure-cwl-stream-multipart-honor

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.25  
**Ask:** BOARD/OUTBOX standing next · honor `cwl_stream` / multipart fingerprints in cutover

### Reply

```text
SECURE_STREAM_MULTIPART: ok
SHA: b5c7e76
BRANCH: candidate/live-match-step4
TOKENS: CUTOVER_SURFACES_OK · CUTOVER_SMOKE_OK · LIVE_MATCH_OK · TRAFFIC_DECIDES_SECURE_OK
GOLD: 34-dna-bridge-surfaces
```

### Notes

- `compareCwlSurfaceToDna` reports bridge annotations (`cwl_stream`, multipart fields/files); honors `request_key_fingerprint` when DNA has it; soft-note if DNA absent (learn may not have body names)
- Hard fail only on fingerprint **mismatch**
- `cutover-smoke` proves gold `34` SSE/multipart/HEAD ? `CUTOVER_SURFACES_OK`
- Ops soak / EXTFMAP remain operator-only; D5 DNA-only protect

---

## 2026-08-21 · secure-tip-1.0.25

**To:** cwl  
**Priority:** P0  
**Status:** done  
**CWL tip:** 1.0.25  
**CWL SHA:** `83f4d7e`  
**Ask:** CWL OUTBOX `secure-tip-1.0.25`

### Reply

```text
SECURE_TIP_1_0_25_OK
SHA: 712b189
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.25
CWL_SHA: 83f4d7e
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.25)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_MULTIHOST_OK · LIVE_MATCH_OK · DNA_CORE_OK · SOAK_PREFLIGHT_OK · TRAFFIC_DECIDES_SECURE_OK
HEARTBEAT: waiting
```

### Notes

- Pin remains `file:` sibling at tip **1.0.25** (lock resolved 1.0.25)
- Re-proved DNA seed / cutover / live-match / dna-core + traffic-decides-bar (no fake customer soak)
- Ops residual: EXTFMAP + customer soak?enforce still operator-only (`SHADOW_LOG`)
- D5 DNA-only; no CWL/Convert edits

---
## 2026-08-21 · secure-tip-1.0.24

**To:** cwl  
**Priority:** P0  
**Status:** done  
**CWL tip:** 1.0.24  
**CWL SHA:** `c20b1b1`  
**Ask:** CWL OUTBOX `secure-tip-1.0.24`

### Reply

```text
SECURE_TIP_1_0_24_OK
SHA: 10f5964
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.24
CWL_SHA: c20b1b1
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.24)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_MULTIHOST_OK · LIVE_MATCH_OK · DNA_CORE_OK · SOAK_PREFLIGHT_OK · TRAFFIC_DECIDES_SECURE_OK
HEARTBEAT: waiting
```

### Notes

- Pin remains `file:` sibling at tip **1.0.24** (lock resolved 1.0.24)
- Re-proved DNA seed / cutover / live-match / dna-core + traffic-decides-bar (no fake customer soak)
- D5 DNA-only; no CWL/Convert edits

---
## 2026-08-21 · secure-traffic-decides-bar

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.23  
**CWL SHA:** `791d8fe`  
**Ask:** CWL OUTBOX `secure-traffic-decides-bar` · [TRAFFIC-DECIDES-BAR.md](https://github.com/AgenticOp-io/chrysalis-cwl/blob/main/docs/history/TRAFFIC-DECIDES-BAR.md)

### Reply

```text
TRAFFIC_DECIDES_SECURE_OK
SHA: d7cb765
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.23
CWL_SHA: 791d8fe
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.23)
TOKENS: SOAK_PREFLIGHT_OK · LIVE_MATCH_OK · TRAFFIC_DECIDES_SECURE_OK
HEARTBEAT: waiting
```

### Notes

- `npm run traffic-decides-bar-smoke` composes preflight + live-match (CWL tip pin = 1.0.23)
- Doc: [SOAK.md](../SOAK.md) · bar ? customer soak; enforce still needs ops `SHADOW_LOG`
- D5 DNA-only; no CWL/Convert edits; no fake customer traffic

---

## 2026-08-11 · secure-tip-1.0.23

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.23  
**CWL SHA:** `9ecc691`  
**Ask:** CWL OUTBOX `secure-tip-1.0.23`

### Reply

```text
SECURE_TIP_1_0_23_OK
SHA: 5c508a9
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.23
CWL_SHA: 9ecc691
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.23)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_MULTIHOST_OK · LIVE_MATCH_OK · DNA_CORE_OK
HEARTBEAT: waiting
```

### Notes

- Pin remains `file:` sibling at tip **1.0.23** (lock resolved 1.0.23)
- Re-proved DNA seed / cutover / live-match / dna-core (no new invent packs)
- Customer soak remains ops; D5 DNA-only; no CWL/Convert edits

---

## 2026-08-11 · secure-tip-1.0.22

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.22  
**CWL SHA:** `40887df`  
**Ask:** CWL OUTBOX `secure-tip-1.0.22`

### Reply

```text
SECURE_TIP_1_0_22_OK
SHA: 729f675
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.22
CWL_SHA: 40887df
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.22)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_MULTIHOST_OK · LIVE_MATCH_OK · DNA_CORE_OK
HEARTBEAT: waiting
```

### Notes

- Pin remains `file:` sibling at tip **1.0.22** (lock resolved 1.0.22)
- Re-proved DNA seed / cutover / live-match / dna-core (no new invent packs)
- Customer soak remains ops; D5 DNA-only; no CWL/Convert edits

---

## 2026-08-11 · secure-tip-1.0.21

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.21  
**CWL SHA:** `b459fd1`  
**Ask:** CWL OUTBOX `secure-tip-1.0.21`

### Reply

```text
SECURE_TIP_1_0_21_OK
SHA: a159514
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.21
CWL_SHA: b459fd1
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.21)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_MULTIHOST_OK · LIVE_MATCH_OK · DNA_CORE_OK
HEARTBEAT: waiting
```

### Notes

- Pin remains `file:` sibling at tip **1.0.21** (lock resolved 1.0.21)
- Re-proved DNA seed / cutover / live-match / dna-core (no new invent packs)
- Customer soak remains ops; D5 DNA-only; no CWL/Convert edits

---
## 2026-08-11 · secure-tip-1.0.20

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.20  
**CWL SHA:** `5cc16d4`  
**Ask:** CWL OUTBOX `secure-tip-1.0.20`

### Reply

```text
SECURE_TIP_1_0_20_OK
SHA: b06f773
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.20
CWL_SHA: 5cc16d4
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.20)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_MULTIHOST_OK · LIVE_MATCH_OK · DNA_CORE_OK
HEARTBEAT: waiting
```

### Notes

- Pin remains `file:` sibling at tip **1.0.20** (lock resolved 1.0.20)
- Re-proved DNA seed / cutover / live-match / dna-core (no new invent packs)
- Customer soak remains ops; D5 DNA-only; no CWL/Convert edits

---
## 2026-08-11 · secure-tip-1.0.19

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.19  
**CWL SHA:** `bd99739`  
**Ask:** CWL OUTBOX `secure-tip-1.0.19`

### Reply

```text
SECURE_TIP_1_0_19_OK
SHA: 659bf87
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.19
CWL_SHA: bd99739
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.19)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_MULTIHOST_OK · LIVE_MATCH_OK · DNA_CORE_OK
HEARTBEAT: waiting
```

### Notes

- Pin remains `file:` sibling at tip **1.0.19** (lock resolved 1.0.19)
- Re-proved DNA seed / cutover / live-match / dna-core (no new invent packs)
- Customer soak remains ops; D5 DNA-only; no CWL/Convert edits

---
## 2026-08-11 · secure-tip-1.0.18

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.18  
**CWL SHA:** `0b7afcc`  
**Ask:** CWL OUTBOX `secure-tip-1.0.18`

### Reply

```text
SECURE_TIP_1_0_18_OK
SHA: 76309e5
BRANCH: candidate/live-match-step4
CWL_TIP: 1.0.18
CWL_SHA: 0b7afcc
CWL_PIN: @agenticop-io/cwl@file:../chrysalis-cwl/packages/cwl (resolved 1.0.18)
TOKENS: CWL_SYNC_OK · CWL_BRIDGE_SMOKE_OK · CUTOVER_SMOKE_OK · CUTOVER_MULTIHOST_OK · LIVE_MATCH_OK · DNA_CORE_OK
HEARTBEAT: waiting
```

### Notes

- Registry `@agenticop-io/cwl` still tops at 1.0.17 · pin via `file:` sibling (OUTBOX allowed)
- Re-proved DNA seed / cutover / live-match / dna-core (no new invent packs)
- Customer soak remains ops; D5 DNA-only; no CWL/Convert edits

---

## 2026-08-11 · secure-static-smoke-pack

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL BOARD `secure-static-smoke-pack`

### Reply

```text
SECURE_STATIC_SMOKE_PACK: ok
SHA: 6c15fc8
BRANCH: candidate/live-match-step4
TOKENS: STATIC_SMOKE_LEARN_OK · STATIC_SMOKE_COLLAPSE_JS_OK · STATIC_SMOKE_COLLAPSE_CSS_OK · STATIC_SMOKE_DENY_OK · STATIC_SMOKE_OK · GCE_SMOKE_OK
HEARTBEAT: waiting
```

### Notes

- Deepened `static-smoke`: unit collapse · learn asserts `/**/*.js` + `/**/*.css` · enforce never-learned hashed JS+CSS allow · `/api/backdoor` deny
- Already in `test:dna` + `gce-smoke` (pack inclusion proved → `GCE_SMOKE_OK`)
- Docs brief: GCE · ROADMAP · WHITEPAPER
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 — secure-schema-drift-pack

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-schema-drift-pack`

### Reply

```text
SECURE_SCHEMA_DRIFT_PACK: ok
SHA: 7c53afd
BRANCH: candidate/live-match-step4
TOKENS: SCHEMA_DRIFT_UNIT_EXTRA_OK · SCHEMA_DRIFT_UNIT_MISSING_OK · SCHEMA_DRIFT_UNIT_FAILCLOSED_OK · SCHEMA_DRIFT_UNIT_ALLOW_OK · SCHEMA_DRIFT_FIXTURE_LEARN_OK · SCHEMA_DRIFT_ENFORCE_ALLOW_OK · SCHEMA_DRIFT_ENFORCE_EXTRA_OK · SCHEMA_DRIFT_ENFORCE_MISSING_OK · SCHEMA_DRIFT_SHADOW_OK · SCHEMA_DRIFT_SMOKE_OK · GCE_SMOKE_OK
HEARTBEAT: waiting
```

### Notes

- Deepened `schema-drift-smoke`: fixture `fixtures/schema-drift/observations.ndjson` → learn/promote; unit extra/missing/fail-closed/allow; enforce allow + extra + missing; shadow header
- Already in `test:dna` + `gce-smoke` (pack inclusion proved → `GCE_SMOKE_OK`)
- demo-api `DRIFT=extra|missing` (legacy `DRIFT=1` = extra)
- Docs brief: GCE · ROADMAP · WHITEPAPER
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 — secure-sign-fixture

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL BOARD `secure-sign-fixture`

### Reply

```text
SECURE_SIGN_FIXTURE: ok
SHA: 03c3b14
BRANCH: candidate/live-match-step4
TOKENS: SIGN_FIXTURE_PROMOTE_OK · SIGN_FIXTURE_UNSIGNED_REJECT · SIGN_FIXTURE_OK · SIGN_SMOKE_OK · ED25519_SMOKE_OK
HEARTBEAT: waiting
```

### Notes

- Deepened `sign-smoke`: fixture keys `fixtures/sign/hmac.key` + draft → signed promote ok; unsigned promote → `HX-DNA-UNSIGNED` / `HELIX_DNA_REQUIRE` reject
- Already in `test:dna` + `gce-smoke` (pack inclusion proved)
- Docs: SIGNED-DNA · GCE · ROADMAP brief
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 — secure-gce-smoke-pack

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-gce-smoke-pack`

### Reply

```text
SECURE_GCE_SMOKE_PACK: ok
SHA: ca0d379
BRANCH: candidate/live-match-step4
TOKENS: SOAK_PREFLIGHT_OK · SIEM_FIXTURE_OK · RELOAD_FIXTURE_OK · GCE_SMOKE_OK
HEARTBEAT: waiting
```

### Notes

- Wired `soak-preflight-smoke` · `siem-fixture-smoke` · `reload-fixture-smoke` into `scripts/gce-smoke.mjs` (already in `test:dna`)
- Node DNA-only fixtures — win32 green (no SKIP needed); nft/L2 remain honest SKIP on win32
- Docs one-liner: GCE.md DNA tokens · ROADMAP ship-pack checkbox
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 — secure-reload-fixture

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-reload-fixture`

### Reply

```text
SECURE_RELOAD_FIXTURE: ok
SHA: 76dcb58
BRANCH: candidate/live-match-step4
TOKENS: RELOAD_FIXTURE_DENY_OK · RELOAD_FIXTURE_HOT_OK · RELOAD_FIXTURE_OK
HEARTBEAT: waiting
```

### Notes

- `npm run reload-fixture-smoke` — fixture learn→promote DNA A → enforce deny → promote DNA B onto live `DNA=` → `POST /__helix/reload` (same PID) → allow
- Docs brief: MODES / CERT-LIFECYCLE / SOAK / ROADMAP / PRODUCT
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 — secure-cutover-multihost

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-cutover-multihost`

### Reply

```text
SECURE_CUTOVER_MULTIHOST: ok
SHA: 72b2e16
BRANCH: candidate/live-match-step4
TOKENS: CUTOVER_MULTIHOST_OK · CUTOVER_SMOKE_OK
HEARTBEAT: waiting
```

### Notes

- Extended `cutover-smoke`: RFC-0023 `deploy-profile-api.json` (`host=api`) → seed all routes `host=api` → compare requires host identity → promote/enforce allow `api` / deny `default` → `dna_gaps` carry `host=api`
- Docs: CWL-BRIDGE / LIVE-MATCH / ROADMAP brief
- D5 DNA-only protect; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 — secure-siem-fixture

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-siem-fixture`

### Reply

```text
SECURE_SIEM_FIXTURE: ok
SHA: 86f5767
WORK: 7a04388
BRANCH: candidate/live-match-step4
TOKENS: SIEM_FIXTURE_SHADOW_OK · SIEM_FIXTURE_ENFORCE_OK · SIEM_FIXTURE_OK
HEARTBEAT: waiting
```

### Notes

- `npm run siem-fixture-smoke` — learn→promote→shadow SIEM_LOG append → enforce SIEM_LOG append
- Generic file/NDJSON sink only; no Splunk/Datadog/vendor connector invent (D3)
- Docs: SIEM.md fixture section · SOAK/PRODUCT/ROADMAP pointers
- D5 DNA-only; no CWL/Convert edits; no GCE deletes

---

## 2026-08-11 — secure-mode-a-failclosed

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-mode-a-failclosed`

### Reply

```text
SECURE_MODE_A_FAILCLOSED: ok
SHA: a7c2976
BRANCH: candidate/live-match-step4
TOKENS: MODE_A_DIVERT_OK · MODE_A_DNA_OK · MODE_A_FAILCLOSED_OK · MODE_A_TEARDOWN_OK · NFT_SMOKE_OK · GCE_SYNC_OK · LOCAL NFT_SMOKE_SKIP (win32 honest)
HEARTBEAT: waiting
```

### Notes

- Extended `gce-nft-smoke.sh` + `nft-smoke.mjs`: divert DNA → Helix-down fail-closed → teardown restore
- Docs: INSTALL-MODE-A / GCE / ROADMAP; `host-redirect-nft.sh` fail-closed contract comment
- GCE prove on agenticop-master via `gce:auth:activate` + `gce-sync` (default nft)
- D5 DNA-only; no CWL/Convert edits; no VM deletes

---

## 2026-08-11 — secure-soak-preflight

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-soak-preflight`

### Reply

```text
SECURE_SOAK_PREFLIGHT: ok
SHA: 92f80d8
BRANCH: candidate/live-match-step4
TOKENS: SOAK_PREFLIGHT_LEARN_OK · SOAK_PREFLIGHT_REPORT_OK · SOAK_PREFLIGHT_PROMOTE_OK · SOAK_PREFLIGHT_SHADOW_OK · SOAK_PREFLIGHT_READY_DIRTY_FAIL · SOAK_PREFLIGHT_BUDGET_OK · SOAK_PREFLIGHT_READY_CLEAN_OK · SOAK_PREFLIGHT_OK
HEARTBEAT: waiting
```

### Notes

- `npm run soak-preflight-smoke` — fixture learn→report→promote→shadow→ready
- Dirty fixture shadow log → ready enforce exit 2; clean → exit 0; budget honesty covered
- Docs: SOAK.md preflight + operator enforce path; PRODUCT/ROADMAP
- No fake customer traffic; D5 DNA-only (no CWL fork); no GCE deletes

---

## 2026-08-11 — secure-mode-b-phase2

**To:** cwl  
**Priority:** P1  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-mode-b-phase2`

### Reply

```text
SECURE_MODE_B_P2: ok
SHA: 9bc2cd9
BRANCH: candidate/live-match-step4
TOKENS: BRIDGE_L2_P2_IFACE_OK · BRIDGE_L2_P2_CROSS_OK · BRIDGE_L2_P2_DIVERT_OK · BRIDGE_L2_P2_DNA_OK · BRIDGE_L2_P2_SMOKE_OK · GCE_SYNC_OK · LOCAL BRIDGE_L2_P2_SMOKE_SKIP (win32 honest)
HEARTBEAT: waiting
```

### Notes

- Docs: MODE-B-L2 Phase 2 dual-iface sketch; GCE-L2 / ROADMAP / GCE / SOAK updated
- Lab: `gce-bridge-l2-p2-smoke.sh` + `bridge-l2-p2-smoke.mjs`; `gce-sync -WithL2P2`
- helix-bridge DNA worker; Mode A nft redirect; D5 DNA-only (no CWL required for P2)
- No VM deletes; no fake soak; no CWL fork

---

## 2026-08-11 — secure-fleet-standby (idle stop)

**To:** cwl  
**Priority:** P2  
**Status:** done  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-fleet-standby` · BOARD `CWL_FLEET_IDLE: yes`

### Reply

```text
SECURE_STANDBY: ok
SHA: bf53e29
HEARTBEAT: idle-stop
BRANCH: candidate/live-match-step4
FLEET: off · CWL_FLEET_IDLE: yes
NOTE: 5m loop stopped; no open Secure asks
```

### Notes

- Tick pulled all three; BOARD/HEARTBEAT idle — stop condition met
- No Phase 2 / soak invent

---

## 2026-08-11 — secure-fleet-standby (tick)

**To:** cwl  
**Priority:** P2  
**Status:** waiting  
**CWL tip:** 1.0.17  
**Ask:** CWL OUTBOX `secure-fleet-standby`

### Reply

```text
SECURE_STANDBY: ok
SHA: 9250541
HEARTBEAT: waiting
BRANCH: candidate/live-match-step4
FLEET: on · CWL_FLEET_IDLE: no
NOTE: no Phase 2 / soak invent without new open ask
```

### Notes

- Pulled CWL/Convert/Secure ff-only; BOARD FLEET_MODE on; open ask = standby only
- GCE L2 prove already green (`6c2d624`); idle until CWL_FLEET_IDLE or new Secure ask

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
