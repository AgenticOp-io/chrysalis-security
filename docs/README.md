# Helix · chrysalis-security docs

Behavioral DNA firewall. **Trust nothing** that isn’t in certified DNA.

**Start here:** [DOC-MAP.md](./DOC-MAP.md) — full index of modes, DNA bind, CWL bridge, live-match, soak, shippable, threat model, Windows Mode A, and Secure vs CWL vs Convert.  
**Honest remaining gaps:** [DOC-HOLES.md](./DOC-HOLES.md)  
**CWL tip pin:** **1.0.88** ([CWL-BRIDGE.md](./CWL-BRIDGE.md))

Traffic DNA is the default protect path (**D5**). CWL bridge is optional for protect.

---

## Core

| Doc | What |
|-----|------|
| [DOC-MAP.md](./DOC-MAP.md) | **Doc index** — Helix surface map |
| [DOC-HOLES.md](./DOC-HOLES.md) | Remaining honest doc / ops gaps |
| [HELIX-SECURITY-SURFACE.md](./HELIX-SECURITY-SURFACE.md) | Full inventory — Linux + Windows, modes, DNA, prove, non-goals |
| [SHIPPABLE.md](./SHIPPABLE.md) | Shippable bar closed — prove tokens; soak is post-ship ops |
| [MODES.md](./MODES.md) | Allow while securing — learn/shadow/enforce + reload |
| [DECISIONS.md](./DECISIONS.md) | Locked D1–D5 (TLS, block/alert, no UEBA, augment, CWL optional) |
| [THREAT-MODEL.md](./THREAT-MODEL.md) | What we stop / don’t |
| [WHITEPAPER.md](./WHITEPAPER.md) | How Helix works and protects |
| [CANON.md](./CANON.md) | Three rules only |
| [PILLARS.md](./PILLARS.md) · [FORKS.md](./FORKS.md) | CWL · Convert · Secure |

## DNA · bind · bridge · soak (tip 1.0.85–1.0.88)

| Doc | What |
|-----|------|
| [CWL-BRIDGE.md](./CWL-BRIDGE.md) | Optional CWL ↔ DNA bridge (pin **1.0.88**) |
| [DNA-BIND.md](./DNA-BIND.md) | Runtime verify of genome-declared digests / proof units |
| [LIVE-MATCH.md](./LIVE-MATCH.md) | Rosetta Step 4 — cutover CWL ⊆ DNA |
| [SIGNED-DNA.md](./SIGNED-DNA.md) | Signed certificates (Secure-owned crypto) |
| [CERT-LIFECYCLE.md](./CERT-LIFECYCLE.md) | Promote / parent_hash / revoke-replace |
| [SOAK.md](./SOAK.md) | Shadow soak before enforce |
| [RESPONSE-SURFACE.md](./RESPONSE-SURFACE.md) | Cookie names / redirect hosts in DNA |
| [SEVERITY.md](./SEVERITY.md) · [TRIAGE.md](./TRIAGE.md) | Hole ranking + soak triage |

## Install · placements

| Doc | What |
|-----|------|
| [BEGINNING.md](./BEGINNING.md) | Basic beginning — internet out of the box |
| [INSTALL-MODE-A.md](./INSTALL-MODE-A.md) | systemd Mode A soft intercept |
| [INSTALL-MODE-A-WINDOWS.md](./INSTALL-MODE-A-WINDOWS.md) | Helix for Windows — tray + startup task + CLI |
| [DESK.md](./DESK.md) | Desk ops console (default Windows / demo upstream) |
| [LOCAL-LAB.md](./LOCAL-LAB.md) | Desktop learn → promote → enforce flip |
| [K8S.md](./K8S.md) | Sidecar image build / push / apply |
| [MODE-B-L2.md](./MODE-B-L2.md) · [GCE-L2.md](./GCE-L2.md) | Mode B L2 |
| [AUGMENT.md](./AUGMENT.md) · [NGFW-TIE-IN.md](./NGFW-TIE-IN.md) | Augment any NGFW |
| [TLS.md](./TLS.md) | Optional Helix TLS terminate (D1) |

## Ops · logging

| Doc | What |
|-----|------|
| [LOGGING.md](./LOGGING.md) | Logging SoR — streams, `helix.siem.v1`, hole catalog |
| [SIEM.md](./SIEM.md) · [FILEBEAT.md](./FILEBEAT.md) · [SPLUNK.md](./SPLUNK.md) | SIEM export recipes |
| [THREAT-CORRELATION.md](./THREAT-CORRELATION.md) | CVE / NVD / TIP join — Helix never assigns CVEs |
| [GCE.md](./GCE.md) · [PROCESS.md](./PROCESS.md) | Sync + prove on agenticop-master; desktop edit loop |
| [PRODUCT.md](./PRODUCT.md) · [ROADMAP.md](./ROADMAP.md) | Gap map + checklist |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Proxy + DNA v0 |

## Quick CLI

```bash
node packages/helix-cli/bin/helix.mjs learn --in fixtures/sample-observations.ndjson --out certificates/demo-draft.json
node packages/helix-cli/bin/helix.mjs diff --a certificates/demo-certified.json --b certificates/demo-draft-backdoor.json
```
