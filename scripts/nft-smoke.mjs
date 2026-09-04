#!/usr/bin/env node
/**
 * Mode A host-redirect nft prove — divert + DNA + fail-closed + teardown.
 * Design: docs/INSTALL-MODE-A.md · scripts/host-redirect-nft.sh
 *
 * On non-Linux: honest SKIP (Mode A soft bind needs no nft; hard redirect is Linux/GCE).
 * Full prove: GCE Linux with nft + sudo (gce-sync runs bash scripts/gce-nft-smoke.sh).
 * Tokens: MODE_A_DIVERT_OK · MODE_A_DNA_OK · MODE_A_FAILCLOSED_OK · MODE_A_TEARDOWN_OK · NFT_SMOKE_OK
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SH = path.join(ROOT, 'scripts', 'gce-nft-smoke.sh');

if (process.platform !== 'linux') {
  console.log(
    `NFT_SMOKE_SKIP (platform=${process.platform} — Mode A hard redirect needs Linux/nft; see docs/INSTALL-MODE-A.md)`,
  );
  process.exit(0);
}

if (!fs.existsSync(SH)) {
  console.log('NFT_SMOKE_SKIP (scripts/gce-nft-smoke.sh missing)');
  process.exit(0);
}

const r = spawnSync('bash', [SH], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status ?? 1);
