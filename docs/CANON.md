# Helix — three rules (trust nothing)

No decision-log bureaucracy. Three rules only:

1. **Trust nothing until certified.** A request is allowed only if it matches a **certified** DNA file. Everything else is blocked (or logged in shadow). Unknown = deny.
2. **DNA comes from traffic, not hope.** Learn from real requests/responses. Never hand-wave an allowlist. Never invent routes to look complete.
3. **Change is guilty until promoted.** New routes, new response shapes, new deploys do not get a free pass. Diff → human/agent promote → new certificate. No silent auto-trust.

## One line

```
If it isn’t in the certified DNA, it doesn’t pass.
```

## What we block / alert (D2)

| Out-of-DNA event | enforce | shadow |
|------------------|---------|--------|
| Unknown route/method/host | block | alert |
| JSON key fingerprint drift | block | alert |

## What we refuse to become (D3)

Not a general “bad behavior” engine. No UEBA, no signature WAF replacement. Pair with NGFW/WAF for that.

## Independence (D1)

Do **not** require firewall SSL inspection. See HTTP on the host (or terminate TLS ourselves later).

Full locks: [DECISIONS.md](./DECISIONS.md) · NGFW pairing: [AUGMENT.md](./AUGMENT.md)
