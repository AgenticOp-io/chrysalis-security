# Helix logging — full map

Helix emits **identity holes**, not vulnerability scan results. This doc is the SoR for every log stream, field, and how those events join threat databases / CVE feeds in *your* SIEM.

**Locks:** Helix is not a SIEM/WAF/CVE scanner (**D3**). See [THREAT-CORRELATION.md](./THREAT-CORRELATION.md) for NVD/OSV/MITRE join recipes.

---

## 1. Log streams (what files exist)

| Stream | Env | When written | Purpose |
| --- | --- | --- | --- |
| **Observations** | `OBSERVE` | `MODE=learn` | Raw learn traffic → draft DNA |
| **Shadow holes** | `SHADOW_LOG` | `MODE=shadow` | Same hole shape as SIEM; soak / `helix ready --shadow-log` |
| **SIEM holes** | `SIEM_LOG` (alias `HELIX_SIEM_LOG`) | shadow + enforce holes | Ship to Splunk/Elastic/Chronicle/XDR |
| **Windows desktop** | `%ProgramData%\Helix\desktop-start.log` | Helix.exe starts node | Process start audit (pid/script) |
| **Windows agent stderr** | `%ProgramData%\Helix\agent-stderr.log` | agent crash sample | Ops debug (not DNA) |

Default Windows paths (desktop app):

```text
C:\ProgramData\Helix\observations.ndjson
C:\ProgramData\Helix\shadow.ndjson
C:\ProgramData\Helix\siem.ndjson
C:\ProgramData\Helix\app.dna.json
C:\ProgramData\Helix\desktop-start.log
C:\ProgramData\Helix\agent-stderr.log
```

Enable SIEM (always on for Windows desktop env):

```env
SIEM_LOG=C:\ProgramData\Helix\siem.ndjson
```

Prove sink:

```bash
npm run siem-fixture-smoke   # → SIEM_FIXTURE_OK
```

---

## 2. SIEM event schema (`helix.siem.v1`)

Every hole line is one NDJSON object. Schema version is explicit:

```json
{
  "schema_version": "helix.siem.v1",
  "at": "2026-10-09T05:00:00.000Z",
  "kind": "helix.hole",
  "mode": "enforce",
  "placement": "agent",
  "phase": "request",
  "hole": { "code": "HX-ROUTE-UNKNOWN", "reason": "…" },
  "severity": "normal",
  "method": "GET",
  "path": "/api/backdoor",
  "host": "app.example",
  "taxonomy": {
    "family": "unauthorized_surface",
    "class": "unknown_route",
    "hole_code": "HX-ROUTE-UNKNOWN"
  },
  "threat_correlation": {
    "assigns_cve": false,
    "queries_nvd": false,
    "mitre_attack": ["T1190", "T1505.003", "T1100"],
    "siem_lookups": ["web_shell", "backdoor_route", "rogue_admin", "supply_chain_implant"],
    "cve_join_guidance": "Join SIEM vuln findings…",
    "priority_hint": "standard",
    "join_keys": {
      "host": "app.example",
      "method": "GET",
      "path": "/api/backdoor",
      "at": "2026-10-09T05:00:00.000Z",
      "app_hint": "use DNA app_id / asset tag in your CMDB join"
    }
  },
  "observability": {
    "log_stream": "SIEM_LOG",
    "companion_streams": ["OBSERVE", "SHADOW_LOG"],
    "docs": "docs/LOGGING.md"
  }
}
```

### Field reference

