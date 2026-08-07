# SIEM / XDR export (v0)

Helix is not a SIEM (D3). It **emits hole events** so your SIEM/XDR can alert.

## Enable

```env
SIEM_LOG=/data/siem.ndjson
# alias: HELIX_SIEM_LOG
```

Each deny (enforce) or shadow hole appends one NDJSON line:

```json
{
  "at": "2026-08-05T00:00:00.000Z",
  "kind": "helix.hole",
  "mode": "enforce",
  "placement": "proxy",
  "phase": "request",
  "hole": { "code": "HX-ROUTE-UNKNOWN", "reason": "…" },
  "method": "GET",
  "path": "/api/backdoor",
  "host": "app.example"
}
```

Codes: `HX-NO-DNA` · `HX-ROUTE-UNKNOWN` · `HX-SCHEMA-DRIFT` · `HX-REQUEST-SCHEMA-DRIFT` · `HX-QUERY-SCHEMA-DRIFT` · `HX-STATUS-DRIFT` · `HX-CONTENT-CLASS-DRIFT` · `HX-BODY-TOO-LARGE` · …

Ship to Splunk/Elastic/Chronicle via filebeat / fluent-bit / sidecar tail — Helix does not ship vendor connectors in v0.
