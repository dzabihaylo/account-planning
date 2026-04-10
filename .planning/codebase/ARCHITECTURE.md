# Architecture

**Analysis Date:** 2026-04-10

## Pattern Overview

**Overall:** Three-tier application with clear separation of authentication, API proxy, and static content delivery.

**Key Characteristics:**
- Single HTML file containing frontend + all business logic (no build step)
- Stateless Node.js server handling auth, static serving, and API proxying
- Browser-based session state (in-memory chat histories per account)
- Server-side API key injection for security (key never exposed to client)
- No database—all intelligence data embedded in frontend as JavaScript objects

## Layers

**Server Layer (Node.js):**
- Purpose: HTTP server, authentication enforcement, API proxying to Anthropic
- Location: `server.js`
- Contains: Cookie parsing, password validation, request routing, HTTPS forwarding
- Depends on: Node.js built-in modules (http, https, fs, path, url)
- Used by: All client requests

**Frontend Layer (Single HTML file):**
- Purpose: Interactive UI, account management, AI chat interface, account data rendering
- Location: `index.html` (all-in-one: ~1,226 lines)
- Contains: CSS styling, HTML structure, JavaScript application logic, account data objects
- Depends on: Chart.js (CDN), Google Fonts (CDN), server endpoints (/api/claude)
- Used by: Browser, renders to user

**Configuration Layer:**
- Purpose: Environment-based runtime configuration
- Contains: API keys (server-side only), app password, port binding
- Depends on: process.env variables (ANTHROPIC_API_KEY, APP_PASSWORD, PORT)

## Data Flow

**Authentication Flow:**

1. User requests `/` without `gd_auth` cookie
2. Server checks `isAuthenticated(req)` via cookie
3. Server responds with `LOGIN_PAGE` HTML
4. User submits password via POST `/login`
5. Server validates against `APP_PASSWORD` environment variable
6. On success: Set `gd_auth` cookie with HttpOnly, SameSite=Strict flags, redirect to `/`
7. On failure: Return `LOGIN_ERROR_PAGE`
8. Subsequent requests include `gd_auth` cookie; authentication check passes

**Account Viewing Flow:**

1. User clicks sidebar item for account (e.g., "General Motors")
2. `showAccount(id, btn)` in browser JavaScript executes
3. Function hides all `.account-panel` divs, shows `#panel-{id}`
4. Updates `currentAccount` variable
5. If chat history doesn't exist for account, initialize it: `chatHistories[id] = []`
6. Account data fetched from `ACCOUNTS` object in JavaScript (no server request)

**AI Chat Flow:**

1. User types question in `.ai-inp` input and presses Enter
2. `sendMsg(id)` executes
3. User message added to DOM via `addMsg()`, hidden from input
4. Message appended to browser-side `chatHistories[id]` array
5. Typing indicator shown via `addTyping(id)`
6. Fetch POST `/api/claude` with:
   - `model`: 'claude-sonnet-4-6'
   - `max_tokens`: 1000
   - `system`: Generic system prompt + account-specific context
   - `messages`: Chat history array with first message prepended with full account intelligence
7. Server receives request, validates `gd_auth` cookie
8. Server extracts request body (already JSON), constructs HTTPS request to `api.anthropic.com/v1/messages`
9. Server injects `x-api-key` header with `ANTHROPIC_API_KEY` (from env, never sent to client)
10. Server forwards response back to browser
11. Browser parses response, displays AI reply via `addMsg(id, 'ai', reply)`
12. Reply stored in chat history for conversation context

**Static Content Serving:**

1. User requests GET `/` or `/index.html` after authentication
2. Server reads `index.html` from filesystem
3. Server responds with full HTML file (1,226 lines, all CSS/JS inline)
4. Browser renders; no additional server requests for static assets (except CDN for Chart.js, Google Fonts)

**State Management:**

- **Server state:** Minimal. No sessions, no database. Only environment variables loaded at startup.
- **Client state:** 
  - `chatHistories` object: Map of account IDs to message arrays (persists during session)
  - `currentAccount` variable: Currently selected account ID
  - `ACCOUNTS` object: Immutable account intelligence database
  - DOM focus (active panels, tabs, sidebar selection)
- **Persistence:** None. Chat histories reset on page reload. No server-side storage.

## Key Abstractions

