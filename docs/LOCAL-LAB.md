# Local lab (your PC)

Desktop prove path while you let learn collect traffic. No CWL required.

```text
learn (recording) → promote → shadow → enforce → prove backdoor 403
```

## Start / panel

```bash
npm run local-lab -- start --mode learn --kill
```

Open **http://127.0.0.1:4080/** (control panel). Hit **Probe demo API** / `/api/items` so observations grow.

Status:

```bash
npm run local-lab -- status
# or: node scripts/local-run-status.mjs
```

## When learn looks complete

Route set should cover what you care about (at least `/api/health`, `/api/items`). Then:

```bash
npm run local-lab -- promote
npm run local-lab -- start --mode shadow --kill
# poke panel; unexpected holes → investigate / re-promote
npm run local-lab -- start --mode enforce --kill
npm run local-lab -- prove    # → LOCAL_LAB_PROVE_OK (backdoor 403)
```

DNA lands at `data/local-run/app.dna.json`. Reload after later promotes: panel **Reload DNA** or `POST /__helix/reload`.

## CI / automated full path

`npm run smoke` already proves learn → promote → enforce backdoor 403 without your PC lab.

## Not a customer soak

This lab is synthetic. Real “implement fully” on a production app follows [SOAK.md](./SOAK.md). Same modes — different traffic.
