#!/usr/bin/env node
/**
 * Helix for Windows — CLI surface for Mode A install / tray / panel.
 * Does not invent a second firewall; wraps deploy/windows + helix-agent.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const winDir = path.join(root, 'deploy', 'windows');
const dataDir = process.env.PROGRAMDATA
  ? path.join(process.env.PROGRAMDATA, 'Helix')
  : path.join(root, 'data', 'helix-windows');
const envFile = path.join(dataDir, 'helix-agent.env');
const panelUrl = process.env.HELIX_PANEL_URL || 'http://127.0.0.1:4080/';

function usage() {
  console.log(`Helix for Windows — native desktop app (auto-protect)

  npm run helix-win -- install --start --desktop
  npm run helix-win -- app            # build + launch Helix.exe (fully automatic)
  npm run helix-win -- build-app      # compile Helix.exe only
  npm run helix-win -- start | stop | status
  npm run helix-win -- uninstall [--remove-data]

Open Helix from the Start Menu — it starts the agent, learns, locks DNA, and blocks.
Docs: docs/INSTALL-MODE-A-WINDOWS.md
`);
}

function isWindows() {
  return process.platform === 'win32';
}

function ps(scriptName, extraArgs = [], opts = {}) {
  const script = path.join(winDir, scriptName);
  const args = [
    '-NoProfile',
    '-WindowStyle',
    'Hidden',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    script,
    ...extraArgs,
  ];
  const r = spawnSync('powershell.exe', args, {
    cwd: root,
    stdio: opts.inherit ? 'inherit' : 'pipe',
    windowsHide: true,
    encoding: 'utf8',
  });
  if (!opts.inherit) {
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
  }
  return r.status ?? 1;
}

function flag(argv, name) {
  return argv.includes(name);
}

function opt(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function readMode() {
  if (!fs.existsSync(envFile)) return null;
  const m = fs.readFileSync(envFile, 'utf8').match(/^\s*MODE\s*=\s*(\S+)/m);
  return m ? m[1] : null;
}

function healthz() {
  return new Promise((resolve) => {
    const url = new URL('__helix/healthz', panelUrl.endsWith('/') ? panelUrl : `${panelUrl}/`);
    const req = http.get(url, { timeout: 2000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function status() {
  const installed = fs.existsSync(envFile);
  const mode = readMode();
  const up = await healthz();
  const marker = path.join(dataDir, 'install.json');
  let install = null;
  if (fs.existsSync(marker)) {
    try {
      install = JSON.parse(fs.readFileSync(marker, 'utf8'));
    } catch {
      install = null;
    }
  }
  const out = {
    kind: 'chrysalis.helix.windows.status',
    platform: process.platform,
    installed,
    mode,
    agentUp: up,
    panel: panelUrl,
    dataDir,
    envFile,
    helixRoot: install?.helixRoot || root,
  };
  console.log(JSON.stringify(out, null, 2));
  if (up) console.log('HELIX_WINDOWS_UP');
  else if (installed) console.log('HELIX_WINDOWS_INSTALLED');
  else console.log('HELIX_WINDOWS_NOT_INSTALLED');
  return 0;
}

function openPanel() {
  if (isWindows()) {
    spawnSync('cmd', ['/c', 'start', '', panelUrl], { stdio: 'ignore' });
  } else {
    console.log(panelUrl);
  }
  return 0;
}

function tray() {
  if (!isWindows()) {
    console.error('Tray requires Windows');
    return 2;
  }
  // Prefer the native desktop app (no PowerShell window).
  const exe = path.join(winDir, 'HelixApp', 'Helix.exe');
  if (fs.existsSync(exe)) {
    spawn(exe, [], {
      cwd: root,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, HELIX_ROOT: root },
    }).unref();
    console.log('HelixTray started (desktop app)');
    return 0;
  }
  const script = path.join(winDir, 'HelixTray.ps1');
  spawn(
    'powershell.exe',
    ['-NoProfile', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', script, '-HelixRoot', root],
    { cwd: root, detached: true, stdio: 'ignore', windowsHide: true },
  ).unref();
  console.log('HelixTray started');
  return 0;
}

function startStop(cmd) {
  if (!isWindows()) {
    console.error(`${cmd} requires Windows`);
    return 2;
  }
  const r = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      cmd === 'start'
        ? "Start-ScheduledTask -TaskName 'HelixAgent' -ErrorAction Stop"
        : "Stop-ScheduledTask -TaskName 'HelixAgent' -ErrorAction SilentlyContinue; Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -match 'helix-agent' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
    ],
    { stdio: 'inherit' },
  );
  return r.status ?? 1;
}

async function main(argv) {
  const cmd = argv[0] || 'help';
  if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
    usage();
    return 0;
  }
  if (cmd === 'status') return status();
  if (cmd === 'open-panel') return openPanel();
  if (cmd === 'tray') return tray();
  if (cmd === 'start' || cmd === 'stop') return startStop(cmd);

  if (cmd === 'app' || cmd === 'desktop') {
    if (!isWindows()) {
      console.error('app requires Windows');
      return 2;
    }
    const buildCode = ps(path.join('HelixApp', 'build.ps1'), []);
    if (buildCode !== 0) return buildCode;
    const exe = path.join(winDir, 'HelixApp', 'Helix.exe');
    spawn(exe, [], {
      cwd: root,
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
      env: { ...process.env, HELIX_ROOT: root },
    }).unref();
    console.log('HELIX_DESKTOP_LAUNCH_OK');
    return 0;
  }

  if (cmd === 'build-app') {
    if (!isWindows()) {
      console.error('build-app requires Windows');
      return 2;
    }
    return ps(path.join('HelixApp', 'build.ps1'), []);
  }

  if (cmd === 'setup' || cmd === 'protect') {
    if (!isWindows()) {
      console.error('setup requires Windows');
      return 2;
    }
    const args = ['-HelixRoot', root];
    if (flag(argv, '--demo')) args.push('-SilentDemo');
    return ps('Protect-Wizard.ps1', args);
  }

  if (cmd === 'seal') {
    return new Promise((resolve) => {
      const url = new URL('__helix/api/seal', panelUrl.endsWith('/') ? panelUrl : `${panelUrl}/`);
      const req = http.request(
        url,
        { method: 'POST', headers: { 'content-type': 'application/json' } },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            console.log(body);
            if (res.statusCode === 200) console.log('HELIX_SEAL_OK');
            resolve(res.statusCode === 200 ? 0 : 1);
          });
        },
      );
      req.on('error', (err) => {
        console.error(String(err.message || err));
        resolve(1);
      });
      req.end(JSON.stringify({ mode: 'shadow' }));
    });
  }

  if (!isWindows() && (cmd === 'install' || cmd === 'uninstall')) {
    console.error(`${cmd} requires Windows (platform=${process.platform})`);
    return 2;
  }

  if (cmd === 'install') {
    const args = [`-HelixRoot`, root];
    if (flag(argv, '--start')) args.push('-Start');
    if (flag(argv, '--tray')) args.push('-Tray');
    if (flag(argv, '--desktop')) args.push('-Desktop');
    if (flag(argv, '--register-tray')) args.push('-RegisterTrayAtLogon');
    if (flag(argv, '--setup')) args.push('-Setup');
    const mode = opt(argv, '--mode');
    if (mode) args.push('-Mode', mode);
    // Default install launches the native desktop app when --start is set.
    if (flag(argv, '--start') && !flag(argv, '--tray') && !flag(argv, '--setup')) {
      if (!flag(argv, '--desktop')) args.push('-Desktop');
    }
    return ps('install.ps1', args);
  }

  if (cmd === 'uninstall') {
    const args = [];
    if (flag(argv, '--remove-data')) args.push('-RemoveData');
    return ps('uninstall.ps1', args);
  }

  usage();
  return 2;
}

const code = await main(process.argv.slice(2));
process.exit(code);
