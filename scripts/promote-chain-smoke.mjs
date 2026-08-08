#!/usr/bin/env node
/**
 * Prove promote parent_hash chain + CLI --from / --parent.
 * Token: PROMOTE_CHAIN_SMOKE_OK
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  learnFromObservations,
  promoteDna,
  hashDna,
  verifyParentChain,
} from '../packages/dna-core/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'promote-chain-smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const SECRET = 'helix-promote-chain-smoke-key';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function runHelix(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['packages/helix-cli/bin/helix.mjs', ...args], {
      cwd: root,
      env: { ...process.env, HELIX_DNA_KEY: SECRET, HELIX_DNA_KEY_ID: 'chain' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      out += d;
    });
    child.on('exit', (code) =>
      code === 0 ? resolve(out) : reject(new Error(out || `exit ${code}`)),
    );
  });
}

const obs = [
  {
    method: 'GET',
    path: '/api/health',
    host: 'h',
    status: 200,
    contentType: 'application/json',
    body: { ok: true },
  },
  {
    method: 'GET',
    path: '/api/items',
    host: 'h',
    status: 200,
    contentType: 'application/json',
    body: { items: [] },
  },
];

const draft1 = learnFromObservations(obs, { app_id: 'chain', mode: 'draft' });
const { dna: cert1 } = promoteDna(draft1, {
  sign: { secret: SECRET, key_id: 'chain' },
});
assert(cert1.parent_hash == null || cert1.parent_hash === null, 'first cert has no parent');
assert(cert1.signature?.value, 'first cert signed');

const draft2 = learnFromObservations(
  [
    ...obs,
    {
      method: 'POST',
      path: '/api/items',
      host: 'h',
      status: 200,
      contentType: 'application/json',
      body: { ok: true },
      requestContentType: 'application/json',
      requestBody: { name: 'x' },
    },
  ],
  { app_id: 'chain', mode: 'draft' },
);
const { dna: cert2, diff } = promoteDna(draft2, {
  from: cert1,
  sign: { secret: SECRET, key_id: 'chain' },
});
assert(diff && diff.added.length >= 1, 'diff shows added route');
assert(cert2.parent_hash === hashDna(cert1), 'parent_hash matches hashDna(cert1)');
assert(verifyParentChain(cert2, cert1).ok, 'verifyParentChain ok');
assert(!verifyParentChain(cert2, draft2).ok, 'wrong parent fails');

const draftPath = path.join(dataDir, 'draft.json');
const certA = path.join(dataDir, 'a.dna.json');
const certB = path.join(dataDir, 'b.dna.json');
fs.writeFileSync(draftPath, JSON.stringify(draft1, null, 2));
await runHelix(['promote', '--in', draftPath, '--out', certA, '--key', SECRET, '--key-id', 'chain']);
fs.writeFileSync(draftPath, JSON.stringify(draft2, null, 2));
const out = await runHelix([
  'promote',
  '--in',
  draftPath,
  '--out',
  certB,
  '--from',
  certA,
  '--key',
  SECRET,
  '--key-id',
  'chain',
]);
assert(out.includes('Promote diff'), 'CLI prints promote diff');
const verifyOut = await runHelix([
  'verify',
  '--in',
  certB,
  '--parent',
  certA,
  '--key',
  SECRET,
  '--require',
]);
assert(verifyOut.includes('"ok": true') || verifyOut.includes('"ok":true'), 'CLI verify --parent ok');

console.log('PROMOTE_CHAIN_SMOKE_OK');
