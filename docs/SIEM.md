# SIEM / XDR export (v0)

Helix is not a SIEM (D3). It **emits hole events** so your SIEM/XDR can alert.

**Full logging map + hole catalog:** [LOGGING.md](./LOGGING.md)  
**CVE / NVD / TIP join recipes:** [THREAT-CORRELATION.md](./THREAT-CORRELATION.md)  
Events use `schema_version: helix.siem.v1` with `threat_correlation.assigns_cve: false` (Helix never invents CVE ids).

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
  "schema_version": "helix.siem.v1",
  "at": "2026-08-05T00:00:00.000Z",
  "kind": "helix.hole",
  "mode": "enforce",
  "placement": "proxy",
  "phase": "request",
  "hole": { "code": "HX-ROUTE-UNKNOWN", "reason": "…" },
  "method": "GET",
  "path": "/api/backdoor",
  "host": "app.example",
  "taxonomy": { "family": "unauthorized_surface", "class": "unknown_route", "hole_code": "HX-ROUTE-UNKNOWN" },
  "threat_correlation": {
    "assigns_cve": false,
    "queries_nvd": false,
    "mitre_attack": ["T1190", "T1505.003", "T1100"],
    "siem_lookups": ["web_shell", "backdoor_route", "rogue_admin", "supply_chain_implant"]
  }
}
```

Codes: see [LOGGING.md § hole catalog](./LOGGING.md). Enrichment SoR: `packages/dna-core/siem-enrich.mjs`.

`HX-COOKIE-DRIFT` / `HX-REDIRECT-DRIFT` name the cookie or destination host and never the value ([RESPONSE-SURFACE.md](./RESPONSE-SURFACE.md)), so these events are safe to ship to a shared sink.

Ship to Splunk/Elastic/Chronicle via filebeat / fluent-bit / sidecar tail — Helix does not ship vendor connectors in v0.

Dashboards (import): [deploy/siem/helix-holes.kibana.ndjson](../deploy/siem/helix-holes.kibana.ndjson) · [deploy/siem/helix-holes.splunk.json](../deploy/siem/helix-holes.splunk.json) — see [FILEBEAT.md](./FILEBEAT.md) · [SPLUNK.md](./SPLUNK.md).
