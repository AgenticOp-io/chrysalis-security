# Mode B — L2 / dual-NIC appliance (design)

Honest path from the **userspace** `helix-bridge` spike to a **bump-in-wire** appliance that still honors **D4** (no NGFW NAT homework) and **BEGINNING** (no custom OS).

Locks: [DECISIONS.md](./DECISIONS.md) · placement: [AUGMENT.md](./AUGMENT.md) · product: [BEGINNING.md](./BEGINNING.md)

## Status

| Layer | Today | This doc |
|-------|-------|----------|
| DNA learn / promote / enforce | Ships (`dna-core` + proxy) | Unchanged |
| Mode B code | `packages/helix-bridge` + `bridge-smoke` | Userspace **placement label** only |
| Dual-NIC / L2 forwarding | **Phase 1 + Phase 2 lab landed** | P1: netns + nft divert + fail-closed; P2: dual-iface pair in appliance ns (`gce-bridge-l2-p2-smoke.sh`) |

**Design-only for this slice.** No production kernel modules. No custom OS image beyond stock Linux + Helix userspace.

---

## What the spike already proved

`helix-bridge` is the same HTTP DNA engine as Mode A/C, with `placement: 'bridge'`:

```text
client → helix-bridge :LISTEN_PORT → APP_UPSTREAM (localhost app)
```

That proves: DNA path works when Helix sits **in the path** without owning the NGFW VIP. It does **not** prove frame-level transparency, dual-NIC failover, or “same server IPs, cable in the middle.”

---

## Target traffic flow (real Mode B)

```text
NGFW / router (unchanged VIP/NAT/policy)
        │
        │  L2 / same subnet (or cloud “appliance in path”)
        ▼
   ┌─────────────────────────────────────────┐
   │  Helix appliance (stock Linux)          │
   │  NIC-A (toward NGFW)  ↔  NIC-B (servers)│
   │                                         │
   │  Kernel: bridge / forward most frames   │
   │  Divert: TCP :80/:443 (policy ports)    │
   │       → Helix userspace (DNA)           │
   │       → continue toward real server IP  │
   └─────────────────────────────────────────┘
        │
        ▼
   App hosts (same IPs as before Helix was inserted)
```

- Helix does **not** become the NAT owner (D4).
- Server IPs and NGFW policies stay the same.
- External (N/S) and internal (E/W) that cross this segment both see Helix when they hit diverted ports.
- TLS: still **D1** — default enforce on cleartext or after terminate on the path Helix can see; never require NGFW SSL inspection.

---

## Userspace vs kernel — who owns what

| Concern | Where | Notes |
|---------|-------|-------|
| L2 learning / flooding / STP (if needed) | **Kernel** bridge (`ip link` / `bridge`) | Boring Linux; not a Helix invention |
| Non-HTTP / non-diverted protocols | **Kernel** forward | Pass through; Helix does not inspect |
| HTTP(S) port divert to Helix | **Kernel** classify + redirect (nft / TC / later eBPF) | Policy ports only |
| DNA learn / shadow / enforce | **Userspace** (`helix-bridge` / shared proxy core) | Same engine as Mode A |
| Fail-open vs fail-closed for diverted flows | **Userspace policy** + divert rules | See failure modes |
| Custom NGFW / custom kernel module / Helix OS | **Will not build** | BEGINNING non-goal |

Rule of thumb: **kernel moves frames; Helix judges HTTP identity.**

---

## Divert options (stock Linux only)

All options assume dual-NIC (or cloud equivalent) + userspace Helix. Prefer boring mechanisms first.

### 1. nftables TPROXY / redirect (recommended first appliance prove)

- Bridge or route between NIC-A and NIC-B.
- `nft` / iptables: match `tcp dport {80,443}` (lab: high ports) → **TPROXY** or redirect to Helix listen.
- Helix proxies to the **original destination** (TPROXY preserves dest IP; REDIRECT needs careful original-dst recovery).
- Pros: matches Mode A nft helper experience; ops already used on GCE (`host-redirect-nft.sh` class).
- Cons: L3-aware divert on top of L2 story needs clear docs so operators don’t confuse “bridge” with “router.”

**Honest note:** A pure L2 bump that still enforces HTTP almost always becomes “bridge + selective L4 divert.” That is normal; claiming magic L2 HTTP parsing without divert is not.

### 2. TC (traffic control) + mirred / bpf classifier

