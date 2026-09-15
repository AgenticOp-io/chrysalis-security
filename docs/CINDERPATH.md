# Helix + Cinderpath — control-plane DNA (not tunnel DPI)

Cinderpath is a **privacy VPN** ([`projects/cinderpath`](../../../projects/cinderpath)). Helix completes the **product-surface** security Cinderpath already declares in CWL — it does **not** inspect destinations through the WireGuard tunnel.

Cinderpath’s own rule: `tunnel_inspection: false` (`GET /cwl-security`). Other VPNs’ “threat protection” filters sites you visit. Helix certifies that **this control plane** is still the published genome / traffic DNA.

## What Helix owns here

| Plane | Helix? | Notes |
| --- | --- | --- |
| Account / shop / connect mint / admin HTTP | **Yes** | Mode A in front of `cinderpath-web` (and optionally ingress `:8080` API) |
| WireGuard UDP / fabric / PDU egress | **No** | Stock WG + Cinderpath dataplane; keep as holes in CWL |
| Destination / DNS filtering on tunnel | **No** | Explicit non-goal |

## Placement (Mode A)

```text
Internet / LAN
  → POP or web host :443/:80
      → Helix (learn → shadow → enforce)
          → 127.0.0.1:CINDERPATH_WEB_PORT   (cinderpath-web)
```

NGFW / VPN VIP unchanged ([AUGMENT.md](./AUGMENT.md) D4). Soft bind or nft divert ([INSTALL-MODE-A.md](./INSTALL-MODE-A.md)).

Optional second Helix instance on **ingress API** (`CINDERPATH_LISTEN`, often `:8080`) for `/v1/sessions` — same Mode A pattern; still not WG dataplane.

## Genome

- Live product genome: `projects/cinderpath/internal/webapp/cwl/cinderpath.cwl` (tip comment tracks CWL)
- Language SoR: `engines/chrysalis-cwl` (pin `@agenticop-io/cwl` / `file:`)
- Expand process: CWL [`CWL-EXPAND.md`](../../chrysalis-cwl/docs/history/CWL-EXPAND.md)

Seed / cutover:

```bash
# from chrysalis-security
set CINDERPATH_ROOT=C:\Users\david\projects\cinderpath
npm run cinderpath-control-plane-smoke
# → CINDERPATH_CONTROL_PLANE_OK
```

## Operator path (control plane only)

1. Point Helix `APP_UPSTREAM` at localhost `cinderpath-web`.
2. `MODE=learn` on real account/shop traffic (not synthetic soak invent).
3. `helix report` → promote → `MODE=shadow` → soak per [SOAK.md](./SOAK.md).
4. `helix ready --target enforce --shadow-log …` → `MODE=enforce`.
5. Optional CWL cutover: compare live DNA to seed from `cinderpath.cwl` ([LIVE-MATCH.md](./LIVE-MATCH.md)).

## Honesty

- WireGuard / POP mint / QR stay `hole hub-cwl:upstream-proxy` — Go executor, not Helix invent.
- bcrypt / sqlite session — app holes; DNA may still learn HTTP shapes.
- Do not market Helix as tunnel destination filtering.
- Customer soak → enforce remains **ops** (real `SHADOW_LOG`).
