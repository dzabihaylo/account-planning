# Testing Patterns

**Analysis Date:** 2026-04-10

## Test Framework

**Status:** Not configured

No test framework is currently integrated into this codebase.

**Runner:**
- None (no Jest, Vitest, Mocha, or similar)

**Assertion Library:**
- None

**Test Files:**
- No `*.test.js`, `*.spec.js`, or `__tests__` directories found

**Run Commands:**
- No testing commands available
- `package.json` only defines `"start": "node server.js"`

## Test File Organization

**Location:** Not applicable - no tests exist

**Naming:** Not applicable

**Structure:** Not applicable

## Current Testing Approach

**Manual Testing:**
The application is tested manually:

1. **Local Development:**
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   export APP_PASSWORD=yourpassword
   node server.js
   ```
   Then open `http://localhost:3000` and interact with the UI.

2. **Network Testing:**
   Find local IP and share `http://192.168.x.x:3000` with colleagues on same network.

3. **Production Deployment:**
   Push to GitHub → Railway auto-deploys → manual verification at `account-planning-production.up.railway.app`

**No automated integration tests** - all validation is done by opening browser and clicking through tabs, searching, and testing AI chat.

## Code Paths Without Tests

**Authentication (`server.js`):**
- Password validation on POST `/login`
- Cookie setting and reading in `getCookies()` and `isAuthenticated()`
- Unauthorized redirect logic
- No tests for password bypass, cookie tampering, or auth state

**API Proxy (`server.js`):**
- JSON parsing error handling
- Upstream API error handling
- Request forwarding to Anthropic API
- No tests for malformed requests, API failures, or response handling

**Frontend Interactive Logic (`index.html`):**
- Account panel switching (`showAccount()`)
- Tab switching (`showTab()`)
- Search/filter logic (`filterAccounts()`)
- AI chat message sending (`sendMsg()`)
- Message rendering (`addMsg()`)
- Typing indicator display (`addTyping()`, `removeTyping()`)
- No tests for state management, event handling, or UI updates

**AI Integration:**
- System prompt construction with account context
- Fetch to `/api/claude` endpoint
- Response parsing and display
- Chat history management in `chatHistories` object
- No tests for prompt injection, API contract, or error recovery

## Frontend State Management

**Current Implementation:**
- Global variables: `chatHistories = {}`, `currentAccount = 'mahle'`
- Per-account chat history: `chatHistories[id] = [{ role, content }]`
- DOM state for active panels/tabs via `.active` class
- No validation of state consistency

**Example pattern:**
```javascript
let chatHistories = {};
let currentAccount = 'mahle';

async function sendMsg(id) {
  // ... build message
  chatHistories[id].push({ role: 'user', content: text });
  // ... fetch to API
  chatHistories[id].push({ role: 'assistant', content: reply });
  addMsg(id, 'ai', reply);
}
```

**Testing gaps:**
- No validation that `chatHistories[id]` exists before use
- No bounds on chat history size (could grow unbounded)
- Chat history lost on page reload (not persisted)
- No error recovery if fetch fails mid-stream

## Error Scenarios Not Covered

**Backend:**
1. Missing environment variables on startup → process exits, but no graceful degradation
2. Malformed request body to `/api/claude` → returns `{ error: 'Invalid JSON' }`, but no logging
3. Upstream API timeout → caught in error handler, but no retry logic
4. File not found for `index.html` → returns 404, but no fallback
5. CORS preflight requests → answered correctly, but no validation of origin

**Frontend:**
1. Network failure during message send → caught, but user only sees generic error message
2. API returns unexpected response format → no validation before parsing
3. Chat history exceeds browser memory limits → no cleanup or warning
4. Multiple simultaneous message sends → no debouncing or queue (could race)
5. User closes browser before message completes → fetch aborts silently

## Security Testing Gaps

**Authentication:**
- Password stored in plain text in cookie (`HttpOnly` flag is set, but value is sensitive)
- No rate limiting on `/login` attempts
- No session timeout or expiration
- No CSRF protection on POST routes

**API Proxy:**
- No validation that API key is injected correctly
- No checking for API key leakage in error messages
- No request body size limit (could proxy arbitrarily large payloads)
- No rate limiting on `/api/claude` endpoint

**Frontend:**
- XSS vulnerability: user-controlled account context passed to API untested
- HTML rendered via `.innerHTML` with basic markdown replacement but no sanitization
- No input validation on search box, chat input, or password field

## Mocking Needs

If tests were added, these would need mocking:

