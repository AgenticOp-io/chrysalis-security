#!/usr/bin/env node
/**
 * Traffic-decides bar — Secure half (Helix shadow-ready).
 * Composite: soak-preflight-smoke → SOAK_PREFLIGHT_OK
 *            live-match-smoke → LIVE_MATCH_OK (CWL tip pin ≥ 1.0.23)
 * Token: TRAFFIC_DECIDES_SECURE_OK
 *
 * Customer soak → enforce remains operator (real SHADOW_LOG). This bar ≠ soak.
 * See docs/SOAK.md · CWL docs/history/TRAFFIC-DECIDES-BAR.md
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIN_CWL = '1.0.23';

function runNodeScript(rel) {
  const script = join(ROOT, rel);
  const r = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    timeout: 300_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  return { status: r.status ?? 1, out };
}

function parseSemver(v) {
  const m = String(v).match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function semverGte(a, min) {
  const pa = parseSemver(a);
  const pm = parseSemver(min);
  if (!pa || !pm) return false;
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pm[i]) return true;
    if (pa[i] < pm[i]) return false;
  }
  return true;
}

function resolveCwlVersion() {
  const cwlRoot = process.env.CHRYSALIS_CWL_ROOT
    ? resolve(process.env.CHRYSALIS_CWL_ROOT)
    : resolve(ROOT, '../chrysalis-cwl');
  try {
    const pkg = JSON.parse(
      fs.readFileSync(join(cwlRoot, 'packages', 'cwl', 'package.json'), 'utf8'),
    );
    return pkg.version;
  } catch {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(
          join(ROOT, 'node_modules', '@agenticop-io', 'cwl', 'package.json'),
          'utf8',
        ),
      );
      return pkg.version;
    } catch {
      return null;
    }
  }
}

console.error(
  'traffic-decides-bar: customer soak→enforce remains operator (real SHADOW_LOG); this bar ≠ soak',
);

const checks = [];

const cwlVersion = resolveCwlVersion();
checks.push({
  id: 'cwl-tip-pin',
  ok: Boolean(cwlVersion && semverGte(cwlVersion, MIN_CWL)),
  detail: cwlVersion ? `cwl@${cwlVersion} (min ${MIN_CWL})` : 'CWL version unresolved',
});

const preflight = runNodeScript('scripts/soak-preflight-smoke.mjs');
checks.push({
  id: 'soak-preflight-smoke',
  ok: preflight.status === 0 && /SOAK_PREFLIGHT_OK/.test(preflight.out),
  detail: /SOAK_PREFLIGHT_OK/.test(preflight.out)
    ? 'SOAK_PREFLIGHT_OK'
    : preflight.out.slice(-500),
});

const liveMatch = runNodeScript('scripts/live-match-smoke.mjs');
checks.push({
  id: 'live-match-smoke',
  ok: liveMatch.status === 0 && /LIVE_MATCH_OK/.test(liveMatch.out),
  detail: /LIVE_MATCH_OK/.test(liveMatch.out)
    ? 'LIVE_MATCH_OK'
    : liveMatch.out.slice(-500),
});

const failed = checks.filter((c) => !c.ok);
const ok = failed.length === 0;

const report = {
  kind: 'chrysalis.helix.traffic-decides-bar-smoke',
  schemaVersion: 1,
  ok,
  bar: 'AI drafts. Traffic decides. — Secure half (Helix shadow-ready)',
  minCwl: MIN_CWL,
  cwlVersion,
  token: ok ? 'TRAFFIC_DECIDES_SECURE_OK' : 'TRAFFIC_DECIDES_SECURE_FAIL',
  checks,
  failed: failed.map((c) => c.id),
  opsNote:
    'Customer soak→enforce remains operator (real SHADOW_LOG); this bar ≠ customer soak.',
  generatedAt: new Date().toISOString(),
};

console.log(JSON.stringify(report, null, 2));
console.log(report.token);
if (!ok) process.exit(1);
