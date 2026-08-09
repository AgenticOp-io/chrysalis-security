# Chrysalis pillars (Secure view)

AgenticOps runs **three interactive components**:

1. **CWL** — language (mature independently)  
2. **Convert** — Universal Translator (`chrysalis-convert`)  
3. **Secure** — this repo (Helix)

Helix **does not** require CWL to protect an app. Primary artifact: traffic **DNA** (`app-dna-v1`).  
Optional CWL bridge (seed / cutover compare) follows [RFC-0022](../../chrysalis-cwl/docs/language/CWL-RFC-0022-dna-surface-bridge.md) — see [CWL-BRIDGE.md](./CWL-BRIDGE.md).

**Always check `engines/chrysalis-cwl`** as the primary holder of CWL language logic before inventing bridge semantics here.

**Pin (Exit 1.0 complete @ 1.0.3):** `"@agenticop-io/cwl": "1.0.3"` (GitHub Packages) + sibling / `CHRYSALIS_CWL_ROOT` for fixtures. Optional `file:` `@chrysalis/cwl` ≡ same tip. Seed SoR: `@agenticop-io/cwl/dna-seed`. Default cutover CLI: `helix cutover` (multi-host via RFC-0023). See [CWL-BRIDGE.md](./CWL-BRIDGE.md) and [`chrysalis-cwl/docs/history/DNA-CWL-COMPLETE.md`](../../chrysalis-cwl/docs/history/DNA-CWL-COMPLETE.md).

Portfolio doc: [`../../../docs/THREE_PILLARS.md`](../../../docs/THREE_PILLARS.md) (from `AgenticOps/docs/`).
