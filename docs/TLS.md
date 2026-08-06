# Optional TLS terminate (D1)

Default Helix sees **cleartext HTTP on the host** after someone else’s TLS (ingress, LB, app).

Optional: Helix terminates TLS itself.

```env
HELIX_TLS_CERT=/certs/fullchain.pem
HELIX_TLS_KEY=/certs/privkey.pem
PORT=443
```

Prove: `npm run tls-smoke` → `TLS_SMOKE_OK` (needs `openssl` for ephemeral cert) or `TLS_SMOKE_SKIP`.

Still **never** require NGFW SSL inspection (D1).
