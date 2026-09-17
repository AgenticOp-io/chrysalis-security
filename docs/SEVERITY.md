# Hole severity — credential surfaces are louder

Drift at `POST /login` is not the same event as drift at `/faq`. Helix tags hole events so the SIEM and the enforce gate can tell them apart.

## What it is not

- **Not** part of `app-dna-v1`. The certificate stays identity only; promote / sign / verify / enforce verdicts are unchanged.
- **Not** a severity score for the app. Two levels only: `high` (credential surface) and `normal`. No CVSS cosplay.
- **Not** required. No overlay ⇒ every hole is `normal` and Helix still protects (D5).

The overlay is an **ops file** that lives beside the certificate, because "a login hole matters more" is an operator judgement, not certified content.

## Shape

```json
{
  "kind": "chrysalis.helix.sensitivity-map",
  "schemaVersion": 1,
  "routes": [
    {
      "method": "POST",
      "path_template": "/login",
      "host": "default",
      "severity": "high",
      "sensitivity": "credential",
      "effects": ["auth.verify", "session.mint"]
    }
  ]
}
```

Hand-authored is fine. From a CWL genome it is one command — the language already declares credential intent (RFC-0032):

```bash
npm run helix -- sensitivity --cwl path/to/app.cwl --out /etc/helix/sensitivity.json
```

## Run

```bash
HELIX_SENSITIVITY=/etc/helix/sensitivity.json   # helix-agent / compose / k8s
```

`GET /__helix/healthz` reports `credentialSurfaces` so you can see the overlay loaded.

Hole events gain `severity`, and credential ones also carry `sensitivity` + `sensitivity_effects`:

```json
{"kind":"helix.hole","hole":{"code":"HX-REQUEST-SCHEMA-DRIFT"},"path":"/login",
 "severity":"high","sensitivity":"credential","sensitivity_effects":["auth.verify","session.mint"]}
```

Existing SIEM packs ([FILEBEAT.md](./FILEBEAT.md) · [SPLUNK.md](./SPLUNK.md)) pass the field through — no new sink.

## Enforce gate

Shadow noise gets a budget; login drift does not. `helix ready --target enforce --shadow-log …` counts credential holes separately and the budget defaults to **zero**:

```bash
npm run helix -- ready --in certificates/app.json --target enforce \
  --shadow-log data/shadow.ndjson --max-shadow-holes 20
# → check shadow_clean            ok   (18 <= 20)
# → check shadow_clean_credential FAIL (1 shadow hole on credential surfaces > max 0)
```

Raise it only deliberately with `--max-credential-holes n`. Explaining login/session drift before enforce is the point of soak ([SOAK.md](./SOAK.md)).

## Prove

```bash
npm run severity-smoke   # → SEVERITY_OVERLAY_OK · SIEM_OK · GATE_OK · CWL_OK · SEVERITY_SMOKE_OK
```

Covers the hand-authored overlay (no CWL), the live agent SIEM event, the enforce gate, and generation from the CWL genome.
