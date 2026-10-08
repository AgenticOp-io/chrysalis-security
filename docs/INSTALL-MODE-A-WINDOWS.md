# Helix Mode A on Windows — security app

**Product:** Helix for Windows — host DNA firewall with a system tray and the existing `/__helix/` control panel.  
**Engine:** same `helix-agent` as Linux Mode A ([INSTALL-MODE-A.md](./INSTALL-MODE-A.md)). No second security invent.  
**CWL:** optional bridge only (**D5**). Traffic DNA protects out of the box.  
**Full Secure map:** [HELIX-SECURITY-SURFACE.md](./HELIX-SECURITY-SURFACE.md).

```text
Internet / LAN → this host :LISTEN_PORT (Helix)
                      ↓
              127.0.0.1:APP_PORT (your app)
```

NGFW VIP/NAT stays pointed at the Windows host (D4).

## What you get

| Piece | Path |
| --- | --- |
| Install / uninstall | `deploy/windows/install.ps1` · `uninstall.ps1` |
| Agent runner | `deploy/windows/run-agent.ps1` |
| System tray | `deploy/windows/HelixTray.ps1` |
| Env template | `deploy/windows/helix-agent.env.example` → `%ProgramData%\Helix\helix-agent.env` |
| CLI | `npm run helix-win -- …` (`packages/helix-windows`) |
| Control panel | `http://127.0.0.1:4080/` (same panel as Linux) |

Startup uses a **Scheduled Task** (`HelixAgent`) — honest Windows host persistence without inventing a custom kernel driver. Linux nft redirect stays Linux-only (`NFT_SMOKE_SKIP` on Win32).

## Install

From the `chrysalis-security` repo (Node ≥ 22 on PATH):

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\install.ps1 -Start -Tray
# or:
npm run helix-win -- install --start --tray
```

Edit `%ProgramData%\Helix\helix-agent.env`:

1. `APP_UPSTREAM=http://127.0.0.1:<your-app-port>`
2. Bind your app to **localhost only**
3. `MODE=learn` → collect traffic → `npm run helix -- promote …` → `shadow` → `enforce`

Optional tray at every logon:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\install.ps1 -RegisterTrayAtLogon -Tray
```

## Tray menu

- Open control panel / attack proof page  
- Start / Stop Helix  
- Live status (running + mode from env)

Double-click the shield icon → panel.

## CLI

```bash
npm run helix-win -- status
npm run helix-win -- open-panel
npm run helix-win -- start
npm run helix-win -- stop
npm run helix-win -- tray
npm run helix-win -- uninstall
```

## Prove

```bash
npm run windows-app-smoke
# → WINDOWS_APP_SMOKE_OK on Windows
# → WINDOWS_APP_SMOKE_SKIP on non-Windows (honest)
```

## Lab vs product

| Path | Use |
| --- | --- |
| `npm run local-lab` + `local-lab-windows-start.ps1` | Desktop fixture flip (demo/real-site) |
| `deploy/windows/install.ps1` | **Product** Mode A on this host for a real localhost app |

Customer soak → enforce remains operator-only ([SOAK.md](./SOAK.md)).

## Uninstall

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\uninstall.ps1
# DNA kept unless: -RemoveData
```
