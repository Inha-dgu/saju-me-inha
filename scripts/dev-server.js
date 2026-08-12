const http = require('http');
const fs = require('fs');
const path = require('path');
const { callGemini } = require('../lib/gemini-server');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
const port = Number(process.env.PORT || 3000);

function loadEnvFile() {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[trimmed.slice(0, eq).trim()] = value;
  }
  return out;
}

const fileEnv = loadEnvFile();
const apiKey = process.env.GEMINI_API_KEY || fileEnv.GEMINI_API_KEY || '';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/api/interpret') {
    if (req.method === 'OPTIONS') {
      return send(res, 204, '', {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
    }
    if (req.method !== 'POST') {
      return send(res, 405, JSON.stringify({ error: 'POST만 허용됩니다.' }), {
        'Content-Type': 'application/json; charset=utf-8',
      });
    }
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || '{}');
      const text = await callGemini(apiKey, body.sajuText);
      return send(res, 200, JSON.stringify({ text }), {
        'Content-Type': 'application/json; charset=utf-8',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '해석 요청에 실패했습니다.';
      return send(res, 502, JSON.stringify({ error: message }), {
        'Content-Type': 'application/json; charset=utf-8',
      });
    }
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  const candidates = [
    path.join(root, pathname),
    path.join(root, 'dist', pathname),
  ];

  const filePath = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!filePath) {
    return send(res, 404, 'Not Found');
  }

  const ext = path.extname(filePath);
  send(res, 200, fs.readFileSync(filePath), {
    'Content-Type': mime[ext] || 'application/octet-stream',
  });
});

server.listen(port, () => {
  console.log(`http://localhost:${port}`);
  if (!apiKey) console.warn('[warn] GEMINI_API_KEY missing in .env');
});
