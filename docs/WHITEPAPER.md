# Helix Whitepaper — Behavioral DNA Firewall

**Product:** Helix (Chrysalis Secure pillar)  
**Artifact:** Traffic DNA (`app-dna-v1`)  
**One line:** *If it isn’t in the certified DNA, it doesn’t pass.*

---

## 1. The problem

Modern applications change constantly — deploys, feature flags, AI agents editing code, forgotten admin panels, “temporary” debug endpoints. Classic defenses ask the wrong question:

| Stack | Question it answers |
|-------|---------------------|
| NGFW / IPS | Is this packet/geo/signature bad? |
| WAF | Does this payload match known attack patterns? |
| SIEM / UEBA | Does this *user or host* look anomalous over time? |

None of those answer: **Is this still the same application we certified?**

An attacker (or a compromised pipeline) that adds `/api/backdoor` or returns an extra JSON field often looks *fine* to a WAF. The route is HTTP. The payload is clean. The firewall already allowed the host. The breach is **unauthorized new surface** — the app’s identity changed without anyone promoting that change.

Helix exists for that gap.

---

## 2. The idea

Helix treats a running app like a living organism with a **behavioral DNA certificate** learned from real traffic — not from hope, OpenAPI hope-docs, or hand-written rule encyclopedias.

```text
Real traffic  →  learn  →  draft DNA  →  human/agent promote  →  certified DNA
                                                                    ↓
                                         every request/response scored against it
                                                                    ↓
                                              match → allow · mismatch → hole
```

Three rules only ([CANON.md](./CANON.md)):

1. **Trust nothing until certified.** Enforce fails closed without DNA.
2. **DNA comes from traffic, not hope.** Never invent routes to look complete.
3. **Change is guilty until promoted.** New surface does not auto-trust.

Helix is not a smarter WAF. It is **nginx-with-a-brain**: one upstream, three modes, one DNA file.

---

## 3. How it works

### 3.1 Placement (see traffic without owning the NGFW)

Helix sits on the **HTTP hop closest to the app**. It does **not** require FortiGate / Palo / cloud firewall SSL inspection (lock **D1**). The NGFW keeps packets, VPN, IPS, geo, and NAT.

| Mode | Role |
|------|------|
| **A — Host intercept** | Default product target. NGFW VIP/NAT unchanged. App listens on localhost; Helix (or soft bind) owns the public port. Covers external *and* internal hits to that host. |
| **B — Transparent bridge** | Bump-in-path / L2 appliance. Same server IPs; segment-wide. |
| **C — Explicit reverse proxy** | Lab and simple hops. Point upstream at Helix. |

Day-one shipping path is Mode C (`helix-proxy`). Out-of-box for real networks converges on Mode A (`helix-agent` / sidecar). Details: [AUGMENT.md](./AUGMENT.md).

Optional: Helix can terminate TLS itself (`HELIX_TLS_CERT` / `HELIX_TLS_KEY`). Default story remains “see cleartext after someone else’s terminate on the host.”

### 3.2 Modes

| Mode | Behavior |
|------|----------|
| **learn** | Pass traffic. Record observations (method, host, path template, status, content class, JSON keys, query *names*). |
| **shadow** | Score against certified DNA. **Allow** through, but log / header the hole (`x-helix-shadow-hole`). Safe rehearsal. |
| **enforce** | Score against certified DNA. **Block** mismatches with HTTP 403 + hole code. Fail closed if no DNA. |

Operator story:

```text
learn for a while  →  helix promote  →  shadow  →  enforce
```

### 3.3 What DNA fingerprints (internet majority)

DNA stays small so it works on WordPress, Rails, Express, PHP, static+API — the shape of most of the web — without per-framework adapters.

| Signal | Role |
|--------|------|
| `METHOD` + `host` + `path_template` | Primary identity. Numeric IDs / UUIDs / hashed static assets collapse (`/api/items/:id`, `/**/*.js`). |
| `content_class` | `json` / `html` / `other` |
| `status_classes` | e.g. learned `200` — surprise `5xx` class on a certified route is drift |
| `response_key_fingerprint` / `request_key_fingerprint` | Sorted JSON key paths depth≤2 (e.g. `data.role`) |
| `query_key_fingerprint` | Sorted unique query **names** (values ignored) |

**Deliberately not in v0:** HTML body hashes (CMS churn → false positives), SQL/DB fingerprints, deep authz logic. Those stay WAF/app problems ([BEGINNING.md](./BEGINNING.md)).

Certified DNA may be **signed** (HMAC-SHA256 or Ed25519) so enforce rejects tampered certificates.

### 3.4 Scoring — how protect happens

On each request (and JSON response), Helix asks only: **is this still the certified app?**

**Request path**

1. No certified DNA → `HX-NO-DNA` (enforce blocks).
2. Route not in DNA → `HX-ROUTE-UNKNOWN`.
3. Query names ≠ learned set → `HX-QUERY-SCHEMA-DRIFT`.
4. JSON request keys ≠ learned set → `HX-REQUEST-SCHEMA-DRIFT`.

**Response path (certified JSON routes)**

1. Status class not in learned set → `HX-STATUS-DRIFT`.
2. Content class not `json` when DNA says json → `HX-CONTENT-CLASS-DRIFT`.
3. Key fingerprint mismatch, missing body, or unparseable JSON → `HX-SCHEMA-DRIFT` (**fail-closed** — no silent allow on empty parse).

HTML/static routes: allow if the path template is known; do not overfit bodies.

