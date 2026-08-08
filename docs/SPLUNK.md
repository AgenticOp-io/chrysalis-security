# Splunk — Helix SIEM NDJSON (recipe)

Helix is not a SIEM (D3). Ship `SIEM_LOG` / Filebeat (see [FILEBEAT.md](./FILEBEAT.md)) or HEC.

## HTTP Event Collector (HEC)

Forward each NDJSON line as a JSON event:

```bash
# Example: one-shot curl of a hole event
curl -k https://splunk:8088/services/collector \
  -H "Authorization: Splunk <HEC_TOKEN>" \
  -d '{"event":{"at":"...","kind":"helix.hole","hole":{"code":"HX-ROUTE-UNKNOWN"}},"sourcetype":"helix:hole"}'
```

## props.conf (optional)

```ini
[helix:hole]
SHOULD_LINEMERGE = false
LINE_BREAKER = ([\r\n]+)
TIME_PREFIX = "at":"
TIME_FORMAT = %Y-%m-%dT%H:%M:%S.%3N%z
```

## Search ideas

```
index=security sourcetype=helix:hole hole.code=HX-ROUTE-UNKNOWN
| stats count by host path hole.code
```

## Dashboard (import)

Studio-oriented search pack: [deploy/siem/helix-holes.splunk.json](../deploy/siem/helix-holes.splunk.json)  
Sample events: [fixtures/siem/sample-holes.ndjson](../fixtures/siem/sample-holes.ndjson)

Pair with shadow mode first: alert on holes, then `helix ready --target enforce --shadow-log …`.
