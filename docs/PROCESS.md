# Helix process — how we build

Desktop = edit. **GCE = prove on Linux.** Product goal: **most of the internet out of the box** — see [BEGINNING.md](./BEGINNING.md).

## Mentality

Three rules only ([CANON.md](./CANON.md)): trust nothing until certified; DNA from traffic; change guilty until promoted.

## The product beginning

HTTP reverse proxy → learn routes → promote → shadow → enforce unknown routes (JSON key drift too).  
One upstream. One DNA file. No convert dependency. No custom OS.

## Loop every slice

```
change → sync to GCE → smoke (learn/promote/backdoor 403) → only then next slice
```

## Modes

| Mode | Behavior |
|------|----------|
| learn | Pass-through; write draft DNA |
| shadow | Never block; log would-blocks |
| enforce | Block mismatches; fail closed if no DNA |

## Done means

GCE smoke green **and** the same story works as:

```text
UPSTREAM=… MODE=enforce DNA=…  (container or binary)
```

against a normal HTTP app — not only the toy fixture.

## Now

1. Proxy records observations (host, path template, content-type, json keys)  
2. Enforce unknown routes + JSON key drift  
3. `scripts/gce-smoke.mjs` (DNA pack + `cwl-bridge-smoke` when CWL root present)  
4. Minimal container env (`UPSTREAM` / `MODE` / `DNA`)  

Later: SIEM vendor connectors, L2 GCE green, K8s image prove — after beginning is boring.
