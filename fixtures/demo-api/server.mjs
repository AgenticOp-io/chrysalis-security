import http from 'node:http';

const port = Number(process.env.PORT || 4090);
const host = process.env.HOST || '127.0.0.1';
/** When set, /api/items returns drifted JSON keys (for HX-SCHEMA-DRIFT smokes). */
const drift = process.env.DRIFT === '1' || process.env.DRIFT === 'true';

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  res.setHeader('content-type', 'application/json');

  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.end(JSON.stringify({ ok: true, service: 'demo-api' }));
    return;
  }
  if (url.pathname === '/api/items' && req.method === 'GET') {
    if (drift) {
      res.end(JSON.stringify({ items: [{ id: 1, name: 'alpha' }], pwned: true, exfil: 'secret' }));
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
