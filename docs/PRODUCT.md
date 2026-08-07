# Helix — what makes this a product that changes security

CWL tip checked: language pillar current at build time (run `npm run cwl-sync-check`).

## Thesis

Security today answers **“is this packet/payload/user weird?”**  
Helix answers **“is this still the certified app?”**

That is a category shift only if operators can run it **Monday morning** without becoming DNA philosophers — and only if enforce is a boring consequence of learn → promote → shadow, not a science project.

---

## Already enough to prove the idea (lab / early adopters)

| Capability | Why it matters |
|------------|----------------|
| learn / shadow / enforce | Allow-while-securing path |
| Route + JSON/query/status DNA | Stops unauthorized new surface |
| Signed DNA + reload | Certificate lifecycle without downtime |
| Mode A agent / compose / SIEM NDJSON | Fits NGFW world (D1–D4) |
| Optional CWL cutover | Platform path without requiring CWL (D5) |
| Whitepaper + threat model | Story is honest |

**Verdict today:** shippable engine + operator path + Mode A install + **L2 GCE green**. Remaining for full “changed security” credibility is **living with real customer traffic** (shadow soak → enforce) — not more core fingerprints.

---

## Gap map — how much more (honest)

Rough product maturity: **~70%** of the *shippable* bar (engine + operator path + install/image recipes). Remaining: **GCE L2 green** + real customer shadow soak.

### Tier 1 — must ship to change buyer behavior

1. **Operator readiness gate** — `helix report` / `helix ready` (+ `--shadow-log`) — **done**  
2. **One install story** — systemd Mode A — **done**  
3. **Shadow→enforce checklist** — shadow hole count gate — **done**  
4. **Real-app prove pack** — `real-site-smoke` — **done**

### Tier 2 — makes it stick in production (~ following quarter)

5. **K8s sidecar image + prove** — sketch exists; need build/push/smoke.  
6. **Certificate lifecycle UX** — parent_hash chain, promote-with-diff printed by default, revoke/replace runbook.  
7. **SIEM that ops already open** — Filebeat recipe exists; add one Splunk/Elastic dashboard JSON.  
8. **L2/GCE Mode B green** — only for segment buyers; not required for host Mode A product.

### Tier 3 — do **not** chase (would un-change the category)

- UEBA / SQLi signature packs / “replace the WAF”  
- Custom OS / NGFW SSL inspection dependency  
- Helix DSL instead of traffic DNA  
- Requiring Chrysalis Convert to protect

---

## What “changed security” looks like when done

```text
Before:  NGFW + WAF + hope the app didn’t grow a backdoor
After:   NGFW + WAF + Helix DNA certificate on the app hop

  learn (traffic still flows)
    → report (coverage honest)
    → promote (diff reviewed)
    → shadow (holes alert only)
    → ready (gate)
    → enforce (unauthorized surface fails closed)
    → reload (new promote without downtime)
```

Buyer sentence: **“We don’t allow app shape we didn’t certify.”**  
That sentence is only credible with Tier 1 install + readiness + real-app prove.

---

## Build order (this doc’s commitment)

| Priority | Slice | Status |
|----------|-------|--------|
| P0 | `helix report` / `helix ready` + smoke | **done** |
| P0 | systemd Mode A unit + install notes | **done** |
| P1 | Shadow log “unexpected count” helper | **done** (`--shadow-log`) |
| P1 | Real-site beginning pack | **done** (`real-site-smoke`) |
| P2 | K8s image prove | **done** (`k8s-image-smoke`, SKIP without docker) |
| P2 | Mode B L2 GCE | **done** (`BRIDGE_L2_SMOKE_OK` on agenticop-master) |
| P2 | Splunk HEC recipe | **done** ([SPLUNK.md](./SPLUNK.md)) |
| Ops | Customer shadow soak | **runbook** ([SOAK.md](./SOAK.md)) — live traffic only |

Related: [WHITEPAPER.md](./WHITEPAPER.md) · [MODES.md](./MODES.md) · [BEGINNING.md](./BEGINNING.md) · [ROADMAP.md](./ROADMAP.md)