**ACCOUNTS Object:**
- Purpose: Single source of truth for all 13 account profiles (intelligence, KPIs, contexts)
- Examples: `ACCOUNTS.gm`, `ACCOUNTS.mahle`, `ACCOUNTS.rocket`
- Pattern: Key-value map where each account ID maps to object with: name, sector, hq, revenue, employees, context (full intelligence string sent to Claude)
- Located in: `index.html` lines 1080-1094

**GD_CONTEXT:**
- Purpose: System-level context about Grid Dynamics organization, sent with every AI request
- Pattern: Template string explaining Grid Dynamics value props, Dave Zabihaylo role, differentiation vs competitors
- Located in: `index.html` lines 1096
- Combined with: Account-specific data (ACCOUNT, SECTOR, HQ, REVENUE, EMPLOYEES, account context) to form final system prompt

**Chat History Map (chatHistories):**
- Purpose: Maintain conversation state per account during user session
- Pattern: `chatHistories[accountId] = [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}]`
- Located in: `index.html` line 1098
- Used by: `sendMsg()` to build Anthropic API messages array

**Account Panel Structure:**
- Purpose: Each account has a hidden/shown div with tabs for different intelligence views
- Pattern: `<div class="account-panel" id="panel-{accountId}">` containing `acct-header`, `acct-tabs`, `tab-pane` divs
- Tabs per account: Overview, Tech Stack, Talent Signals, Executives, AI Chat
- Located in: `index.html` lines 352-1078 (13 panels, one per account)
- Shown/hidden by: `showAccount()` and `showTab()` functions

## Entry Points

**Server Entry Point:**
- Location: `server.js` lines 184-190
- Triggers: `node server.js` command at startup
- Responsibilities: 
  - Validate environment variables (ANTHROPIC_API_KEY, APP_PASSWORD)
  - Create HTTP server listening on PORT
  - Log server startup
  - Await requests indefinitely

**Browser Entry Point:**
- Location: `index.html` lines 294-1223
- Triggers: Page load after successful authentication
- Responsibilities:
  - Render initial HTML structure (nav, sidebar, account panels)
  - Load CSS and JavaScript in browser
  - Initialize first account panel AI (`initAIPanel('mahle')` at line 1223)
  - Bind event listeners (search, sidebar clicks, AI messages)

**API Entry Point:**
- Location: `server.js` lines 116-162
- Path: POST `/api/claude`
- Triggers: `fetch('/api/claude', {...})` from browser after user submits AI question
- Responsibilities:
  - Validate authentication cookie
  - Parse JSON request body
  - Forward to Anthropic API with injected API key
  - Stream or buffer response back to client
  - Handle errors (invalid JSON, Anthropic API failures)

## Error Handling

**Strategy:** Defensive error handling at server layer with minimal error handling in browser layer. Errors logged to server console but not exposed in detail to client.

**Patterns:**

- **Server Auth Errors:** Missing env vars trigger `process.exit(1)` with console error (lines 11-18)
- **Invalid JSON on /api/claude:** Return 400 with `{error: 'Invalid JSON'}` (lines 121-127)
- **Anthropic API Errors:** Catch via `proxy.on('error')`, return 502 with error detail (lines 153-157)
- **AI Chat Errors (browser):** Catch fetch() exception, display generic "There was an error" message to user (lines 1176-1179)
- **File Not Found (index.html):** Return 404 "index.html not found" (lines 169-172)
- **Unauthenticated Request:** Silently redirect to login page (no error message, just show LOGIN_PAGE)

## Cross-Cutting Concerns

**Logging:** 
- Server startup confirmation to stdout (lines 186-189)
- Console.error for Anthropic API failures (line 154)
- No persistent logging; all output to console
- No client-side logging

**Validation:**
- Server validates password on login (line 94)
- Server validates presence of environment variables (lines 11-18)
- Browser validates message text non-empty before sending (line 1151)
- No schema validation on API request/response bodies

**Authentication:**
- Cookie-based: `gd_auth` cookie must equal `APP_PASSWORD` value
- Applied globally: Every request checked via `isAuthenticated()` before serving authenticated content
- Cookies set with HttpOnly, SameSite=Strict for basic security
- No token expiration; cookie persists until deleted by browser

**CORS:**
- Headers set permissively: `Access-Control-Allow-Origin: *` (line 77)
- Allows GET, POST, OPTIONS methods (line 78)
- Allows Content-Type header (line 79)
- Handles preflight OPTIONS requests (lines 81-85)

---

*Architecture analysis: 2026-04-10*
