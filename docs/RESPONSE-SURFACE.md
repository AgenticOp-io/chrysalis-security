# Response surface — who mints sessions, and where the browser is sent

Route and schema DNA answer “did the app grow a surface it never had?” They say nothing about a **certified** route that keeps its exact shape and quietly gains a new power:

- the FAQ page starts setting `admin_session`
- the login keeps returning `302` but now points at `evil.example`

No new route. No new JSON key. No new status class. Still not the certified app.

Two optional route fields close that gap:

| Field | Certifies | Hole |
| --- | --- | --- |
| `set_cookie_names` | Which cookie **names** this route may set | `HX-COOKIE-DRIFT` |
| `redirect_targets` | Where this route may send the browser: `self` or a hostname | `HX-REDIRECT-DRIFT` |

## Names and hostnames, never values

A cookie **value** is the session token — the thing being protected. DNA files get copied into repos, tickets, and SIEM sinks, so a certificate that carried one would be a liability. Helix records only the name before `=`, both in the learned observation log and in the certificate. The same rule applies to hole events: `HX-COOKIE-DRIFT` names the cookie and nothing else.

Redirects collapse the same way. A `Location` that is relative, or points at the request's own host, is certified as `self`, so ordinary navigation does not churn the certificate on every path change. Anything else is stored as the bare hostname, because the hostname is the part that turns an open redirect into an exfiltration path. A `Location` that will not parse is recorded as `unparseable` rather than ignored.

## Absent is not empty

- **Absent** (`undefined`) — a certificate promoted before this existed. Nothing is checked. Upgrading Helix never starts refusing traffic that a running certificate allowed.
- **Empty** (`[]`) — a learn pass watched this route and it never set a cookie or redirected. That is a claim, and a cookie appearing later is a hole.

So the feature arrives with a re-learn, not with an upgrade. `helix diff` shows the new fields when you promote.

## False positives are soak material

If the login only mints `sid` on success and the learn window saw nothing but failures, the certificate will carry `[]` and real logins will drift. This behaves exactly like response-key drift: visible in `shadow`, grouped by `helix triage` as `certified_surface_drift`, and fixed by learning the path you actually accept before enforcing. That is the soak doing its job, not a surprise in production — provided you soak.

## With the CWL genome

A genome can declare that a route mints a session (RFC-0032 `session.mint`), but it does not name the cookie, so `helix seed-cwl` does not invent one — seeded routes leave these fields absent. Cookie certification comes from watching the app, which is the only place the real name exists.

`helix cutover` cross-checks the two afterwards and reports `session_mint_notes`:

| Note | Meaning |
| --- | --- |
| `session_mint_honored` | Genome says the route mints a session; the certificate names the cookie it sets |
| `genome_mints_session_dna_sets_no_cookie` | The certificate watched this route and saw no cookie — the learn window likely missed a successful login, or the genome is stale |
| `dna_predates_response_surface` | The certificate has no opinion yet; learn again |

These are notes, not cutover failures. DNA owns observed behaviour, and a disagreement means a human should look — not that traffic should stop.

## Prove

```bash
npm run response-surface-smoke
# → RESPONSE_SURFACE_UNIT_OK · LEARN_OK · COOKIE_OK · REDIRECT_OK · LEGACY_OK · RESPONSE_SURFACE_SMOKE_OK
```

The smoke learns a real app whose `/login` mints `sid` and bounces to `/dashboard`, promotes it, then makes the app grow a cookie on its FAQ page and steal its own login redirect — asserting both are refused, that the browser receives neither, and that the session value appears in no observation, certificate, or hole event.

Related: [ARCHITECTURE.md](./ARCHITECTURE.md) · [SEVERITY.md](./SEVERITY.md) · [TRIAGE.md](./TRIAGE.md) · [SOAK.md](./SOAK.md)
