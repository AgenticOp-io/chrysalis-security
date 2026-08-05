# Signed DNA certificates

Certified DNA may carry a signature so enforce fails closed on tamper. Two algorithms:

| `alg` | Key material | `signature.value` |
|-------|--------------|-------------------|
| `hmac-sha256` (default) | Shared secret string | Hex HMAC |
| `ed25519` (optional) | Ed25519 private (sign) / public (verify) | Hex 64-byte sig |

```json
"signature": {
  "alg": "hmac-sha256",
  "key_id": "lab",
  "value": "<hex>"
}
```

```json
"signature": {
  "alg": "ed25519",
  "key_id": "lab",
  "value": "<hex>"
}
```

## Ed25519 key material

Accept any of:

- **PEM** — PKCS#8 private (`-----BEGIN PRIVATE KEY-----`) or SPKI public (`-----BEGIN PUBLIC KEY-----`)
- **Raw 32-byte** — hex (64 chars) or base64 seed / public key (Node wraps to PKCS#8 / SPKI DER)
- **KeyObject** — from `crypto.generateKeyPairSync('ed25519')` (library callers)

Promote needs the **private** key. Verify needs the **public** key (or the private PEM — public is derived). Runtime `HELIX_DNA_KEY` for Ed25519 DNA should hold the **public** PEM (private also works).

Generate a lab pair:

```bash
node -e "const c=require('crypto');const{privateKey,publicKey}=c.generateKeyPairSync('ed25519');console.log(privateKey.export({type:'pkcs8',format:'pem'}));console.log(publicKey.export({type:'spki',format:'pem'}));"
```

## CLI

```bash
# HMAC (unchanged)
helix promote --in draft.json --out cert.json --key "$HELIX_DNA_KEY" --key-id lab
helix verify  --in cert.json --key "$HELIX_DNA_KEY" --require

# Ed25519
helix promote --in draft.json --out cert.json --alg ed25519 --key-file priv.pem --key-id lab
helix verify  --in cert.json --alg ed25519 --key-file pub.pem --require
```

Env aliases: `HELIX_DNA_KEY`, `HELIX_DNA_KEY_ID`, `HELIX_DNA_ALG`, `--key-file`.

## Runtime

Set `HELIX_DNA_KEY` (and optionally `HELIX_DNA_REQUIRE=1`) on `helix-proxy` / `helix-agent` / `helix-bridge`.  
Signed DNA with a wrong key refuses to start. Unsigned DNA still loads unless `HELIX_DNA_REQUIRE=1`.  
For `alg: ed25519`, put the verifying public PEM (or private PEM) in `HELIX_DNA_KEY`.

Core: `signDna` / `verifyDna` / `loadEd25519Key` / `generateEd25519KeyPair` in `packages/dna-core`. Smoke: `npm run sign-smoke`.
