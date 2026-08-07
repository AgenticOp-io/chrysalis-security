#!/usr/bin/env node
/**
 * Operator readiness: report + ready gates.
 * Token: READY_SMOKE_OK
 */
import { learnFromObservations, reportDna, assessReadiness, signDna } from '../packages/dna-core/index.mjs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const draft = learnFromObservations(
  [
    { method: 'GET', path: '/api/health', host: 'h', status: 200, contentType: 'application/json', body: { ok: true } },
    { method: 'GET', path: '/api/items', host: 'h', status: 200, contentType: 'application/json', body: { items: [] } },
    { method: 'GET', path: '/a.js', host: 'h', status: 200, contentType: 'application/javascript' },
  ],
  { app_id: 'ready', mode: 'draft' },
);

const rep = reportDna(draft);
assert(rep.routes === 3, 'routes');
assert(rep.next_step === 'promote', 'draft → promote');
assert(rep.product_bar === 'thin_dna_continue_learn_or_promote', 'bar');

const notShadow = assessReadiness('shadow', draft);
assert(notShadow.ok === false, 'draft not ready for shadow');

let cert = { ...draft, mode: 'certified', created_at: new Date().toISOString() };
cert = signDna(cert, { secret: 'lab', key_id: 'lab' });
const shadowOk = assessReadiness('shadow', cert, { minRoutes: 1 });
assert(shadowOk.ok === true, 'certified ready shadow');

const enforceBlocked = assessReadiness('enforce', cert, { minRoutes: 5 });
assert(enforceBlocked.ok === false, 'min routes gate');

const enforceOk = assessReadiness('enforce', cert, {
  minRoutes: 3,
  requireSigned: true,
  shadowHoles: 0,
  maxShadowHoles: 0,
});
assert(enforceOk.ok === true, 'enforce ready');

const dirty = assessReadiness('enforce', cert, { minRoutes: 3, shadowHoles: 2, maxShadowHoles: 0 });
assert(dirty.ok === false, 'shadow holes block enforce');

const dataDir = path.join(root, 'data', 'ready-smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });
const dnaPath = path.join(dataDir, 'app.dna.json');
fs.writeFileSync(dnaPath, JSON.stringify(cert, null, 2));

const cli = path.join(root, 'packages/helix-cli/bin/helix.mjs');
const r1 = spawnSync(process.execPath, [cli, 'report', '--in', dnaPath], { encoding: 'utf8' });
assert(r1.status === 0 && r1.stdout.includes('helix.report'), `report cli: ${r1.stderr}`);
const r2 = spawnSync(process.execPath, [cli, 'ready', '--in', dnaPath, '--target', 'shadow'], {
  encoding: 'utf8',
});
assert(r2.status === 0 && r2.stdout.includes('"ok": true'), `ready shadow: ${r2.stdout}`);

console.log('READY_SMOKE_OK');
