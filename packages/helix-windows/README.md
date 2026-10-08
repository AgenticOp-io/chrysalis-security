# `@chrysalis/helix-windows` (in-tree)

Helix for Windows — Mode A host agent install + system tray + CLI.

- Docs: [`docs/INSTALL-MODE-A-WINDOWS.md`](../../docs/INSTALL-MODE-A-WINDOWS.md)
- Engine: `packages/helix-agent` (same DNA firewall as Linux)
- Panel: `/__helix/` (no second UI invent)

```bash
npm run helix-win -- install --start --tray
npm run helix-win -- status
npm run windows-app-smoke
```
