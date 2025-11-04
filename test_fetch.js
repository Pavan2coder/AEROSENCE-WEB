const http = require('http');

function fetch(path, host='127.0.0.1', port=8080) {
  return new Promise((resolve, reject) => {
    const options = { host, port, path, method: 'GET', timeout: 5000 };
    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; if (body.length > 1000) req.destroy(); });
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

(async () => {
  try {
    console.log('Fetching static /__health (port 8080)');
    const s = await fetch('/__health', '127.0.0.1', 8080);
    console.log('Static status:', s.statusCode);
    console.log('Static body (first 200 chars):', s.body.slice(0,200));
  } catch (e) {
    console.error('Static fetch failed:', e.message);
  }

  try {
    console.log('Fetching aero.html (static)');
    const s2 = await fetch('/aero.html', '127.0.0.1', 8080);
    console.log('aero.html status:', s2.statusCode);
    console.log('aero.html head:', s2.body.slice(0,300));
  } catch (e) {
    console.error('aero.html fetch failed:', e.message);
  }

  try {
    console.log('Fetching backend /health (port 4000)');
    const b = await fetch('/health', '127.0.0.1', 4000);
    console.log('Backend status:', b.statusCode);
    console.log('Backend body:', b.body);
  } catch (e) {
    console.error('Backend fetch failed:', e.message);
  }
})();
