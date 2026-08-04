# Signed DNA certificates

Certified DNA may carry an HMAC-SHA256 signature so enforce fails closed on tamper.

```json
"signature": {
  "alg": "hmac-sha256",
  "key_id": "lab",
  "value": "<hex>"
}
```

## CLI

```bash
helix promote --in draft.json --out cert.json --key "$HELIX_DNA_KEY" --key-id lab
helix verify  --in cert.json --key "$HELIX_DNA_KEY" --require
```

Env aliases: `HELIX_DNA_KEY`, `HELIX_DNA_KEY_ID`, `--key-file`.

## Runtime

Set `HELIX_DNA_KEY` (and optionally `HELIX_DNA_REQUIRE=1`) on `helix-proxy` / `helix-agent` / `helix-bridge`.  
Signed DNA with a wrong key refuses to start. Unsigned DNA still loads unless `HELIX_DNA_REQUIRE=1`.

Core: `signDna` / `verifyDna` in `packages/dna-core`. Smoke: `npm run sign-smoke`.
