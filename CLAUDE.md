# Grid Dynamics Prospect Intelligence Hub
## Project Brief for Claude Code

---

## What This Is

A Node.js web application that serves a multi-account sales intelligence dashboard for Grid Dynamics, a publicly traded enterprise AI and digital transformation consultancy. The app is used by the GTM Automotive team (Dave Zabihaylo, Senior Director GTM Automotive, based in Detroit) and colleagues to research and prepare for enterprise prospect engagements.

Each account in the hub has tabs covering company overview, financials, technology stack, talent signals, outsourcing landscape, key executives, and a live AI chat interface that answers questions about that specific account using Claude as the backend.

---

## Project Owner

Dave Zabihaylo
Senior Director GTM Automotive, Grid Dynamics
Based in Ferndale, Michigan (Detroit area)
Owns the Ford account. Building the automotive go-to-market.

---

## Directory Location

The project lives at:
```
/users/davezabihaylo/documents/Grid_Accounts/
```

---

## File Structure

```
Grid_Accounts/
├── server.js        - Node.js proxy server (no npm dependencies)
├── index.html       - The full single-page application (all 13 accounts)
├── package.json     - Minimal, no dependencies beyond Node built-ins
├── railway.toml     - Railway deployment config
├── README.md        - Setup and deployment instructions
└── .gitignore       - Excludes .env and node_modules
```

---

## How It Works

### server.js
A plain Node.js HTTP server using only built-in modules (no npm packages needed). It does three things:

1. **Password protection** - Serves a login page at `/`. On successful login, sets a cookie (`gd_auth`) containing the password. All routes check this cookie before serving content. Unauthenticated requests are redirected to the login page.

2. **Serves the app** - On `GET /`, reads and serves `index.html` from the same directory.

3. **Proxies AI requests** - On `POST /api/claude`, forwards the request body to `https://api.anthropic.com/v1/messages`, injecting the Anthropic API key from the environment server-side. The API key never reaches the browser.

### index.html
A single self-contained HTML file (~108KB) with all CSS, JavaScript, and account data inline. No build step, no framework, no external dependencies beyond Google Fonts and Chart.js (loaded from CDN).

The app has:
- A sticky top nav with a search bar that filters the sidebar
- A left sidebar listing all 13 accounts grouped by industry category
- A main panel per account with multiple tabs
- A live AI chat tab per account, wired to `/api/claude` with that account's full intelligence context pre-loaded as a system prompt

### AI Chat
Each account's Ask AI tab sends POST requests to `/api/claude`. The server forwards these to the Anthropic API with:
- Model: `claude-sonnet-4-20250514`
- Max tokens: 1000
- System prompt: Grid Dynamics context + full account intelligence for the selected account

Chat history is maintained in browser memory per account session (not persisted across page reloads).

---

## Environment Variables

Three environment variables are required. In Railway these are set in the Variables tab. Locally they are set in the shell before running.

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key from console.anthropic.com |
| `APP_PASSWORD` | Password shown to users on the login screen |
| `PORT` | Port to listen on (Railway sets this automatically, do not override) |

---

## Current Accounts (13 total)

### Automotive OEM
- General Motors (NYSE: GM) - Active engagement, $187.4B revenue
- Mercedes-Benz Group AG (DAX: MBG) - $160B revenue
- Volvo Group (Stockholm: VOLV) - $49.6B revenue, existing Nova Bus relationship
- Rivian Automotive (NASDAQ: RIVN) - $4.97B revenue, VW JV

### Automotive Tier 1
- MAHLE GmbH - $12.6B revenue, former Provectus account
- Magna International (NYSE: MGA) - $42.8B revenue, Troy MI HQ
- Forvia SE (Euronext: FRVIA) - $29.8B revenue, Auburn Hills MI HQ
- Robert Bosch GmbH - $99.7B revenue, Farmington Hills MI NA HQ
- HARMAN International (Samsung subsidiary) - $11B revenue, new CEO Apr 2025
- Detroit Manufacturing Systems (now Voltava) - ~$600M, Detroit

### Financial Services
- Rocket Companies (NYSE: RKT) - $5.1B revenue, Detroit
- United Wholesale Mortgage (NYSE: UWMC) - ~$3.5B, Pontiac MI

### Energy & Utilities
- DTE Energy (NYSE: DTE) - $12.5B revenue, Detroit

---

## Deployment: Railway (current production)

The app is live on Railway at:
```
account-planning-production.up.railway.app
```

