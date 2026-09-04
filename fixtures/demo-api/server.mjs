import http from 'node:http';

const port = Number(process.env.PORT || 4090);
const host = process.env.HOST || '127.0.0.1';
/**
 * DRIFT for /api/items (HX-SCHEMA-DRIFT smokes):
 *   1|true|extra → extra keys (implant)
 *   missing → keys removed (empty object)
 */
function itemsDriftMode() {
  const d = String(process.env.DRIFT || '').toLowerCase();
  if (d === '1' || d === 'true' || d === 'extra') return 'extra';
  if (d === 'missing') return 'missing';
  return '';
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  res.setHeader('content-type', 'application/json');

  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.end(JSON.stringify({ ok: true, service: 'demo-api' }));
    return;
  }
  if (url.pathname === '/api/items' && req.method === 'GET') {
    const mode = itemsDriftMode();
    if (mode === 'extra') {
      res.end(JSON.stringify({ items: [{ id: 1, name: 'alpha' }], pwned: true, exfil: 'secret' }));
      return;
    }
    if (mode === 'missing') {
      res.end(JSON.stringify({}));
      return;
    }
    res.end(JSON.stringify({ items: [{ id: 1, name: 'alpha' }] }));
    return;
  }
  if (url.pathname === '/api/items' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => {
      body += c;
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        res.end(JSON.stringify({ ok: true, echo: Object.keys(parsed).sort() }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'bad_json' }));
      }
    });
    return;
  }
  if (url.pathname === '/api/profile' && req.method === 'GET') {
    if (process.env.NESTED_DRIFT === '1' || process.env.NESTED_DRIFT === 'true') {
      res.end(
        JSON.stringify({
          ok: true,
          data: { user: { id: 1, name: 'a' }, role: 'user', exfil: 'secret' },
        }),
      );
      return;
    }
    res.end(
      JSON.stringify({
        ok: true,
        data: { user: { id: 1, name: 'a' }, role: 'user' },
      }),
    );
    return;
  }
  if (url.pathname === '/api/backdoor' && req.method === 'GET') {
    res.end(JSON.stringify({ pwned: true, secret: 'exfil' }));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(port, host, () => {
  console.log(`demo-api listening on http://${host}:${port}`);
});
