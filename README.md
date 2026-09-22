# Helix · chrysalis-security

DNA firewall: **if it isn’t in certified DNA, it doesn’t pass.**

## Chrysalis (open source)

| Pillar | Repository | Role |
|--------|------------|------|
| **CWL** | [chrysalis-cwl](https://github.com/AgenticOp-io/chrysalis-cwl) | Chrysalis Web Language — DNA of the web |
| **Convert** | [chrysalis](https://github.com/AgenticOp-io/chrysalis) | Universal Translator — origin → WebIR/CWL → emit |
| **Secure** | [chrysalis-security](https://github.com/AgenticOp-io/chrysalis-security) | Helix DNA firewall — allow only what certified traffic proves |

Helix protects with **traffic DNA** out of the box (D5). Any CWL bridge consumes `chrysalis-cwl`; this repo does not own the language.

Locks: [`docs/DECISIONS.md`](./docs/DECISIONS.md) · Beginning: [`docs/BEGINNING.md`](./docs/BEGINNING.md) · NGFW: [`docs/AUGMENT.md`](./docs/AUGMENT.md)

## Prove

```bash
npm test   # dna-core + smoke + host + static + schema-drift
.\scripts\gce-sync.ps1 -SiteUp   # GCE pack + all smokes + persistent site :18085
```

## Mode A (no NGFW NAT change)

App on localhost only; Helix binds the public port:

```bash
HOST=127.0.0.1 PORT=4090 node fixtures/demo-api/server.mjs

LISTEN_PORT=4080 APP_UPSTREAM=http://127.0.0.1:4090 MODE=learn \
  node packages/helix-agent/bin/helix-agent.mjs
```

Linux hard redirect (optional): `bash scripts/host-redirect-nft.sh install`
