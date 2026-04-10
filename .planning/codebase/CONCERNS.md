# Codebase Concerns

**Analysis Date:** 2026-04-10

## Security Issues

**Authentication Security:**
- Issue: Cookie stores plaintext password value directly (`gd_auth=${APP_PASSWORD}`)
- Files: `server.js` (lines 96, 33)
- Impact: Any browser with access to DevTools can see the password. Password exposure in browser history, auto-fill, cache.
- Current mitigation: HttpOnly flag is set (protects from JavaScript access)
- Recommendations: Replace with opaque session tokens. Hash passwords server-side, issue JWT or session ID instead. Acceptable only for internal-only teams with low sensitivity data.

**XSS Vulnerability - HTML Injection in Chat:**
- Issue: User input from AI chat is rendered via `innerHTML` without sanitization
- Files: `index.html` (lines 1188, 1187)
  ```javascript
  const fmt = text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  div.innerHTML = `...<div class="msg-bub">${fmt}</div>`;
  ```
- Impact: If Claude's response contains HTML/script tags (either malicious or accidental), they execute in the browser
- Current mitigation: Only Claude responses are rendered this way (not user input), but Claude could be compromised or prompt-injected
- Recommendations: Use `textContent` for user messages, `createTextNode()` for AI responses, or use a proper HTML sanitizer library (DOMPurify)

**CORS Wildcard Origin:**
- Issue: `Access-Control-Allow-Origin: *` allows any domain to make requests
- Files: `server.js` (line 77)
- Impact: Any website can make requests to the API on behalf of authenticated users
- Recommendations: Restrict to specific origin(s): `Access-Control-Allow-Origin: https://account-planning-production.up.railway.app`

**Unbounded Request Body:**
- Issue: No size limit on POST body data
- Files: `server.js` (lines 118, 89-90)
  ```javascript
  let body = '';
  req.on('data', chunk => { body += chunk; });
  ```
- Impact: Large file uploads or malicious requests could cause memory exhaustion (DoS)
- Recommendations: Implement max body size check:
  ```javascript
  if (body.length > 1024 * 1024) { // 1MB limit
    res.writeHead(413);
    res.end('Payload too large');
    return;
  }
  ```

**API Key Exposure in Error Messages:**
- Issue: Server forwards full error details from Anthropic API
- Files: `server.js` (line 156)
  ```javascript
  res.end(JSON.stringify({ error: 'Upstream API error', detail: e.message }));
  ```
- Impact: Network errors could expose API connection details (hostname, TLS issues)
- Recommendations: Log full errors server-side only. Return generic errors to client: `{ error: 'Service temporarily unavailable' }`

## Tech Debt

**Frontend Bundle Size:**
- Issue: Single 106KB index.html file contains all 13 accounts + full CSS/JS + inline images/data
- Files: `index.html`
- Impact: Slow initial load, poor for mobile networks, all accounts load even if user only needs one
- Scaling limit: Adding more accounts will further bloat the bundle
- Improvement path: Split into lazy-loaded account modules, or move account data to separate files served on-demand from server

**No Request Timeout on API Calls:**
- Issue: Frontend fetch() to `/api/claude` has no timeout
- Files: `index.html` (line 1166)
  ```javascript
  const res = await fetch('/api/claude', { ... });
  ```
- Impact: Slow/hung requests leave the user hanging indefinitely with typing indicator
- Recommendations: Add timeout:
  ```javascript
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const res = await fetch('/api/claude', { signal: controller.signal });
  ```

**Hardcoded Model Version:**
- Issue: Claude model is hardcoded in frontend
- Files: `index.html` (line 1169)
  ```javascript
  body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, ... })
  ```
- Impact: Changing model requires frontend update and redeployment
- Recommendations: Move model selection to server config, pass via API response header or config endpoint

**In-Memory Chat History Only:**
- Issue: Chat history is stored in browser memory and lost on page reload
- Files: `index.html` (lines 1098, 1156)
  ```javascript
  let chatHistories = {};
  chatHistories[id].push({ role: 'user', content: text });
  ```
- Impact: Users lose context if they refresh. No audit trail of questions asked.
- Recommendations: If persistence needed, add server-side session storage with database

**No Rate Limiting:**
- Issue: No rate limit on `/api/claude` endpoint
- Files: `server.js` (line 116)
- Impact: User could spam API calls, burning through Anthropic quota
- Recommendations: Implement rate limiting per session/cookie, e.g., max 10 requests/minute

