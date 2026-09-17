#!/usr/bin/env node
/**
 * Mode B L2 Phase 3 lab prove — transparent bridge-nf divert on daddr=server.
 * Design: docs/MODE-B-L2.md § Phase 3
 *
 * On non-Linux or without root: honest SKIP (DNA firewall does not require L2).
 * Full prove: GCE Linux with CAP_NET_ADMIN (`gce-sync -WithL2P3`).
 * Tokens: BRIDGE_L2_P3_BRNF_OK · CROSS_OK · BASELINE_OK · DIVERT_OK · TRANSPARENT_OK ·
 *         DNA_OK · FAILCLOSED_OK · TEARDOWN_OK · BRIDGE_L2_P3_SMOKE_OK
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SH = path.join(ROOT, 'scripts', 'gce-bridge-l2-p3-smoke.sh');

if (process.platform !== 'linux') {
  console.log(
    `BRIDGE_L2_P3_SMOKE_SKIP (platform=${process.platform} — need Linux root/netns + br_netfilter; see docs/MODE-B-L2.md Phase 3)`,
  );
  process.exit(0);
}

if (!fs.existsSync(SH)) {
  console.log('BRIDGE_L2_P3_SMOKE_SKIP (scripts/gce-bridge-l2-p3-smoke.sh missing)');
  process.exit(0);
}

const r = spawnSync('bash', [SH], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status ?? 1);
