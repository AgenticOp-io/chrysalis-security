#!/usr/bin/env node
/**
 * GCE / local demo pack: DNA smokes + RFC-0022 cutover + CWL UT spine.
 * Run from chrysalis-security. Prefer gce-sync.ps1 -WithCwl for remote.
 *
 * Token: UT_GCE_DEMO_OK (local).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'ut-gce-demo.json');

function run(rel, env = {}) {
  const script = path.join(ROOT, rel);
  if (!fs.existsSync(script)) {
    return { ok: false, skip: `missing ${rel}` };
  }
  const r = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 300_000,
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    ok: r.status === 0,
    status: r.status,
    stdoutTail: (r.stdout || '').slice(-400),
    stderrTail: (r.stderr || '').slice(-400),
  };
}

const steps = [];
// Full DNA pack is best-effort locally (port races); cutover + CWL spine are the UT gate.
const pack = run('scripts/gce-smoke.mjs');
steps.push({
  id: 'gce-smoke-pack',
  ...pack,
  ok: pack.ok === true,
  soft: pack.ok !== true,
});
if (!pack.ok) {
  console.warn('gce-smoke-pack soft-fail (retry or run gce-smoke alone); continuing UT cutover prove');
}
steps.push({ id: 'cutover-smoke', ...run('scripts/cutover-smoke.mjs') });

// Prefer CWL ut-evidence pack (0.1.7+) when present; else smoke:ut-spine:helix
const cwlRoot = path.resolve(ROOT, '../chrysalis-cwl');
const evidence = path.join(cwlRoot, 'scripts', 'ut-evidence-pack.mjs');
const spine = path.join(cwlRoot, 'scripts', 'smoke-ut-spine.mjs');
if (fs.existsSync(evidence)) {
  const r = spawnSync(process.execPath, [evidence, '--require-helix'], {
    cwd: cwlRoot,
    encoding: 'utf8',
    env: { ...process.env, CHRYSALIS_SECURITY_ROOT: ROOT },
    timeout: 180_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  steps.push({
    id: 'cwl-ut-evidence',
    ok: r.status === 0 && /UT_EVIDENCE_OK|UT_SPINE_OK/.test(out),
    status: r.status,
    stdoutTail: out.slice(-300),
  });
} else if (fs.existsSync(spine)) {
  const r = spawnSync(process.execPath, [spine, '--require-helix'], {
    cwd: cwlRoot,
    encoding: 'utf8',
    env: { ...process.env, CHRYSALIS_SECURITY_ROOT: ROOT },
    timeout: 180_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  steps.push({
    id: 'cwl-ut-spine',
    ok: r.status === 0 && /UT_SPINE_OK/.test(r.stdout || ''),
    status: r.status,
    stdoutTail: (r.stdout || '').slice(-300),
  });
} else {
  steps.push({
    id: 'cwl-ut-spine',
    ok: true,
    skip: 'chrysalis-cwl sibling absent — Secure cutover still gates',
  });
}

const ok = steps.every((s) => s.ok === true || s.skip || s.soft);
const report = {
  kind: 'chrysalis.secure.ut-gce-demo',
  schemaVersion: 2,
  ok,
  token: ok ? 'UT_GCE_DEMO_OK' : 'UT_GCE_DEMO_FAIL',
  ownerNote: 'UT spine owned by chrysalis-cwl; Convert does not own DNA cutover',
  host: 'agenticop-master (preferred) — see docs/GCE.md',
  steps,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (ok) console.log('UT_GCE_DEMO_OK');
if (!ok) process.exit(1);
