# Codebase Structure

**Analysis Date:** 2026-04-10

## Directory Layout

```
gd-intel-server/
├── server.js              # Node.js HTTP server + auth + API proxy
├── index.html             # Single-file SPA (CSS + JS + HTML inline)
├── package.json           # npm metadata (Node >=16)
├── railway.toml           # Railway deployment config
├── README.md              # Setup and deployment guide
├── .gitignore             # Excludes .env, node_modules
└── CLAUDE.md              # Project brief and instructions
```

## Directory Purposes

**Root Directory:**
- Purpose: Contain all application code and config
- Contains: Source files, configuration, git metadata
- Key files: `server.js`, `index.html`, `package.json`

## Key File Locations

**Entry Points:**

- `server.js`: Server entry point. Run with `node server.js`. Creates HTTP server on PORT, handles auth, proxies /api/claude requests.
- `index.html`: Frontend entry point. Loaded and served by server.js after authentication. Contains all UI, styling, and business logic.

**Configuration:**

- `package.json`: Specifies Node runtime (>=16) and start script (`node server.js`). No npm dependencies—only Node built-ins used.
- `railway.toml`: Railway deployment manifest. Specifies start command and build settings.
- `.gitignore`: Excludes `.env` files (secrets not committed) and `node_modules/` (no dependencies to commit).

**Core Logic:**

- `server.js`: HTTP request handling, cookie-based authentication, password validation, /api/claude proxy, index.html file serving.
- `index.html`: All frontend logic (account display, AI chat, sidebar search, tab switching, account data, API client).

**Documentation:**

- `README.md`: Setup instructions, environment variables, local dev, deployment to Railway, adding new accounts.
- `CLAUDE.md`: Project brief, context, account descriptions, tech stack summary, known issues.

## Naming Conventions

**Files:**
- `server.js`: Single server file, lowercase, .js extension
- `index.html`: Standard web server convention (served on `/`)
- Configuration files use standard names: `package.json`, `railway.toml`, `.gitignore`

**Directories:**
- None. All files in root directory. No subdirectories needed given current scale (1 server file, 1 HTML file, config files).

**HTML Elements (in index.html):**
- Classes use kebab-case: `.topnav`, `.sidebar-item`, `.account-panel`, `.acct-header`, `.tab-pane`, `.ai-panel`, `.msg-bub`
- IDs use kebab-case: `#acctSearch`, `#acctCount`, `#panel-{accountId}`, `#msgs-{accountId}`, `#inp-{accountId}`, `#chips-{accountId}`
- Data attributes: None used. IDs used for element selection.

**JavaScript Variables:**
- camelCase for most: `chatHistories`, `currentAccount`, `ACCOUNTS`, `GD_CONTEXT`
- UPPERCASE for constants: `ACCOUNTS`, `GD_CONTEXT` (large objects/templates)
- Functions: camelCase: `showAccount()`, `showTab()`, `sendMsg()`, `filterAccounts()`, `isAuthenticated()`

**CSS Variables:**
- kebab-case in `:root`: `--dark`, `--surface`, `--text`, `--accent`, `--green`, `--font`, `--mono`
- Used throughout stylesheet as `var(--varname)`

## Where to Add New Code

**New Account:**
1. Add entry to `ACCOUNTS` object in `index.html` (line 1080+)
   - Key: Short ID (e.g., `'ford'`)
   - Value: Object with name, sector, hq, revenue, employees, context
2. Add sidebar section group or sidebar item (if new category, add `<div class="sidebar-section">` and `<button class="sidebar-item">`)
3. Add account panel HTML: `<div class="account-panel" id="panel-{id}">` with tabs and content (follow existing structure)
4. Update account count in `.topnav-count` display (currently hardcoded "13 accounts", update to "14 accounts" etc.)
5. Push to GitHub; Railway auto-deploys

**New Tab/Content within Existing Account:**
1. Add `<button class="acct-tab">` to tabs row in account panel
2. Add corresponding `<div class="tab-pane" id="{accountId}-{tabName}">` with content
3. `showTab()` function already handles tab switching by ID pattern

**Modify AI Chat Behavior:**
1. Edit `GD_CONTEXT` template string (line 1096) for global system prompt changes
2. Edit individual account `context` field in ACCOUNTS object for account-specific intelligence
3. Adjust `max_tokens` in fetch body (line 1169) to change response length
4. Edit `sendMsg()` function to change how messages are formatted or sent

**Server Endpoints:**
1. Add new `if (req.method === 'POST' && parsed.pathname === '/newpath')` block in server.js request handler
2. Parse request body: `let body = ''; req.on('data', chunk => body += chunk); req.on('end', () => { ... });`
3. Call `res.writeHead()` with status and headers, then `res.end()` with response

**Authentication/Security Changes:**
1. Cookie logic in `getCookies()` and `isAuthenticated()` functions (server.js lines 21-34)
2. Login page template in `LOGIN_PAGE` variable (server.js lines 36-70)
3. Password validation in login handler (server.js lines 88-106)

## Special Directories

**None.** The application is deliberately flat:
- No `src/`, `lib/`, `public/`, `dist/` directories
- No build step. HTML + CSS + JS all inline in single file.
- No node_modules/ checked in (see .gitignore)

**Git-Ignored:**
- `.env`: Environment variables (secrets not committed)
- `node_modules/`: Would be empty since package.json has no dependencies
- `.DS_Store`: macOS metadata files

## File Size Notes

- `server.js`: ~190 lines (small, focused)
- `index.html`: ~1,226 lines (large, but self-contained SPA)
  - Lines 1-8: DOCTYPE, head, imports
  - Lines 9-292: CSS styling (inline `<style>` tag)
  - Lines 294-1078: HTML structure (nav, sidebar, 13 account panels with tabs)
  - Lines 1080-1224: JavaScript (account data, chat logic, event handlers)
- `package.json`: 13 lines
- `railway.toml`: Small config file

## Production Considerations

**Railway Deployment:**
- Platform automatically sets `PORT` environment variable (do not hardcode)
- Must provide `ANTHROPIC_API_KEY` and `APP_PASSWORD` via Railway Variables UI
- Auto-deploys on git push to `main` branch
- Logs visible in Railway dashboard

**Local Development:**
```bash
export ANTHROPIC_API_KEY=sk-ant-...
export APP_PASSWORD=yourpassword
export PORT=3000
node server.js
```

**No Build Step:**
- No compilation, transpilation, or bundling needed
- Changes to index.html take effect on next page load (no cache busting)
- Changes to server.js require server restart

---

*Structure analysis: 2026-04-10*
