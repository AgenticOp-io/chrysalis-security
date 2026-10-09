/**
 * Prove Helix native desktop app builds on Windows.
 * WINDOWS_DESKTOP_SMOKE_OK / WINDOWS_DESKTOP_SMOKE_SKIP
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(root, 'deploy', 'windows', 'HelixApp');
const required = ['HelixApp.cs', 'build.ps1', 'launch.ps1'].map((n) => path.join(appDir, n));
const missing = required.filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2));
  process.exit(1);
}

if (process.platform !== 'win32') {
  console.log(
    JSON.stringify({
      kind: 'chrysalis.helix.windows-desktop.smoke',
      ok: true,
      skip: true,
      token: 'WINDOWS_DESKTOP_SMOKE_SKIP',
    }),
  );
  console.log('WINDOWS_DESKTOP_SMOKE_SKIP');
  process.exit(0);
}

const build = spawnSync(
  'powershell.exe',
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(appDir, 'build.ps1'), '-OutDir', appDir],
  { cwd: root, encoding: 'utf8' },
);
if (build.status !== 0) {
  console.error(build.stdout || build.stderr);
  process.exit(build.status ?? 1);
}
const exe = path.join(appDir, 'Helix.exe');
if (!fs.existsSync(exe)) {
  console.error('Helix.exe missing after build');
  process.exit(1);
}

console.log(
  JSON.stringify({
    kind: 'chrysalis.helix.windows-desktop.smoke',
    ok: true,
    token: 'WINDOWS_DESKTOP_SMOKE_OK',
    exe,
    bytes: fs.statSync(exe).size,
  }),
);
console.log('WINDOWS_DESKTOP_SMOKE_OK');
