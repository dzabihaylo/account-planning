const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const db = require('./db');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const APP_PASSWORD = process.env.APP_PASSWORD;
const PORT = process.env.PORT || 3000;

const GD_CONTEXT = 'You are an account intelligence assistant for Grid Dynamics sales team. Grid Dynamics is a publicly traded enterprise AI and digital transformation consultancy. Key facts about Grid Dynamics: Founded 2006, HQ in Roseville CA, offices including Detroit MI. Dave Zabihaylo is Senior Director GTM Automotive based in Detroit, owns the Ford account, and is building the automotive go-to-market. Grid Dynamics has deep Google Cloud, AWS, Snowflake, and AI engineering expertise. Differentiation vs large Indian SIs (HCL, Cognizant, Infosys, Wipro): AI-native delivery, senior engineering talent, consultancy approach not body-shop, Google Cloud partnership. Answer concisely and with specific actionable sales intelligence. Do not use em dashes or double hyphens. Use bullet points only when listing multiple items.';

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

const MAX_BODY = 1024 * 1024; // 1 MB

function readBody(req, res, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > MAX_BODY) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request body too large' }));
      req.destroy();
    }
  });
  req.on('end', () => {
    if (!req.destroyed) callback(body);
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);

  // CORS: Only allow same-origin requests (SPA served from same origin).
  // No Access-Control-Allow-Origin header needed for same-origin.

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Login form submission
  if (req.method === 'POST' && parsed.pathname === '/login') {
    readBody(req, res, (body) => {
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

  // Chat API routes (must match before generic /api/accounts/:id)
  const chatMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)\/chat$/);

  // GET /api/accounts/:id/chat - get chat history
  if (req.method === 'GET' && chatMatch) {
    const messages = db.getChatMessages(chatMatch[1]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(messages));
    return;
  }

  // POST /api/accounts/:id/chat - save a chat message
  if (req.method === 'POST' && chatMatch) {
    readBody(req, res, (body) => {
      let parsed_body;
      try {
        parsed_body = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      const { role, content } = parsed_body;
      if (!role || !content || !['user', 'assistant'].includes(role)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'role (user|assistant) and content are required' }));
        return;
      }
      const msg = db.addChatMessage(chatMatch[1], role, content);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(msg));
    });
    return;
  }

  // DELETE /api/accounts/:id/chat - clear chat history
  if (req.method === 'DELETE' && chatMatch) {
    db.clearChatMessages(chatMatch[1]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Account API routes
  const accountMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)$/);

  // GET /api/accounts - list all active accounts
  if (req.method === 'GET' && parsed.pathname === '/api/accounts') {
    const accounts = db.getAccounts();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(accounts));
    return;
  }

  // GET /api/accounts/:id - get single account
  if (req.method === 'GET' && accountMatch) {
    const account = db.getAccount(accountMatch[1]);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Account not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(account));
    return;
  }

  // POST /api/accounts - create new account
  if (req.method === 'POST' && parsed.pathname === '/api/accounts') {
    readBody(req, res, (body) => {
      try {
        const data = JSON.parse(body);
        if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Name is required' }));
          return;
        }
        const account = db.createAccount(data);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(account));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // PUT /api/accounts/:id - update account
  if (req.method === 'PUT' && accountMatch) {
    readBody(req, res, (body) => {
      try {
        const data = JSON.parse(body);
        const account = db.updateAccount(accountMatch[1], data);
        if (!account) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Account not found' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(account));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // DELETE /api/accounts/:id - soft delete account
  // ID format already validated by route regex /^\/api\/accounts\/([a-z0-9-]+)$/
  if (req.method === 'DELETE' && accountMatch) {
    const result = db.deleteAccount(accountMatch[1]);
    if (!result) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Account not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // POST /api/accounts/:id/restore - restore soft-deleted account
  const restoreMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)\/restore$/);
  if (req.method === 'POST' && restoreMatch) {
    const account = db.restoreAccount(restoreMatch[1]);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Account not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(account));
    return;
  }

  // Proxy endpoint: POST /api/claude
  if (req.method === 'POST' && parsed.pathname === '/api/claude') {
    readBody(req, res, (body) => {
      let parsed_body;
      try {
        parsed_body = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      // If account_id is provided, build system prompt from DB
      if (parsed_body.account_id) {
        const acct = db.getAccount(parsed_body.account_id);
        if (acct) {
          const sysPrompt = GD_CONTEXT + '\n\nACCOUNT: ' + acct.name + '\nSECTOR: ' + acct.sector + '\nHQ: ' + acct.hq + '\nREVENUE: ' + acct.revenue + '\nEMPLOYEES: ' + acct.employees + '\n\nACCOUNT INTELLIGENCE:\n' + acct.context;
          parsed_body.system = sysPrompt;
        }
        delete parsed_body.account_id;
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