Linked to GitHub repo: `dzabihaylo/account-planning`

Railway watches the `main` branch and auto-deploys on every push. Deploy time is approximately 30 seconds.

### To deploy changes:
```bash
cd /users/davezabihaylo/documents/Grid_Accounts
git add .
git commit -m "describe what changed"
git push origin main
```

### To change the password:
Go to Railway dashboard > service > Variables > update `APP_PASSWORD`. Takes effect immediately, no redeployment needed.

### To add new accounts:
1. Update `index.html` - add sidebar entry, account panel HTML, and entry in the `ACCOUNTS` JS object
2. Push to GitHub - Railway redeploys automatically

---

## Running Locally

```bash
cd /users/davezabihaylo/documents/Grid_Accounts
export ANTHROPIC_API_KEY=sk-ant-...
export APP_PASSWORD=yourpassword
node server.js
```

Then open `http://localhost:3000`.

---

## Git Setup

Remote: `https://github.com/dzabihaylo/account-planning.git`
Branch: `main`

Standard workflow:
```bash
git add .
git commit -m "message"
git push origin main
```

---

## Adding a New Account: Step-by-Step

When Dave provides a new company name, the process is:

1. Research the company (revenue, employees, tech stack, executives, outsourcing partners, strategic signals) using web search
2. Determine the correct industry category for the sidebar
3. In `index.html`, make three additions:

   **A. Sidebar entry** - find the correct `sidebar-section` and add a `sidebar-item` button following the existing pattern, with appropriate dot color and revenue

   **B. Account panel HTML** - add a `<div class="account-panel" id="panel-{id}">` block following the existing structure. Each panel has: acct-header (KPIs), acct-tabs, and tab panes for overview, tech, signals, execs, and ai

   **C. ACCOUNTS data object** - add an entry to the `const ACCOUNTS = {...}` JS object with: name, sector, hq, revenue, employees, and a detailed `context` string (this is what gets sent to Claude as account intelligence)

4. Update the account count in `.topnav-count` (currently `13 accounts`)
5. Push to GitHub

---

## Known Issues / Notes

- The `PORT` environment variable must NOT be hardcoded in Railway. Railway assigns it dynamically. The server reads `process.env.PORT` automatically.
- The `.gitignore` excludes `.env` files. Do not commit API keys.
- The login cookie stores the password value directly. This is intentional for simplicity given the internal team use case. It is not suitable for public-facing applications with sensitive data.
- Chart.js is loaded from cdnjs.cloudflare.com. Google Fonts are loaded from fonts.googleapis.com. Both require internet access.
- The AI chat history is in-memory only and resets on page reload. There is no persistence layer.

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Runtime | Node.js (built-ins only, no npm packages) |
| Frontend | Vanilla HTML/CSS/JS, Chart.js 4.4.1 |
| Fonts | DM Sans, DM Mono (Google Fonts) |
| AI | Anthropic Claude claude-sonnet-4-20250514 via REST API |
| Hosting | Railway (railway.app) |
| Source control | GitHub (dzabihaylo/account-planning) |
| Auth | Cookie-based password, server-side validation |

---

## Context on Grid Dynamics

Grid Dynamics (NASDAQ: GDYN) is a publicly traded enterprise AI and digital transformation consultancy. Key differentiators vs large Indian SIs (HCL, Cognizant, Infosys): AI-native delivery, senior engineering talent, consultancy model rather than body-shop, Google Cloud partnership.

Dave Zabihaylo joined Grid Dynamics March 1, 2026 as Senior Director GTM Automotive after departing Provectus. He owns the Ford account and is building the automotive go-to-market from the Detroit area. The accounts in this hub represent his active prospect list.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Grid Dynamics Prospect Intelligence Hub**

A pursuit intelligence dashboard for Grid Dynamics' GTM Automotive team that helps Dave Zabihaylo and his pursuit teams research enterprise prospects, identify the right contacts, plan outreach strategies, and evolve their approach based on real engagement outcomes. The tool serves as the single source of truth for account intelligence — combining auto-refreshed public data with private pursuit notes — so any team member can be briefed on any account at any time.

**Core Value:** Every pursuit team member can open this tool and get a current, actionable briefing on any account — who to target, what to pitch, how to reach them, and what we've learned so far.

### Constraints

