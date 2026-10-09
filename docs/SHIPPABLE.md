# Helix — shippable bar (engineering complete)

**Status:** **SHIPPABLE** (2026-10-08)  
**Meaning:** Operators can install, learn → promote → shadow → ready → enforce, and prove the path with honest tokens. Customer soak remains ops — it does not block shipping the product.

## Bar (closed)

| Slice | Proof |
| --- | --- |
| DNA learn / shadow / enforce | `npm run test:dna` |
| Mode A Linux (systemd) | [INSTALL-MODE-A.md](./INSTALL-MODE-A.md) · `HOST_SMOKE_OK` |
| Mode A Windows (tray + task) | [INSTALL-MODE-A-WINDOWS.md](./INSTALL-MODE-A-WINDOWS.md) · `WINDOWS_APP_SMOKE_OK` |
| Readiness / soak tooling | `SOAK_PREFLIGHT_OK` · `helix ready --shadow-log` |
| Cert lifecycle + reload | `promote-chain-smoke` · `RELOAD_FIXTURE_OK` |
| SIEM / triage / severity | `SIEM_FIXTURE_OK` (`helix.siem.v1` + threat_correlation) · `TRIAGE_SMOKE_OK` · `SEVERITY_SMOKE_OK` |
| Logging / CVE join docs | [LOGGING.md](./LOGGING.md) · [THREAT-CORRELATION.md](./THREAT-CORRELATION.md) |
| Response surface DNA | `response-surface-smoke` |
| Mode B L2 / K8s / compose | GCE + `k8s-*` / `compose-smoke` (where host allows) |
| CWL optional (D5) | Protect path never requires CWL |
| Surface inventory | [HELIX-SECURITY-SURFACE.md](./HELIX-SECURITY-SURFACE.md) |

## Not part of shippable (ops after ship)

| Item | Why |
| --- | --- |
| Customer shadow soak → enforce | Needs real peak/off-peak traffic ([SOAK.md](./SOAK.md)) |
| EXTFMAP / live hunts | Operator / sibling runbooks |

```text
SHIPPABLE_OK = engineering bar closed
SOAK_CUSTOMER = ops-owned · preflight ≠ soak
```

## Prove (desktop)

```bash
npm run test:dna
# → includes windows-app-smoke · soak-preflight · ready · real-site · …

npm run soak-preflight-smoke   # → SOAK_PREFLIGHT_OK
npm run windows-app-smoke      # → WINDOWS_APP_SMOKE_OK (or SKIP off Windows)
```

Related: [PRODUCT.md](./PRODUCT.md) · [ROADMAP.md](./ROADMAP.md) · [BEGINNING.md](./BEGINNING.md)
