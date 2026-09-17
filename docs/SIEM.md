# SIEM / XDR export (v0)

Helix is not a SIEM (D3). It **emits hole events** so your SIEM/XDR can alert.

## Fixture smoke (generic file sink)

Prove shadow + enforce holes append to a local `SIEM_LOG` path — no Splunk/Datadog/vendor connector invent:

```bash
npm run siem-fixture-smoke
# → SIEM_FIXTURE_SHADOW_OK · SIEM_FIXTURE_ENFORCE_OK · SIEM_FIXTURE_OK
```

Ops still tails that NDJSON file into whatever collector they already run ([FILEBEAT.md](./FILEBEAT.md) is a recipe, not a Helix dependency).

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

Codes: `HX-NO-DNA` · `HX-ROUTE-UNKNOWN` · `HX-SCHEMA-DRIFT` · `HX-REQUEST-SCHEMA-DRIFT` · `HX-QUERY-SCHEMA-DRIFT` · `HX-STATUS-DRIFT` · `HX-CONTENT-CLASS-DRIFT` · `HX-COOKIE-DRIFT` · `HX-REDIRECT-DRIFT` · `HX-BODY-TOO-LARGE` · …

`HX-COOKIE-DRIFT` / `HX-REDIRECT-DRIFT` name the cookie or destination host and never the value ([RESPONSE-SURFACE.md](./RESPONSE-SURFACE.md)), so these events are safe to ship to a shared sink.

Ship to Splunk/Elastic/Chronicle via filebeat / fluent-bit / sidecar tail — Helix does not ship vendor connectors in v0.

Dashboards (import): [deploy/siem/helix-holes.kibana.ndjson](../deploy/siem/helix-holes.kibana.ndjson) · [deploy/siem/helix-holes.splunk.json](../deploy/siem/helix-holes.splunk.json) — see [FILEBEAT.md](./FILEBEAT.md) · [SPLUNK.md](./SPLUNK.md).
