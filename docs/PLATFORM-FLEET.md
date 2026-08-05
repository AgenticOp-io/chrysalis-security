# Chrysalis platform fleet (CWL · Convert · Secure)

Orchestrator chat: **CWL-Security** (`chrysalis-security`)  
Date: 2026-08-05

## Parallel agents (Task fleet)

| ID | Lane | Slice | Agent |
| --- | --- | --- | --- |
| S1 | Secure | Ed25519 DNA | [Ed25519 DNA](51f71bf4-b88d-41b6-a0fe-85abfe3fff0d) ✅ |
| S2 | Secure | Cutover E2E | [Cutover E2E](8ce80d83-a984-47d0-be9b-47d128af52e0) ✅ |
| S3 | Secure | GCE / ops | [GCE sync](57ff07b0-cd97-44ca-9236-f05346a61909) |
| C1 | CWL | Phase 1.0 pin | [CWL pin](8c05858b-23a3-4d14-a62d-d5687ea8bbf3) ✅ |
| V1 | Convert | Dual-mode fmt | [Convert fmt](e809133d-d7d1-4d4b-ad60-51d4f15b0def) ✅ |
| S4 | Secure | Mode B L2 design | [Mode B L2](62667799-9e29-4781-84dd-915b9e4bd94c) ✅ |

## Parallel safety

- S1–S4: `engines/chrysalis-security` only (S4 docs-heavy)
- C1: `engines/chrysalis-cwl` (+ pointer files into Secure/Convert docs only)
- V1: `engines/chrysalis-convert` (+ read CWL; no DNA fork)

## Already green (do not redo)

- Helix RFC-0022 `cwl-bridge` + `CWL_BRIDGE_SMOKE_OK`
- Convert `hub:cwl-language-pillar-smoke` v3 + junctions
- CWL 0.1.7 ingest/emit round-trip path