| Field | Meaning |
| --- | --- |
| `schema_version` | Always `helix.siem.v1` for enriched holes |
| `kind` | `helix.hole` |
| `mode` | `learn` (rare for holes) · `shadow` · `enforce` |
| `placement` | `proxy` · `agent` · `bridge` |
| `phase` | `request` · `response` |
| `hole.code` | Stable machine id (see catalog) |
| `hole.reason` | Human-readable; safe (no session token values) |
| `severity` | `normal` · `high` (credential overlay — [SEVERITY.md](./SEVERITY.md)) |
| `taxonomy.*` | Helix family/class for dashboards |
| `threat_correlation.assigns_cve` | **Always false** — Helix never invents CVE ids |
| `threat_correlation.queries_nvd` | **Always false** — no live NVD/OSV calls |
| `threat_correlation.mitre_attack` | Suggested ATT&CK techniques for SIEM mapping (hints) |
| `threat_correlation.siem_lookups` | Suggested detection names / intel tags to search |
| `threat_correlation.cve_join_guidance` | How an analyst should JOIN vuln DBs |
| `threat_correlation.join_keys` | host / method / path / time for correlation |

Credential surfaces also include `sensitivity` + `sensitivity_effects` when `HELIX_SENSITIVITY` is loaded.

---

## 3. Hole code catalog

| Code | Family | What Helix saw | MITRE hints (not a scan) |
| --- | --- | --- | --- |
| `HX-ROUTE-UNKNOWN` | unauthorized_surface | Method+path not in certified DNA | T1190, T1505.003, T1100 |
| `HX-SCHEMA-DRIFT` | shape_drift | Response JSON keys drifted | T1190, T1078 |
| `HX-REQUEST-SCHEMA-DRIFT` | shape_drift | Request JSON keys drifted | T1190, T1059 |
| `HX-QUERY-SCHEMA-DRIFT` | shape_drift | Query **names** drifted | T1190, T1059.007 |
| `HX-STATUS-DRIFT` | shape_drift | Status class not certified | T1499 |
| `HX-CONTENT-CLASS-DRIFT` | shape_drift | content-class changed | T1105, T1505.003 |
| `HX-COOKIE-DRIFT` | session_surface | `Set-Cookie` **names** drifted | T1550.004, T1078 |
| `HX-REDIRECT-DRIFT` | session_surface | Redirect **host** drifted | T1557, T1185 |
| `HX-BODY-TOO-LARGE` | ops | Over `HELIX_MAX_BODY_BYTES` | T1498 |
| `HX-NO-DNA` | ops | Enforce/shadow without certificate | — |

Cookie/redirect events never log secret values ([RESPONSE-SURFACE.md](./RESPONSE-SURFACE.md)).

Implementation SoR: `packages/dna-core/siem-enrich.mjs`.

---

## 4. What is *not* logged (on purpose)

| Not logged | Why |
| --- | --- |
| CVE ids / CVSS scores | Helix is not a vuln scanner (D3) |
| Full request/response bodies in SIEM holes | Privacy + noise; learn observations may hold JSON keys only |
| Cookie / token **values** | Names and policy flags only |
| UEBA / “user weirdness” | Out of category (D3) |

---

## 5. Shipping to collectors

| Recipe | Doc |
| --- | --- |
| Filebeat / Elastic | [FILEBEAT.md](./FILEBEAT.md) |
| Splunk HEC | [SPLUNK.md](./SPLUNK.md) |
| Generic SIEM | [SIEM.md](./SIEM.md) |
| CVE / threat DB join | [THREAT-CORRELATION.md](./THREAT-CORRELATION.md) |

Dashboard imports: `deploy/siem/helix-holes.{kibana.ndjson,splunk.json}`.

---

## 6. Windows desktop ops logs

| File | Use |
| --- | --- |
| `desktop-start.log` | When Helix.exe spawned node (demo / agent) |
| `agent-stderr.log` | Crash samples if the agent dies |
| Helix.exe UI log list | Operator-facing progress (not SIEM) |

These are **ops** streams. Threat/CVE correlation uses **`siem.ndjson`**.

---

## 7. Analyst one-liner

> Helix proves **“this traffic is outside certified app DNA.”**  
> Your vuln scanner / NVD / OSV / EPSS / TIP proves **“this host has CVE-….”**  
> The SIEM joins them on **host + path + time**. Helix never fabricates the CVE side.
