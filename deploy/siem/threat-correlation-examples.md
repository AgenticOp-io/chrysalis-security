# SIEM examples — Helix holes × CVE / threat feeds

Copy into your SIEM. Helix supplies `helix.siem.v1` NDJSON; CVE ids come only from *your* vuln index.

See [docs/THREAT-CORRELATION.md](../../docs/THREAT-CORRELATION.md) · [docs/LOGGING.md](../../docs/LOGGING.md).

## Splunk — unknown routes with optional CVE join

```spl
index=helix kind="helix.hole" hole.code="HX-ROUTE-UNKNOWN"
| spath threat_correlation.join_keys.host
| rename threat_correlation.join_keys.host AS host
| join type=left host [ search index=vuln earliest=-14d | rename dest AS host | fields host, cve, cvss ]
| table _time host path cve cvss mode severity
```

## Elastic KQL

```text
kind: "helix.hole" and hole.code: "HX-ROUTE-UNKNOWN" and threat_correlation.assigns_cve: false
```

## What “good” looks like

- Every Helix hole has `schema_version: helix.siem.v1`
- `assigns_cve` is always `false` on the Helix side
- CVE columns populate only after a successful join to scanner/NVD data
