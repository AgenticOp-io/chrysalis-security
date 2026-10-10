# Chrysalis pillars (Secure view)

AgenticOps runs **three interactive components**:

1. **CWL** — language (mature independently)  
2. **Convert** — Universal Translator (`chrysalis-convert`)  
3. **Secure** — this repo (Helix)

Helix **does not** require CWL to protect an app. Primary artifact: traffic **DNA** (`app-dna-v1`).  
Optional CWL bridge (seed / cutover compare) follows [RFC-0022](../../chrysalis-cwl/docs/language/CWL-RFC-0022-dna-surface-bridge.md) — see [CWL-BRIDGE.md](./CWL-BRIDGE.md).

**Always check `engines/chrysalis-cwl`** as the primary holder of CWL language logic before inventing bridge semantics here.

**Pin (CWL tip @ 1.0.88):** `"@agenticop-io/cwl": "file:../chrysalis-cwl/packages/cwl"` or registry `@agenticop-io/cwl@1.0.88` (GitHub Packages; Node ≥22) + sibling / `CHRYSALIS_CWL_ROOT` for fixtures. Seed SoR: `@agenticop-io/cwl/dna-seed` (incl. `pathTemplateShapeEqual`). Default cutover CLI: `helix cutover` (multi-host via RFC-0023; `dna_gaps` filled by Helix). DNA bind tip ladder 1.0.85–1.0.88: [DOC-MAP.md](./DOC-MAP.md) · [CWL-BRIDGE.md](./CWL-BRIDGE.md) · [DNA-BIND.md](./DNA-BIND.md).

Portfolio doc: [`../../../docs/THREE_PILLARS.md`](../../../docs/THREE_PILLARS.md) (from `AgenticOps/docs/`).
