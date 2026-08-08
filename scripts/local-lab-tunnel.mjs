#!/usr/bin/env node
/**
 * Expose local Helix (:4080) on a temporary public Cloudflare quick tunnel.
 * Requires tools/cloudflared/cloudflared.exe (downloaded on first run).
 *
 *   npm run local-lab-tunnel
 *
 * Prints PUBLIC_URL=https://….trycloudflare.com — lab only, no uptime SLA.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'tools', 'cloudflared');
const exe = path.join(dir, 'cloudflared.exe');
const url =
  process.env.CLOUDFLARED_URL ||
  'https://github.com/cloudflare/cloudflared/releases/download/2026.7.3/cloudflared-windows-amd64.exe';
const port = Number(process.env.HELIX_LOCAL_PORT || 4080);

function download(dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          https
            .get(res.headers.location, (res2) => {
              res2.pipe(file);
              file.on('finish', () => {
                file.close();
                resolve();
              });
            })
            .on('error', reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`download ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', reject);
  });
}

if (!fs.existsSync(exe)) {
  console.log('Downloading cloudflared…');
  await download(exe);
}

const ping = spawnSync(
  process.execPath,
  [
    '-e',
    `fetch('http://127.0.0.1:${port}/__helix/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`,
  ],
  { encoding: 'utf8', timeout: 4000 },
);
if (ping.status !== 0) {
  console.error(`Helix not reachable on :${port}. Start: npm run local-lab -- start --mode enforce`);
  process.exit(1);
}

console.log(`Tunneling http://127.0.0.1:${port} (Ctrl+C to stop)…`);
const child = spawn(exe, ['tunnel', '--url', `http://127.0.0.1:${port}`], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});

function scan(buf) {
  const s = buf.toString('utf8');
  process.stderr.write(s);
  const m = s.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (m) {
    console.log(`PUBLIC_URL=${m[0]}`);
    console.log(`PROOF=${m[0]}/__helix/attack`);
    console.log(`BLOCK=${m[0]}/api/backdoor`);
  }
}
child.stdout.on('data', scan);
child.stderr.on('data', scan);
child.on('exit', (code) => process.exit(code ?? 0));
