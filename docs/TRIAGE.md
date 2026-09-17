# Soak triage — holes are lines, decisions are surfaces

`helix ready --shadow-log` answers **“how many holes?”** That is the gate, not the work. The work during a soak is answering **“what did the app actually grow, and is any of it supposed to be there?”** — and a two-week shadow log is tens of thousands of lines nobody reads.

`helix triage` digests that log into the handful of **surfaces** an operator can decide about.

```bash
helix triage --shadow-log "$SHADOW_LOG" --in certified.dna.json
```

```text
11 holes → 6 surfaces (data/soak/shadow.ndjson)
!      1  certified_surface_drift    POST /login [HX-REQUEST-SCHEMA-DRIFT]
       4  new_surface                GET /api/orders/:id [HX-ROUTE-UNKNOWN]
       3  new_surface                GET /**/*.js [HX-ROUTE-UNKNOWN]
       1  new_surface                GET /api/backdoor [HX-ROUTE-UNKNOWN]
       1  certified_surface_drift    GET /api/items [HX-SCHEMA-DRIFT]
       1  new_method_on_known_path   POST /api/items [HX-ROUTE-UNKNOWN]
```

Grouping uses the same path template as DNA itself, so hashed bundles (`/assets/app.a1b2c3.js`) and id paths (`/api/orders/417`) collapse the way the certificate already thinks about them. A thousand-line bundle flood becomes one row, which is the only reason the `POST /login` row is visible at all.

## What the classes mean

| Class | What happened | What to do |
| --- | --- | --- |
| `new_surface` | Traffic hit a path template the certificate has never seen | Legitimate growth → **re-learn** and promote. Not legitimate → it was a probe, and enforce would have refused it |
| `new_method_on_known_path` | The path is certified, this **method** is not | Read it before certifying: a `POST` at a read-only surface is a different sentence from a new page |
| `certified_surface_drift` | A route we certified changed shape (schema / query / status / content class) | Either the app changed and needs a new certificate, or it regressed and needs a fix |
| `policy` | Body limits and other non-DNA refusals | Tune the limit or leave it — no certificate change involved |

`in_dna` on each group says whether the certificate already carries that exact `method + template + host`, so “the app grew a surface” is never confused with “a surface we certified moved”.

## Why it proposes no DNA

A hole event records what was **refused** — method, path, host, code. It does not carry the response shape, status classes, or key fingerprints a route needs. Synthesizing DNA from holes would mean inventing coverage nobody observed, and the traffic that produced those holes includes the probe at `/api/backdoor`. Auto-certifying a soak would certify the attack.

So triage stops where honesty stops: it tells you which surfaces exist and what kind of thing each one is. Certifying a legitimate new surface takes another **learn** pass over traffic you accept — the same path any new feature takes.

## Credential surfaces

With an overlay loaded ([SEVERITY.md](./SEVERITY.md)), high-severity groups sort **first** and are listed under `blockers`. `helix triage` exits **2** when any exist, matching `helix ready`, so a soak cron fails loudly the day login drifts rather than the week someone reads the log.

```bash
helix triage --shadow-log "$SHADOW_LOG" --in certified.dna.json || echo "review before enforce"
```

## Flags

| Flag | Effect |
| --- | --- |
| `--shadow-log <path>` | Required. Missing file exits **1** — a soak with no log is not a clean soak |
| `--in <dna.json>` | Optional certificate. Without it, grouping still works and `in_dna` stays `null` rather than guessing |
| `--since` / `--until` | ISO window, for “what happened since yesterday’s review”. Lines outside the window are reported as `outside_window`, not dropped silently |
| `--top n` | Rows in the printed table (default 20). The JSON always carries every group |
| `--samples n` | Real paths kept per group (default 3) so you can see what `/**/*.js` actually was |
| `--out <file>` | Write the `helix.triage` JSON instead of printing it |

Non-hole lines (access logs, junk) are counted as `skipped`, never as holes — shared SIEM sinks are normal.

## In the panel

The control panel (`/__helix/`) shows the same digest live as **Surfaces to review**, above the raw hole list. It digests a bounded tail (the most recent 500 hole lines) so the page stays cheap to poll during a soak.

## Prove

```bash
npm run triage-smoke
# → TRIAGE_GROUP_OK · TRIAGE_CLASS_OK · TRIAGE_WINDOW_OK · TRIAGE_CLI_OK · TRIAGE_SMOKE_OK
```

The smoke soaks a real shadow-mode Helix in front of a real upstream — bundle churn, id paths, a probe, a drifted response, and one drifted login — rather than hand-written hole fixtures, because the claim being tested is that grouping survives what traffic actually looks like.

Related: [SOAK.md](./SOAK.md) · [SEVERITY.md](./SEVERITY.md) · [SIEM.md](./SIEM.md) · [PRODUCT.md](./PRODUCT.md)
