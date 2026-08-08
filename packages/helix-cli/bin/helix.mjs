#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  learnFromObservations,
  diffDna,
  verifyDna,
  verifyParentChain,
  promoteDna,
  reportDna,
  assessReadiness,
  countShadowHoles,
} from '../../dna-core/index.mjs';
import {
  seedDnaFromCwlFile,
  stripBridgeEnvelope,
  compareCwlSurfaceToDna,
} from '../../cwl-bridge/index.mjs';

function usage() {
  console.log(`Helix CLI — Chrysalis security fork

Usage:
  helix learn      --in <observations.ndjson> --out <dna.json> [--app-id name]
  helix report     --in <dna.json> [--observations <n>] [--shadow-holes <n>]
  helix ready      --in <dna.json> --target shadow|enforce
                   [--min-routes n] [--require-signed]
                   [--shadow-log <shadow.ndjson>] [--shadow-holes n] [--max-shadow-holes n]
  helix diff       --a <dna.json> --b <dna.json>
  helix promote    --in <draft.json> --out <certified.json>
                   [--from <prev-certified.json>]   # default: --out if it already exists
                   [--require-from] [--no-diff]
                   [--alg hmac-sha256|ed25519]
                   [--key <secret|pem>|--key-file <path>] [--key-id id]
  helix verify     --in <certified.json> [--parent <prev-certified.json>]
                   [--alg hmac-sha256|ed25519]
                   [--key <secret|pem>|--key-file <path>] [--key-id id] [--require]
  helix seed-cwl   --in <routes.cwl> --out <draft.json> [--app-id name] [--host default] [--strip-bridge]
  helix compare-cwl --cwl <routes.cwl|seed.json> --dna <certified.json>

Signing: hmac-sha256 (shared secret) or ed25519 (PEM/raw private promote, public verify).
Env: HELIX_DNA_KEY, HELIX_DNA_KEY_ID, HELIX_DNA_ALG. Canon: docs/SIGNED-DNA.md
Lifecycle: docs/CERT-LIFECYCLE.md · Product: docs/PRODUCT.md · Modes: docs/MODES.md
CWL bridge: RFC-0022 (chrysalis-cwl). Canon: docs/CANON.md
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

function resolveAlg(rest) {
  const fromFlag = flag(rest, '--alg');
  const fromEnv = process.env.HELIX_DNA_ALG || '';
  return String(fromFlag || fromEnv || 'hmac-sha256').toLowerCase();
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
  console.log(JSON.stringify(reportDna(dna), null, 2));
  process.exit(0);
}

if (cmd === 'report') {
  const input = flag(rest, '--in');
  if (!input) {
    usage();
    process.exit(1);
  }
  const obs = flag(rest, '--observations');
  const holes = flag(rest, '--shadow-holes');
  const report = reportDna(readJson(input), {
    observations: obs != null ? Number(obs) : undefined,
    shadowHoles: holes != null ? Number(holes) : undefined,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (cmd === 'ready') {
  const input = flag(rest, '--in');
  const target = flag(rest, '--target');
  if (!input || !['shadow', 'enforce'].includes(String(target))) {
    usage();
    process.exit(1);
  }
  const holes = flag(rest, '--shadow-holes');
  const maxHoles = flag(rest, '--max-shadow-holes');
  const minRoutes = flag(rest, '--min-routes');
  const shadowLog = flag(rest, '--shadow-log');
  let shadowHoles = holes != null ? Number(holes) : undefined;
  let shadowMeta = null;
  if (shadowLog) {
    shadowMeta = countShadowHoles(shadowLog);
    if (shadowHoles == null) shadowHoles = shadowMeta.count;
  }
  const result = assessReadiness(target, readJson(input), {
    minRoutes: minRoutes != null ? Number(minRoutes) : undefined,
    requireSigned: hasFlag(rest, '--require-signed'),
    shadowHoles,
    maxShadowHoles: maxHoles != null ? Number(maxHoles) : target === 'enforce' && shadowHoles != null ? 0 : undefined,
  });
  if (shadowMeta) result.shadow_log = shadowMeta;
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 2);
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
  const draft = readJson(input);
  let fromPath = flag(rest, '--from');
  // Re-promote UX: if --out already exists and --from omitted, diff against current cert
  if (!fromPath && fs.existsSync(out) && path.resolve(input) !== path.resolve(out)) {
    fromPath = out;
  }
  if (hasFlag(rest, '--require-from') && !fromPath) {
    console.error('promote --require-from needs --from (or an existing --out to replace)');
    process.exit(1);
  }
  const from = fromPath ? readJson(fromPath) : null;
  const secret = resolveSecret(rest);
  const alg = resolveAlg(rest);
  const { dna, diff } = promoteDna(draft, {
    from,
    sign: secret
      ? {
          alg,
          secret,
          privateKey: alg === 'ed25519' ? secret : undefined,
          key_id: flag(rest, '--key-id') || process.env.HELIX_DNA_KEY_ID || 'default',
        }
      : null,
  });
  if (diff && !hasFlag(rest, '--no-diff')) {
    console.log(fromPath ? `Promote diff vs ${fromPath}:` : 'Promote diff:');
    console.log(JSON.stringify(diff, null, 2));
  }
  if (from) {
    const chain = verifyParentChain(dna, from);
    if (!chain.ok) {
      console.error(JSON.stringify(chain, null, 2));
      process.exit(2);
    }
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(dna, null, 2) + '\n');
  console.log(
    secret
      ? `Promoted + signed (${dna.signature?.alg || alg}) certificate → ${out}` +
          (dna.parent_hash ? ` parent_hash=${dna.parent_hash.slice(0, 12)}…` : '')
      : `Promoted certificate → ${out}` +
          (dna.parent_hash ? ` parent_hash=${dna.parent_hash.slice(0, 12)}…` : ''),
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
  const algHint = flag(rest, '--alg') || process.env.HELIX_DNA_ALG || dna?.signature?.alg;
  const result = verifyDna(dna, {
    secret: secret || undefined,
    publicKey: algHint === 'ed25519' || dna?.signature?.alg === 'ed25519' ? secret || undefined : undefined,
    key_id: flag(rest, '--key-id') || process.env.HELIX_DNA_KEY_ID || undefined,
    require: hasFlag(rest, '--require'),
  });
  const parentPath = flag(rest, '--parent');
  if (parentPath) {
    const chain = verifyParentChain(dna, readJson(parentPath));
    result.parent_chain = chain;
    if (!chain.ok) result.ok = false;
  }
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 2);
}

if (cmd === 'seed-cwl') {
  const input = flag(rest, '--in');
  const out = flag(rest, '--out');
  if (!input || !out) {
    usage();
    process.exit(1);
  }
  const seeded = await seedDnaFromCwlFile(input, {
    app_id: flag(rest, '--app-id') || undefined,
    host: flag(rest, '--host') || 'default',
    cwlRoot: flag(rest, '--cwl-root') || process.env.CHRYSALIS_CWL_ROOT,
  });
  const doc = hasFlag(rest, '--strip-bridge') ? stripBridgeEnvelope(seeded) : seeded;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(doc, null, 2) + '\n');
  console.log(
    `Seeded draft DNA from CWL (${doc.routes.length} routes) → ${out}` +
      (doc.bridge ? ' (bridge envelope included)' : ''),
  );
  process.exit(0);
}

if (cmd === 'compare-cwl') {
  const cwlIn = flag(rest, '--cwl');
  const dnaIn = flag(rest, '--dna');
  if (!cwlIn || !dnaIn) {
    usage();
    process.exit(1);
  }
  let cwlSide;
  if (String(cwlIn).endsWith('.json')) {
    cwlSide = readJson(cwlIn);
  } else {
    cwlSide = await seedDnaFromCwlFile(cwlIn, {
      cwlRoot: flag(rest, '--cwl-root') || process.env.CHRYSALIS_CWL_ROOT,
    });
  }
  const live = readJson(dnaIn);
  const report = compareCwlSurfaceToDna(cwlSide, live);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 2);
}

console.error(`Unknown command: ${cmd}`);
usage();
process.exit(1);
