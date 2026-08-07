# Allow traffic while securing (modes)

Helix does not flip from “open internet” to “locked” in one step. Modes separate **pass** from **trust**.

| Mode | App traffic | Security |
|------|-------------|----------|
| **learn** | Pass | Record DNA observations |
| **shadow** | Pass | Score certified DNA; **alert** only |
| **enforce** | Pass only if DNA matches | **Block** holes (403) |

```text
learn → promote → shadow → enforce
```

## Promote without downtime

1. Write new certified DNA to the same `DNA=` path  
2. `POST /__helix/reload` (or `SIGHUP` / `SIGUSR2` to the process)  
3. Traffic keeps flowing; new certificate is live  

Ops (never DNA-gated):

- `GET /__helix/healthz` · `GET /__helix/status`  
- `POST /__helix/reload`  

Prove: `npm run reload-smoke` → `RELOAD_SMOKE_OK`

## Body size (ops protect)

`HELIX_MAX_BODY_BYTES` rejects oversized bodies with `413` / `HX-BODY-TOO-LARGE` in **all** modes (including learn). Allow-while-secure does not mean unbounded request size.

Prove: `npm run body-limit-smoke` → `BODY_LIMIT_SMOKE_OK`

## Holes vs WAF

DNA holes (`HX-ROUTE-UNKNOWN`, schema/query drift, …) are **identity** failures. Pair a WAF for payload attacks on routes that *are* in DNA. See [THREAT-MODEL.md](./THREAT-MODEL.md) · [WHITEPAPER.md](./WHITEPAPER.md).
