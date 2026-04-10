# Coding Conventions

**Analysis Date:** 2026-04-10

## Naming Patterns

**Files:**
- Lowercase with extension: `server.js`, `index.html`, `package.json`
- No separators in filenames (no kebab-case or snake_case)

**Functions:**
- camelCase for all function names: `showAccount()`, `sendMsg()`, `filterAccounts()`, `initAIPanel()`
- Descriptive verb-first pattern: `show*`, `send*`, `add*`, `remove*`, `filter*`, `init*`
- Handler functions use compound names: `sendChip()`, `sendMsg()`, `removeTyping()`

**Variables:**
- camelCase throughout: `currentAccount`, `chatHistories`, `typingId`, `container`
- Prefix patterns for IDs: `inp-${id}`, `msgs-${id}`, `panel-${id}`, `sb-${id}`
- Constants use UPPER_SNAKE_CASE: `API_KEY`, `APP_PASSWORD`, `PORT`, `ACCOUNTS`, `GD_CONTEXT`

**CSS Classes:**
- kebab-case for all classes: `.topnav`, `.sidebar-item`, `.account-panel`, `.acct-header`, `.msg-av`, `.exec-card`
- Prefix pattern: `.acct-*` for account-related, `.msg-*` for messages, `.exec-*` for executive cards, `.ai-*` for AI panel
- State classes with suffix: `.active`, `.show` (e.g., `.sidebar-item.active`)

**HTML IDs:**
- kebab-case with compound structure: `panel-${id}`, `msgs-${id}`, `inp-${id}`, `chips-${id}`, `acctSearch`, `acctCount`, `mainContent`
- Pattern: `{component}-{account-id}` or global singletons like `sidebar`, `mainContent`

**CSS Variables (custom properties):**
- kebab-case: `--dark`, `--surface`, `--text`, `--accent`, `--muted`, `--border`
- Color hierarchy: base colors (`--dark`, `--mid`) → semantic colors (`--text`, `--muted`, `--accent`) → status colors (`--green`, `--red`, `--gold`)

## Code Style

**Formatting:**
- No automated formatter (Prettier not used)
- Manual formatting observed:
  - 2-space indentation throughout (both HTML and JavaScript)
  - No semicolons omitted - statements end with semicolons
  - Single quotes for strings in JavaScript (mixed with double quotes in HTML attributes)
  - Long lines preserved (no hard wrap at 80/100 chars)

**Linting:**
- No ESLint or other linter configured
- No `.eslintrc`, `.prettierrc`, or similar config files
- Code style enforced by manual review only

**Line length:**
- Practically unbounded - see `index.html` lines with inline CSS/HTML blocks
- Server.js keeps URLs and longer strings on single lines

## Import Organization

**Backend (server.js):**
- Node.js built-in modules listed first: `http`, `https`, `fs`, `path`, `url`
- No external imports (dependencies intentionally avoided)
- Order: protocol modules (`http`, `https`), then file system (`fs`), then utilities (`path`, `url`)

**Frontend (index.html):**
- External scripts in `<head>`: Chart.js from CDN
- Google Fonts imported in CSS `@import`
- Inline JavaScript at end of `<body>` with `<script>` tag
- No module system (CommonJS, ES6 modules, or bundler)

## Error Handling

**Backend (server.js):**
- Startup validation: Synchronous checks at module load for `ANTHROPIC_API_KEY` and `APP_PASSWORD`
  - On failure: `console.error()` and `process.exit(1)`
- JSON parsing: try-catch wrapper in `/api/claude` endpoint (`try { JSON.parse() } catch (e)`)
  - Error response: `{ error: 'Invalid JSON' }`
- Upstream API errors: `.on('error')` callback on https.request
  - Error response: `{ error: 'Upstream API error', detail: e.message }`
- File read errors: Callback-based with `fs.readFile((err, data) => { if (err) ... })`
  - Error response: 404 with `'index.html not found.'`

**Frontend (index.html):**
- Try-catch in async `sendMsg()` function around fetch and JSON parsing
- On fetch error: catches exception and displays `'There was an error. Please try again.'` to user
- No explicit validation - relies on API response structure
- Silent fallback: Missing data properties checked with optional chaining in display logic

## Logging

**Framework:** console (Node.js built-in)

**Backend patterns:**
- Startup info: `console.log()` with formatted message
  ```javascript
  console.log('');
  console.log('  Grid Dynamics Intel Hub');
  console.log('  Running at http://localhost:' + PORT);
  console.log('  Password protection: enabled');
  console.log('');
  ```
