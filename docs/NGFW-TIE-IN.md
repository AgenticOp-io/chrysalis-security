# Helix ↔ NGFW tie-in — can it be a “firewall add-in”?

**Short answer:** Not as a vendor dataplane plugin that *replaces* FortiOS / PAN-OS / Snort.  
**Yes** as an **augment** that sits with the app (Mode A/B) and optionally **feeds** NGFW / SOAR via APIs and logs — same recipe for almost every NGFW.

Locks: **D1** (no NGFW TLS dependency) · **D3** (not a WAF/UEBA replacement) · **D4** (no NAT homework). Canon: [AUGMENT.md](./AUGMENT.md).

---

## What “add-in” usually means (and why Helix doesn’t fit)

| Buyer hope | Reality across NGFW vendors |
|------------|------------------------------|
| Install Helix **inside** FortiGate / Palo / Cisco box | Vendors do **not** open a general third-party HTTP “DNA engine” slot on the dataplane |
| Run DNA on decrypted TLS in the NGFW | Requires **their** SSL inspection (violates **D1** product stance) |
| One .so / Software Blade for all brands | Each OS is proprietary; partner programs are slow and per-vendor |

Helix’s job is **application identity on the HTTP hop** (certified DNA). That hop is almost always **after** the NGFW, on the host/sidecar/bridge — which is why Mode A/B is the product, not a FortiOS module.

---

## Survey — major NGFW / edge offerings (integration surfaces)

Classified by **what they actually expose to third parties**, not marketing names.

### Edge / campus NGFW

| Vendor / product | In-box “plugin” for custom HTTP DNA? | Useful Helix tie-in |
|------------------|--------------------------------------|---------------------|
| **Fortinet FortiGate** | No arbitrary blade for Helix | Keep VIP→host; Helix Mode A. Optional: **Security Fabric** / syslog / automation stitches; FortiAppSec/FortiWeb are **parallel WAF** (API for *their* WAF, not Helix host) |
| **Palo Alto NGFW / Prisma / CN-Series** | No third-party App-ID runtime | Custom App-ID/threat **signatures** ≠ DNA. Tie-in: **EDL / Dynamic Address Groups**, Cortex/XSIAM ingest of Helix holes, CN-Series as *other* layer while Helix is sidecar |
| **Cisco Secure Firewall (FMC) + Snort 3** | Inspectors are Cisco/Talos JSON config — not a Helix SDK | Custom IPS rules ≠ DNA. Tie-in: FMC/API + syslog; do **not** rewrite Helix as a Snort inspector |
| **Check Point** | Blades are Check Point’s | **Identity Awareness Web API** (quarantine host/IP roles), Mgmt API for rules — good for “Helix hole → restrict Access Role” |
| **Juniper SRX** | No Helix blade | Syslog / Security Director APIs; Mode A on hosts |
| **Sophos / SonicWall / WatchGuard / Barracuda / Stormshield** | UTM/WAF bundles are theirs | Same Mode A/B; SIEM export |
| **pfSense / OPNsense / IPFire** | Open, but still packet/UTM | Mode A on app host; optional HAProxy/nginx hop (Mode C) |

### Cloud network firewalls

| Offering | Tie-in |
|----------|--------|
| **AWS Network Firewall / Azure Firewall / GCP Cloud NGFW** | Network layer only → Helix on compute/GKE sidecar |
| **Cloudflare / Zscaler / similar SSE** | They own edge TLS → Helix still on **origin** (D1: don’t depend on their decrypt for DNA) |

### Adjacent (often confused with NGFW add-ins)

| Offering | Relation to Helix |
|----------|-------------------|
| **FortiWeb / FortiAppSec Cloud, Palo Prisma Cloud WAF, etc.** | Signature/bot/WAF products — **pair beside**, don’t merge (D3) |
| **Service mesh / Ingress (Istio, nginx, Envoy)** | Natural Helix Mode A/C placement (sidecar/proxy) |

---

## Realistic Helix product shapes (ranked)

### 1. Primary (shipped) — **not an add-in, an augment**

```text
Any NGFW (unchanged NAT/VIP)
    → app host / pod
        → Helix (learn | shadow | enforce)
            → app
```

Works with **all** vendors in the table. No partner SDK. See [INSTALL-MODE-A.md](./INSTALL-MODE-A.md).

### 2. Soft “add-in” (recommended productization) — **control-plane glue**

Helix stays on the host; NGFW/SOAR **reacts** to holes:

| Integration | Mechanism | Example |
|-------------|-----------|---------|
| **Alert** | `SIEM_LOG` NDJSON → Filebeat/Splunk/Elastic ([FILEBEAT.md](./FILEBEAT.md), [SPLUNK.md](./SPLUNK.md)) | Already |
| **Quarantine / restrict** | On `HX-ROUTE-UNKNOWN` (enforce or repeated shadow) call vendor API | Check Point Identity Web API; Palo DAG/EDL; FortiGate address group + automation stitch |
| **Ticket / SOAR** | Webhook from SIEM | Generic |
| **Inventory** | `helix report` / DNA cert pushed to CMDB | Ops |

This *feels* like a firewall add-in to the SOC without living in FortiOS.

### 3. Explicit hop (Mode C) — only when they’ll change VIP

`NGFW → Helix VIP → app` — one policy change. Fine for SaaS/lab; not the “no NAT homework” story (D4).

### 4. Avoid — true dataplane plugin

| Idea | Why not |
|------|---------|
| Snort 3 custom inspector that “is Helix” | Wrong layer; Cisco-owned inspector model; TLS mid-path |
| Palo custom App-ID encoding DNA | Signature patterns ≠ traffic DNA certificates |
| FortiOS / Check Point proprietary blade | Multi-year partner; couples Helix to one OS; SSL inspection temptation (D1) |

---

## Per-vendor “tie-in” playbook (if we productize glue)

| Priority | Vendor surface | Helix action |
|----------|----------------|--------------|
| P1 | **Syslog/CEF/JSON** to all managers | Map `helix.hole` → common fields (already NDJSON) |
| P1 | **Check Point** Identity Web API | Optional connector: hole → Access Role quarantine |
| P1 | **Palo** External Dynamic List / DAG | Optional: emit IP/host list on sustained holes |
| P2 | **Fortinet** Fabric / automation stitch | Syslog trigger → script; don’t require FortiWeb |
| P2 | **Cisco FMC** alert correlation | Syslog only unless partner asks for more |
| P3 | Marketplace listings | “Works with FortiGate/Palo/…” = Mode A certified, not in-box blade |

---

## Recommendation

1. **Keep saying:** Helix **augments any NGFW** — install on the app path (Windows/Linux/K8s), not inside the firewall OS.  
2. **If marketing wants “add-in”:** ship **connectors** (SIEM first, then Check Point / Palo quarantine EDLs) — not FortiOS modules.  
3. **Do not** bet the product on SSL inspection or a single-vendor blade.

Related: [AUGMENT.md](./AUGMENT.md) · [DECISIONS.md](./DECISIONS.md) · [WHITEPAPER.md](./WHITEPAPER.md) · [CHIMERA-HELIX-COEXISTENCE.md](./CHIMERA-HELIX-COEXISTENCE.md)