**Backend:**
- `https.request()` - to mock Anthropic API responses
- `fs.readFile()` - to mock file system without needing actual `index.html`
- `process.env` - to test with different environment variables

**Frontend:**
- `fetch()` - to mock `/api/claude` endpoint and test response handling
- `document.*` DOM methods - to test DOM updates without rendering
- `Date.now()` - for generating deterministic typing indicator IDs

## Load Testing Gaps

**Not tested:**
- Server under concurrent requests (e.g., multiple users accessing same server)
- Frontend with very large chat histories (100+ messages)
- Sidebar with more than 13 accounts (search performance)
- Large account context strings in system prompt (would affect token usage)

## Potential Test Suites to Add

### Unit Tests (if framework added)

**Backend (`server.js`):**
```javascript
describe('getCookies', () => {
  it('parses empty cookie header', () => { /* ... */ });
  it('parses single cookie', () => { /* ... */ });
  it('parses multiple cookies', () => { /* ... */ });
  it('handles cookie with equals in value', () => { /* ... */ });
});

describe('isAuthenticated', () => {
  it('returns true if cookie matches password', () => { /* ... */ });
  it('returns false if cookie missing', () => { /* ... */ });
  it('returns false if cookie does not match', () => { /* ... */ });
});

describe('POST /login', () => {
  it('sets cookie and redirects on correct password', () => { /* ... */ });
  it('returns 401 on wrong password', () => { /* ... */ });
  it('parses URL-encoded request body', () => { /* ... */ });
});

describe('POST /api/claude', () => {
  it('forwards request to Anthropic API', () => { /* ... */ });
  it('injects API key in headers', () => { /* ... */ });
  it('returns 400 on invalid JSON', () => { /* ... */ });
  it('returns 502 on upstream error', () => { /* ... */ });
});
```

**Frontend (`index.html`):**
```javascript
describe('showAccount', () => {
  it('hides all panels except target', () => { /* ... */ });
  it('updates sidebar active state', () => { /* ... */ });
  it('sets currentAccount variable', () => { /* ... */ });
  it('initializes chat history for new account', () => { /* ... */ });
});

describe('sendMsg', () => {
  it('clears input field', () => { /* ... */ });
  it('adds user message to chat', () => { /* ... */ });
  it('shows typing indicator', () => { /* ... */ });
  it('sends POST to /api/claude with correct payload', () => { /* ... */ });
  it('adds AI response to chat', () => { /* ... */ });
  it('removes typing indicator on response', () => { /* ... */ });
  it('handles fetch error gracefully', () => { /* ... */ });
});

describe('filterAccounts', () => {
  it('shows all accounts on empty query', () => { /* ... */ });
  it('hides accounts not matching query', () => { /* ... */ });
  it('updates account count', () => { /* ... */ });
  it('searches case-insensitively', () => { /* ... */ });
});
```

### Integration Tests

**Server + Frontend:**
1. End-to-end login flow: POST `/login` → check cookie → verify page loads
2. Account switching: Click sidebar item → verify panel shown → verify tabs available
3. AI chat flow: Enter question → POST `/api/claude` → receive response → display in chat
4. Search: Type in search → sidebar updates → click filtered item → correct panel loads

### Manual Test Checklist (Current Approach)

**Authentication:**
- [ ] Login with correct password → access granted
- [ ] Login with wrong password → error shown
- [ ] Logout → session ends
- [ ] Share URL with colleague → they must log in

**Navigation:**
- [ ] Click each account in sidebar → correct panel shows
- [ ] Click each tab (Overview, Tech, Signals, Execs, Ask AI) → correct content loads
- [ ] Scroll within sidebar → scrollbar visible and functional
- [ ] Scroll within account content → content visible, topnav remains sticky

**Search:**
- [ ] Type account name in search → results filter
- [ ] Clear search → all accounts reappear
- [ ] Account count updates dynamically
- [ ] Search is case-insensitive

**AI Chat:**
- [ ] First message sends to API with correct prompt
- [ ] Typing indicator shows while waiting for response
- [ ] Response displays in chat
- [ ] Follow-up messages build on history
- [ ] Chat history persists for same account during session
- [ ] Chat history clears when navigating to different account
- [ ] Error message displays on network failure
- [ ] Suggest chips (buttons) populate Ask AI tab

**Responsive Design:**
- [ ] Desktop view: sidebar visible, content on right
- [ ] Mobile view (< 900px): sidebar hidden, content full width
- [ ] Grid layouts collapse properly on narrow screens

---

*Testing analysis: 2026-04-10*