- **Hosting**: Railway (railway.app) — current deployment, auto-deploys from GitHub main branch
- **AI Backend**: Anthropic Claude API — already integrated, keep as primary AI engine
- **Simplicity**: Dave values the zero-dependency, no-build-step approach — don't over-engineer the stack
- **Security**: API keys must stay server-side; auth is simple but must exist
- **Budget**: Token costs matter — be smart about when and how much AI is used for auto-refresh
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (ES6+) - All source code and build targets
## Runtime
- Node.js >= 16 (per `package.json` engines field)
- Single-file server deployment using Node.js built-in modules only
- npm (no dependencies installed)
- `package.json` exists but contains no external dependencies
- Lockfile: Not used (no npm packages)
## Frameworks
- No framework dependencies - pure Node.js HTTP server using built-in `http` and `https` modules
- Vanilla HTML/CSS/JavaScript - Single-page application in `index.html`
- Chart.js 4.4.1 - For data visualization, loaded from CDN (cdnjs.cloudflare.com)
- Google Fonts (DM Sans, DM Mono) - Loaded from fonts.googleapis.com
- None detected
- None - No build step required
## Key Dependencies
- Chart.js 4.4.1 (via CDN) - JavaScript charting library for data visualization in account panels
- Google Fonts API - DM Sans and DM Mono typefaces
- `http` - HTTP server creation and request handling
- `https` - HTTPS proxy to Anthropic API
- `fs` - File system operations (reading `index.html`)
- `path` - Path manipulation for file serving
- `url` - URL parsing for routing
## Configuration
| Variable | Purpose | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | API authentication to Anthropic Claude API | Yes |
| `APP_PASSWORD` | Password for basic auth to the web UI | Yes |
| `PORT` | HTTP server port (Railway auto-assigns, defaults to 3000) | No (default: 3000) |
- No build configuration - Direct Node.js execution via `node server.js`
- Railway deployment: `railway.toml` specifies Nixpacks builder and start command
## Platform Requirements
- Node.js 16+ installed locally
- Internet access for Google Fonts and Chart.js CDN (cdnjs.cloudflare.com, fonts.googleapis.com)
- Anthropic API key from https://console.anthropic.com
- Hosted on Railway (railway.app)
- Linked to GitHub repo: `dzabihaylo/account-planning`
- Auto-deploys on push to main branch
- Railway provides `PORT` environment variable automatically
## Summary
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Lowercase with extension: `server.js`, `index.html`, `package.json`
- No separators in filenames (no kebab-case or snake_case)
- camelCase for all function names: `showAccount()`, `sendMsg()`, `filterAccounts()`, `initAIPanel()`
- Descriptive verb-first pattern: `show*`, `send*`, `add*`, `remove*`, `filter*`, `init*`
- Handler functions use compound names: `sendChip()`, `sendMsg()`, `removeTyping()`
- camelCase throughout: `currentAccount`, `chatHistories`, `typingId`, `container`
- Prefix patterns for IDs: `inp-${id}`, `msgs-${id}`, `panel-${id}`, `sb-${id}`
- Constants use UPPER_SNAKE_CASE: `API_KEY`, `APP_PASSWORD`, `PORT`, `ACCOUNTS`, `GD_CONTEXT`
- kebab-case for all classes: `.topnav`, `.sidebar-item`, `.account-panel`, `.acct-header`, `.msg-av`, `.exec-card`
- Prefix pattern: `.acct-*` for account-related, `.msg-*` for messages, `.exec-*` for executive cards, `.ai-*` for AI panel
- State classes with suffix: `.active`, `.show` (e.g., `.sidebar-item.active`)
- kebab-case with compound structure: `panel-${id}`, `msgs-${id}`, `inp-${id}`, `chips-${id}`, `acctSearch`, `acctCount`, `mainContent`
- Pattern: `{component}-{account-id}` or global singletons like `sidebar`, `mainContent`
- kebab-case: `--dark`, `--surface`, `--text`, `--accent`, `--muted`, `--border`
- Color hierarchy: base colors (`--dark`, `--mid`) → semantic colors (`--text`, `--muted`, `--accent`) → status colors (`--green`, `--red`, `--gold`)
## Code Style
- No automated formatter (Prettier not used)
- Manual formatting observed:
- No ESLint or other linter configured
- No `.eslintrc`, `.prettierrc`, or similar config files
- Code style enforced by manual review only
- Practically unbounded - see `index.html` lines with inline CSS/HTML blocks
- Server.js keeps URLs and longer strings on single lines
## Import Organization
- Node.js built-in modules listed first: `http`, `https`, `fs`, `path`, `url`
- No external imports (dependencies intentionally avoided)
- Order: protocol modules (`http`, `https`), then file system (`fs`), then utilities (`path`, `url`)
- External scripts in `<head>`: Chart.js from CDN
- Google Fonts imported in CSS `@import`
- Inline JavaScript at end of `<body>` with `<script>` tag
- No module system (CommonJS, ES6 modules, or bundler)
## Error Handling
- Startup validation: Synchronous checks at module load for `ANTHROPIC_API_KEY` and `APP_PASSWORD`
- JSON parsing: try-catch wrapper in `/api/claude` endpoint (`try { JSON.parse() } catch (e)`)
- Upstream API errors: `.on('error')` callback on https.request
- File read errors: Callback-based with `fs.readFile((err, data) => { if (err) ... })`
- Try-catch in async `sendMsg()` function around fetch and JSON parsing
- On fetch error: catches exception and displays `'There was an error. Please try again.'` to user
- No explicit validation - relies on API response structure
- Silent fallback: Missing data properties checked with optional chaining in display logic
## Logging
- Startup info: `console.log()` with formatted message
- Errors: `console.error()` for startup failures
- Upstream errors: `console.error('Anthropic API error:', e.message)`
- No console logging in production code
- Messages only via UI (toast/modal patterns not visible, but errors shown in chat)
## Comments
- Minimal commenting observed - code is largely self-documenting
- Section dividers in HTML: `<!-- ═══════════════════ ACCOUNT NAME ═══════════════════ -->`
- HTML structure comments: Near closing tags for complex sections
- No JSDoc or TSDoc used
## Function Design
- Utility functions: 2-8 lines (`getCookies()`, `isAuthenticated()`, `addTyping()`, `removeTyping()`)
- Handler functions: 5-15 lines (`showAccount()`, `showTab()`, `sendChip()`)
- Larger functions: `sendMsg()` (async, ~30 lines with API call), `initAIPanel()` (~15 lines with HTML generation)
- Few parameters per function (0-2 typical)
- Single responsibility: each function does one thing
- Most functions return `undefined` (mutations on DOM or state)
- Async functions return Promises (e.g., `sendMsg()` is async)
- Utility functions return values: `getCookies()` returns object, `isAuthenticated()` returns boolean
- Global variables: `chatHistories`, `currentAccount`, `ACCOUNTS`, `GD_CONTEXT`
- Closures: Minimal use of closures; mostly linear, functional flow
- Event handlers: Inline `onclick` attributes in HTML (traditional pattern, no addEventListener in JS)
## Module Design
- Single monolithic file: `index.html` contains all markup, styles, and JavaScript (~1,227 lines)
- No separation of concerns into modules
- Data centralized in `ACCOUNTS` object (all 13 accounts in single const)
- System prompt in `GD_CONTEXT` constant
- Single file: `server.js` (no modules, ~190 lines)
- Functional structure: Constants, helper functions, request handler, server initialization
- No separation into routes/middleware layers (monolithic handler function)
- Frontend: None (HTML page with inline `<script>`)
- Backend: None (used with `node server.js` directly)
- Not applicable - no module system
## Event Handling
- Click handlers use `onclick` attributes:
- Input handlers:
- No `addEventListener` calls found in codebase
- Traditional inline event attributes throughout
## String and Template Handling
- String concatenation with `+` operator
- Template literals not used (older JavaScript style)
- Example: `'Running at http://localhost:' + PORT`
- Template literals heavily used: `` `${value}` ``
- HTML generation via `.innerHTML` with template literals in `initAIPanel()`
- String replacement for formatting messages:
## Constants and Magic Numbers
- Environment variables as constants at top:
- HTTP status codes inline: `200`, `302`, `400`, `401`, `404`, `502`
- Hardcoded API paths: `/api/claude`, `/login`, `/`, `/index.html`
- CSS color variables centralized in `:root { --color: value; }`
- Account data in `ACCOUNTS` object (data-first design)
- Grid breakpoint for responsive: `900px`
- Magic values for messaging: `max_tokens: 1000` in fetch body
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Single HTML file containing frontend + all business logic (no build step)
- Stateless Node.js server handling auth, static serving, and API proxying
- Browser-based session state (in-memory chat histories per account)
- Server-side API key injection for security (key never exposed to client)
- No database—all intelligence data embedded in frontend as JavaScript objects
## Layers
- Purpose: HTTP server, authentication enforcement, API proxying to Anthropic
- Location: `server.js`
- Contains: Cookie parsing, password validation, request routing, HTTPS forwarding
- Depends on: Node.js built-in modules (http, https, fs, path, url)
- Used by: All client requests
- Purpose: Interactive UI, account management, AI chat interface, account data rendering
- Location: `index.html` (all-in-one: ~1,226 lines)
- Contains: CSS styling, HTML structure, JavaScript application logic, account data objects
- Depends on: Chart.js (CDN), Google Fonts (CDN), server endpoints (/api/claude)
- Used by: Browser, renders to user
- Purpose: Environment-based runtime configuration
- Contains: API keys (server-side only), app password, port binding
- Depends on: process.env variables (ANTHROPIC_API_KEY, APP_PASSWORD, PORT)
## Data Flow
- **Server state:** Minimal. No sessions, no database. Only environment variables loaded at startup.
- **Client state:** 
- **Persistence:** None. Chat histories reset on page reload. No server-side storage.
## Key Abstractions
- Purpose: Single source of truth for all 13 account profiles (intelligence, KPIs, contexts)
- Examples: `ACCOUNTS.gm`, `ACCOUNTS.mahle`, `ACCOUNTS.rocket`
- Pattern: Key-value map where each account ID maps to object with: name, sector, hq, revenue, employees, context (full intelligence string sent to Claude)
- Located in: `index.html` lines 1080-1094
- Purpose: System-level context about Grid Dynamics organization, sent with every AI request
- Pattern: Template string explaining Grid Dynamics value props, Dave Zabihaylo role, differentiation vs competitors
- Located in: `index.html` lines 1096
- Combined with: Account-specific data (ACCOUNT, SECTOR, HQ, REVENUE, EMPLOYEES, account context) to form final system prompt
- Purpose: Maintain conversation state per account during user session
- Pattern: `chatHistories[accountId] = [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}]`
- Located in: `index.html` line 1098
- Used by: `sendMsg()` to build Anthropic API messages array
- Purpose: Each account has a hidden/shown div with tabs for different intelligence views
- Pattern: `<div class="account-panel" id="panel-{accountId}">` containing `acct-header`, `acct-tabs`, `tab-pane` divs
- Tabs per account: Overview, Tech Stack, Talent Signals, Executives, AI Chat
- Located in: `index.html` lines 352-1078 (13 panels, one per account)
- Shown/hidden by: `showAccount()` and `showTab()` functions
## Entry Points
- Location: `server.js` lines 184-190
- Triggers: `node server.js` command at startup
- Responsibilities: 
- Location: `index.html` lines 294-1223
- Triggers: Page load after successful authentication
- Responsibilities:
- Location: `server.js` lines 116-162
- Path: POST `/api/claude`
- Triggers: `fetch('/api/claude', {...})` from browser after user submits AI question
- Responsibilities:
## Error Handling
- **Server Auth Errors:** Missing env vars trigger `process.exit(1)` with console error (lines 11-18)
- **Invalid JSON on /api/claude:** Return 400 with `{error: 'Invalid JSON'}` (lines 121-127)
- **Anthropic API Errors:** Catch via `proxy.on('error')`, return 502 with error detail (lines 153-157)
- **AI Chat Errors (browser):** Catch fetch() exception, display generic "There was an error" message to user (lines 1176-1179)
- **File Not Found (index.html):** Return 404 "index.html not found" (lines 169-172)
- **Unauthenticated Request:** Silently redirect to login page (no error message, just show LOGIN_PAGE)
## Cross-Cutting Concerns
- Server startup confirmation to stdout (lines 186-189)
- Console.error for Anthropic API failures (line 154)
- No persistent logging; all output to console
- No client-side logging
- Server validates password on login (line 94)
- Server validates presence of environment variables (lines 11-18)
- Browser validates message text non-empty before sending (line 1151)
- No schema validation on API request/response bodies
- Cookie-based: `gd_auth` cookie must equal `APP_PASSWORD` value
- Applied globally: Every request checked via `isAuthenticated()` before serving authenticated content
- Cookies set with HttpOnly, SameSite=Strict for basic security
- No token expiration; cookie persists until deleted by browser
- Headers set permissively: `Access-Control-Allow-Origin: *` (line 77)
- Allows GET, POST, OPTIONS methods (line 78)
- Allows Content-Type header (line 79)
- Handles preflight OPTIONS requests (lines 81-85)
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
