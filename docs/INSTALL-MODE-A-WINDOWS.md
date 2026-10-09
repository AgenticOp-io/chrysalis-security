# Helix Mode A on Windows — security app

**Product:** Helix for Windows — DNA firewall with a system tray and control panel.  
**Engine:** same `helix-agent` as Linux Mode A ([INSTALL-MODE-A.md](./INSTALL-MODE-A.md)).  
**Audience:** everyday operators — **no CLI required** for daily use.  
**CWL:** optional bridge only (**D5**).  
**Full Secure map:** [HELIX-SECURITY-SURFACE.md](./HELIX-SECURITY-SURFACE.md).

```text
Your browser / clients  →  http://THIS-PC:4080  (Helix front door)
                                ↓
                        localhost app (demo or yours)
```

Helix is **not** a whole-PC scanner. Only traffic through the front door is learned and checked.

## Everyday path (recommended)

1. Install + start + tray (elevated once for the startup task):

```powershell
npm run helix-win -- install --start --tray
```

2. Open the control panel: [http://127.0.0.1:4080/](http://127.0.0.1:4080/)  
   - Or tray → **Open control panel** / **Protect an app…**

3. **Generate traffic** through Helix (sample buttons, or use your app via `:4080`).

4. Click **Lock DNA** (or wait for auto-lock after ~12 requests when `HELIX_AUTO_SEAL_AFTER=12`).

5. Helix switches to **watching** (shadow). Review holes in the panel.

6. When the hole list is boring, click **Start blocking** (enforce).

Tray shortcuts: Protect an app… · Lock DNA · Start blocking · Start/Stop Helix.

## Protect an app (wizard)

Tray → **Protect an app…** or:

```powershell
npm run helix-win -- setup
```

| Choice | What happens |
| --- | --- |
| **Sample app** | Starts bundled demo API, Helix on `:4080`, auto-learn + auto-seal ready |
| **Local listening port** | Guides you to move the app to a private localhost port; Helix stays the front door on `:4080` |

You do **not** hand-edit env files for the normal path. Advanced ops can still edit `%ProgramData%\Helix\helix-agent.env`.

## What gets installed

| Piece | Path |
| --- | --- |
| Install / uninstall | `deploy/windows/install.ps1` · `uninstall.ps1` |
| Agent runner | `deploy/windows/run-agent.ps1` (optional demo auto-start) |
| Protect wizard | `deploy/windows/Protect-Wizard.ps1` |
| System tray | `deploy/windows/HelixTray.ps1` |
| Env | `%ProgramData%\Helix\helix-agent.env` |
| CLI (optional) | `npm run helix-win -- …` |
| Control panel | `http://127.0.0.1:4080/` |

Startup task: **HelixAgent**. nft redirect stays Linux-only.

## Panel actions (no promote CLI)

| Button | API | Effect |
| --- | --- | --- |
| Lock DNA | `POST /__helix/api/seal` | Learn observations → certified DNA → **shadow** |
| Start watching | `POST /__helix/api/mode` `{mode:shadow}` | Alert only |
| Start blocking | `POST /__helix/api/mode` `{mode:enforce}` | Fail closed |

Auto-seal: set `HELIX_AUTO_SEAL_AFTER=12` (default in the Windows env example).

## Prove

```bash
npm run windows-app-smoke   # → WINDOWS_APP_SMOKE_OK
npm run seal-smoke          # → SEAL_SMOKE_OK (panel lock path)
```

## Uninstall

```powershell
npm run helix-win -- uninstall
# or: uninstall -RemoveData
```