- Attach filters on bridge ports; send matched packets to Helix or a ifb.
- Pros: fine-grained; good when nft alone fights the bridge path.
- Cons: harder to operate; save for when nft prove is green but sticky.

### 3. eBPF (XDP/TC) later

- Same job as (1)/(2): classify + redirect; nicer metrics later.
- **Not** required for first Mode B prove. BEGINNING already deferred eBPF past smoke.
- Still no custom out-of-tree module: use upstream-capable programs only when we adopt this.

### Explicit non-choice

- **Out-of-tree Helix kernel module** — no.
- **Custom Helix Linux distro / appliance OS** — no (container or static binary on stock Linux).
- **Customer NGFW NAT/VIP rewrite as the Mode B story** — no (that is Mode C homework; D4 forbids making it the product path).

---

## Relation to Mode A (host intercept)

| | Mode A | Mode B |
|-|--------|--------|
| Default product story | **Yes** — install on app host | Segment-wide when one box covers many servers |
| NGFW change | None | None (insert in wire / vSwitch) |
| Coverage | All traffic that hits **that host’s** listeners | Traffic that **crosses the appliance** |
| East–west | Per host / sidecar | Only if flows traverse the bridge |
| Code reuse | `helix-agent` + nft helper | Same DNA userspace; different **placement** + divert topology |
| Prefer when | One app / few hosts | Many servers, operator won’t touch each host yet |

**Build order stays:** Mode A hard redirect is the primary out-of-box path; Mode B is the site-wide augment. Do not stall Mode A for L2 polish.

Mode C (explicit VIP → Helix) remains lab/fallback only.

---

## Failure modes (honest)

| Failure | Enforce expectation | Operator risk |
|---------|---------------------|---------------|
| Helix userspace down, divert still active | Diverted HTTP **fails closed** (no silent allow) | Apps on diverted ports unreachable until Helix or divert is fixed |
| Helix down, divert removed / fail-open script | Traffic bridges like before Helix | Temporary loss of DNA protection — must be explicit ops, not default |
| DNA missing in enforce | Already fail closed (`HX-*`) | Same as Mode A/C |
| TLS mid-path, no keys (D1) | **Cannot** enforce DNA on ciphertext | Document; terminate or host-side cleartext |
| Non-diverted protocol | Kernel forward | No DNA claim — correct |
| Bridge loop / mis-cabling | Network outage | Dual-NIC runbooks + lab namespaces first |
| Cloud “dual-NIC” without true L2 | May degrade to L3 on-path VM | Still no NGFW NAT rewrite; topology doc per cloud |
| Partial segment (some servers bypass bridge) | Those servers unprotected | Inventory the insert point |

Silent allow of unknown HTTP on diverted ports remains forbidden (canon + D2).

---

## What we will NOT build

1. **Custom OS** / Helix-branded firewall distro  
2. **Production out-of-tree kernel modules**  
3. **NAT/VIP homework** for customer NGFW as the Mode B pitch (D4)  
4. **UEBA / signature WAF** on the bridge (D3)  
5. **Dependency on NGFW SSL inspection** (D1)  
6. **Replacing** the NGFW packet path for the whole enterprise  

Mode B is an **augment insert**, not a second firewall product.

---

## GCE prove sketch (no VM delete)

Preferred host: **agenticop-master** ([GCE.md](./GCE.md)). Do not delete protected instances.

### Phase 0 — already green locally

- `node scripts/bridge-smoke.mjs` → `BRIDGE_SMOKE_OK` (userspace placement).

### Phase 1 — namespace dual-NIC simulation (**landed**)

On GCE Linux, **no second VM required**. Entry points:

```bash
# Local Windows / no root → BRIDGE_L2_SMOKE_SKIP (honest)
npm run bridge-l2-smoke

# GCE Linux as root (after gce-sync):
bash scripts/gce-bridge-l2-smoke.sh   # → BRIDGE_L2_SMOKE_OK
# or: .\scripts\gce-sync.ps1 -WithL2
```

```text
ns-a (NGFW side)  --veth--  br0 in helix-ns  --veth--  ns-b (server)
                              │
                         nft divert PUBLIC→helix-bridge
                              │
                         upstream = server IP in ns-b
```

Prove tokens (landed in `gce-bridge-l2-smoke.sh`):

