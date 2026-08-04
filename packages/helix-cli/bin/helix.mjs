#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { learnFromObservations, diffDna, signDna, verifyDna } from '../../dna-core/index.mjs';

function usage() {
  console.log(`Helix CLI — Chrysalis security fork

Usage:
  helix learn   --in <observations.ndjson> --out <dna.json> [--app-id name]
  helix diff    --a <dna.json> --b <dna.json>
  helix promote --in <draft.json> --out <certified.json> [--key <secret>|--key-file <path>] [--key-id id]
  helix verify  --in <certified.json> [--key <secret>|--key-file <path>] [--key-id id] [--require]

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

function resolveSecret(rest) {
  const key = flag(rest, '--key');
  const keyFile = flag(rest, '--key-file');
  const envKey = process.env.HELIX_DNA_KEY || '';
  if (key) return key;
  if (keyFile) return fs.readFileSync(keyFile, 'utf8').trim();
  if (envKey) return envKey;
  return null;
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd || cmd === '-h' || cmd === '--help') {
  usage();
  process.exit(0);
}

function flag(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function hasFlag(argv, name) {
  return argv.includes(name);
}

if (cmd === 'learn') {
  const input = flag(rest, '--in');
  const out = flag(rest, '--out');
  const appId = flag(rest, '--app-id') || 'demo';
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
  const a = flag(rest, '--a');
  const b = flag(rest, '--b');
  if (!a || !b) {
    usage();
    process.exit(1);
  }
  const d = diffDna(readJson(a), readJson(b));
  console.log(JSON.stringify(d, null, 2));
  process.exit(d.distance === 0 ? 0 : 2);
}

if (cmd === 'promote') {
  const input = flag(rest, '--in');
  const out = flag(rest, '--out');
  if (!input || !out) {
    usage();
    process.exit(1);
  }
  let dna = readJson(input);
  dna.mode = 'certified';
  dna.created_at = new Date().toISOString();
  const secret = resolveSecret(rest);
  if (secret) {
    dna = signDna(dna, { secret, key_id: flag(rest, '--key-id') || 'default' });
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(dna, null, 2) + '\n');
  console.log(
    secret
      ? `Promoted + signed certificate → ${out}`
      : `Promoted certificate → ${out}`,
  );
  process.exit(0);
}

if (cmd === 'verify') {
  const input = flag(rest, '--in');
  if (!input) {
    usage();
    process.exit(1);
  }
  const dna = readJson(input);
  const secret = resolveSecret(rest);
  const result = verifyDna(dna, {
    secret: secret || undefined,
    key_id: flag(rest, '--key-id'),
    require: hasFlag(rest, '--require'),
  });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 2);
}

console.error(`Unknown command: ${cmd}`);
usage();
process.exit(1);
