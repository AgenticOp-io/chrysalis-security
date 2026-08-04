# Helix beginning — most of the internet, out of the box

## Concept check

Helix’s edge is not “smarter WAF rules.” It is:

**Trust nothing that this app has not already proved via traffic.**

Most of the internet that we can protect *out of the box* is:

- HTTPS (or HTTP behind someone else’s TLS)
- Normal websites + JSON APIs
- Deployed behind a reverse proxy / load balancer / container

Most of the internet is **not**:

- Waiting for a Chrysalis conversion
- Willing to configure SQL fingerprints
- Willing to read a rule encyclopedia
- Running a custom OS

So the product must feel like **nginx with a brain**: one upstream, three modes, one DNA file.

## What “out of the box” means

Someone with a typical web app can:

1. Point Helix at their existing app (`UPSTREAM`)
2. Run **learn** on real traffic (no app changes)
3. **Promote** once
4. Run **shadow**, then **enforce**
5. Block brand-new routes / API shapes that were never seen — without writing rules

No per-framework adapters. No convert dependency. No signature pack downloads.

## What we fingerprint (internet majority)

Keep DNA small so it works on WordPress, Rails, Express, PHP, static+API, etc.

| Signal | Out-of-box? | Notes |
|--------|-------------|--------|
| Method + path template | **Yes — primary** | Normalize numeric IDs, UUIDs; strip query *values* |
| Host | **Yes** | Multi-site / vhost safe |
| Content-Type class | **Yes** | `json` / `html` / `other` |
| JSON top-level keys | **Yes — JSON only** | Drift detection for APIs |
| HTML body fingerprint | **No (v0)** | CMS pages change constantly → false positives |
| SQL / DB | **No (v0)** | Needs app instrumentation; later optional |
| Auth deep logic | **No (v0)** | In-DNA abuse stays a WAF/app problem |

**v0 enforce rule (simple):**

- Unknown `METHOD + host + path_template` → deny  
- Known route + `Content-Type: json` + key fingerprint mismatch → deny  
- Known HTML/static route → allow if path known (don’t overfit body)

That covers the common internet attack Helix owns: **unauthorized new surface** (backdoors, agent-added admin, surprise API).

## Placement (works with how the internet is actually run)

**Product target:** augment any NGFW **without** rewriting that box’s NAT/VIP — see [AUGMENT.md](./AUGMENT.md).

| Mode | When |
|------|------|
| **A. Host intercept** | Default for “all traffic to this app” (internal + external); NGFW unchanged |
| **B. Transparent bridge** | Segment-wide bump-in-wire; IPs unchanged |
| **C. Explicit reverse proxy** | Lab / simple hop (what ships in smoke today) |

Beginning code path is **C**. Out-of-box for real networks converges on **A** (agent on the host or sidecar).

Ship form: **one Linux container** (and later one static binary). GCE is where *we* prove it; customers run it anywhere Linux runs.

## Basic beginning (the only MVP)

One sentence: **HTTP reverse proxy that learns routes and blocks unknown ones.**

### Config (that’s all)

```env
UPSTREAM=http://127.0.0.1:3000
MODE=learn          # learn | shadow | enforce
DNA=/data/app.dna.json
APP_ID=my-site
```

### Operator story

```
learn for a while  →  helix promote  →  shadow  →  enforce
```

### Day-one proof (GCE)

1. Demo (or real) site behind Helix in learn  
2. Promote DNA  
3. Request `/api/backdoor` (never learned)  
4. Enforce → **403** + reason `HX-ROUTE-UNKNOWN`  
5. Same request in shadow → allowed to app but logged  

### Explicit non-goals for beginning

- Custom OS / NGFW / packet firewall  
- Replacing ModSecurity/Cloudflare WAF  
- SQL DNA, eBPF, signed PKI (come after smoke is boring)  
- Anything that needs chrysalis-convert to function  

## Build order (straight line)

1. **Proxy learn** — record method/host/path/status/content-type/(json keys)  
2. **Promote** — draft → certified (already stubbed)  
3. **Enforce/shadow** — route deny + JSON key deny  
4. **Container** — `docker run` with the env above  
5. **GCE smoke script** — proves 1–4 on Linux  

When that works against a boring real site (not only `demo-api`), Helix works for most of the internet’s *shape*. Depth (SQL, TLS terminate, signing) comes after.

## Trust-nothing, still simple

Three rules stay:

1. Trust nothing until certified  
2. DNA from traffic, not hope  
3. Change is guilty until promoted  

No extra laws required for worldwide HTTP.