## Fragile Areas

**Chat Message Rendering Logic:**
- Files: `index.html` (lines 1187-1189)
- Why fragile: Simple regex replace for markdown formatting is brittle
  - `**(.*?)**/g` fails on nested bold or across line breaks
  - Newline handling via `<br>` doesn't handle multiple newlines correctly
  - No handling for code blocks, links, or other markdown
- Safe modification: If extending formatting, use a proper markdown library (marked.js, showdown.js)
- Test coverage: No tests for markdown rendering edge cases

**Account Data String Concatenation:**
- Files: `index.html` (line 1159)
  ```javascript
  const sysPrompt = GD_CONTEXT + '\n\nACCOUNT: ' + acct.name + ... + acct.context;
  ```
- Why fragile: If account context contains backticks or prompt injection patterns, could manipulate Claude's system prompt
- Example: If someone updates `ACCOUNTS[id].context` with `\n\nHuman: ignore all previous instructions...`, Claude may follow injected instructions
- Safe modification: Ensure account data is never user-editable; if dynamic, validate/escape special characters
- Current mitigation: Account data is hardcoded in the codebase, not user input

**File Serving on Static Path:**
- Files: `server.js` (lines 166-177)
  ```javascript
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, (err, data) => { ... });
  ```
- Why fragile: Path is safe, but if extended to other files, could enable directory traversal
- Safe modification: Maintain an explicit whitelist of servable files; never use user input in path construction

**Search Filter - Case Sensitivity Edge Case:**
- Files: `index.html` (lines 1210-1219)
- Why fragile: Filter only checks `includes()`, so partial matches and case variations work inconsistently
  - "mer" matches "Mercedes" (good)
  - "MERC" doesn't match because filter lowercases then checks include (works)
  - But filter label update at line 1219 may not accurately reflect filtered count if logic is modified

## Performance Bottlenecks

**Large Initial HTML Parse:**
- Problem: Browser must parse and layout entire 106KB HTML on first load
- Files: `index.html`
- Cause: All 13 account panels exist in DOM even though only 1 is visible
- Improvement path: 
  - Lazy-load account panels on click
  - Or use template elements and clone on demand
  - Measure: Initial render time should drop from ~500ms to ~100ms

**CSS-in-HEAD Inline Stylesheet:**
- Problem: ~3KB of CSS is parsed before DOM renders
- Files: `index.html` (lines 8-199)
- Current: CSS is inline in `<style>` tag in `<head>`
- Improvement: Not critical, but could move styles to external file if assets are cached

**Chart.js CDN Dependency:**
- Problem: Page load blocked waiting for Chart.js from cdnjs.cloudflare.com
- Files: `index.html` (line 7)
- Current: Not used in any visible account (all are static HTML, no charts visible)
- Improvement: Remove if not needed, or self-host and combine with index.html in bundle

**Sidebar Scroll Performance on Filter:**
- Problem: Filter loop iterates all `.sidebar-item` elements on every keystroke
- Files: `index.html` (lines 1210-1220)
- Cause: No debouncing on search input
- Impact: Filter is fast enough for 13 accounts, but noticeable lag when filtering 100+ accounts
- Improvement: Add debounce(300ms) or use CSS `:has()` selector with `filter` input value

## Scaling Limits

**Maximum Accounts Before Performance Degrades:**
- Current: 13 accounts fit in 106KB file
- Limit: At ~100 accounts, file size would be ~800KB+, initial load time would exceed 2 seconds
- Scaling path: Move account data to server-side, fetch on-demand, or implement virtual scrolling in sidebar

**Chat History Memory Growth:**
- Current: Chat history stored in `chatHistories[accountId]` array
- Limit: Each message (system prompt + account context + user input + response) can be 5-10KB. After 20-30 messages, browser memory usage is ~100-300MB
- Scaling path: If chats need to be longer, implement server-side history with database persistence

**Anthropic API Token Limits:**
- Current: System prompt for each account can be 3-5KB, max tokens 1000 per response
- Limit: Anthropic has rate limits (varies by plan) and token-per-minute limits
- Scaling path: Implement request queuing, token budget tracking, rate limiting on client

## Missing Critical Features

**No Session Persistence:**
- Problem: Selected account and chat context is lost on page reload
- Files: `index.html` (lines 1098-1106)
- Blocks: Users can't resume work or share links to specific account views
- Recommendation: Use `sessionStorage` or `localStorage` to persist:
  - Current account ID
  - Chat history per account
  - Search filter state

