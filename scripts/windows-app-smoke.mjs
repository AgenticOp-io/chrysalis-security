#!/usr/bin/env node
/**
 * Prove Helix for Windows packaging is present and the CLI status path works.
 * Full service start is operator/install — this smoke does not bind :4080 or invent traffic.
 *
 * Windows → WINDOWS_APP_SMOKE_OK
 * Other OS → WINDOWS_APP_SMOKE_SKIP (honest)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'docs/INSTALL-MODE-A-WINDOWS.md',
  'deploy/windows/install.ps1',
  'deploy/windows/uninstall.ps1',
  'deploy/windows/run-agent.ps1',
  'deploy/windows/HelixTray.ps1',
  'deploy/windows/Protect-Wizard.ps1',
  'deploy/windows/helix-agent.env.example',
  'packages/helix-windows/bin/helix-win.mjs',
  'packages/helix-agent/bin/helix-agent.mjs',
];

const missing = required.filter((rel) => !fs.existsSync(path.join(root, rel)));
if (missing.length) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2));
  process.exit(1);
}

if (process.platform !== 'win32') {
  console.log(
    JSON.stringify(
      {
        kind: 'chrysalis.helix.windows-app.smoke',
        ok: true,
        skip: true,
        token: 'WINDOWS_APP_SMOKE_SKIP',
        reason: `platform=${process.platform}; Windows install/tray not exercised`,
        files: required.length,
      },
      null,
      2,
    ),
  );
  console.log('WINDOWS_APP_SMOKE_SKIP');
  process.exit(0);
}

const cli = path.join(root, 'packages/helix-windows/bin/helix-win.mjs');
const status = spawnSync(process.execPath, [cli, 'status'], { cwd: root, encoding: 'utf8' });
if (status.status !== 0) {
  console.error(status.stdout || status.stderr);
  process.exit(status.status ?? 1);
}

const help = spawnSync(process.execPath, [cli, 'help'], { cwd: root, encoding: 'utf8' });
if (help.status !== 0 || !String(help.stdout).includes('Helix for Windows')) {
  console.error('helix-win help failed');
  process.exit(1);
}

// Syntax-check PowerShell installers without mutating the host
for (const name of ['install.ps1', 'uninstall.ps1', 'run-agent.ps1', 'HelixTray.ps1', 'Protect-Wizard.ps1']) {
  const script = path.join(root, 'deploy', 'windows', name);
  const chk = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `$ste = $null; [void][System.Management.Automation.Language.Parser]::ParseFile('${script.replace(/'/g, "''")}', [ref]$null, [ref]$ste); if ($ste) { $ste | ForEach-Object { $_.ToString() }; exit 1 }`,
    ],
    { encoding: 'utf8' },
  );
  if (chk.status !== 0) {
    console.error(`PowerShell parse failed: ${name}`);
    console.error(chk.stdout || chk.stderr);
    process.exit(1);
  }
}

console.log(
  JSON.stringify(
    {
      kind: 'chrysalis.helix.windows-app.smoke',
      ok: true,
      token: 'WINDOWS_APP_SMOKE_OK',
      files: required.length,
      cliStatusExit: status.status,
    },
    null,
    2,
  ),
);
console.log('WINDOWS_APP_SMOKE_OK');
