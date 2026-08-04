# Helix · chrysalis-security

DNA firewall: **if it isn’t in certified DNA, it doesn’t pass.**

Locks: [`docs/DECISIONS.md`](./docs/DECISIONS.md) · Beginning: [`docs/BEGINNING.md`](./docs/BEGINNING.md) · NGFW: [`docs/AUGMENT.md`](./docs/AUGMENT.md)

## Prove

```bash
npm run smoke
npm run host-smoke
```

## Mode A (no NGFW NAT change)

App on localhost only; Helix binds the public port:

```bash
HOST=127.0.0.1 PORT=4090 node fixtures/demo-api/server.mjs

LISTEN_PORT=4080 APP_UPSTREAM=http://127.0.0.1:4090 MODE=learn \
  node packages/helix-agent/bin/helix-agent.mjs
```

Linux hard redirect (optional): `bash scripts/host-redirect-nft.sh install`
