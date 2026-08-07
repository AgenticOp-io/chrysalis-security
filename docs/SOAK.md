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

## What soak is not

- Not UEBA (“user looks weird”)
- Not a promise zero holes forever — new features must promote
- Not a substitute for WAF on in-DNA abuse

## Ops pointers

- Modes: [MODES.md](./MODES.md)  
- Install: [INSTALL-MODE-A.md](./INSTALL-MODE-A.md)  
- Product bar: [PRODUCT.md](./PRODUCT.md)
