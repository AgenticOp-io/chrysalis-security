# Helix security surface — what we have now

**Status:** living inventory (2026-10-08)  
**Repo:** `engines/chrysalis-security` · GitHub [AgenticOp-io/chrysalis-security](https://github.com/AgenticOp-io/chrysalis-security)  
**Thesis:** Security usually asks “is this packet/payload/user weird?” Helix asks **“is this still the certified app?”**

This document is the full product map: one DNA firewall engine, two host install stories (Linux + Windows), optional placements (bridge / K8s / compose), and what is deliberately *not* Helix.

---

## 1. One product, not two firewalls

| Name | What it is |
| --- | --- |
| **Helix** | Behavioral DNA firewall on the HTTP hop closest to the app |
| **Linux Mode A** | `helix-agent` + systemd (optional nft redirect) |
| **Helix for Windows** | Same `helix-agent` + startup task + system tray + CLI |
| **Control panel** | Shared `/__helix/` UI (both hosts) |

Windows is **not** a second security engine. It is the Mode A install + operator shell for Win32. Linux is **not** “the only real Helix” — both run the same learn / shadow / enforce DNA path.

```text
                    ┌─────────────────────────────┐
                    │   Helix engine (dna-core +  │
                    │   helix-proxy / helix-agent)│
                    └─────────────┬───────────────┘
                                  │
           ┌──────────────────────┼──────────────────────┐
           ▼                      ▼                      ▼
    Linux Mode A            Windows Mode A           Other placements
    systemd + agent         tray + task + agent      Mode B L2 · K8s · Compose · lab proxy
```

---

## 2. What Helix is (and is not)

### Is

- **Application identity** from certified traffic DNA (`app-dna-v1`)
- **Allow while securing:** learn → promote → shadow → enforce ([MODES.md](./MODES.md))
- **Augment any NGFW** without rewriting that box’s NAT/VIP ([AUGMENT.md](./AUGMENT.md), lock **D4**)
- **Out-of-box** for typical HTTPS/HTTP websites + JSON APIs ([BEGINNING.md](./BEGINNING.md))
- **Optional CWL bridge** for Chrysalis cutover — never required to protect (**D5**, [PILLARS.md](./PILLARS.md), [CWL-BRIDGE.md](./CWL-BRIDGE.md))

### Is not

| Not Helix | Why |
| --- | --- |
| NGFW / next-gen firewall OS module | Packets, VPN, IPS, geo, NAT stay on Forti/Palo/cloud ([NGFW-TIE-IN.md](./NGFW-TIE-IN.md)) |
| Signature WAF / UEBA / SQLi pack | Wrong question; locked **D2** / **D3** ([DECISIONS.md](./DECISIONS.md)) |
| Windows Defender / OS firewall | Host packet filter ≠ app DNA on the HTTP hop |
| Convert / CWL language owner | Language lives in `chrysalis-cwl`; Secure consumes |
| Custom Linux distro | Stock Linux + container/binary ([MODE-B-L2.md](./MODE-B-L2.md)) |

Buyer sentence: **“We don’t allow app shape we didn’t certify.”**

---

## 3. Operator lifecycle (shared)

```text
learn (traffic still flows, DNA observations recorded)
  → report / ready (coverage honest)
  → promote (diff reviewed; signed DNA)
  → shadow (holes alert only)
  → soak (real traffic — operator; [SOAK.md](./SOAK.md))
  → enforce (unauthorized surface fails closed)
  → reload (new promote without downtime)
```

| Mode | App traffic | Security |
| --- | --- | --- |
| **learn** | Pass | Record observations |
| **shadow** | Pass | Score DNA; alert only |
| **enforce** | Pass only if DNA matches | Block holes (403) |

Ops surfaces (never DNA-gated):

- `GET /__helix/` — control / monitor panel  
- `GET /__helix/healthz` · `GET /__helix/status` · `GET /__helix/api/snapshot`  
- `POST /__helix/reload`  
- Proof page: `/__helix/attack` (lab)

CLI: `npm run helix -- …` (`packages/helix-cli`) — learn, diff, promote, report, ready, triage, …

---

## 4. DNA — what is fingerprinted

Out-of-box signals (internet majority):

| Signal | Role |
| --- | --- |
| Method + path template | Primary — unknown route → deny in enforce |
| Host | Multi-site / vhost safe |
| Content-Type class | `json` / `html` / `other` |
| JSON key paths (depth ≤ 2) | Request + response drift |
| Query **names** | `HX-QUERY-SCHEMA-DRIFT` |
| Status / content class | Fail-closed JSON when certified |
| Response surface | Cookie **names**, redirect **hosts** ([RESPONSE-SURFACE.md](./RESPONSE-SURFACE.md)) |

Deliberately weak / out of v0:

- Full HTML body fingerprint (CMS churn)  
- SQL / DB instrumentation  
- Deep auth logic (WAF/app problem on certified routes)

Signed certificates: [SIGNED-DNA.md](./SIGNED-DNA.md) · lifecycle: [CERT-LIFECYCLE.md](./CERT-LIFECYCLE.md)

---

## 5. Placement modes

| Mode | Placement | When |
| --- | --- | --- |
| **A. Host intercept** | Helix on the app host (or sidecar); app on localhost | **Default product** — external + internal hits to that host |
| **B. Transparent bridge** | L2 bump-in-wire appliance | Segment-wide; IPs unchanged ([MODE-B-L2.md](./MODE-B-L2.md), [GCE-L2.md](./GCE-L2.md)) |
| **C. Explicit reverse proxy** | `helix-proxy` in front of upstream | Labs / simple hop ([BEGINNING.md](./BEGINNING.md)) |

Day-one shipping path historically Mode C; out-of-box for real networks converges on **Mode A**.

---

## 6. Linux — Mode A firewall install

**Docs:** [INSTALL-MODE-A.md](./INSTALL-MODE-A.md) · [AUGMENT.md](./AUGMENT.md)

```text
Internet / LAN → host :80/:443/:LISTEN_PORT (Helix)
                      ↓
              127.0.0.1:APP_PORT (app)
```

| Piece | Path |
| --- | --- |
| Agent | `packages/helix-agent/bin/helix-agent.mjs` |
| systemd unit | `deploy/systemd/helix-agent.service` |
| Env example | `deploy/systemd/helix-agent.env.example` → `/etc/helix/helix-agent.env` |
| Optional nft redirect | `scripts/host-redirect-nft.sh` |
| Prove | `npm run host-smoke` → `HOST_SMOKE_OK` · `npm run nft-smoke` → `NFT_SMOKE_OK` (Linux/GCE; Win32 → `NFT_SMOKE_SKIP`) |

**Also on Linux / fleet:**

| Surface | Doc / prove |
| --- | --- |
| Docker Compose lab | `docker-compose.yml` · `compose-smoke` |
| K8s sidecar | [K8S.md](./K8S.md) · `k8s-image-smoke` / `k8s-push` |
| Mode B L2 | [MODE-B-L2.md](./MODE-B-L2.md) · GCE green |
| GCE prove host | [GCE.md](./GCE.md) · `agenticop-master` |

---

## 7. Windows — Helix for Windows (Mode A app)

**Docs:** [INSTALL-MODE-A-WINDOWS.md](./INSTALL-MODE-A-WINDOWS.md)  
**Landed:** Secure `main` (PR [#40](https://github.com/AgenticOp-io/chrysalis-security/pull/40))

Same topology as Linux Mode A. Persistence is a **Scheduled Task** (`HelixAgent`), not a custom kernel driver. nft redirect stays Linux-only.

| Piece | Path |
| --- | --- |
| Install / uninstall | `deploy/windows/install.ps1` · `uninstall.ps1` |
| Agent runner | `deploy/windows/run-agent.ps1` |
| System tray | `deploy/windows/HelixTray.ps1` |
| Env | `deploy/windows/helix-agent.env.example` → `%ProgramData%\Helix\helix-agent.env` |
| CLI | `npm run helix-win -- …` (`packages/helix-windows`) |
| Panel | `http://127.0.0.1:4080/` (same `/__helix/`) |
| Prove | `npm run windows-app-smoke` → `WINDOWS_APP_SMOKE_OK` (non-Windows → honest `WINDOWS_APP_SMOKE_SKIP`) |

```powershell
npm run helix-win -- install --start --tray
# Edit %ProgramData%\Helix\helix-agent.env → APP_UPSTREAM
# learn → promote → shadow → enforce
```

**Tray:** open panel / attack proof, start/stop Helix, live status (mode + up/down).

**Lab vs product on Windows:**

| Path | Use |
| --- | --- |
| `npm run local-lab` + `local-lab-windows-start.ps1` | Fixture flip (demo / real-site) — [LOCAL-LAB.md](./LOCAL-LAB.md) |
| `deploy/windows/install.ps1` | Product Mode A for a real localhost app |

---

## 8. Shared packages and ops tooling

| Package / area | Role |
| --- | --- |
| `packages/dna-core` | Learn, promote, report, ready, triage, fingerprints |
| `packages/helix-proxy` | HTTP DNA proxy engine |
| `packages/helix-agent` | Mode A entrypoint (Linux + Windows) |
| `packages/helix-bridge` | Mode B userspace bridge |
| `packages/helix-cli` | Operator CLI |
| `packages/helix-windows` | Windows install / tray / status CLI |
| `packages/cwl-bridge` | Optional CWL ↔ DNA (tip-pinned to `chrysalis-cwl`) |
| `schemas/app-dna-v1.json` | Certificate schema |
| SIEM | `SIEM_LOG` NDJSON (`helix.siem.v1`) · [LOGGING.md](./LOGGING.md) · [THREAT-CORRELATION.md](./THREAT-CORRELATION.md) · [SIEM.md](./SIEM.md) |
| Severity / triage | [SEVERITY.md](./SEVERITY.md) · [TRIAGE.md](./TRIAGE.md) |
| TLS terminate (optional) | [TLS.md](./TLS.md) — default still cleartext after someone else’s TLS (**D1**) |

---

## 9. Chrysalis three pillars (Secure’s role)

| Pillar | Repo | Role vs Helix |
| --- | --- | --- |
| **CWL** | `chrysalis-cwl` | Language / genome — DNA of web languages |
| **Convert** | `chrysalis` (convert) | Universal Translator — does not own Helix or UT↔Helix spine |
| **Secure** | **this repo** | Helix traffic DNA firewall |

Cutover / live-match when bridging: [LIVE-MATCH.md](./LIVE-MATCH.md) · `cutover-smoke` · CWL `smoke:ut-spine`.  
Helix **does not** require CWL to learn or enforce.

---

## 10. Prove matrix (honest tokens)

| Prove | Token | Notes |
| --- | --- | --- |
| Core DNA pack | `npm run test:dna` | No CWL required for protect path |
| Full local | `npm test` | Includes bridge / nft / compose / k8s where applicable |
| Host Mode A | `HOST_SMOKE_OK` | |
| Windows app pack | `WINDOWS_APP_SMOKE_OK` | Skip on non-Windows |
| nft redirect | `NFT_SMOKE_OK` | Skip on Win32 |
| Panel | `PANEL_SMOKE_OK` | |
| Local lab flip | `LOCAL_LAB_PROVE_OK` | |
| Cutover + CWL | `CUTOVER_SMOKE_OK` | Bridge optional |
| Mode B L2 | `BRIDGE_L2_*_OK` | GCE |
| Soak preflight | `SOAK_PREFLIGHT_OK` | ≠ customer soak |
| GCE sync | `GCE_SYNC_OK` | [GCE.md](./GCE.md) |

---

## 11. Shippable vs post-ship

**Engineering shippable bar:** **closed** — [SHIPPABLE.md](./SHIPPABLE.md).

| Open (post-ship) | Owner |
| --- | --- |
| Customer shadow soak → enforce on real traffic | Operator ([SOAK.md](./SOAK.md)) |
| EXTFMAP / live EXTFMAP hunts where applicable | Operator (sibling runbooks) |

Credibility after ship is **living with real customer traffic**, not more fingerprint invent.

---

## 12. Doc map (where to go next)

| Want | Read |
| --- | --- |
| How Helix protects (story) | [WHITEPAPER.md](./WHITEPAPER.md) · [THREAT-MODEL.md](./THREAT-MODEL.md) |
| Gap / maturity | [PRODUCT.md](./PRODUCT.md) |
| Linux install | [INSTALL-MODE-A.md](./INSTALL-MODE-A.md) |
| Windows install | [INSTALL-MODE-A-WINDOWS.md](./INSTALL-MODE-A-WINDOWS.md) |
| Modes + reload | [MODES.md](./MODES.md) |
| NGFW pairing | [AUGMENT.md](./AUGMENT.md) |
| Desktop lab | [LOCAL-LAB.md](./LOCAL-LAB.md) |
| Roadmap checklist | [ROADMAP.md](./ROADMAP.md) |
| Architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Index | [README.md](./README.md) |

---

## 13. Quick start cheat sheet

**Linux Mode A (lab):**

```bash
HOST=127.0.0.1 PORT=4090 node fixtures/demo-api/server.mjs
LISTEN_PORT=4080 APP_UPSTREAM=http://127.0.0.1:4090 MODE=learn \
  node packages/helix-agent/bin/helix-agent.mjs
# Panel: http://127.0.0.1:4080/__helix/
```

**Windows Mode A (product shell):**

```powershell
npm run helix-win -- install --start --tray
# Panel: http://127.0.0.1:4080/
npm run windows-app-smoke
```

**Compose (no CWL):**

```bash
docker compose up --build
# Helix :4080 → demo-api :4090
```
