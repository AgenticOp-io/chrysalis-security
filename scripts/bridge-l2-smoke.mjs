#!/usr/bin/env node
/**
 * Mode B L2 lab prove — Phase 1 sketch (netns + divert → helix-bridge).
 * Design: docs/MODE-B-L2.md
 *
 * On non-Linux or without root: honest SKIP (DNA firewall does not require L2).
 * Full netns prove runs only on GCE Linux with CAP_NET_ADMIN.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SH = path.join(ROOT, 'scripts', 'gce-bridge-l2-smoke.sh');

if (process.platform !== 'linux') {
  console.log(
    `BRIDGE_L2_SMOKE_SKIP (platform=${process.platform} — run on GCE Linux; see docs/MODE-B-L2.md)`,
  );
  process.exit(0);
}

if (!fs.existsSync(SH)) {
  console.log('BRIDGE_L2_SMOKE_SKIP (scripts/gce-bridge-l2-smoke.sh missing)');
  process.exit(0);
}

const r = spawnSync('bash', [SH], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status ?? 1);
