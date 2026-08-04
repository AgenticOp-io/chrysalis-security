# Helix architecture (v0 beginning)

From [BEGINNING.md](./BEGINNING.md) and [AUGMENT.md](./AUGMENT.md):

```
any NGFW (unchanged NAT)
    → app host
        → Helix intercept (Mode A) or explicit proxy (Mode C)
            → app
```

Explicit proxy (Mode C) is what `helix-proxy` smoke proves today.
Host intercept (Mode A) is the path that avoids firewall NAT edits and covers internal + external hits to that host.

## DNA v0 fields that matter

- `host`
- `method` + `path_template`
- `content_class` (`json` | `html` | `other`)
- `response_key_fingerprint` (**json only**)
- `status_classes`

Skip HTML body hashes and SQL in v0.

## Pieces

| Piece | Job |
|-------|-----|
| `packages/dna-core` | Template, learn, diff, score |
| `packages/helix-proxy` | Inline proxy + modes |
| `packages/helix-cli` | learn / diff / promote |
| `fixtures/demo-api` | First smoke victim |
| Container (soon) | Out-of-box run |
