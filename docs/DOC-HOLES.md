# Secure documentation holes (honest)

**Status:** living — close by documenting shipped truth, not inventing product.  
**Map:** [DOC-MAP.md](./DOC-MAP.md)  
**Last reviewed:** 2026-10-10 (CWL tip consume **1.0.88**)

These are remaining gaps in **docs coverage** or **ops maturity** that we refuse to paper over. They are not a backlog to invent Helix features.

---

## Closed this pass (docs)

| Hole | Resolution |
| --- | --- |
| No top-level doc index for Helix surface | [DOC-MAP.md](./DOC-MAP.md) + thicker [README.md](./README.md) |
| `CWL-BRIDGE.md` header pin stuck at 1.0.86 while body had 1.0.88 | Pin + registry example → **1.0.88** (gold `97` / RFC-0045) |
| Tip 1.0.85–1.0.88 ladder not cross-linked | Ladder in DOC-MAP + DNA-BIND / LIVE-MATCH / SIGNED-DNA / SOAK |
| Seal vs “CWL Certified” ambiguity | Honesty table in DOC-MAP + CWL-BRIDGE |

---

## Remaining honest gaps

### Ops (not engineering invent)

| Gap | Owner | Notes |
| --- | --- | --- |
| Customer shadow soak → enforce on real peak/off-peak traffic | Operator | Preflight ≠ soak — [SOAK.md](./SOAK.md) · [SHIPPABLE.md](./SHIPPABLE.md) |
| EXTFMAP / live hunts | Operator / sibling runbooks | Post-ship credibility, not Helix fingerprint invent |

### Windows Mode A (product shell — deferred depth, not second engine)

| Gap | Honest status |
| --- | --- |
| Whole-OS / every-packet protection | **Out of scope** — one front door (default `:4080` → upstream). Documented in [INSTALL-MODE-A-WINDOWS.md](./INSTALL-MODE-A-WINDOWS.md) § Honest scope |
| Non-Windows CI for desktop smokes | `WINDOWS_APP_SMOKE_SKIP` / desktop smoke skip off Win32 — expected |
| Code-signed / Store distribution packaging | Not documented as shipped; do not claim MSIX/Store until wired |
| Auto-update channel for `Helix.exe` | Not shipped; tray + scheduled task only |

### Crypto / bind

| Gap | Honest status |
| --- | --- |
| Post-quantum DNA certificate `alg` | **Secure-owned lane** (not CWL invent). **Shipped today:** `hmac-sha256`, `ed25519` only (`DNA_SIG_ALGS`). PQ is ownership + future product, not a present CLI flag |
| DNA bind without overlay | Absent `HELIX_DNA_BIND` ⇒ no bind check — by design ([DNA-BIND.md](./DNA-BIND.md)) |
| Witness network reliability | Witness fetch is ops-dependent; failures → `HX-DNA-WITNESS` |

### CWL / Convert boundary

| Gap | Honest status |
| --- | --- |
| Genome “CWL Certified” / site seal chrome | **Site / genome form** — not Helix enforce. Helix seal = Lock DNA / promote of traffic DNA |
| Convert emitting Helix policy | Convert does not own Helix; cutover consume stays Secure |
| Stale tip pins in older narrative docs | Prefer [CWL-BRIDGE.md](./CWL-BRIDGE.md) + this file; [PILLARS.md](./PILLARS.md) historical “1.0.17” lines are superseded by tip **1.0.88** |

### Docs hygiene (low priority)

| Gap | Notes |
| --- | --- |
| `LIVE-MATCH.md` reply shape still shows example `CWL_PIN: …@1.0.17` | Historical acceptance stamp; current pin is **1.0.88** |
| Whitepaper / beginning may lag tip ladder detail | Point operators to DOC-MAP ladder rather than duplicating RFC tables |

---

## Refuse

- Inventing PQ alg docs that imply `helix promote --alg dilithium` today  
- Claiming Windows protects the whole PC  
- Equating genome “Certified” copy with Helix enforce  
- Force-closing customer soak as an engineering green token  

When a gap closes in code, update this file and the linked surface doc in the same PR.
