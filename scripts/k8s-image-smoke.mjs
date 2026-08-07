#!/usr/bin/env node
/**
 * Build Helix image and prove /__helix/healthz (K8s sidecar image bar).
 * Token: K8S_IMAGE_SMOKE_OK | K8S_IMAGE_SMOKE_SKIP
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = process.env.HELIX_K8S_FULL === '1' || process.env.HELIX_K8S_FULL === 'true';

function docker(args, timeout = 300_000) {
  return spawnSync('docker', args, {
    cwd: root,
    encoding: 'utf8',
    timeout,
  });
}

const ver = docker(['version'], 15_000);
if (ver.status !== 0) {
  console.log('K8S_IMAGE_SMOKE_SKIP (docker not available)');
  process.exit(0);
}

console.log('=== docker build -t helix:local ===');
const build = docker(['build', '-t', 'helix:local', '.'], 600_000);
if (build.status !== 0) {
  console.error(build.stderr || build.stdout || 'build failed');
  process.exit(build.status ?? 1);
}

if (!full) {
  // Image exists = sidecar sketch can be applied once registry/tag set
  console.log('K8S_IMAGE_SMOKE_OK (image built; set HELIX_K8S_FULL=1 to run container healthz)');
  process.exit(0);
}

docker(['rm', '-f', 'helix-k8s-smoke'], 15_000);
const run = docker(
  [
    'run',
    '-d',
    '--name',
    'helix-k8s-smoke',
    '-p',
    '18080:4080',
    '-e',
    'MODE=learn',
    '-e',
    'UPSTREAM=http://127.0.0.1:9',
    '-e',
    'OBSERVE=/data/obs.ndjson',
    'helix:local',
  ],
  60_000,
);
if (run.status !== 0) {
  console.error(run.stderr || run.stdout);
  process.exit(run.status ?? 1);
}

let ok = false;
for (let i = 0; i < 30; i++) {
  const ping = spawnSync(
    process.execPath,
    [
      '-e',
      `fetch('http://127.0.0.1:18080/__helix/healthz').then(r=>r.json()).then(j=>{console.log(JSON.stringify(j));process.exit(j.ok?0:1)}).catch(()=>process.exit(1))`,
    ],
    { encoding: 'utf8', timeout: 4000 },
  );
  if (ping.status === 0) {
    ok = true;
    break;
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
}
docker(['rm', '-f', 'helix-k8s-smoke'], 15_000);
if (!ok) {
  console.error('healthz failed');
  process.exit(1);
}
console.log('K8S_IMAGE_SMOKE_OK');
