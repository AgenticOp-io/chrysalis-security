#!/usr/bin/env node
/**
 * Soak preflight — SOAK.md gates as a runnable smoke (fixture traffic only).
 *
 * Proves: learn → report → promote → ready(shadow) → ready(enforce)+shadow-log
 *   - dirty fixture shadow log → honest fail (exit 2)
 *   - clean fixture shadow log → exit 0
 *
 * Does NOT generate fake customer soak traffic. Real soak remains ops ([docs/SOAK.md]).
 * D5: DNA-only path — no CWL seed/cutover required.
 *
 * Tokens: SOAK_PREFLIGHT_* · final SOAK_PREFLIGHT_OK
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { countShadowHoles } from '../packages/dna-core/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'packages/helix-cli/bin/helix.mjs');
const fx = path.join(root, 'fixtures', 'soak-preflight');
const dataDir = path.join(root, 'data', 'soak-preflight-smoke');
const SECRET = 'helix-soak-preflight-lab';

const tokens = [];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function token(name) {
  tokens.push(name);
  console.log(name);
}

function helix(args, { expectStatus = 0 } = {}) {
  const r = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      HELIX_DNA_KEY: SECRET,
      HELIX_DNA_KEY_ID: 'soak-preflight',
    },
  });
  const status = r.status ?? 1;
  if (status !== expectStatus) {
    throw new Error(
      `helix ${args.join(' ')} → exit ${status} (want ${expectStatus})\n` +
        `${r.stdout || ''}${r.stderr || ''}`,
    );
  }
  return { status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

/** SOAK.md gates that preflight can prove without live customers. */
const AUTOMATABLE_GATES = [
  'learn',
  'report',
  'promote',
  'ready_shadow',
  'ready_enforce_shadow_log',
  'max_shadow_holes_budget',
];

/** Ops-only gaps — must stay documented holes (no invent). */
const OPS_ONLY_GATES = [
  'real_customer_traffic',
  'shadow_log_retention',
  'agreed_hole_budget_written',
  'promote_cadence_during_soak',
  'mode_placement_live',
];

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const obsPath = path.join(fx, 'observations.ndjson');
const dirtyLog = path.join(fx, 'shadow-dirty.ndjson');
const cleanLog = path.join(fx, 'shadow-clean.ndjson');
const draftPath = path.join(dataDir, 'draft.json');
const certPath = path.join(dataDir, 'app.dna.json');

assert(fs.existsSync(obsPath), 'fixture observations');
assert(fs.existsSync(dirtyLog), 'fixture dirty shadow log');
assert(fs.existsSync(cleanLog), 'fixture clean shadow log');

// --- learn ---
const learn = helix(['learn', '--in', obsPath, '--out', draftPath, '--app-id', 'soak-preflight']);
assert(learn.stdout.includes('Wrote draft DNA'), 'learn wrote draft');
assert(fs.existsSync(draftPath), 'draft on disk');
token('SOAK_PREFLIGHT_LEARN_OK');

// --- report ---
const report = helix(['report', '--in', draftPath]);
assert(report.stdout.includes('helix.report') || report.stdout.includes('"routes"'), 'report json');
const reportJson = JSON.parse(report.stdout);
assert(Number(reportJson.routes) >= 3, `report routes >= 3 (got ${reportJson.routes})`);
assert(reportJson.next_step === 'promote' || reportJson.mode === 'draft', 'draft wants promote');
token('SOAK_PREFLIGHT_REPORT_OK');

// --- promote (DNA certificate; D5 no CWL) ---
const promote = helix([
  'promote',
  '--in',
  draftPath,
  '--out',
  certPath,
  '--key',
  SECRET,
  '--key-id',
  'soak-preflight',
]);
assert(promote.stdout.includes('Promoted'), 'promote stdout');
assert(fs.existsSync(certPath), 'cert on disk');
const cert = JSON.parse(fs.readFileSync(certPath, 'utf8'));
assert(cert.mode === 'certified', 'mode certified');
assert(cert.signature?.value, 'signed DNA');
token('SOAK_PREFLIGHT_PROMOTE_OK');

// --- ready shadow (pre-enforce soak placement gate) ---
const readyShadow = helix(['ready', '--in', certPath, '--target', 'shadow', '--min-routes', '3']);
const shadowReady = JSON.parse(readyShadow.stdout);
assert(shadowReady.ok === true, 'ready --target shadow');
token('SOAK_PREFLIGHT_SHADOW_OK');

// --- dirty shadow log: enforce must fail honestly ---
const dirtyCount = countShadowHoles(dirtyLog);
assert(dirtyCount.count >= 2, `dirty fixture has holes (got ${dirtyCount.count})`);
const readyDirty = helix(
  [
    'ready',
    '--in',
    certPath,
    '--target',
    'enforce',
    '--shadow-log',
    dirtyLog,
    '--min-routes',
    '3',
    '--max-shadow-holes',
    '0',
    '--require-signed',
  ],
  { expectStatus: 2 },
);
const dirtyResult = JSON.parse(readyDirty.stdout);
assert(dirtyResult.ok === false, 'dirty ready.ok false');
assert(dirtyResult.shadow_log?.count >= 2, 'shadow_log meta counted holes');
token('SOAK_PREFLIGHT_READY_DIRTY_FAIL');

// --- budget honesty: same dirty log passes only if budget covers holes ---
const budgetPass = helix([
  'ready',
  '--in',
  certPath,
  '--target',
  'enforce',
  '--shadow-log',
  dirtyLog,
  '--min-routes',
  '3',
  '--max-shadow-holes',
  String(dirtyCount.count),
  '--require-signed',
]);
assert(JSON.parse(budgetPass.stdout).ok === true, 'budget covers dirty holes');
token('SOAK_PREFLIGHT_BUDGET_OK');

// --- clean shadow log: enforce ready exit 0 ---
const cleanCount = countShadowHoles(cleanLog);
assert(cleanCount.count === 0, `clean fixture must have 0 holes (got ${cleanCount.count})`);
const readyClean = helix([
  'ready',
  '--in',
  certPath,
  '--target',
  'enforce',
  '--shadow-log',
  cleanLog,
  '--min-routes',
  '3',
  '--max-shadow-holes',
  '0',
  '--require-signed',
]);
const cleanResult = JSON.parse(readyClean.stdout);
assert(cleanResult.ok === true, 'clean ready.ok true');
assert(cleanResult.shadow_log?.count === 0, 'clean shadow_log count 0');
token('SOAK_PREFLIGHT_READY_CLEAN_OK');

// --- gate inventory (SOAK.md codified) ---
assert(AUTOMATABLE_GATES.length >= 5, 'automatable gates listed');
assert(OPS_ONLY_GATES.includes('real_customer_traffic'), 'ops gap: real traffic');
console.log(
  JSON.stringify({
    kind: 'helix.soak_preflight',
    automatable: AUTOMATABLE_GATES,
    ops_only: OPS_ONLY_GATES,
    enforce_after:
      'helix ready --target enforce --shadow-log <ops SHADOW_LOG> --max-shadow-holes 0 → MODE=enforce + reload',
  }),
);

token('SOAK_PREFLIGHT_OK');
console.error(`soak-preflight tokens: ${tokens.join(' · ')}`);
