# DNA bind — runtime verify of genome-declared digests

CWL tips **1.0.85–1.0.88** (RFC-0042–0045) let a genome **name** which promoted `app-dna-v1` certificate it claims: SRI fingerprint(s), bank, `match live`, named proof units, quorum, lineage, supersedes, witness, scope.

CWL does **not** hash or fetch. Helix does.

```text
genome declares          Helix verifies
───────────────          ──────────────
dna fingerprint "sha384-…"  →  digest(canonical DNA) ∈ declared set
quorum 2                    →  ≥ N declared digests match
match live                  →  check on shadow/enforce for that surface
witness "https://…"         →  GET; body must contain a declared digest
supersedes "sha384-…"       →  lineage certificate carries that digest
```

Traffic DNA (`scoreRequest` / `scoreResponse`) stays the default protect path (**D5**). Bind verify is an **ops overlay** beside the certificate — same pattern as sensitivity / cookie-purpose maps. Absent overlay ⇒ no bind check.

## Mint digests operators can paste into CWL

Helix fingerprints the **canonical signing payload** (stable JSON, signature omitted) so pretty-print and the signature block do not churn the digest:

```bash
helix fingerprint --in certificates/app.dna.json
# → { "digests": ["sha384-…", "sha512-…"] }
```

Put those strings in the genome (`dna fingerprint "sha384-…";`). Weak `sha256` DNA binds are refused at consume (`cwl:dna-fingerprint-too-weak`).

## Overlay

```bash
helix dna-bind --cwl app.cwl --out data/dna-bind.json
# HELIX_DNA_BIND=data/dna-bind.json
```

Or hand-author:

```json
{
  "kind": "chrysalis.helix.dna-bind",
  "module": {
    "match_live": true,
    "fingerprints": ["sha384-…", "sha512-…"],
    "quorum": 2,
    "expect": "enforce"
  },
  "routes": [
    {
      "method": "GET",
      "path_template": "/invoice",
      "match_live": true,
      "fingerprints": ["sha384-…"],
      "quorum": 1
    }
  ]
}
```

## Runtime holes

| Code | When |
| --- | --- |
| `HX-DNA-BIND` | `match live` without fingerprints, or no DNA loaded |
| `HX-DNA-QUORUM` | fewer digests matched than `quorum` |
| `HX-DNA-SUPERSEDES` | `supersedes` set but lineage missing / wrong |
| `HX-DNA-BANK` | `match bank` and the live digest is not in the bank dir |
| `HX-DNA-WITNESS` | witness fetch failed or body did not attest |

In **enforce**, a failed bind on a `match live` surface is **403** before traffic DNA scoring. In **shadow**, the hole is logged and traffic still passes. Panel/healthz stay ungated.

## CLI verify (no proxy)

```bash
helix verify-bind --bind data/dna-bind.json --dna certificates/app.dna.json \
  [--lineage certificates/prev.dna.json] [--witness-body "sha384-…"]
# exit 0 ok · exit 2 failed
```

## Agent env

| Var | Role |
| --- | --- |
| `HELIX_DNA_BIND` | Path to the overlay |
| `HELIX_DNA_LINEAGE` | Prior certificate for `supersedes` checks |

## Prove

```bash
npm run dna-bind-smoke
# → DNA_BIND_UNIT_OK · ENFORCE_OK · WITNESS_OK · SUPERSEDES_OK · CWL_OK · DNA_BIND_SMOKE_OK
```

Related: [CWL-BRIDGE.md](./CWL-BRIDGE.md) · [LIVE-MATCH.md](./LIVE-MATCH.md) · [SIGNED-DNA.md](./SIGNED-DNA.md) · [CERT-LIFECYCLE.md](./CERT-LIFECYCLE.md)
