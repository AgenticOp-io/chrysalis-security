#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { learnFromObservations, diffDna } from '../../dna-core/index.mjs';

function usage() {
  console.log(`Helix CLI — Chrysalis security fork

Usage:
  helix learn  --in <observations.ndjson> --out <dna.json> [--app-id name]
  helix diff   --a <dna.json> --b <dna.json>
  helix promote --in <draft.json> --out <certified.json>

Canon: docs/CANON.md
`);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function readNdjson(p) {
  return fs
    .readFileSync(p, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === '-h' || cmd === '--help') {
  usage();
  process.exit(0);
}

function flag(name) {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
}

if (cmd === 'learn') {
  const input = flag('--in');
  const out = flag('--out');
  const appId = flag('--app-id') || 'demo';
  if (!input || !out) {
    usage();
    process.exit(1);
  }
  const obs = readNdjson(input);
  const dna = learnFromObservations(obs, { app_id: appId, mode: 'draft' });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(dna, null, 2) + '\n');
  console.log(`Wrote draft DNA (${dna.routes.length} routes) → ${out}`);
  process.exit(0);
}

if (cmd === 'diff') {
  const a = flag('--a');
  const b = flag('--b');
  if (!a || !b) {
    usage();
    process.exit(1);
  }
  const d = diffDna(readJson(a), readJson(b));
  console.log(JSON.stringify(d, null, 2));
  process.exit(d.distance === 0 ? 0 : 2);
}

if (cmd === 'promote') {
  const input = flag('--in');
  const out = flag('--out');
  if (!input || !out) {
    usage();
    process.exit(1);
  }
  const dna = readJson(input);
  dna.mode = 'certified';
  dna.created_at = new Date().toISOString();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(dna, null, 2) + '\n');
  console.log(`Promoted certificate → ${out}`);
  process.exit(0);
}

console.error(`Unknown command: ${cmd}`);
usage();
process.exit(1);
