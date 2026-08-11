#!/usr/bin/env node
/**
 * Mode B L2 Phase 2 lab prove — dual-iface (NIC-A + NIC-B) appliance netns.
 * Design: docs/MODE-B-L2.md § Phase 2
 *
 * On non-Linux or without root: honest SKIP (DNA firewall does not require L2).
 * Full prove: GCE Linux with CAP_NET_ADMIN (`gce-sync -WithL2P2`).
 * Tokens: BRIDGE_L2_P2_IFACE_OK · CROSS_OK · DIVERT_OK · DNA_OK · BRIDGE_L2_P2_SMOKE_OK
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SH = path.join(ROOT, 'scripts', 'gce-bridge-l2-p2-smoke.sh');

if (process.platform !== 'linux') {
  console.log(
    `BRIDGE_L2_P2_SMOKE_SKIP (platform=${process.platform} — need Linux root/netns; see docs/MODE-B-L2.md Phase 2)`,
  );
  process.exit(0);
}

if (!fs.existsSync(SH)) {
  console.log('BRIDGE_L2_P2_SMOKE_SKIP (scripts/gce-bridge-l2-p2-smoke.sh missing)');
  process.exit(0);
}

const r = spawnSync('bash', [SH], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status ?? 1);
