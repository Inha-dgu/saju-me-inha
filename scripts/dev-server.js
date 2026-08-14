const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const port = Number(process.env.PORT || 3000);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  const candidates = [
    path.join(root, 'dist', pathname),
    path.join(root, pathname),
  ];

  const filePath = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!filePath) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(filePath));
});

server.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