1. ICMP / non-HTTP TCP across bridge still works → `BRIDGE_L2_ICMP_OK`  
2. Learned HTTP path allows; `/api/backdoor` → **403** → `BRIDGE_L2_DNA_OK`  
3. Stop Helix with divert left on → diverted port **fails** (no silent allow) → `BRIDGE_L2_FAILCLOSED_OK`  
4. Teardown divert → ICMP + direct upstream restored → `BRIDGE_L2_TEARDOWN_OK`  
5. Composite → `BRIDGE_L2_SMOKE_OK`

Script: `scripts/gce-bridge-l2-smoke.sh` — root for netns/nft only; Helix stays Node userspace.

### Phase 2 — dual-iface appliance (NIC-A + NIC-B) (**landed**)

Phase 1 keeps the bridge in the host netns with a single helix veth. Phase 2 moves the **interface pair into the appliance namespace** — the topology Mode B actually claims:

```text
ns-a (NGFW/client)                 ns-helix (appliance)                 ns-b (server)
10.68.0.10/24                      NIC-A ── br0 ── NIC-B               10.68.0.20/24
     │                                │    +IP                         │
     └──────── veth ──────────────────┘    helix-bridge                └──── veth
                                           nft divert (Mode A pattern)
```

Locks for this slice:

- **No VM deletes** — lab uses netns on **agenticop-master** (or any stock Linux root). Do not attach/delete protected GCE instances for this prove.
- **helix-bridge** remains the DNA worker (same engine as Mode A/C; `placement: 'bridge'`).
- **nft** redirect reuses Mode A patterns (`prerouting`/`output` → Helix listen). No DNA fork.
- **D5** — protect path is DNA-only; no CWL required for this smoke.
- **Honest divert scope** — client hits **appliance br0 IP** on the public port (on-path L3 hop on the dual-iface box). Full transparent bridge-nf divert of `daddr=server` is a later deepen, not required for Phase 2 green.
- **Windows / no root** — `npm run bridge-l2-p2-smoke` → `BRIDGE_L2_P2_SMOKE_SKIP` with reason (not a fake green).

Entry points:

```bash
# Local Windows / no root → BRIDGE_L2_P2_SMOKE_SKIP (honest)
npm run bridge-l2-p2-smoke

# GCE Linux as root (after sync):
bash scripts/gce-bridge-l2-p2-smoke.sh   # → BRIDGE_L2_P2_SMOKE_OK
# or: .\scripts\gce-sync.ps1 -WithL2P2
```

Prove tokens (`gce-bridge-l2-p2-smoke.sh`):

1. NIC-A + NIC-B exist and share `br0` master → `BRIDGE_L2_P2_IFACE_OK`  
2. ICMP client → server across appliance → `BRIDGE_L2_P2_CROSS_OK`  
3. Mode A-style nft divert installed → `BRIDGE_L2_P2_DIVERT_OK`  
4. Learned HTTP allows; `/api/backdoor` → **403** via appliance public port → `BRIDGE_L2_P2_DNA_OK`  
5. Composite → `BRIDGE_L2_P2_SMOKE_OK`

Optional hardware second NIC (same checks, still no deletes): attach an extra NIC to a lab VM or use a non-protected scratch instance if one exists — never `gcloud compute instances delete` on **agenticop-master** / **fusion-lab**.

### Sync

- Phase 1: `scripts/gce-sync.ps1 -WithL2`  
- Phase 2: `scripts/gce-sync.ps1 -WithL2P2` (implies CWL pack like `-WithL2`; does not break `SMOKE_OK` / `NFT_SMOKE_OK`)

---

## Recommended next code slice (small, non-dangerous)

**Phase 1 deepen + Phase 2 dual-iface landed.**

When coding further Mode B:

1. **Keep** `helix-bridge` as the userspace DNA worker.  
2. **Reuse** Mode A nft patterns; do not fork DNA logic.  
3. **Defer** TC/eBPF and transparent `br_netfilter` divert until Phase 2 stays boring on GCE.  
4. **Ops:** customer shadow soak remains live-traffic only ([SOAK.md](./SOAK.md)) — never fake soak traffic in lab smokes.

That is the straight line from spike → honest appliance path without inventing an OS.

---

## Operator one-liner

**Keep your firewall and server IPs. Put Helix in the wire (dual-NIC / vSwitch). Kernel forwards; Helix enforces DNA on the HTTP hop it can see.**
