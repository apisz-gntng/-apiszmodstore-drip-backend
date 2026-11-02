const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DRIP_API_KEY = process.env.DRIP_API_KEY;
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://apiszmod-site.lagasawahakun.workers.dev';
const ALLOWED_PATHS = new Set([
  '/api/v1/me',
  '/api/v1/balance',
  '/api/v1/products',
  '/api/v1/pricing',
  '/api/v1/stock',
  '/api/v1/orders'
]);

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const cors = {
    'Access-Control-Allow-Origin': SITE_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
  if (origin && origin !== SITE_ORIGIN) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Origin tidak diizinkan');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }
  if (req.method !== 'GET') {
    res.writeHead(405, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method tidak diizinkan');
  }
  const incoming = new URL(req.url, `http://${req.headers.host}`);
  if (incoming.pathname === '/' || incoming.pathname === '/health') {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ ok: true, service: 'APISZMODSTORE DRIP proxy' }));
  }
  if (!ALLOWED_PATHS.has(incoming.pathname)) {
    res.writeHead(403, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Endpoint tidak diizinkan');
  }
  if (!DRIP_API_KEY) {
    res.writeHead(500, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('DRIP_API_KEY belum diatur di environment hosting');
  }
  const target = new URL('https://dripclientofficial.dev' + incoming.pathname + incoming.search);
  const proxyReq = https.request(target, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${DRIP_API_KEY}`, 'Accept': 'application/json' }
  }, proxyRes => {
    res.writeHead(proxyRes.statusCode || 502, {
      ...cors,
      'Content-Type': proxyRes.headers['content-type'] || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Gagal menghubungi supplier');
  });
  proxyReq.end();
});

server.listen(PORT, '0.0.0.0', () => console.log(`DRIP proxy listening on ${PORT}`));
