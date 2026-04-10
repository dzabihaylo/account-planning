# External Integrations

**Analysis Date:** 2026-04-10

## APIs & External Services

**AI & Intelligence:**
- Anthropic Claude API - Core AI chat engine for account intelligence
  - SDK/Client: HTTPS proxy via Node.js built-in `https` module
  - Endpoint: `https://api.anthropic.com/v1/messages`
  - Auth: `ANTHROPIC_API_KEY` environment variable sent as `x-api-key` header
  - Model: `claude-sonnet-4-6`
  - Implementation: Server-side proxy in `server.js` (`POST /api/claude`)
  - Request headers:
    - `Content-Type: application/json`
    - `x-api-key: [ANTHROPIC_API_KEY]`
    - `anthropic-version: 2023-06-01`
  - Max tokens per request: 1000
  - System prompt: Grid Dynamics context + full account intelligence pre-loaded per account

## Data Storage

**Databases:**
- None - No persistent database. All account data embedded in `index.html` as JavaScript objects

**File Storage:**
- Local filesystem only
  - `index.html` - Full application and all account data (~108KB)
  - `server.js` - Backend proxy server
  - Served directly from disk via `fs.readFile()` in `server.js`

**Caching:**
- None - No caching layer. Each `index.html` request reads from disk

**Chat History:**
- In-memory per browser session only
- Stored in JavaScript variable `chatHistories` per account ID
- Not persisted to disk or backend
- Reset on page reload

## Authentication & Identity

**Auth Provider:**
- Custom password-based authentication (internal team use only)
  - Implementation: Cookie-based session with password comparison
  - Cookie name: `gd_auth`
  - Cookie attributes: `HttpOnly`, `SameSite=Strict`
  - Password compared server-side in `isAuthenticated()` function (`server.js`, lines 31-34)
  - Login endpoint: `POST /login` accepts form data with password
  - All routes after login check `gd_auth` cookie before serving content

## Monitoring & Observability

**Error Tracking:**
- None detected - No error tracking service integrated

**Logs:**
- Console only
  - Server startup message logged to stdout
  - Anthropic API errors logged via `console.error()` (`server.js`, line 154)
  - Client-side errors: Silent fallback messages in chat UI

## CI/CD & Deployment

**Hosting:**
- Railway (railway.app)
- Service: `account-planning-production`
- URL: `account-planning-production.up.railway.app`

**CI Pipeline:**
- GitHub auto-deploy: Railway watches `main` branch of `dzabihaylo/account-planning`
- Auto-deploy trigger: Push to main
- Deploy time: ~30 seconds
- Manual redeploy: Via Railway dashboard or `git push origin main`

**Start Command:**
```
node server.js
```

**Restart Policy:**
- Type: `on_failure`
- Max retries: 3

## Environment Configuration

**Required env vars (set in Railway Variables tab):**
- `ANTHROPIC_API_KEY` - Anthropic API key (obtain from https://console.anthropic.com)
- `APP_PASSWORD` - Login password for web UI
- `PORT` - (Auto-set by Railway, do not override)

**Secrets location:**
- Environment variables only - No `.env` file committed (`.gitignore` excludes `.env*`)
- Set in Railway dashboard > service > Variables tab
- Changed without redeployment - Takes effect on next request

## Webhooks & Callbacks

**Incoming:**
- None - No webhooks received

**Outgoing:**
- None - No webhooks sent

## External Assets (CDN)

**JavaScript Libraries:**
- Chart.js 4.4.1 - https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js
  - Used for: Revenue charts, employee count visualizations in account panels

**Fonts:**
- Google Fonts - https://fonts.googleapis.com
  - Families: DM Sans (weights 300, 400, 500), DM Mono (weights 400, 500)
  - CSS import in `index.html` head

## Request/Response Flow

**Chat Request Flow:**
1. Browser sends `POST /api/claude` with JSON payload (messages, model, max_tokens)
2. `server.js` receives request, verifies `gd_auth` cookie
3. `server.js` forwards payload to `https://api.anthropic.com/v1/messages`
4. `server.js` injects `ANTHROPIC_API_KEY` in `x-api-key` header
5. Anthropic API responds with message completion
6. `server.js` proxies response back to browser
7. Browser updates chat UI with AI response

**API Key Security:**
- API key stored only on server (`process.env.ANTHROPIC_API_KEY`)
- Never sent to browser
- Never logged or exposed in responses
- Only transmitted to Anthropic API over HTTPS

---

*Integration audit: 2026-04-10*
