# Shadow soak — customer traffic before enforce

Helix changes security only if enforce follows a boring **soak**, not a flip on day one.

## Path

```text
learn → report → promote → shadow → soak → ready --shadow-log → enforce → reload
```

## Preflight (automatable — no fake customers)

Prove the **tooling path** before ops starts a live soak. Fixture observations + fixture shadow logs only — never synthetic production traffic.

```bash
npm run soak-preflight-smoke
# → SOAK_PREFLIGHT_LEARN_OK · REPORT_OK · PROMOTE_OK · SHADOW_OK
#   · READY_DIRTY_FAIL · BUDGET_OK · READY_CLEAN_OK · SOAK_PREFLIGHT_OK
```

| Gate (SOAK checklist) | Preflight proves |
|-----------------------|------------------|
| `helix learn` | Draft DNA from `fixtures/soak-preflight/observations.ndjson` |
| `helix report` | Routes present; draft → promote |
| `helix promote` | Signed certified DNA (D5 — no CWL required) |
| `MODE=shadow` readiness | `helix ready --target shadow` on cert |
| Unexpected holes / budget | Dirty fixture log → exit 2 at `--max-shadow-holes 0`; budget covers → exit 0 |
| `helix ready --target enforce --shadow-log` | Clean fixture log → exit 0 |

**Preflight green ≠ soak complete.** Ops still owes real peak/off-peak traffic, durable `SHADOW_LOG`, and a written hole budget (see gaps below).

**Credential surfaces are not budget material.** With an overlay loaded ([SEVERITY.md](./SEVERITY.md)), `helix ready --target enforce` counts login/session holes separately and refuses at **zero** by default — a tolerated total of 20 will not carry one unexplained `POST /login` drift into enforce.

**Traffic-decides bar (Secure half):** `npm run traffic-decides-bar-smoke` composes preflight (`SOAK_PREFLIGHT_OK`) and live-match (`LIVE_MATCH_OK`, CWL tip pin ≥ 1.0.23) into `TRAFFIC_DECIDES_SECURE_OK` — Helix shadow-ready for the portfolio bar “AI drafts. Traffic decides.” That composite proves fixture tooling + CWL ⊆ DNA bridging only; live customer soak → enforce still requires ops `SHADOW_LOG` (see [TRAFFIC-DECIDES-BAR.md](https://github.com/AgenticOp-io/chrysalis-cwl/blob/main/docs/history/TRAFFIC-DECIDES-BAR.md)).

### Operator path after preflight green → enforce

1. Keep Helix on the **same placement** that preflight assumed (Mode A proxy / Mode B divert / Mode C agent).  
2. `MODE=shadow` + `SHADOW_LOG` (or SIEM) for the agreed soak window.  
3. Investigate every `HX-*`; promote legitimate new surface; fix app otherwise.  
4. Gate:

```bash
helix ready --target enforce --shadow-log "$SHADOW_LOG" --max-shadow-holes 0 --require-signed
# exit 0 only
```

5. Set `MODE=enforce` and `POST /__helix/reload` (or restart).  
6. On new deploys: draft → promote → reload — do not invent routes to silence holes (**D5** DNA-only).

## Soak checklist (honest)

| Gate | Bar |
|------|-----|
| Learn window | Cover peak + off-peak (often 3–14 days for real apps) |
| `helix report` | Routes look complete for the app’s real surface |
| `helix promote --from` | Diff reviewed; no surprise admin routes |
| `MODE=shadow` | Traffic still flows; holes go to `SHADOW_LOG` / `SIEM_LOG` (prove file sink: `npm run siem-fixture-smoke` → `SIEM_FIXTURE_OK`) |
| Unexpected holes | Investigate each `HX-*` — promote if legitimate, fix app if not |
| `helix ready --target enforce --shadow-log …` | Exit 0 with `--max-shadow-holes 0` (or agreed budget) |
| `MODE=enforce` | Fail closed on out-of-DNA |
| New deploys | Draft → promote → `POST /__helix/reload` (fixture: `npm run reload-fixture-smoke` → `RELOAD_FIXTURE_OK`) |

## Runbook gaps (ops must fill — no invent)

These are **documented holes** in the soak story. Do not close them with synthetic traffic or demo façades.

| Gap | Why it matters | Who fills it |
| --- | --- | --- |
| **Real customer traffic** | Soak is meaningless without the customer’s peak + off-peak load through Helix in `shadow` | Customer / ops — Helix does **not** ship a fake traffic generator |
| **Shadow log retention** | `helix ready --shadow-log` needs a durable path ops can read across the soak window | Ops — set `SHADOW_LOG` / SIEM sink before soak day 1 |
| **Agreed hole budget** | Default bar is `--max-shadow-holes 0`; some apps need a written exception list | Ops + security owner — document budget before enforce |
| **Promote cadence** | New deploys during soak create new `HX-*` noise | App owners — promote draft DNA before blaming Helix |
| **Mode placement** | Soak assumes Helix already sees HTTP (Mode A proxy / Mode B divert / Mode C agent) | Install docs — soak does not prove L2 divert |
| **GCE L2 prove ≠ soak** | `gce-sync.ps1 -WithL2` proves lab divert tokens; it is **not** a customer soak | Lab — see [GCE-L2.md](./GCE-L2.md) |

### Pre-soak gate (operator)

1. DNA certified for the app (promote reviewed).  
2. `MODE=shadow` live on the **same** placement that will enforce.  
3. `SHADOW_LOG` (or SIEM) writing and rotatable.  
4. Written soak window + hole budget.  
5. On-call knows: investigate `HX-*`, do **not** flip to enforce to “make it green.”

### Exit soak → enforce

```bash
helix ready --target enforce --shadow-log <path> --max-shadow-holes 0
# exit 0 only → then MODE=enforce + reload
```

If `ready` fails: extend soak or promote/fix — never invent routes to silence holes (**D5** DNA-only protect; no CWL façades).

## What soak is not

- Not UEBA (“user looks weird”)
- Not a promise zero holes forever — new features must promote
- Not a substitute for WAF on in-DNA abuse
- Not Mode B Phase 2 dual-NIC work — that is a separate lab prove ([MODE-B-L2.md](./MODE-B-L2.md)); soak stays live customer traffic only
- Not synthetic load that looks like a customer

## Ops pointers

- Modes: [MODES.md](./MODES.md)  
- Install: [INSTALL-MODE-A.md](./INSTALL-MODE-A.md)  
- Product bar: [PRODUCT.md](./PRODUCT.md)  
- SIEM file sink: [SIEM.md](./SIEM.md) · `npm run siem-fixture-smoke`  
- Mode B L2 lab: [MODE-B-L2.md](./MODE-B-L2.md) · [GCE-L2.md](./GCE-L2.md)
