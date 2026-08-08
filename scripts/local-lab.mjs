#!/usr/bin/env node
/**
 * Operator helper for the Windows/desktop Helix lab (data/local-run).
 *
 *   npm run local-lab -- status
 *   npm run local-lab -- promote [--key secret] [--key-id lab]
 *   npm run local-lab -- start --mode learn|shadow|enforce
 *   npm run local-lab -- prove
 *
 * Does not replace soak on a real app — flips the local demo when learn looks complete.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { reportDna, assessReadiness } from '../packages/dna-core/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.env.HELIX_LOCAL_RUN_DIR
  ? path.resolve(process.env.HELIX_LOCAL_RUN_DIR)
  : path.join(root, 'data', 'local-run');
const listenPort = Number(process.env.HELIX_LOCAL_PORT || 4080);
const demoPort = Number(process.env.HELIX_LOCAL_DEMO_PORT || 4090);
const obsPath = path.join(dir, 'observations.ndjson');
const draftPath = path.join(dir, 'draft.dna.json');
const dnaPath = path.join(dir, 'app.dna.json');
const siemPath = path.join(dir, 'siem.ndjson');
const shadowPath = path.join(dir, 'shadow.ndjson');
const pidPath = path.join(dir, 'pids.json');

function usage() {
  console.log(`Helix local lab

  npm run local-lab -- status
  npm run local-lab -- promote [--key <secret>] [--key-id lab]
  npm run local-lab -- start --mode learn|shadow|enforce [--kill]
  npm run local-lab -- prove

Data: ${dir}
Panel: http://127.0.0.1:${listenPort}/
`);
}

function flag(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function hasFlag(argv, name) {
  return argv.includes(name);
}

function countLines(p) {
  if (!fs.existsSync(p)) return 0;
  const t = fs.readFileSync(p, 'utf8').trim();
  if (!t) return 0;
  return t.split(/\r?\n/).filter(Boolean).length;
}

function get(urlPath) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: '127.0.0.1', port: listenPort, path: urlPath, timeout: 2000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {
          /* ignore */
        }
        resolve({ ok: res.statusCode === 200, status: res.statusCode, json, body });
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: String(e.message || e) }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

