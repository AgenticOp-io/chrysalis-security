# DNA certificate lifecycle

Helix treats certified DNA as a **certificate**: learn drafts it, promote seals it, reload applies it, replace continues the chain.

```text
learn → report → promote [--from] → shadow soak → ready → enforce
                      ↓
              POST /__helix/reload   (or restart with DNA=)
```

See [MODES.md](./MODES.md) · [SOAK.md](./SOAK.md) · [SIGNED-DNA.md](./SIGNED-DNA.md).

## Promote (with diff by default)

```bash
# First certificate (no parent)
helix promote --in draft.json --out app.dna.json --key "$HELIX_DNA_KEY" --key-id lab

# Replace / re-promote — diff prints automatically when --out already exists
# (or pass --from explicitly)
helix promote --in draft.json --out app.dna.json --from app.dna.json --key "$HELIX_DNA_KEY"

# Refuse promote without a parent (CI / prod gate)
helix promote --in draft.json --out app.dna.json --require-from --from prev.dna.json
```

`parent_hash` on the new cert is `sha256(canonical JSON of --from)` (signature omitted).  
Verify lineage:

```bash
helix verify --in app.dna.json --parent prev.dna.json --key "$HELIX_DNA_KEY"
```

Prove: `npm run promote-chain-smoke` → `PROMOTE_CHAIN_SMOKE_OK`

## Apply without downtime

1. Write the new file to the same `DNA=` path  
2. `POST /__helix/reload` (panel button, or `SIGHUP` / `SIGUSR2`)  
3. Confirm `/__helix/healthz` shows updated `routes`

## Revoke / replace (v0 — no CRL)

Helix does not ship a certificate revocation list. To **invalidate** a compromised cert:

1. **Rotate signing key** — new `HELIX_DNA_KEY` / `key_id` (set `HELIX_DNA_REQUIRE=1` in enforce)  
2. **Re-promote** the known-good draft (or re-learn) with the new key:  
   `helix promote --in draft.json --out app.dna.json --from app.dna.json --key-id lab-v2 …`  
3. **Reload** Helix so only the new signature verifies  
4. **Archive** the old file for audit (`app.dna.json.revoked-<date>`); do not leave it on `DNA=`  
5. If the *content* was wrong (not just the key), fix the draft first — revoke does not mean “allow backdoors”

Wrong-key / tampered DNA fails closed at load when `HELIX_DNA_REQUIRE=1` ([SIGNED-DNA.md](./SIGNED-DNA.md)).

## Operator checklist

| Step | Gate |
|------|------|
| Coverage | `helix report --in draft.json` |
| Diff reviewed | promote stdout / `helix diff` |
| Chain | `helix verify --parent` after re-promote |
| Shadow | holes → SIEM; investigate |
| Enforce | `helix ready --target enforce --shadow-log …` |
| Live | reload; panel at `/__helix/` |