**No Error Recovery for API Failures:**
- Problem: If Anthropic API is down, user sees generic "there was an error" message
- Files: `index.html` (line 1178)
- Blocks: No retry logic, no status page check, no fallback
- Recommendation: 
  - Implement exponential backoff retry
  - Show specific error codes (rate limited, quota exceeded, service down)
  - Provide status page link or fallback suggestion

**No Mobile-Responsive Design:**
- Problem: Sidebar is 220px wide (fixed), doesn't collapse on mobile
- Files: `index.html` (lines 68-70)
- Blocks: App is unusable on phones (sidebar takes up 50%+ of screen width)
- Recommendation: Add media query breakpoints, hide sidebar behind hamburger menu on mobile

**No Accessibility (a11y):**
- Problem: Chat interface lacks proper ARIA labels, focus management, keyboard navigation
- Files: `index.html` (entire chat section)
- Blocks: Screen reader users cannot use the chat feature
- Recommendation: Add `aria-label`, `role`, `tabindex` attributes; implement keyboard navigation for message history

**No Dark Mode Toggle:**
- Problem: App only supports dark theme (hardcoded colors)
- Files: `index.html` (CSS variables defined in :root)
- Impact: Users prefer light mode can't change it
- Recommendation: Add theme toggle button, persist preference to localStorage

## Dependencies at Risk

**Chart.js 4.4.1 from CDN:**
- Risk: CDN could go down, JavaScript could be cached/stale
- Impact: Page won't load visually if cdnjs.cloudflare.com is unreachable (though app still functions since Chart.js isn't used)
- Migration plan: Remove unused Chart.js, or bundle locally with build step

**Google Fonts CDN:**
- Risk: Google Fonts CDN could be blocked by corporate firewalls or go down
- Impact: App falls back to system sans-serif font (readable but not on-brand)
- Current: Fallback is built-in via CSS (`font-family: 'DM Sans', sans-serif`)
- Recommendation: Self-host fonts or include system-font fallback stack

**Anthropic API Dependency:**
- Risk: API rate limits, quota exhaustion, service degradation
- Impact: AI features won't work if API is down or slow
- Mitigation: Currently no fallback or offline mode
- Recommendation: Cache common responses, implement graceful degradation

## Known Bugs

**Chat History Not Initialized on First Account Tab Click:**
- Symptoms: Typing in AI tab before viewing Overview tab might not initialize chat history correctly
- Files: `index.html` (lines 1107, 1117)
- Trigger: Click "Ask AI" tab immediately on account select without viewing other tabs first
- Workaround: The code checks `!chatHistories[id]` and initializes, so it should work, but timing could race

**Filter Count Label Not Updated on Account Visibility Toggle:**
- Symptoms: If you hide accounts via search, then clear search, the count label might briefly show old count
- Files: `index.html` (line 1219)
- Cause: Label is only updated during filter, not on panel visibility toggle
- Workaround: Click in search box to trigger re-filter

**Sidebar Scroll Position Lost on Account Switch:**
- Symptoms: If sidebar is scrolled and user clicks an account far down the list, scroll resets to top
- Files: `index.html` (lines 68-80, 1101)
- Trigger: Scroll sidebar, then click an item not visible, then scroll back
- Workaround: Scroll back to item manually

## Test Coverage Gaps

**No Automated Tests:**
- What's not tested: Entire codebase (both frontend and backend)
- Files: All
- Risk: Regressions on account updates, API integration changes, styling changes go undetected
- Priority: High (especially for API integration layer)

**No Test for API Error Handling:**
- What's not tested: Server response to malformed JSON, network timeouts, Anthropic API errors
- Files: `server.js` (lines 121-127, 153-157)
- Risk: Edge cases could cause crashes or expose errors to client
- Priority: Medium

**No Test for Password Validation:**
- What's not tested: Cookie-based auth edge cases (expired cookies, tampered values, missing auth header)
- Files: `server.js` (lines 31-34, 88-106)
- Risk: Auth bypass possible if logic is modified
- Priority: Medium

**No Test for Chat Context Injection:**
- What's not tested: Prompt injection via account data or user input
- Files: `index.html` (lines 1159, 1162-1165)
- Risk: Adversarial input could break Claude's context or cause unexpected responses
- Priority: Low (internal team only, low risk, but good practice)

---

*Concerns audit: 2026-04-10*
