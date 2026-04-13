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

  // Contact API routes
  const contactsMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)\/contacts$/);
  const contactMatch = parsed.pathname.match(/^\/api\/contacts\/(\d+)$/);
  const outreachMatch = parsed.pathname.match(/^\/api\/contacts\/(\d+)\/outreach$/);
  const generateMatch = parsed.pathname.match(/^\/api\/contacts\/(\d+)\/generate$/);

  // POST /api/contacts/:id/generate - AI generate rationale + warm path (must be before generic contactMatch)
  if (req.method === 'POST' && generateMatch) {
    const contactId = parseInt(generateMatch[1]);
    const contact = db.getContact(contactId);
    if (!contact) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Contact not found' }));
      return;
    }
    const account = db.getAccount(contact.account_id);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Account not found' }));
      return;
    }

    const systemPrompt = GD_CONTEXT + '\n\nACCOUNT: ' + account.name + '\nSECTOR: ' + account.sector + '\nHQ: ' + account.hq + '\nREVENUE: ' + account.revenue + '\n\nACCOUNT INTELLIGENCE:\n' + account.context;
    const userMessage = 'You are helping a sales team at Grid Dynamics prepare outreach to a specific contact.\n\nCONTACT: ' + contact.name + '\nTITLE: ' + contact.title + '\nINFLUENCE LEVEL: ' + contact.influence + '\n\nProvide two sections separated by the exact delimiter ---SECTION_BREAK---\n\nSECTION 1 - OUTREACH RATIONALE: Why would this person care about Grid Dynamics? What specific problems can GD solve for them?\n\nSECTION 2 - WARM PATH: How to reach this person. Mutual connections, shared networks, events, referral paths, or direct channels. Be specific and actionable.';

    const payload = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

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
        try {
          const parsed_resp = JSON.parse(data);
          if (apiRes.statusCode !== 200) {
            res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(data);
            return;
          }
          const text = parsed_resp.content && parsed_resp.content[0] && parsed_resp.content[0].text || '';
          const parts = text.split('---SECTION_BREAK---');
          let ai_rationale, warm_path;
          if (parts.length >= 2) {
            ai_rationale = parts[0].trim();
            warm_path = parts[1].trim();
          } else {
            ai_rationale = text.trim();
            warm_path = '';
          }
          db.updateContactAI(contactId, { ai_rationale: ai_rationale, warm_path: warm_path });
          const updated = db.getContact(contactId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updated));
        } catch (e) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to parse AI response', detail: e.message }));
        }
      });
    });

    proxy.on('error', (e) => {
      console.error('Anthropic API error:', e.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream API error', detail: e.message }));
    });

    proxy.write(payload);
    proxy.end();
    return;
  }

  // POST /api/contacts/:id/outreach - log an outreach attempt (must be before generic contactMatch)
  if (req.method === 'POST' && outreachMatch) {
    readBody(req, res, (body) => {
      let parsed_body;
      try {
        parsed_body = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      const { date, channel, outcome, notes } = parsed_body;
      if (!date || typeof date !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'date is required' }));
        return;
      }
      const validChannels = ['email', 'linkedin', 'phone', 'meeting', 'other'];
      if (!channel || !validChannels.includes(channel)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'channel must be one of: ' + validChannels.join(', ') }));
        return;
      }
      const validOutcomes = ['connected', 'no response', 'declined', 'meeting scheduled'];
      if (!outcome || !validOutcomes.includes(outcome)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'outcome must be one of: ' + validOutcomes.join(', ') }));
        return;
      }
      const contactId = parseInt(outreachMatch[1]);
      const contact = db.getContact(contactId);
      if (!contact) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Contact not found' }));
        return;
      }
      const entry = db.addOutreachEntry(contactId, { date: date, channel: channel, outcome: outcome, notes: notes || '' });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(entry));
    });
    return;
  }

  // GET /api/contacts/:id - get single contact with outreach history
  if (req.method === 'GET' && contactMatch) {
    const contact = db.getContact(parseInt(contactMatch[1]));
    if (!contact) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Contact not found' }));
      return;
    }
    const outreach = db.getOutreachLog(contact.id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Object.assign({}, contact, { outreach: outreach })));
    return;
  }

  // PUT /api/contacts/:id - update contact fields
  if (req.method === 'PUT' && contactMatch) {
    readBody(req, res, (body) => {
      let parsed_body;
      try {
        parsed_body = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      const updated = db.updateContact(parseInt(contactMatch[1]), parsed_body);
      if (!updated) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Contact not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(updated));
    });
    return;
  }

  // DELETE /api/contacts/:id - soft delete contact
  if (req.method === 'DELETE' && contactMatch) {
    const result = db.deleteContact(parseInt(contactMatch[1]));
    if (!result) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Contact not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // GET /api/accounts/:id/contacts - list contacts for an account
  if (req.method === 'GET' && contactsMatch) {
    const contacts = db.getContacts(contactsMatch[1]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(contacts));
    return;
  }

  // POST /api/accounts/:id/contacts - create a new contact
  if (req.method === 'POST' && contactsMatch) {
    readBody(req, res, (body) => {
      let parsed_body;
      try {
        parsed_body = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      const { name, title, influence, role, email, linkedin, phone } = parsed_body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'name is required' }));
        return;
      }
      if (!title || typeof title !== 'string' || !title.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'title is required' }));
        return;
      }
      const validInfluence = ['Champion', 'Evaluator', 'Blocker'];
      if (!influence || !validInfluence.includes(influence)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'influence must be one of: ' + validInfluence.join(', ') }));
        return;
      }
      const account = db.getAccount(contactsMatch[1]);
      if (!account) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Account not found' }));
        return;
      }
      const contact = db.createContact({
        account_id: contactsMatch[1],
        name: name,
        title: title,
        role: role || '',
        influence: influence,
        email: email || '',
        linkedin: linkedin || '',
        phone: phone || ''
      });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(contact));
    });
    return;
  }

  // Activity log API routes
  const activityMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)\/activity$/);

  // GET /api/accounts/:id/activity - list activity entries (reverse chronological)
  if (req.method === 'GET' && activityMatch) {
    const account = db.getAccount(activityMatch[1]);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Account not found' }));
      return;
    }
    const entries = db.getActivity(activityMatch[1]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(entries));
    return;
  }

  // POST /api/accounts/:id/activity - create a new activity entry
  if (req.method === 'POST' && activityMatch) {
    readBody(req, res, (body) => {
      let parsed_body;
      try {
        parsed_body = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      const account = db.getAccount(activityMatch[1]);
      if (!account) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Account not found' }));
        return;
      }
      const validTypes = ['meeting', 'call', 'email', 'note', 'other'];
      if (!parsed_body.type || !validTypes.includes(parsed_body.type)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'type must be one of: ' + validTypes.join(', ') }));
        return;
      }
      if (!parsed_body.summary || typeof parsed_body.summary !== 'string' || !parsed_body.summary.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'summary is required' }));
        return;
      }
      const validSources = ['manual', 'ai_debrief'];
      var source = parsed_body.source || 'manual';
      if (!validSources.includes(source)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'source must be one of: ' + validSources.join(', ') }));
        return;
      }
      var linked_contacts = parsed_body.linked_contacts;
      if (linked_contacts && typeof linked_contacts !== 'string') {
        linked_contacts = JSON.stringify(linked_contacts);
      }
      const entry = db.addActivity({
        account_id: activityMatch[1],
        type: parsed_body.type,
        participants: parsed_body.participants || '',
        summary: parsed_body.summary.trim(),
        linked_contacts: linked_contacts || null,
        source: source,
        ai_raw: parsed_body.ai_raw || null
      });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(entry));
    });
    return;
  }

  // AI debrief extraction endpoint
  const debriefMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)\/debrief$/);

  if (req.method === 'POST' && debriefMatch) {
    readBody(req, res, (body) => {
      let parsed_body;
      try {
        parsed_body = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      var debrief_text = parsed_body.text;
      if (!debrief_text || typeof debrief_text !== 'string' || !debrief_text.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'text field is required and must be a non-empty string' }));
        return;
      }

      var account = db.getAccount(debriefMatch[1]);
      if (!account) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Account not found' }));
        return;
      }

      var recentActivity = db.getActivity(debriefMatch[1], 10);
      var contacts = db.getContacts(debriefMatch[1]);

      var systemPrompt = GD_CONTEXT +
        '\n\nACCOUNT: ' + account.name +
        '\nSECTOR: ' + account.sector +
        '\nHQ: ' + account.hq +
        '\nREVENUE: ' + account.revenue +
        '\n\nACCOUNT INTELLIGENCE:\n' + account.context;

      if (recentActivity.length > 0) {
        systemPrompt += '\n\nRECENT ACTIVITY:\n' + recentActivity.map(function(a) {
          return a.created_at + ' [' + a.type + '] ' + a.summary;
        }).join('\n');
      }

      if (contacts.length > 0) {
        systemPrompt += '\n\nKNOWN CONTACTS:\n' + contacts.map(function(c) {
          return c.name + ' - ' + c.title + ' (' + c.influence + ')';
        }).join('\n');
      }

      var userMessage = 'Extract structured activity log entries from the following meeting debrief. ' +
        'Return ONLY valid JSON with no additional text, no markdown code fences. Use this exact format:\n' +
        '{"activities": [{"date": "YYYY-MM-DD", "type": "meeting|call|email|note|other", ' +
        '"participants": "Name (Title), Name (Title)", "summary": "What happened and key takeaways", ' +
        '"action_items": "Next steps"}], ' +
        '"contact_updates": [{"action": "new|update", "name": "Full Name", ' +
        '"title": "Job Title", "influence": "Champion|Evaluator|Blocker", ' +
        '"changes": "what changed (for updates only)"}]}\n\n' +
        'If no contact updates are needed, return an empty contact_updates array.\n' +
        'Embed action items naturally in the summary text.\n\n' +
        'DEBRIEF:\n' + debrief_text;

      var payload = JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      });

      var options = {
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

      var proxy = https.request(options, function(apiRes) {
        var data = '';
        apiRes.on('data', function(chunk) { data += chunk; });
        apiRes.on('end', function() {
          try {
            var parsed_resp = JSON.parse(data);
            if (apiRes.statusCode !== 200) {
              res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
              res.end(data);
              return;
            }
            var text = parsed_resp.content && parsed_resp.content[0] && parsed_resp.content[0].text || '';

            // Try to parse as JSON directly
            var proposals;
            try {
              proposals = JSON.parse(text);
            } catch (e1) {
              // Fallback: try extracting from code fences
              var fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
              if (fenceMatch) {
                try {
                  proposals = JSON.parse(fenceMatch[1].trim());
                } catch (e2) {
                  proposals = null;
                }
              }
            }

            if (!proposals) {
              res.writeHead(422, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Could not parse AI response', raw: text }));
              return;
            }

            // Ensure expected shape
            if (!proposals.activities) proposals.activities = [];
            if (!proposals.contact_updates) proposals.contact_updates = [];

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(proposals));
          } catch (e) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to parse AI response', detail: e.message }));
          }
        });
      });

      proxy.on('error', function(e) {
        console.error('Anthropic API error:', e.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upstream API error', detail: e.message }));
      });

      proxy.write(payload);
      proxy.end();
    });
    return;
  }

  // Private intel API routes
  const intelMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)\/intel$/);

  // GET /api/accounts/:id/intel - list private intel notes (reverse chronological)
  if (req.method === 'GET' && intelMatch) {
    var account = db.getAccount(intelMatch[1]);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Account not found' }));
      return;
    }
    var notes = db.getIntel(intelMatch[1]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(notes));
    return;
  }

  // POST /api/accounts/:id/intel - add a private intel note
  if (req.method === 'POST' && intelMatch) {
    readBody(req, res, (body) => {
      var parsed_body;
      try {
        parsed_body = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      if (!parsed_body.content || typeof parsed_body.content !== 'string' || !parsed_body.content.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'content is required and must be a non-empty string' }));
        return;
      }
      var account = db.getAccount(intelMatch[1]);
      if (!account) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Account not found' }));
        return;
      }
      var note = db.addIntel(intelMatch[1], parsed_body.content.trim());
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(note));
    });
    return;
  }

  // Strategy API routes
  const strategyMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)\/strategy$/);

  // GET /api/accounts/:id/strategy - get current strategy summary
  if (req.method === 'GET' && strategyMatch) {
    var account = db.getAccount(strategyMatch[1]);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Account not found' }));
      return;
    }
    var strategy = db.getStrategy(strategyMatch[1]);
    if (!strategy) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ content: null }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(strategy));
    return;
  }

  // POST /api/accounts/:id/strategy - AI strategy synthesis
  if (req.method === 'POST' && strategyMatch) {
    var account = db.getAccount(strategyMatch[1]);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Account not found' }));
      return;
    }

    // Gather all data sources per D-08
    var activities = db.getActivity(strategyMatch[1], 20);
    var intel = db.getIntel(strategyMatch[1]).slice(0, 20);
    var contacts = db.getContacts(strategyMatch[1]);
    var triggers = db.getTriggers(strategyMatch[1]);
    var chatMessages = db.getChatMessages(strategyMatch[1]);

    // Build system prompt
    var systemPrompt = GD_CONTEXT +
      '\n\nACCOUNT: ' + account.name +
      '\nSECTOR: ' + account.sector +
      '\nHQ: ' + account.hq +
      '\nREVENUE: ' + account.revenue +
      '\n\nACCOUNT INTELLIGENCE:\n' + account.context;

    if (activities.length > 0) {
      systemPrompt += '\n\nPURSUIT ACTIVITY LOG:\n' + activities.map(function(a) {
        return a.created_at + ' [' + a.type + '] ' + a.summary;
      }).join('\n');
    }

    if (intel.length > 0) {
      systemPrompt += '\n\nPRIVATE INTEL NOTES:\n' + intel.map(function(n) {
        return n.created_at + ': ' + n.content;
      }).join('\n');
    }

    if (contacts.length > 0) {
      systemPrompt += '\n\nKEY CONTACTS:\n' + contacts.map(function(c) {
        return c.name + ' - ' + c.title + ' (' + c.influence + ')' +
          (c.ai_rationale ? ' | Rationale: ' + c.ai_rationale.substring(0, 200) : '');
      }).join('\n');
    }

    if (triggers.length > 0) {
      systemPrompt += '\n\nBUYING TRIGGERS:\n' + triggers.map(function(t) {
        return t.created_at + ' [' + t.category + '] ' + t.tag +
          (t.notes ? ' - ' + t.notes : '');
      }).join('\n');
    }

    if (chatMessages.length > 0) {
      systemPrompt += '\n\nRECENT AI CHAT INSIGHTS:\n' + chatMessages.slice(-30).map(function(m) {
        return '[' + m.role + '] ' + m.content.substring(0, 300);
      }).join('\n');
    }

    var userMessage = 'Synthesize a pursuit strategy for this account based on ALL the data above. ' +
      'Structure your response as:\n\n' +
      '**Current Situation**: What we know about this account and where things stand.\n\n' +
      '**Why Now**: What buying triggers or signals make this the right time to engage.\n\n' +
      '**Recommended Approach**: Specific entry points, which contacts to prioritize, what to pitch.\n\n' +
      '**Key Risks**: What could go wrong and how to mitigate.\n\n' +
      '**Next Steps**: Concrete actions to take in the next 2 weeks.\n\n' +
      'Be specific, actionable, and concise. Reference specific people, events, and data points from the intelligence above.';

    var payload = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    var options = {
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

    var proxy = https.request(options, function(apiRes) {
      var data = '';
      apiRes.on('data', function(chunk) { data += chunk; });
      apiRes.on('end', function() {
        try {
          var parsed_resp = JSON.parse(data);
          if (apiRes.statusCode !== 200) {
            res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(data);
            return;
          }
          var text = parsed_resp.content && parsed_resp.content[0] && parsed_resp.content[0].text || '';
          if (!text) {
            res.writeHead(422, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Empty AI response' }));
            return;
          }
          var row = db.upsertStrategy(strategyMatch[1], text);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(row));
        } catch (e) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to parse AI response', detail: e.message }));
        }
      });
    });

    proxy.on('error', function(e) {
      console.error('Anthropic API error:', e.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream API error', detail: e.message }));
    });

    proxy.write(payload);
    proxy.end();
    return;
  }

  // PUT /api/accounts/:id/strategy - save manual edits
  if (req.method === 'PUT' && strategyMatch) {
    readBody(req, res, (body) => {
      var parsed_body;
      try {
        parsed_body = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      if (!parsed_body.content || typeof parsed_body.content !== 'string' || !parsed_body.content.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'content is required and must be a non-empty string' }));
        return;
      }
      var account = db.getAccount(strategyMatch[1]);
      if (!account) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Account not found' }));
        return;
      }
      var updated = db.updateStrategyContent(strategyMatch[1], parsed_body.content.trim());
      if (!updated) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No strategy exists for this account. Generate one first.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(updated));
    });
    return;
  }

  // Buying triggers API routes
  const triggersMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)\/triggers$/);

  // GET /api/accounts/:id/triggers - list buying triggers
  if (req.method === 'GET' && triggersMatch) {
    var account = db.getAccount(triggersMatch[1]);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Account not found' }));
      return;
    }
    var triggers = db.getTriggers(triggersMatch[1]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(triggers));
    return;
  }

  // POST /api/accounts/:id/triggers - add a buying trigger
  if (req.method === 'POST' && triggersMatch) {
    readBody(req, res, (body) => {
      var parsed_body;
      try {
        parsed_body = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      if (!parsed_body.tag || typeof parsed_body.tag !== 'string' || !parsed_body.tag.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'tag is required and must be a non-empty string' }));
        return;
      }
      var validCategories = ['CTO Change', 'Cost Cuts', 'Failed Vendor', 'Reorg', 'M&A', 'Digital Initiative', 'Custom'];
      if (!parsed_body.category || !validCategories.includes(parsed_body.category)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'category must be one of: ' + validCategories.join(', ') }));
        return;
      }
      var account = db.getAccount(triggersMatch[1]);
      if (!account) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Account not found' }));
        return;
      }
      var trigger = db.addTrigger({
        account_id: triggersMatch[1],
        tag: parsed_body.tag.trim(),
        category: parsed_body.category,
        notes: parsed_body.notes || ''
      });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(trigger));
    });
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
