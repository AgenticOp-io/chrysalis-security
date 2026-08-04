import http from 'node:http';

const port = Number(process.env.PORT || 4090);
const host = process.env.HOST || '127.0.0.1';

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  res.setHeader('content-type', 'application/json');

  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.end(JSON.stringify({ ok: true, service: 'demo-api' }));
    return;
  }
  if (url.pathname === '/api/items' && req.method === 'GET') {
    res.end(JSON.stringify({ items: [{ id: 1, name: 'alpha' }] }));
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