function helixCli(args) {
  const r = spawnSync(process.execPath, ['packages/helix-cli/bin/helix.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function killPortListeners(ports) {
  if (process.platform === 'win32') {
    for (const port of ports) {
      const out = spawnSync(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
        ],
        { encoding: 'utf8' },
      );
      if (out.stderr) process.stderr.write(out.stderr);
    }
    return;
  }
  for (const port of ports) {
    spawnSync('bash', ['-lc', `fuser -k ${port}/tcp 2>/dev/null || true`], { encoding: 'utf8' });
  }
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === '-h' || cmd === '--help') {
  usage();
  process.exit(0);
}

fs.mkdirSync(dir, { recursive: true });

if (cmd === 'status') {
  const hz = await get('/__helix/healthz');
  const api = await get('/api/health');
  const backdoor = await get('/api/backdoor');
  const obs = countLines(obsPath);
  const status = {
    at: new Date().toISOString(),
    working: Boolean(hz.ok && api.ok),
    mode: hz.json?.mode || null,
    dna: hz.json?.dna || false,
    routes: hz.json?.routes || 0,
    observations: obs,
    siem_holes: countLines(siemPath),
    dna_file: fs.existsSync(dnaPath) ? dnaPath : null,
    backdoor_status: backdoor.status,
    panel: `http://127.0.0.1:${listenPort}/`,
    next:
      !hz.json?.dna && obs >= 2
        ? 'npm run local-lab -- promote'
        : hz.json?.mode === 'learn' && hz.json?.dna
          ? 'npm run local-lab -- start --mode shadow --kill'
          : hz.json?.mode === 'shadow'
            ? 'soak, then: npm run local-lab -- start --mode enforce --kill'
            : hz.json?.mode === 'enforce'
              ? 'prove: npm run local-lab -- prove'
              : 'keep learning (hit /api/health, /api/items) or start: npm run local-lab -- start --mode learn',
  };
  if (fs.existsSync(dnaPath)) {
    const dna = JSON.parse(fs.readFileSync(dnaPath, 'utf8'));
    status.report = reportDna(dna, { observations: obs });
    status.ready_shadow = assessReadiness('shadow', dna, { minRoutes: 1 });
    status.ready_enforce = assessReadiness('enforce', dna, {
      minRoutes: 1,
      shadowHoles: countLines(shadowPath) || countLines(siemPath),
      maxShadowHoles: 0,
    });
  }
  fs.writeFileSync(path.join(dir, 'status.json'), JSON.stringify(status, null, 2) + '\n');
  console.log(JSON.stringify(status, null, 2));
  process.exit(status.working || status.dna_file ? 0 : 1);
}

if (cmd === 'promote') {
  if (!fs.existsSync(obsPath) || countLines(obsPath) < 1) {
    console.error(`No observations at ${obsPath}. Run lab in learn and hit /api/health first.`);
    process.exit(1);
  }
  helixCli(['learn', '--in', obsPath, '--out', draftPath, '--app-id', 'local-lab']);
  const key = flag(rest, '--key') || process.env.HELIX_DNA_KEY || 'local-lab-key';
  const keyId = flag(rest, '--key-id') || process.env.HELIX_DNA_KEY_ID || 'local-lab';
  const promoteArgs = [
    'promote',
    '--in',
    draftPath,
    '--out',
    dnaPath,
    '--key',
    key,
    '--key-id',
    keyId,
  ];
  helixCli(promoteArgs);
  helixCli(['report', '--in', dnaPath]);
  helixCli(['ready', '--in', dnaPath, '--target', 'shadow', '--min-routes', '1']);
  console.log(`
Next:
  npm run local-lab -- start --mode shadow --kill
  # soak / poke panel, then:
  npm run local-lab -- start --mode enforce --kill
  npm run local-lab -- prove
`);
  process.exit(0);
}

if (cmd === 'start') {
  const mode = flag(rest, '--mode') || 'learn';
  if (!['learn', 'shadow', 'enforce'].includes(mode)) {
    console.error('start --mode learn|shadow|enforce');
    process.exit(1);
  }
  if ((mode === 'shadow' || mode === 'enforce') && !fs.existsSync(dnaPath)) {
    console.error(`MODE=${mode} needs ${dnaPath} — run: npm run local-lab -- promote`);
    process.exit(1);
  }
  if (hasFlag(rest, '--kill')) {
    killPortListeners([listenPort, demoPort]);
    await new Promise((r) => setTimeout(r, 500));
  }

  const demo = spawn(process.execPath, ['fixtures/demo-api/server.mjs'], {
    cwd: root,
    env: { ...process.env, PORT: String(demoPort), HOST: '127.0.0.1' },
    stdio: 'ignore',
    detached: true,
  });
  demo.unref();

  const env = {
    ...process.env,
    PORT: String(listenPort),
    UPSTREAM: `http://127.0.0.1:${demoPort}`,
    MODE: mode,
    OBSERVE: obsPath,
    SIEM_LOG: siemPath,
    SHADOW_LOG: shadowPath,
    HELIX_ROOT_PANEL: '1',
    HELIX_DNA_KEY: process.env.HELIX_DNA_KEY || 'local-lab-key',
    HELIX_DNA_KEY_ID: process.env.HELIX_DNA_KEY_ID || 'local-lab',
  };
  if (mode === 'shadow' || mode === 'enforce') {
    env.DNA = dnaPath;
  }
  const proxy = spawn(process.execPath, ['packages/helix-proxy/server.mjs'], {
    cwd: root,
    env,
    stdio: 'ignore',
    detached: true,
  });
  proxy.unref();

  fs.writeFileSync(
    pidPath,
    JSON.stringify(
      { at: new Date().toISOString(), mode, demo: demo.pid, helix: proxy.pid, dna: env.DNA || null },
      null,
      2,
    ) + '\n',
  );

  for (let i = 0; i < 40; i++) {
    const hz = await get('/__helix/healthz');
    if (hz.ok) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const hz = await get('/__helix/healthz');
  console.log(
    JSON.stringify(
      {
        started: Boolean(hz.ok),
        mode,
        panel: `http://127.0.0.1:${listenPort}/`,
        healthz: hz.json || hz,
        pids: { demo: demo.pid, helix: proxy.pid },
      },
      null,
      2,
    ),
  );
  process.exit(hz.ok ? 0 : 1);
}

if (cmd === 'prove') {
  const hz = await get('/__helix/healthz');
  const api = await get('/api/health');
  const backdoor = await get('/api/backdoor');
  const mode = hz.json?.mode;
  const result = {
    mode,
    healthz: hz.ok,
    api_health: api.ok,
    backdoor_status: backdoor.status,
    backdoor_hole: backdoor.json?.hole?.code || null,
  };
  if (mode === 'enforce') {
    const ok =
      hz.ok && api.ok && backdoor.status === 403 && backdoor.json?.hole?.code === 'HX-ROUTE-UNKNOWN';
    result.ok = ok;
    result.expect = 'api 200, backdoor 403 HX-ROUTE-UNKNOWN';
    console.log(JSON.stringify(result, null, 2));
    console.log(ok ? 'LOCAL_LAB_PROVE_OK' : 'LOCAL_LAB_PROVE_FAIL');
    process.exit(ok ? 0 : 1);
  }
  if (mode === 'shadow') {
    result.ok = hz.ok && api.ok && backdoor.status === 200;
    result.expect = 'shadow allows backdoor but should log a hole';
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }
  result.ok = hz.ok && api.ok;
  result.expect = 'learn: traffic passes; promote when ready';
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

console.error(`Unknown command: ${cmd}`);
usage();
process.exit(1);
