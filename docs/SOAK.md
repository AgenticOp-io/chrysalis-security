# Shadow soak — customer traffic before enforce

Helix changes security only if enforce follows a boring **soak**, not a flip on day one.

## Path

```text
learn → report → promote → shadow → soak → ready --shadow-log → enforce → reload
```

## Soak checklist (honest)

| Gate | Bar |
|------|-----|
| Learn window | Cover peak + off-peak (often 3–14 days for real apps) |
| `helix report` | Routes look complete for the app’s real surface |
| `helix promote --from` | Diff reviewed; no surprise admin routes |
| `MODE=shadow` | Traffic still flows; holes go to `SHADOW_LOG` / `SIEM_LOG` |
| Unexpected holes | Investigate each `HX-*` — promote if legitimate, fix app if not |
| `helix ready --target enforce --shadow-log …` | Exit 0 with `--max-shadow-holes 0` (or agreed budget) |
| `MODE=enforce` | Fail closed on out-of-DNA |
| New deploys | Draft → promote → `POST /__helix/reload` |

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
- Not Mode B Phase 2 dual-NIC work — that waits until Phase 1 stays boring on GCE ([MODE-B-L2.md](./MODE-B-L2.md))
- Not synthetic load that looks like a customer

## Ops pointers

- Modes: [MODES.md](./MODES.md)  
- Install: [INSTALL-MODE-A.md](./INSTALL-MODE-A.md)  
- Product bar: [PRODUCT.md](./PRODUCT.md)  
- Mode B L2 lab: [MODE-B-L2.md](./MODE-B-L2.md) · [GCE-L2.md](./GCE-L2.md)
