# Chrysalis pillars (Secure view)

AgenticOps runs **three interactive components**:

1. **CWL** — language (mature independently)  
2. **Convert** — Universal Translator (`chrysalis-convert`)  
3. **Secure** — this repo (Helix)

Helix **does not** require CWL to protect an app. Primary artifact: traffic **DNA** (`app-dna-v1`).  
Optional CWL bridge (seed / cutover compare) follows [RFC-0022](../../chrysalis-cwl/docs/language/CWL-RFC-0022-dna-surface-bridge.md) — see [CWL-BRIDGE.md](./CWL-BRIDGE.md).

**Always check `engines/chrysalis-cwl`** as the primary holder of CWL language logic before inventing bridge semantics here.

**Pin (Exit 1.0):** `"@chrysalis/cwl": "file:../chrysalis-cwl/packages/cwl"` + sibling / `CHRYSALIS_CWL_ROOT` — keep `file:` until Secure opts into GitHub Packages `@chrysalis/cwl@1.0.0`. Prefer package subpaths (`@chrysalis/cwl/parser`) over hub-ingest deep-links. See [CWL-BRIDGE.md](./CWL-BRIDGE.md) and [`chrysalis-cwl/docs/history/EXIT-1.0.md`](../../chrysalis-cwl/docs/history/EXIT-1.0.md).

Portfolio doc: [`../../../docs/THREE_PILLARS.md`](../../../docs/THREE_PILLARS.md) (from `AgenticOps/docs/`).
