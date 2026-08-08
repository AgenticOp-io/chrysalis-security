#!/usr/bin/env node
/**
 * Local lab status for desktop Helix run (learn mode).
 * Writes data/local-run/status.json and prints one line.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'data', 'local-run');
const obsPath = path.join(dir, 'observations.ndjson');
const siemPath = path.join(dir, 'siem.ndjson');
const statusPath = path.join(dir, 'status.json');

function get(urlPath) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: '127.0.0.1', port: 4080, path: urlPath, timeout: 2000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {
          /* ignore */
        }
        resolve({ ok: res.statusCode === 200, status: res.statusCode, json, body });
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: String(e.message || e) }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

function countLines(p) {
  if (!fs.existsSync(p)) return 0;
  const t = fs.readFileSync(p, 'utf8').trim();
  if (!t) return 0;
  return t.split(/\r?\n/).filter(Boolean).length;
}

const hz = await get('/__helix/healthz');
const api = await get('/api/health');
const backdoor = await get('/api/backdoor'); // learn allows; useful later for enforce
const obs = countLines(obsPath);
const siem = countLines(siemPath);

const status = {
  at: new Date().toISOString(),
  working: Boolean(hz.ok && api.ok),
  healthz: hz.json || hz,
  api_health: api.ok,
  backdoor_status: backdoor.status,
  observations: obs,
  siem_holes: siem,
  listen: 'http://127.0.0.1:4080',
  panel: 'http://127.0.0.1:4080/',
  mode: hz.json?.mode || null,
};

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(statusPath, JSON.stringify(status, null, 2) + '\n');

const verdict = status.working ? 'WORKING' : 'DOWN';
console.log(
  `HELIX_LOCAL ${verdict} mode=${status.mode} obs=${obs} siem=${siem} healthz=${hz.ok} api=${api.ok}`,
);
process.exit(status.working ? 0 : 1);
