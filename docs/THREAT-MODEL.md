# Helix threat model (short)

## We stop

- New routes / methods that were never learned (backdoors, agent-added admin)  
- Response shape drift that wasn’t promoted (extra fields, unexpected keys)  
- “Looks fine to a WAF” traffic that is **not this app’s certified identity**

## We do not stop (honest)

- Abuse of a route that **is** in DNA (authz bugs, business logic)  
- Classic payload attacks on known routes (use a WAF beside Helix)  
- Traffic we can’t see (end-to-end encrypted bodies we don’t terminate, non-HTTP)  
- Attacks that never hit the Helix proxy (bypass the sidecar)

## Trust-nothing default

| Situation | Behavior |
|-----------|----------|
| No certified DNA loaded | Fail closed in enforce (no pass-through) |
| Route not in DNA | Block (enforce) / log (shadow) |
| DNA present but score mismatch | Block / log with reason code |
| Want new behavior | Learn → diff → **promote** → then allow |

## Placement

Linux reverse proxy / sidecar **in front of the app** on GCE. Not a new OS. Not packet firewall v1.
