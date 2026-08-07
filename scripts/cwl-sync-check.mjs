#!/usr/bin/env node
/**
 * Always-check CWL tip before Secure slices (D5 still: DNA works without CWL).
 * Token: CWL_SYNC_OK | CWL_SYNC_SKIP
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cwlRoot = process.env.CHRYSALIS_CWL_ROOT
  ? path.resolve(process.env.CHRYSALIS_CWL_ROOT)
  : path.resolve(ROOT, '../chrysalis-cwl');

if (!fs.existsSync(path.join(cwlRoot, 'LANGUAGE_VERSION.md'))) {
  console.log('CWL_SYNC_SKIP (chrysalis-cwl not found)');
  process.exit(0);
}

const fetch = spawnSync('git', ['fetch', 'origin'], { cwd: cwlRoot, encoding: 'utf8' });
const status = spawnSync('git', ['status', '-sb'], { cwd: cwlRoot, encoding: 'utf8' });
const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: cwlRoot, encoding: 'utf8' });
const origin = spawnSync('git', ['rev-parse', 'origin/main'], { cwd: cwlRoot, encoding: 'utf8' });
const verLine = fs
  .readFileSync(path.join(cwlRoot, 'LANGUAGE_VERSION.md'), 'utf8')
  .split('\n')
  .find((l) => l.includes('`0.') || /\|\s*\*\*Version\*\*/.test(l));

const sha = (head.stdout || '').trim();
const originSha = (origin.stdout || '').trim();
const behind = sha && originSha && sha !== originSha;

const report = {
  kind: 'helix.cwl-sync',
  cwlRoot,
  languageVersionLine: verLine?.trim() || null,
  head: sha,
  originMain: originSha || null,
  fetchOk: fetch.status === 0,
  status: (status.stdout || '').trim().split('\n')[0] || null,
  upToDate: !behind,
};

const outDir = path.join(ROOT, 'data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'cwl-sync.json'), JSON.stringify(report, null, 2) + '\n');

if (behind) {
  console.warn('CWL tip behind origin/main — pull chrysalis-cwl before bridge/cutover work');
  console.warn(JSON.stringify(report, null, 2));
  // Soft warn: still OK token so DNA pack isn't blocked (D5). Exit 0.
  console.log('CWL_SYNC_OK (behind_origin_noted)');
  process.exit(0);
}

console.log(`CWL_SYNC_OK ${sha.slice(0, 7)} ${(verLine || '').trim()}`);
process.exit(0);