- Errors: `console.error()` for startup failures
  ```javascript
  console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set.');
  ```
- Upstream errors: `console.error('Anthropic API error:', e.message)`

**Frontend:**
- No console logging in production code
- Messages only via UI (toast/modal patterns not visible, but errors shown in chat)

## Comments

**When to Comment:**
- Minimal commenting observed - code is largely self-documenting
- Section dividers in HTML: `<!-- ═══════════════════ ACCOUNT NAME ═══════════════════ -->`
- HTML structure comments: Near closing tags for complex sections
- No JSDoc or TSDoc used

**Example patterns:**
```javascript
// Login form submission
if (req.method === 'POST' && parsed.pathname === '/login') { ... }

// Proxy endpoint: POST /api/claude
if (req.method === 'POST' && parsed.pathname === '/api/claude') { ... }

// Show login page if not authenticated
if (!isAuthenticated(req)) { ... }
```

## Function Design

**Size:** Functions are small and focused
- Utility functions: 2-8 lines (`getCookies()`, `isAuthenticated()`, `addTyping()`, `removeTyping()`)
- Handler functions: 5-15 lines (`showAccount()`, `showTab()`, `sendChip()`)
- Larger functions: `sendMsg()` (async, ~30 lines with API call), `initAIPanel()` (~15 lines with HTML generation)

**Parameters:**
- Few parameters per function (0-2 typical)
  - `showAccount(id, btn)`
  - `showTab(account, tab, btn)`
  - `addMsg(id, role, text)`
- Single responsibility: each function does one thing

**Return Values:**
- Most functions return `undefined` (mutations on DOM or state)
- Async functions return Promises (e.g., `sendMsg()` is async)
- Utility functions return values: `getCookies()` returns object, `isAuthenticated()` returns boolean

**Scope patterns:**
- Global variables: `chatHistories`, `currentAccount`, `ACCOUNTS`, `GD_CONTEXT`
- Closures: Minimal use of closures; mostly linear, functional flow
- Event handlers: Inline `onclick` attributes in HTML (traditional pattern, no addEventListener in JS)

## Module Design

**Frontend:**
- Single monolithic file: `index.html` contains all markup, styles, and JavaScript (~1,227 lines)
- No separation of concerns into modules
- Data centralized in `ACCOUNTS` object (all 13 accounts in single const)
- System prompt in `GD_CONTEXT` constant

**Backend:**
- Single file: `server.js` (no modules, ~190 lines)
- Functional structure: Constants, helper functions, request handler, server initialization
- No separation into routes/middleware layers (monolithic handler function)

**Exports:**
- Frontend: None (HTML page with inline `<script>`)
- Backend: None (used with `node server.js` directly)

**Barrel Files:**
- Not applicable - no module system

## Event Handling

**Inline event handlers (HTML):**
- Click handlers use `onclick` attributes:
  ```html
  <button onclick="showAccount('gm',this)" id="sb-gm">
  <button onclick="showTab('gm','overview',this)">
  ```
- Input handlers:
  ```html
  <input oninput="filterAccounts(this.value)" />
  <input onkeydown="if(event.key==='Enter') sendMsg('${id}')" />
  ```

**No event listeners:**
- No `addEventListener` calls found in codebase
- Traditional inline event attributes throughout

## String and Template Handling

**Backend:**
- String concatenation with `+` operator
- Template literals not used (older JavaScript style)
- Example: `'Running at http://localhost:' + PORT`

**Frontend:**
- Template literals heavily used: `` `${value}` ``
- HTML generation via `.innerHTML` with template literals in `initAIPanel()`
- String replacement for formatting messages:
  ```javascript
  const fmt = text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  ```

## Constants and Magic Numbers

**Backend:**
- Environment variables as constants at top:
  ```javascript
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  const APP_PASSWORD = process.env.APP_PASSWORD;
  const PORT = process.env.PORT || 3000;
  ```
- HTTP status codes inline: `200`, `302`, `400`, `401`, `404`, `502`
- Hardcoded API paths: `/api/claude`, `/login`, `/`, `/index.html`

**Frontend:**
- CSS color variables centralized in `:root { --color: value; }`
- Account data in `ACCOUNTS` object (data-first design)
- Grid breakpoint for responsive: `900px`
- Magic values for messaging: `max_tokens: 1000` in fetch body

---

*Convention analysis: 2026-04-10*
