# Helix Mode A on Windows — native desktop app

**Product:** Helix for Windows — a real desktop app (`Helix.exe`) that protects automatically.  
**Engine:** same `helix-agent` DNA firewall as Linux.  
**Not:** a browser admin console as the primary UI (panel still exists for power users).  
**CWL:** optional (**D5**).

## What “automatic” means

When you open **Helix** from the Start Menu it:

1. Writes Mode A settings under `%ProgramData%\Helix\`
2. Starts the DNA agent + bundled demo app if needed
3. Generates normal traffic through the front door
4. **Locks DNA** from that traffic
5. Switches to **enforce** (blocks unknown surface)
6. Proves a backdoor probe gets **403**
7. Stays in the system tray

You do not run CLI promote/shadow commands for the default path.

```text
Helix.exe (native WinForms)
    -> helix-agent :4080
         -> demo API :4090 (or your APP_UPSTREAM)
```

## Install

```powershell
npm run helix-win -- install --start --desktop
# or:
npm run helix-win -- app
```

Creates:

| Piece | Location |
| --- | --- |
| Desktop app | `deploy/windows/HelixApp/Helix.exe` |
| Start Menu | Programs → **Helix** |
| Startup (optional) | Scheduled task `HelixDesktop` |
| Agent task | `HelixAgent` |
| Data / DNA | `%ProgramData%\Helix\` |

Build alone (no Visual Studio — uses .NET Framework `csc`):

```powershell
npm run helix-win -- build-app
# -> HELIX_DESKTOP_BUILD_OK
```

## Everyday use

1. Open **Helix** (Start Menu or `npm run helix-win -- app`)
2. Watch the progress: Starting → Learning → Locking → Protected
3. Close the window to tray (protection keeps running)
4. **Protect now** runs the full pipeline again
5. **Block unknown surface** forces enforce if you stepped back to watching

## Honest scope

Helix still protects **one front door** (default `:4080` → localhost app), not every packet on the PC. The desktop app removes operator homework for that path; it does not invent whole-OS DPI.

## Prove

```bash
npm run helix-desktop-smoke   # -> WINDOWS_DESKTOP_SMOKE_OK
npm run windows-app-smoke
npm run seal-smoke
```

## Uninstall

```powershell
npm run helix-win -- uninstall
```
