#!/usr/bin/env node
/**
 * Local / GCE day-one prove pack (DNA + optional CWL bridge).
 * DNA fixtures in pack: static · schema-drift · sign · soak-preflight · siem-fixture · reload-fixture (also test:dna).
 * Prefer: node scripts/gce-smoke.mjs
 * Linux wrapper: bash scripts/gce-smoke.sh
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveCwlRoot } from '../packages/cwl-bridge/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(rel) {
  const script = path.join(ROOT, rel);
  const r = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('scripts/dna-core-smoke.mjs');
run('scripts/smoke.mjs');
run('scripts/host-smoke.mjs');
run('scripts/static-smoke.mjs');
run('scripts/schema-drift-smoke.mjs');
run('scripts/sign-smoke.mjs');
run('scripts/bridge-smoke.mjs');
// DNA fixture pack (also in test:dna) — Node-only; green on win32 (no nft/L2)
run('scripts/soak-preflight-smoke.mjs');
run('scripts/siem-fixture-smoke.mjs');
run('scripts/reload-fixture-smoke.mjs');

try {
  resolveCwlRoot();
  run('scripts/cwl-bridge-smoke.mjs');
  const cutover = path.join(ROOT, 'scripts', 'cutover-smoke.mjs');
  if (fs.existsSync(cutover)) {
    run('scripts/cutover-smoke.mjs');
  } else {
    console.log('CUTOVER_SMOKE_SKIP (scripts/cutover-smoke.mjs not present)');
  }
} catch {
  console.log(
    'CWL_BRIDGE_SMOKE_SKIP (set CHRYSALIS_CWL_ROOT or keep engines/chrysalis-cwl next to chrysalis-security)',
  );
  console.log('CUTOVER_SMOKE_SKIP (CWL pillar not on box — DNA pack still gates)');
}

console.log('GCE_SMOKE_OK');
