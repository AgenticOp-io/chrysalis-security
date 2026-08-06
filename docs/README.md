# Helix · chrysalis-security

Behavioral DNA firewall. **Trust nothing** that isn’t in certified DNA.

| Doc | What |
|-----|------|
| [BEGINNING.md](./BEGINNING.md) | **Basic beginning** — internet out of the box |
| [DECISIONS.md](./DECISIONS.md) | Locked D1–D4 (TLS, block/alert, no UEBA, augment) |
| [AUGMENT.md](./AUGMENT.md) | Augment any NGFW — no NAT rewrite; internal + external |
| [GCE.md](./GCE.md) | Sync + prove on agenticop-master |
| [PROCESS.md](./PROCESS.md) | Desktop edit, GCE prove |
| [CANON.md](./CANON.md) | Three rules only |
| [THREAT-MODEL.md](./THREAT-MODEL.md) | What we stop / don’t |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Proxy + DNA v0 |
| [ROADMAP.md](./ROADMAP.md) | Straight-line slices |
| [FORKS.md](./FORKS.md) | Convert vs security |
| [SIEM.md](./SIEM.md) | NDJSON hole export for SIEM/XDR |
| [TLS.md](./TLS.md) | Optional Helix TLS terminate (D1) |
| [PILLARS.md](./PILLARS.md) | CWL · Convert · Secure |

```bash
node packages/helix-cli/bin/helix.mjs learn --in fixtures/sample-observations.ndjson --out certificates/demo-draft.json
node packages/helix-cli/bin/helix.mjs diff --a certificates/demo-certified.json --b certificates/demo-draft-backdoor.json
```
