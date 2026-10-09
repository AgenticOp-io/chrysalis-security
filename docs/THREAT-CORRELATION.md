# Threat database & CVE correlation (with Helix logs)

Helix **does not** query NVD, OSV, EPSS, CISA KEV, VirusTotal, or any TIP.  
It **does** emit `helix.siem.v1` hole events with explicit join keys and ATT&CK *hints* so your SIEM can correlate DNA holes with those feeds.

Full schema: [LOGGING.md](./LOGGING.md) · lock **D3**: [DECISIONS.md](./DECISIONS.md).

---

## Honest split of labor

| System | Question it answers |
| --- | --- |
| **Helix** | Is this still the certified app surface? |
| **Vuln scanner / SBOM / NVD / OSV** | Does this host/package have a known CVE? |
| **TIP / IDS / malware DB** | Is this IOC / hash / C2 known-bad? |
| **SIEM / XDR** | Join the above on asset + time + path |

If a product claims “Helix found CVE-2024-…”, that claim is false unless the CVE came from another tool.

---

## Join keys Helix always provides

From each `helix.hole` event (`threat_correlation.join_keys`):

| Key | Typical SIEM join |
| --- | --- |
| `host` | CMDB / asset / vuln scan target |
| `path` + `method` | Endpoint in scanner / WAF / API inventory |
| `at` | Time window (± soak or ± deploy) |
| `taxonomy.family` | Detection content pack routing |
| `threat_correlation.mitre_attack[]` | ATT&CK navigator / analytic tags |
| `threat_correlation.siem_lookups[]` | Saved-search / intel tag seeds |

---

## Recommended correlation playbooks

### 1. Unknown route → backdoor / webshell hunt

**Helix signal:** `hole.code = HX-ROUTE-UNKNOWN`  
**Join:**

1. Same `host` in vuln scan results (especially web app / plugin CVEs).
2. Same `path` in WAF / RASP / access logs for rare hits.
3. TIP / hash intel on files served from that path (if you have FS telemetry).
4. Recent deploy / package change on that asset (SBOM delta).

**MITRE hints on the event:** `T1190`, `T1505.003`, `T1100`.

### 2. Schema / query drift → exploit probe vs legit feature

**Helix signal:** `HX-REQUEST-SCHEMA-DRIFT` · `HX-QUERY-SCHEMA-DRIFT` · `HX-SCHEMA-DRIFT`  
**Join:**

1. WAF signatures firing on the same path in the same minute.
2. Scanner findings for injection classes on that route.
3. Change ticket / promote DNA if the app intentionally grew fields.

### 3. Cookie / redirect drift → session / phishing

**Helix signal:** `HX-COOKIE-DRIFT` · `HX-REDIRECT-DRIFT`  
**Join:**

1. IdP / SSO anomalies for the same app.
2. Open-redirect / phishing intel on `threat_correlation.join_keys` redirect host (from hole reason text — host only).
3. Auth library CVEs from SBOM for that app (optional).

### 4. Credential surface (severity=high)

**Helix signal:** `severity = high` + `sensitivity = credential`  
**Join:** Treat as P1 even without a CVE. Budget must be zero before enforce ([SEVERITY.md](./SEVERITY.md)). Overlay with account-takeover / brute-force analytics from other tools — Helix still only says “DNA mismatch on a login surface.”

---

## Example SIEM queries

### Splunk — Helix holes waiting for CVE join

```spl
index=helix OR source="*siem.ndjson" kind="helix.hole"
| spath hole.code
| spath threat_correlation.assigns_cve
| spath threat_correlation.join_keys.host
| spath threat_correlation.join_keys.path
| rename threat_correlation.join_keys.host AS host, threat_correlation.join_keys.path AS path
| join type=left host
    [ search index=vuln OR index=nvd OR sourcetype=nessus
      | rename dest_host AS host
      | fields host, cve, cvss, severity, scan_time ]
| where isnotnull(cve) OR hole.code="HX-ROUTE-UNKNOWN"
| table _time, host, path, hole.code, cve, cvss, mode, severity
```

### Elastic / Kibana KQL — DNA holes

```text
kind: "helix.hole" and schema_version: "helix.siem.v1"
```

### Elastic ES|QL — join sketch (conceptual)

```esql
FROM helix-holes
| WHERE kind == "helix.hole" AND hole.code == "HX-ROUTE-UNKNOWN"
| KEEP @timestamp, host, path, hole.code, threat_correlation.mitre_attack
```

Then use your vuln index lookup on `host` (Elastic does not invent the CVE — your vuln index does).

### Microsoft Sentinel KQL

```kusto
HelixHole_CL
| where kind_s == "helix.hole"
| extend HoleCode = hole_code_s, Host = tostring(threat_correlation_join_keys_host_s)
| join kind=leftouter (
    SecurityNestedRecommendation
    | extend Host = tostring(VulnerableDevices)
  ) on Host
| project TimeGenerated, Host, HoleCode, RecommendationName, Severity
```

(Field names depend on how you ingest NDJSON — keep `schema_version` and `kind` as the stable anchors.)

---

## Feeds Helix will never call (by design)

| Feed | Why not inside Helix |
| --- | --- |
| NVD / CVE.org | Vuln inventory, not app DNA |
| OSV / GitHub Advisories | Package graph — Convert/SBOM lane |
| EPSS / CISA KEV | Exploit prediction / known exploited — SIEM policy |
| Commercial TIP | IOC reputation — NGFW/XDR |

Helix only **labels** holes so those feeds can be joined downstream.

---

## Dashboard / pack pointers

| Artifact | Path |
| --- | --- |
| Splunk holes dashboard | `deploy/siem/helix-holes.splunk.json` |
| Kibana holes saved objects | `deploy/siem/helix-holes.kibana.ndjson` |
| Correlation query examples | `deploy/siem/threat-correlation-examples.md` |
| Enrichment SoR | `packages/dna-core/siem-enrich.mjs` |

---

## Acceptance check for operators

1. `SIEM_LOG` is tailed into the SIEM.  
2. Events show `schema_version: helix.siem.v1` and `threat_correlation.assigns_cve: false`.  
3. At least one saved search joins `host` to your vuln/CVE index.  
4. `HX-ROUTE-UNKNOWN` on a production host pages someone — with or without a CVE match.  
5. No one claims Helix “detected CVE-…” without a joined scanner/intel row.