Holes are emitted as structured events (optional `SIEM_LOG` NDJSON) for your existing SIEM/XDR. Helix is not a SIEM (lock **D3**).

### 3.5 Change control

```text
New deploy adds /api/admin   →  not in DNA  →  blocked / alerted
Legitimate new feature      →  learn (or draft from lab) → diff → promote → allow
Agent/backdoor adds surface →  same as unknown route — no free pass
```

Promotion is the only path from “observed” to “trusted.” There is no silent auto-trust of drift.

---

## 4. How it protects (attack stories)

### 4.1 Unauthorized new surface

**Attack:** Compromised host, supply-chain implant, or AI agent adds `/api/exfil` or `/admin/debug`.

**WAF view:** Often clean GET/POST to a valid host.  
**Helix view:** Route never learned → `HX-ROUTE-UNKNOWN` → block in enforce / alert in shadow.

This is the primary Helix win: **identity of the app**, not payload signatures.

### 4.2 API shape smuggling / implant fields

**Attack:** Known `/api/items` starts returning `{ items, pwned, exfil }` or accepting unexpected request keys.

**Helix view:** Response or request key fingerprint drift → `HX-SCHEMA-DRIFT` / `HX-REQUEST-SCHEMA-DRIFT`.

### 4.3 Surprise query surface

**Attack:** Known path gains `?debug=1` or `?cmd=` that was never in production traffic.

**Helix view:** Query-name fingerprint drift → `HX-QUERY-SCHEMA-DRIFT`.

### 4.4 Status / content class lies

**Attack:** Certified JSON health endpoint starts returning HTML error pages or unexpected status classes after tampering.

**Helix view:** `HX-CONTENT-CLASS-DRIFT` / `HX-STATUS-DRIFT`.

### 4.5 Certificate tampering

**Attack:** Operator or malware rewrites the DNA file on disk to allow a backdoor.

**Helix view:** With signing required, bad signature → refuse to start / `HX-DNA-BAD-SIG`.

### 4.6 What Helix does *not* claim

Honesty is part of the protect story ([THREAT-MODEL.md](./THREAT-MODEL.md)):

- Abuse of a route that **is** in DNA (broken authz, business logic) — still WAF/app.
- Classic SQLi/XSS on a known route — pair a WAF; Helix will not become ModSecurity.
- Traffic Helix cannot see (ciphertext mid-path without keys; bypass the sidecar).
- UEBA / “user looks weird” — lock **D3**; that stays XDR.

Helix asks one question well. Pair it with NGFW + WAF for the rest. Coexistence with Chimera-class stacks: [CHIMERA-HELIX-COEXISTENCE.md](./CHIMERA-HELIX-COEXISTENCE.md).

---

## 5. Relationship to Chrysalis pillars

| Pillar | Job vs Helix |
|--------|----------------|
| **CWL** | Language of the web model. Optional bridge can *seed* or *compare* DNA surfaces (RFC-0022). Never required to learn or enforce (lock **D5**). |
| **Convert** | Universal Translator. Does not own Helix or the UT↔Helix spine. |
| **Secure (Helix)** | Traffic DNA firewall. Protects with DNA out of the box. |

Missing CWL pillar → bridge/cutover smokes **SKIP** honestly; DNA pack still gates. Do not invent a Helix DSL; do not enforce CWL as the firewall.

---

## 6. Operator picture

```text
┌─────────────────────────────────────────────────────────┐
│  Any NGFW / LB (unchanged NAT — Mode A)                 │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  App host / pod                                         │
│    Helix (learn | shadow | enforce)                     │
│      DNA: app.dna.json (± signature)                    │
│      holes → SIEM_LOG / shadow log                      │
│         │                                               │
│         ▼                                               │
│    App on localhost                                     │
└─────────────────────────────────────────────────────────┘
```

**Config surface (beginning):**

```env
UPSTREAM=http://127.0.0.1:3000
MODE=learn|shadow|enforce
DNA=/data/app.dna.json
SIEM_LOG=/data/siem.ndjson   # optional
```

**Prove tokens (engineering bar):** `SMOKE_OK`, `HOST_SMOKE_OK`, schema/request/query/status drift smokes, `CUTOVER_SMOKE_OK` when CWL present, GCE sync when proving on `agenticop-master`.

---

## 7. Design locks (do not reopen casually)

| ID | Lock |
|----|------|
| **D1** | No dependency on NGFW TLS decryption |
| **D2** | DNA mismatch → block (enforce) and alert (shadow) |
| **D3** | Not UEBA / not signature-WAF replacement |
| **D4** | Augment firewalls without NAT homework (prefer Mode A) |
| **D5** | CWL never required to learn/enforce |

Full text: [DECISIONS.md](./DECISIONS.md).

---

## 8. Closing

Firewalls and WAFs defend **channels and payloads**. Helix defends **application identity**.

Learn what the app proved in production. Promote that proof into a certificate. Trust nothing else until someone deliberately promotes the next change.

That is how Helix is supposed to work — and how it protects: by making unauthorized new surface fail closed, while staying simple enough to sit in front of most of the internet’s HTTP apps without a rule encyclopedia.

---

### Related docs

| Doc | Use |
|-----|-----|
| [BEGINNING.md](./BEGINNING.md) | Out-of-box product definition |
| [THREAT-MODEL.md](./THREAT-MODEL.md) | Stop / don’t stop |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Package layout |
| [AUGMENT.md](./AUGMENT.md) | NGFW pairing |
| [CANON.md](./CANON.md) | Three rules |
| [ROADMAP.md](./ROADMAP.md) | What shipped vs later |
