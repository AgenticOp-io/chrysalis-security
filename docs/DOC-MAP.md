# Helix / Secure — documentation map

**Repo:** [AgenticOp-io/chrysalis-security](https://github.com/AgenticOp-io/chrysalis-security)  
**CWL tip pin (consume):** **1.0.88** (RFC-0045 · gold `97`) — see [CWL-BRIDGE.md](./CWL-BRIDGE.md)  
**Remaining honest gaps:** [DOC-HOLES.md](./DOC-HOLES.md)

This index is the Secure-owned map of Helix. Language grammar and RFCs live in `chrysalis-cwl`. Convert does not own Helix.

---

## What Secure owns vs CWL vs Convert

| Pillar | Repo | Owns | Does not own |
| --- | --- | --- | --- |
| **Secure (Helix)** | this repo | Traffic DNA learn / promote / shadow / soak / enforce; signed DNA (`hmac-sha256` / `ed25519`); strip / cutover compare / `dna_gaps`; DNA-bind runtime verify; Mode A/B/C placements; SIEM / triage / severity overlays | CWL grammar, RFCs, gold fixtures; Convert emit / WebIR |
| **CWL** | `chrysalis-cwl` | Language + genome meaning; `dna-seed` SoR; RFC-0022–0045 DNA surface / bind declarations as **document facts** | Helix firewall enforce; certificate PQ/HMAC/Ed25519 signing |
| **Convert** | `chrysalis-convert` | Origin → WebIR/CWL → emit (Universal Translator) | Helix protect path; UT↔Helix spine ownership |

**Default protect path is traffic DNA (D5).** The CWL bridge is optional for protect and required only for cutover-default (CWL surface ⊆ certified DNA).

---

## Honesty (read first)

| Phrase | Means | Does not mean |
| --- | --- | --- |
| **Seal / Lock DNA** | Helix panel or Windows Protect path promotes draft traffic DNA → certified `app-dna-v1` (`seal-smoke` → `SEAL_SMOKE_OK`) | “CWL Certified” site badge or genome form |
| **CWL Certified / genome form** | Site / Convert / CWL marketing or genome markup about a published site | Helix enforce; not a substitute for soak → ready → enforce |
| **DNA bind / match live** | Genome **names** digests / bank / proof units (tips 1.0.85–1.0.88); Helix verifies via ops overlay `HELIX_DNA_BIND` | CWL hashing or crypto invent |
| **PQ signatures Secure-owned** | Post-quantum **certificate signing** is a Secure lane if/when productized — not CWL crypto | A shipped PQ `alg` today (`DNA_SIG_ALGS` = `hmac-sha256`, `ed25519` only) |
| **Traffic DNA default** | Out-of-box protect never requires CWL | Cutover tooling may still consume CWL |

---

## Start here

| Want | Doc |
| --- | --- |
| Full product inventory | [HELIX-SECURITY-SURFACE.md](./HELIX-SECURITY-SURFACE.md) |
| Shippable bar | [SHIPPABLE.md](./SHIPPABLE.md) |
| How Helix protects | [WHITEPAPER.md](./WHITEPAPER.md) · [THREAT-MODEL.md](./THREAT-MODEL.md) |
| Modes (learn / shadow / enforce) | [MODES.md](./MODES.md) |
| Locked decisions D1–D5 | [DECISIONS.md](./DECISIONS.md) |
| Pillars | [PILLARS.md](./PILLARS.md) · [FORKS.md](./FORKS.md) |
| Remaining doc / product holes | [DOC-HOLES.md](./DOC-HOLES.md) |

---

## Modes and install

| Surface | Doc |
| --- | --- |
| Mode overview + reload | [MODES.md](./MODES.md) |
| Linux Mode A (systemd) | [INSTALL-MODE-A.md](./INSTALL-MODE-A.md) |
| Windows Mode A (Helix.exe) | [INSTALL-MODE-A-WINDOWS.md](./INSTALL-MODE-A-WINDOWS.md) |
| Mode B L2 | [MODE-B-L2.md](./MODE-B-L2.md) · [GCE-L2.md](./GCE-L2.md) |
| K8s sidecar | [K8S.md](./K8S.md) |
| Compose / local lab | root `docker-compose.yml` · [LOCAL-LAB.md](./LOCAL-LAB.md) |
| Desk upstream | [DESK.md](./DESK.md) |
| NGFW augment | [AUGMENT.md](./AUGMENT.md) · [NGFW-TIE-IN.md](./NGFW-TIE-IN.md) |
| Beginning / internet OOB | [BEGINNING.md](./BEGINNING.md) |

---

## DNA, bind, bridge, soak (tip 1.0.85–1.0.88 ladder)

```text
1.0.85  RFC-0042  gold 94   dna certificate / fingerprint / bank / match live
1.0.86  RFC-0043  gold 95   DNA fingerprint floor sha384+ (refuse sha256 binds)
1.0.87  RFC-0044  gold 96   multi-fingerprint · match bank · dna expect
1.0.88  RFC-0045  gold 97   named dna proof units · quorum · lineage · supersedes · witness · scope
```

| Doc | Role on the ladder |
| --- | --- |
| [CWL-BRIDGE.md](./CWL-BRIDGE.md) | Optional seed / cutover; tip pin **1.0.88**; genome facts as annotations |
| [DNA-BIND.md](./DNA-BIND.md) | Runtime verify of declared digests / proof units (`HELIX_DNA_BIND`) |
| [LIVE-MATCH.md](./LIVE-MATCH.md) | Rosetta Step 4 — CWL ⊆ DNA cutover; protect stays DNA-only |
| [SIGNED-DNA.md](./SIGNED-DNA.md) | Promote / verify signatures (Secure-owned crypto) |
| [CERT-LIFECYCLE.md](./CERT-LIFECYCLE.md) | parent_hash / revoke-replace |
| [SOAK.md](./SOAK.md) | Shadow soak → ready → enforce; optional `--bind` |
| [RESPONSE-SURFACE.md](./RESPONSE-SURFACE.md) | Cookie names / redirects in DNA |
| [SEVERITY.md](./SEVERITY.md) · [TRIAGE.md](./TRIAGE.md) | Credential overlays + hole triage |

Prove tokens: `cwl-bridge-smoke` · `cutover-smoke` (`CUTOVER_TIP_1_0_88_OK`) · `dna-bind-smoke` · `live-match-smoke` · `soak-preflight-smoke` · `sign-smoke`.

---

## Ops, logging, threat

| Doc | What |
| --- | --- |
| [LOGGING.md](./LOGGING.md) | Streams + `helix.siem.v1` |
| [SIEM.md](./SIEM.md) · [FILEBEAT.md](./FILEBEAT.md) · [SPLUNK.md](./SPLUNK.md) | Export recipes |
| [THREAT-CORRELATION.md](./THREAT-CORRELATION.md) | CVE / NVD / TIP join (Helix never assigns CVEs) |
| [TLS.md](./TLS.md) | Optional Helix TLS terminate (D1) |
| [GCE.md](./GCE.md) · [PROCESS.md](./PROCESS.md) | Prove host + desktop edit loop |
| [PLATFORM-FLEET.md](./PLATFORM-FLEET.md) | Fleet notes |
| [CHIMERA-HELIX-COEXISTENCE.md](./CHIMERA-HELIX-COEXISTENCE.md) | Translated traffic + Helix shadow/enforce |
| [CINDERPATH.md](./CINDERPATH.md) | Control-plane placement note |

---

## Architecture and product

| Doc | What |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Proxy + DNA v0 |
| [CANON.md](./CANON.md) | Three rules |
| [PRODUCT.md](./PRODUCT.md) | Gap map + build order |
| [ROADMAP.md](./ROADMAP.md) | Checklist (incl. tip consume) |
| [AGENTS.md](./AGENTS.md) | Agent rules for this lane |

---

## Pillar sync

| File | Role |
| --- | --- |
| [pillar-sync/OUTBOX.md](./pillar-sync/OUTBOX.md) | Secure → CWL/Convert bus (this lane writes) |
| CWL `docs/pillar-sync/BOARD.md` | Read before edits (sibling) |
