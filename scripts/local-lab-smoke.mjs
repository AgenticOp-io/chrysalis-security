#!/usr/bin/env node
/**
 * Full desktop flip on ephemeral ports (does not touch :4080 lab).
 * learn traffic → promote → enforce → backdoor 403
 * Token: LOCAL_LAB_SMOKE_OK
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'data', 'local-lab-smoke');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const listenPort = 19092;
const demoPort = 19093;
const env = {
  ...process.env,
  HELIX_LOCAL_RUN_DIR: dir,
  HELIX_LOCAL_PORT: String(listenPort),
  HELIX_LOCAL_DEMO_PORT: String(demoPort),
  HELIX_DNA_KEY: 'local-lab-smoke-key',
  HELIX_DNA_KEY_ID: 'smoke',
};

function lab(args) {
  const r = spawnSync(process.execPath, ['scripts/local-lab.mjs', ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) throw new Error(`local-lab ${args.join(' ')} exit ${r.status}`);
  return r.stdout;
}

function get(urlPath) {
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: '127.0.0.1', port: listenPort, path: urlPath, timeout: 2000 }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      })
      .on('error', reject);
  });
}

lab(['start', '--mode', 'learn', '--kill']);
for (const p of ['/api/health', '/api/items', '/api/health']) {
  const r = await get(p);
  if (r.status !== 200) throw new Error(`learn probe ${p} → ${r.status}`);
}
lab(['promote']);
lab(['start', '--mode', 'enforce', '--kill']);
const prove = lab(['prove']);
if (!prove.includes('LOCAL_LAB_PROVE_OK')) throw new Error('prove token missing');

console.log('LOCAL_LAB_SMOKE_OK');
process.exit(0);
