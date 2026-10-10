# Desk — ops console behind Helix

**Desk** is the default Mode A upstream: a small **operator console** Helix can learn, soak, and enforce against. It is not a storefront and not another Helix UI.

```text
Browser → Helix :4080 → Desk :4090
```

## Surfaces

| Kind | Paths |
| --- | --- |
| HTML | `/` · `/sites.html` · `/account.html` |
| Assets | `/assets/desk.css` · `/assets/desk.a1b2c3d4.js` |
| JSON | `/api/health` · `/api/sites` · `/api/tickets` · `/api/session` · `/api/me` |
| Aliases | `/api/catalog` · `/api/items` → sites · `/api/orders` → tickets (lab transition) |
| Attack proof | `/api/backdoor` (unauthorized — enforce → 403) |

Session mint sets cookie **name** `sid` only. Tickets POST `{ site, severity, note }`.

## Run

```bash
npm run desk                 # http://127.0.0.1:4090/
npm run desk-smoke           # → DESK_SMOKE_OK (learn → promote → enforce)
```

Windows desktop / `HELIX_START_DEMO=1` starts Desk on `:4090` automatically. With `HELIX_ROOT_PANEL=1`, Helix serves its panel at `/` — use `http://127.0.0.1:4080/sites.html` (through Helix) or `http://127.0.0.1:4090/` (direct).

## Prove

```bash
npm run desk-smoke
# DESK_UP_OK · DESK_LEARN_OK · DESK_ENFORCE_OK · DESK_SMOKE_OK
```

Thin `fixtures/demo-api` remains for smokes that pin a two-route JSON toy. Prefer Desk for operator demos and Windows Protect.

Related: [INSTALL-MODE-A-WINDOWS.md](./INSTALL-MODE-A-WINDOWS.md) · [BEGINNING.md](./BEGINNING.md) · [SOAK.md](./SOAK.md)
