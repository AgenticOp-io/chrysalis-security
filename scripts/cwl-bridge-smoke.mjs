#!/usr/bin/env node
/**
 * RFC-0022 smoke: seed DNA from CWL language gold + shape compare.
 * Optional: skips cleanly if chrysalis-cwl is absent (DNA firewall must not require CWL).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveCwlRoot,
  seedDnaFromCwlFile,
  stripBridgeEnvelope,
  pathTemplateShapeEqual,
  compareCwlSurfaceToDna,
} from '../packages/cwl-bridge/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

let cwlRoot;
try {
  cwlRoot = resolveCwlRoot();
} catch {
  console.log(
    'CWL_BRIDGE_SMOKE_SKIP (chrysalis-cwl not found — set CHRYSALIS_CWL_ROOT or keep engines/chrysalis-cwl sibling)',
  );
  process.exit(0);
}

const goldCwl = path.join(cwlRoot, 'fixtures', 'language-gold', '24-dna-bridge', 'routes.cwl');
const goldExpected = path.join(
  cwlRoot,
  'fixtures',
  'language-gold',
  '24-dna-bridge',
  'expected-dna.json',
);

if (!fs.existsSync(goldCwl) || !fs.existsSync(goldExpected)) {
  console.log(
    `CWL_BRIDGE_SMOKE_SKIP (missing gold under ${path.join(cwlRoot, 'fixtures/language-gold/24-dna-bridge')})`,
  );
  process.exit(0);
}

assert(fs.existsSync(goldCwl), `missing CWL gold: ${goldCwl}`);
assert(fs.existsSync(goldExpected), `missing expected DNA gold: ${goldExpected}`);

const expected = JSON.parse(fs.readFileSync(goldExpected, 'utf8'));

const seeded = await seedDnaFromCwlFile(goldCwl, {
  app_id: 'dna-bridge-gold',
  host: 'default',
  created_at: expected.created_at,
  mode: 'draft',
  fixture: 'fixtures/language-gold/24-dna-bridge/routes.cwl',
  cwlRoot,
});

assert(seeded.schema === 'app-dna-v1', 'schema');
assert(seeded.mode === 'draft', 'mode draft');
assert(seeded.routes.length === expected.routes.length, 'route count');

for (let i = 0; i < expected.routes.length; i++) {
  const e = expected.routes[i];
  const g = seeded.routes.find(
    (r) => r.method === e.method && r.path_template === e.path_template,
  );
  assert(g, `missing seeded route ${e.method} ${e.path_template}`);
  assert(g.host === e.host, `host ${e.path_template}`);
  assert(g.content_class === e.content_class, `content_class ${e.path_template}`);
  assert(
    (g.response_key_fingerprint || null) === (e.response_key_fingerprint || null),
    `fingerprint ${e.path_template}: got ${g.response_key_fingerprint}`,
  );
}

assert(seeded.bridge?.kind === 'cwl-surface-seed', 'bridge kind');
assert(seeded.bridge?.rfc === '0022', 'bridge rfc');
assert(
  seeded.bridge.annotations.length === expected.bridge.annotations.length,
  'annotation count',
);

for (const ea of expected.bridge.annotations) {
  const ga = seeded.bridge.annotations.find(
    (a) => a.method === ea.method && a.path_template === ea.path_template,
  );
  assert(ga, `annotation ${ea.method} ${ea.path_template}`);
  assert(ga.cwl_surface === ea.cwl_surface, `surface ${ea.path_template}`);
  assert(
    JSON.stringify(ga.cwl_effects) === JSON.stringify(ea.cwl_effects),
    `effects ${ea.path_template}`,
  );
}

const certifiedShape = stripBridgeEnvelope(seeded);
assert(!('bridge' in certifiedShape), 'strip bridge for certify');
assert(certifiedShape.routes.length === 4, 'certified routes');

assert(pathTemplateShapeEqual('/items/:id', '/items/:id') === true, 'exact shape');
assert(pathTemplateShapeEqual('/items/:userId', '/items/:id') === true, 'named vs :id');
assert(pathTemplateShapeEqual('/items/:id', '/items/42') === false, 'param vs static');
assert(pathTemplateShapeEqual('/a/:id', '/b/:id') === false, 'static mismatch');

const live = {
  schema: 'app-dna-v1',
  app_id: 'live',
  created_at: expected.created_at,
  mode: 'certified',
  parent_hash: null,
  routes: [
    ...seeded.routes.map((r) => ({
      ...r,
      // learned-style collapse for one route
      path_template:
        r.path_template === '/items/:id' ? '/items/:id' : r.path_template,
    })),
  ],
  holes: [],
};

const cmp = compareCwlSurfaceToDna(seeded, live);
assert(cmp.ok === true, 'cutover ok');
assert(cmp.cutover === 'cwl_surface_subseteq_dna', 'cutover label');

const incomplete = {
  ...live,
  routes: live.routes.filter((r) => r.path_template !== '/login'),
};
const bad = compareCwlSurfaceToDna(seeded, incomplete);
assert(bad.ok === false, 'missing login fails cutover');
assert(bad.missing_in_dna.some((m) => m.path_template === '/login'), 'reports /login');

const outDir = path.join(ROOT, 'data', 'cwl-bridge-smoke');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'seeded.dna.json'), JSON.stringify(seeded, null, 2) + '\n');
fs.writeFileSync(
  path.join(outDir, 'certified-shape.dna.json'),
  JSON.stringify(certifiedShape, null, 2) + '\n',
);

console.log('CWL_BRIDGE_SMOKE_OK');
