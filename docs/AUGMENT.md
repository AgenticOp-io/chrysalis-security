# Helix + existing firewalls — augment, don’t re-route

Goal: Helix works **with** almost any NGFW / edge firewall **without** asking operators to rewrite that box’s NAT, VIP, or policy routes. It must cover **external (north–south)** and **internal (east–west)** traffic.

The new part is **DNA trust-nothing**. The path part should use boring intercept patterns every network already understands.

## One principle

```text
NGFW / router keeps owning packets, VPN, IPS, geo, NAT.
Helix owns app identity on the HTTP(S) hop — by intercepting
as close to the app as possible (or transparently in front of it).
```

**Do not** require: “change FortiGate VIP to Helix.”  
**Do** prefer: “install Helix where the app already receives traffic.”

## How we avoid NGFW NAT / routing edits

| Mode | What changes on the NGFW? | How Helix sees traffic |
|------|---------------------------|-------------------------|
| **A. Host intercept (default target)** | **Nothing** | On the app server (or sidecar): redirect local listeners → Helix → app on localhost |
| **B. Transparent bridge / bump-in-wire** | **Nothing** (same L3 IPs) | Helix appliance/VM sits in the vSwitch/cable path; forwards all frames, enforces HTTP |
| **C. Explicit reverse proxy** | One VIP/upstream change | What we built first — fine when they’ll point at Helix |

**A and B = “augment without NAT homework.”**  
**C = simplest code path; keep as fallback / lab.**

## Mode A — Host intercept (covers most “all traffic to this app”)

Works behind **any** upstream firewall because that firewall still targets the **same server IP**.

```text
Internet / LAN
    → any NGFW / LB / router (unchanged)
        → app host :443/:80
            → [iptables/nftables TPROXY or redirect | eBPF]
                → Helix (DNA learn/shadow/enforce)
                    → app on 127.0.0.1:PORT
```

- **External** traffic hits the host as today → Helix sees it.  
- **Internal** traffic to that host’s service IP/port → Helix sees it too (same redirect).  
- East–west between two services: put Helix on **each** host (or each pod sidecar).

This is how you “intercept all traffic” to an app **without** touching FortiGate / Palo / ASA policies.

### Host intercept mechanisms (pick boring ones)

1. **nftables / iptables REDIRECT or TPROXY** on the app host (HTTP cleartext or after local TLS terminate)  
2. **eBPF** redirect (same idea, nicer ops later)  
3. **Sidecar container** in the pod; mesh/CNI sends pod traffic to sidecar first  
4. **Systemd socket / reverse proxy on :443** bound publicly; app bound only on localhost (soft intercept — still no NGFW change)

## Mode B — Transparent bridge appliance (site-wide, still no VIP rewrite)

```text
NGFW inside port  →  Helix bridge  →  server VLAN
```

- Helix does **not** become the NAT owner.  
- Same server IPs, same firewall policies.  
- Insert at vSwitch / pair of interfaces / cloud “appliance in path.”  
- Enforces when it can parse HTTP; bridges everything else (or fails per policy).

Use when you want one box for many servers and still won’t edit NGFW rules.

## Mode C — Explicit proxy (already shipping)

```text
NGFW → Helix VIP → app
```

Requires a target change on the NGFW/LB. Keep for demos, simple SaaS, and operators who prefer an obvious hop.

---

## “All possible” firewalls — same augment recipe

We don’t write a special Fortinet module per vendor. We classify by **role**, then attach Helix with A or B.

### Edge / NGFW / UTM (north–south)

Examples of the *class* (not an exclusive list):

- Fortinet FortiGate  
- Palo Alto Networks NGFW  
- Cisco Firepower / ASA  
- Check Point  
- Juniper SRX  
- Sophos / Stormshield / WatchGuard / SonicWall / Barracuda  
- pfSense / OPNsense / IPFire  
- Cloud: AWS Network Firewall, Azure Firewall, GCP Cloud NGFW, Cloudflare Magic/Spectrum (edge)

**Augment:** Mode **A** on workloads and/or Mode **B** on the segment behind them. NGFW keeps IPS/VPN/NAT.

### Load balancers / ADC (often where VIP lives)

- F5, Citrix ADC, HAProxy, nginx, Envoy, AWS ALB/NLB, GCP URL map, Azure App Gateway  

**Augment:** Prefer Helix **behind** the LB on the real pool members (Mode A) so LB pools don’t change. Or Mode C only if they’ll retarget the pool to Helix.

### Host firewalls

- firewalld, ufw, Windows Firewall, cloud security groups  

**Augment:** Helix host agent cooperates; security groups still allow 80/443 to the instance — no new DNAT on the NGFW.

### Service mesh / Kubernetes

- Istio, Linkerd, Cilium, nginx ingress  

**Augment:** Helix as **sidecar** or CNI-aware listener (Mode A). East–west covered per pod.

### “We already have a WAF”

- Cloudflare WAF, AWS WAF, ModSecurity, FortiWeb, F5 ASM  

**Augment:** Leave them on. Helix adds **identity DNA** after or beside them — complementary (not a signature rival).

---

## Internal + external = where Helix must sit

| Traffic | Meaning | Helix coverage |
|---------|---------|----------------|
| **External** | Internet / partners → DMZ → app | Host agent on DMZ/app servers, or bridge behind edge NGFW |
| **Internal** | App ↔ app, user LAN ↔ app, admin tools | Same host agent on every service you care about; optional bridge on server VLAN |

“Intercept all traffic” in product language means:

**Every flow that reaches a protected app process goes through Helix on that host (or through a transparent bridge in front of that segment).**  

It does **not** mean Helix replaces the NGFW’s packet path for the whole enterprise.

---

## TLS reality (honest) — locked D1

**Do not rely on NGFW SSL inspection.** See [DECISIONS.md](./DECISIONS.md).

| Situation | Can Helix enforce DNA? |
|-----------|-------------------------|
| HTTP cleartext to app | Yes |
| TLS terminated on host / sidecar, Helix sees HTTP | Yes (**default**) |
| Helix terminates TLS | Optional later |
| TLS mid-path without keys | **No** |
| NGFW decrypt-and-forward | Bonus only — **never required** |

Default product story: **Helix on the host after TLS (or HTTP).**

---

## Trust-nothing still holds

1. No certified DNA → deny (enforce)  
2. DNA from traffic, not hope  
3. Change guilty until promoted  

Intercept only answers **how packets arrive**. DNA answers **whether they may pass**.

---

## Build order (straight line)

1. **Done:** Mode C explicit reverse proxy + smoke  
2. **Done (soft Mode A):** `helix-agent` binds public port → app on localhost (NGFW unchanged)  
3. **Next:** nftables/TPROXY helper on GCE Linux for hard redirect  
4. **Then:** Mode B bridge image · K8s sidecar  

Vendor logo slides = “works behind any of these” using Mode A/B — not “certified FortiGate firmware plugin.”

## Operator one-liner

**Keep your firewall. Install Helix on the app (or in the wire). We intercept there — you don’t rewrite NAT.**
