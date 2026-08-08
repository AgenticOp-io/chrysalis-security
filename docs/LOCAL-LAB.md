# Local lab (your PC)

Desktop prove path while you let learn collect traffic. No CWL required.

```text
learn (recording) → promote → shadow → enforce → prove backdoor 403
```

## Start / panel

```bash
npm run local-lab -- start --mode learn --kill
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\local-lab-windows-start.ps1 -Mode enforce
# optional: -RegisterTask   (start at logon)
```

Open **http://127.0.0.1:4080/** (control panel).  
Proof page: **http://127.0.0.1:4080/__helix/attack**  
Blocked URL: **http://127.0.0.1:4080/api/backdoor** (403 HTML in a browser; JSON for API clients)

Status:

```bash
npm run local-lab -- status
# or: node scripts/local-run-status.mjs
```

## When learn looks complete

Route set should cover what you care about (at least `/api/health`, `/api/items`). **Do not promote `/api/backdoor`** if you want enforce to block it.

```bash
npm run local-lab -- promote
npm run local-lab -- start --mode shadow --kill
# poke panel; unexpected holes → investigate / re-promote
npm run local-lab -- start --mode enforce --kill
npm run local-lab -- prove    # → LOCAL_LAB_PROVE_OK (backdoor 403)
```

DNA lands at `data/local-run/app.dna.json`. Reload after later promotes: panel **Reload DNA** or `POST /__helix/reload`.

## Public URL (temporary tunnel)

Helix only gates traffic that hits it. To click a proof link from another device / “the internet” while Helix runs on your PC:

```bash
npm run local-lab -- start --mode enforce
npm run local-lab-tunnel
# → PUBLIC_URL=https://….trycloudflare.com
#    PROOF=…/__helix/attack
#    BLOCK=…/api/backdoor
```

Quick tunnels have no SLA; stop when done. For a durable public prove, run Helix on GCE ([GCE.md](./GCE.md)).

## Closer-to-real app (HTML + static + API)

```bash
npm run local-lab -- bootstrap-real
# Helix in enforce in front of fixtures/real-site
# Site:  http://127.0.0.1:4080/
# Proof: http://127.0.0.1:4080/__helix/attack
```

Or: `npm run local-lab -- start --mode learn --app real-site --kill` then promote as usual.

## Durable public prove (GCE)

After `gcloud auth login`:

```powershell
.\scripts\gce-sync.ps1 -SiteUp
# then (project admin once): open tcp:18085 — see docs/GCE.md
# Public: http://35.224.146.25:18085/
```

## CI / automated full path

`npm run smoke` and `npm run local-lab-smoke` prove learn → promote → enforce backdoor 403 without depending on your long-lived `:4080` lab.

## Not a customer soak

`real-site` is still a fixture. Production credibility needs your real app’s traffic per [SOAK.md](./SOAK.md).
