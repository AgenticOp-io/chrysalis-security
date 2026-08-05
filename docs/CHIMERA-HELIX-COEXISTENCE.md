# Chimera + Helix coexistence (cutover playbook)

**Status:** ops playbook (no new runtime)  
**Locks:** D1–D4 · UT spine owned by CWL · Helix DNA dispose  

## Goal

Run **translated (Chimera/modern) traffic** while Helix **shadows**, then **enforce** once CWL surface ⊆ certified DNA.

```text
legacy ──┐
         ├── Chimera (shadow → canary → cutover)
modern ──┘
              │
              ▼
         Helix (learn → shadow → enforce)
              │
              ▼
    compare-cwl / smoke:ut-spine (CWL gold ⊆ DNA)
```

## Happy path (lab)

1. **Convert** — lift/emit; ST green; honest holes only  
2. **CWL** — `npm run smoke:ut-evidence` (contract + ingest matrix + spine)  
3. **Helix learn** — traffic against modern (or dual) stack → draft DNA  
4. **Promote** — strip bridge envelope; sign; certify  
5. **Compare** — `helix compare-cwl` or `npm run smoke:ut-spine:helix` → `UT_SPINE_OK`  
6. **Shadow** — Helix shadow mode; Chimera still serving  
7. **Enforce** — Helix enforce; unknown routes deny (`HX-ROUTE-UNKNOWN`)  
8. **Chimera cutover** — modern wins when DNA + verify gates allow  

## Commands

| Step | Where | Command |
|------|-------|---------|
| Evidence | CWL | `npm run smoke:ut-evidence` |
| Spine | CWL | `npm run smoke:ut-spine:helix` |
| Cutover E2E | Secure | `npm run cutover-smoke` |
| Convert consume | Convert | `pnpm run hub:cwl-helix-cutover-smoke -- --require-helix` |
| GCE | Secure | `.\scripts\gce-sync.ps1 -WithCwl` |

## Non-goals

- Helix does not replace Chimera phased cutover runbooks  
- Convert does not own DNA compare  
- No NGFW TLS dependency; no invent for EXTFMAP / vendor runtimes  
