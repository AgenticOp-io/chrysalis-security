# Filebeat → Helix SIEM NDJSON (recipe)

Helix emits hole events to a file when `SIEM_LOG` is set ([SIEM.md](./SIEM.md)).
This is a **consumer recipe**, not a Helix SIEM product (D3).

## Helix side

```env
SIEM_LOG=/data/siem.ndjson
```

## Filebeat input (v8-style)

```yaml
filebeat.inputs:
  - type: filestream
    id: helix-siem
    paths:
      - /data/siem.ndjson
    parsers:
      - ndjson:
          keys_under_root: true
          overwrite_keys: true
          add_error_key: true

processors:
  - add_fields:
      target: helix
      fields:
        product: helix
        kind: hole

output.elasticsearch:
  hosts: ["https://elasticsearch:9200"]
  # index / auth per your stack
```

Or ship to Logstash / Kafka / Splunk HEC with the same filestream NDJSON input.

## Event shape (v0)

```json
{
  "at": "2026-08-06T00:00:00.000Z",
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

Prove Helix emission: `npm run request-drift-smoke` / `query-drift-smoke` (assert SIEM lines).
