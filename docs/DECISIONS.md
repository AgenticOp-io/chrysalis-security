# Helix locked decisions

Short product locks. Don’t reopen without an explicit amend.

## D1 — Do not rely on NGFW TLS decryption

Helix must work **without** FortiGate / Palo / cloud firewall SSL inspection.

- **Default:** see HTTP on the **app host** (app on localhost after TLS terminate, or cleartext HTTP).
- **Optional later:** Helix terminates TLS itself.
- **Never required:** NGFW decrypt-and-forward.

NGFWs keep packets, VPN, IPS, geo, NAT. Helix does not depend on their content inspection features.

## D2 — DNA mismatch: block and alert (yes)

Out-of-DNA is the only “bad action” Helix owns:

| Mode | Behavior |
|------|----------|
| **enforce** | **Block** (403 + hole code) |
| **shadow** | **Alert/log** (pass through + `x-helix-shadow-hole` / shadow log) |

That includes unknown routes/methods and JSON key drift on certified JSON routes.

## D3 — General “bad behavior” / UEBA: no

Helix does **not** become a SIEM, XDR, or classic WAF:

- No SQLi/XSS signature mission  
- No brute-force / beacon / “user looks weird” UEBA  
- Those stay on NGFW / WAF / XDR  

Helix asks only: **is this still the certified app?**

## D4 — Augment firewalls without NAT homework

Prefer **Mode A host intercept** ([AUGMENT.md](./AUGMENT.md)): NGFW VIP/NAT unchanged; Helix on the host covers external + internal hits to that app. Explicit proxy (Mode C) remains for labs.
