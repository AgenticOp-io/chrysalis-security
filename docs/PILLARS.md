# Chrysalis pillars (Secure view)

AgenticOps runs **three interactive components**:

1. **CWL** — language (mature independently)  
2. **Convert** — Universal Translator (`chrysalis-convert`)  
3. **Secure** — this repo (Helix)

Helix **does not** require CWL to protect an app. Primary artifact: traffic **DNA** (`app-dna-v1`).  
Optional CWL bridge (seed / cutover compare) follows [RFC-0022](../../chrysalis-cwl/docs/language/CWL-RFC-0022-dna-surface-bridge.md) — see [CWL-BRIDGE.md](./CWL-BRIDGE.md).

**Always check `engines/chrysalis-cwl`** as the primary holder of CWL language logic before inventing bridge semantics here.

**Pin (pre-publish):** `"@chrysalis/cwl": "file:../chrysalis-cwl/packages/cwl"` + sibling / `CHRYSALIS_CWL_ROOT` — not npm registry yet. See [CWL-BRIDGE.md](./CWL-BRIDGE.md) pin note and [`chrysalis-cwl/docs/language/CWL-PUBLISH.md`](../../chrysalis-cwl/docs/language/CWL-PUBLISH.md).

Portfolio doc: [`../../../docs/THREE_PILLARS.md`](../../../docs/THREE_PILLARS.md) (from `AgenticOps/docs/`).
