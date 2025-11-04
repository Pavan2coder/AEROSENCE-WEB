const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = process.cwd();

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function send404(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('404 Not Found');
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  // Lightweight health endpoint to verify server is running
  if (reqPath === '/__health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', root: ROOT }));
    return;
  }
  if (reqPath === '/') reqPath = '/aero.html';
  const filePath = path.join(ROOT, reqPath);

  // Prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    send404(res);
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      send404(res);
      return;
    }
    if (stats.isDirectory()) {
      send404(res);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mime[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => send404(res));
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Static server serving ${ROOT} on 0.0.0.0:${PORT}`);
});

module.exports = server;
