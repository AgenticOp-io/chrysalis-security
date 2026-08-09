#!/usr/bin/env node
/**
 * Always-check CWL tip before Secure slices (D5 still: DNA works without CWL).
 * Token: CWL_SYNC_OK | CWL_SYNC_SKIP
 *
 * Follows Exit 1.0: tip may be on candidate/* ahead of origin/main while
 * LANGUAGE_VERSION is 1.x — that is not “behind”.
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

function git(args) {
  return spawnSync('git', args, { cwd: cwlRoot, encoding: 'utf8' });
}

const fetch = git(['fetch', 'origin']);
const status = git(['status', '-sb']);
const head = git(['rev-parse', 'HEAD']);
const originMain = git(['rev-parse', 'origin/main']);
const branch = git(['branch', '--show-current']);
const behindCount = git(['rev-list', '--count', 'HEAD..origin/main']);
const aheadCount = git(['rev-list', '--count', 'origin/main..HEAD']);

const md = fs.readFileSync(path.join(cwlRoot, 'LANGUAGE_VERSION.md'), 'utf8');
const verMatch = md.match(/\|\s*\*\*Version\*\*\s*\|\s*`([^`]+)`/);
const languageVersion = verMatch ? verMatch[1] : null;

let packageVersion = null;
try {
  packageVersion = JSON.parse(
    fs.readFileSync(path.join(cwlRoot, 'packages', 'cwl', 'package.json'), 'utf8'),
  ).version;
} catch {
  /* optional */
}

const sha = (head.stdout || '').trim();
const originSha = (originMain.stdout || '').trim();
const behindN = Number((behindCount.stdout || '').trim() || '0');
const aheadN = Number((aheadCount.stdout || '').trim() || '0');
const behind = Number.isFinite(behindN) && behindN > 0;
const ahead = Number.isFinite(aheadN) && aheadN > 0;

const report = {
  kind: 'helix.cwl-sync',
  cwlRoot,
  languageVersion,
  packageVersion,
  branch: (branch.stdout || '').trim() || null,
  head: sha,
  originMain: originSha || null,
  commitsBehindMain: behindN,
  commitsAheadMain: aheadN,
  fetchOk: fetch.status === 0,
  status: (status.stdout || '').trim().split('\n')[0] || null,
  upToDate: !behind,
  exit10Tip: Boolean(languageVersion?.startsWith('1.') || packageVersion?.startsWith('1.')),
};

const outDir = path.join(ROOT, 'data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'cwl-sync.json'), JSON.stringify(report, null, 2) + '\n');

const tipLabel = `${sha.slice(0, 7)} cwl@${languageVersion || packageVersion || '?'}`;

if (behind) {
  console.warn(
    `CWL tip behind origin/main by ${behindN} commit(s) — pull chrysalis-cwl before bridge/cutover work`,
  );
  console.warn(JSON.stringify(report, null, 2));
  // Soft warn: still OK token so DNA pack isn't blocked (D5). Exit 0.
  console.log(`CWL_SYNC_OK (behind_origin_noted) ${tipLabel}`);
  process.exit(0);
}

if (ahead) {
  console.log(`CWL_SYNC_OK (ahead_of_main_${aheadN}) ${tipLabel}`);
  process.exit(0);
}

console.log(`CWL_SYNC_OK ${tipLabel}`);
process.exit(0);
