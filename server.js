const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const APP_PASSWORD = process.env.APP_PASSWORD;
const PORT = process.env.PORT || 3000;

if (!API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set.');
  process.exit(1);
}

if (!APP_PASSWORD) {
  console.error('ERROR: APP_PASSWORD environment variable is not set.');
  process.exit(1);
}

function getCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || '';
  header.split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    if (k) cookies[k.trim()] = v.join('=').trim();
  });
  return cookies;
}

function isAuthenticated(req) {
  const cookies = getCookies(req);
  return cookies['gd_auth'] === APP_PASSWORD;
}

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Grid Dynamics Intel Hub</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #080C16; color: #EEF2FF; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .box { background: #141B2D; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 40px; width: 360px; }
  .logo { font-size: 12px; font-weight: 500; color: #7C8DB5; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 24px; }
  .logo span { color: #60A5FA; }
  h1 { font-size: 20px; font-weight: 400; margin-bottom: 6px; }
  p { font-size: 13px; color: #7C8DB5; margin-bottom: 28px; }
  input { width: 100%; background: #1A2236; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 10px 14px; font-size: 14px; color: #EEF2FF; font-family: 'DM Sans', sans-serif; outline: none; margin-bottom: 12px; }
  input:focus { border-color: #3B82F6; }
  button { width: 100%; background: #3B82F6; border: none; border-radius: 6px; padding: 10px; font-size: 14px; font-weight: 500; color: white; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  button:hover { background: #2563EB; }
  .error { font-size: 12px; color: #EF4444; margin-top: -6px; margin-bottom: 12px; display: none; }
  .error.show { display: block; }
</style>
</head>
<body>
<div class="box">
  <div class="logo">Grid Dynamics <span>/ Intel Hub</span></div>
  <h1>Sign in</h1>
  <p>Enter the access password to continue.</p>
  <form method="POST" action="/login">
    <input type="password" name="password" placeholder="Password" autofocus />
    <button type="submit">Continue</button>
  </form>
</div>
</body>
</html>`;

const LOGIN_ERROR_PAGE = LOGIN_PAGE.replace('<form method="POST"', '<p style="font-size:12px;color:#EF4444;margin-bottom:12px">Incorrect password.</p><form method="POST"');

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Login form submission
  if (req.method === 'POST' && parsed.pathname === '/login') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const submitted = params.get('password');
      if (submitted === APP_PASSWORD) {
        res.writeHead(302, {
          'Set-Cookie': `gd_auth=${APP_PASSWORD}; Path=/; HttpOnly; SameSite=Strict`,
          'Location': '/'
        });
        res.end();
      } else {
        res.writeHead(401, { 'Content-Type': 'text/html' });
        res.end(LOGIN_ERROR_PAGE);
      }
    });
    return;
  }

  // Show login page if not authenticated
  if (!isAuthenticated(req)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(LOGIN_PAGE);
    return;
  }

  // Proxy endpoint: POST /api/claude
  if (req.method === 'POST' && parsed.pathname === '/api/claude') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let parsed_body;
      try {
        parsed_body = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const payload = JSON.stringify(parsed_body);

      const options = {
        hostname: 'api.anthropic.com',
        port: 443,
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const proxy = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => { data += chunk; });
        apiRes.on('end', () => {
          res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });

      proxy.on('error', (e) => {
        console.error('Anthropic API error:', e.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upstream API error', detail: e.message }));
      });

      proxy.write(payload);
      proxy.end();
    });
    return;
  }

  // Serve the HTML app
  if (req.method === 'GET' && (parsed.pathname === '/' || parsed.pathname === '/index.html')) {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('index.html not found.');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Grid Dynamics Intel Hub');
  console.log('  Running at http://localhost:' + PORT);
  console.log('  Password protection: enabled');
  console.log('');
});
