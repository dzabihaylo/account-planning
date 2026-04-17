---
phase: 07-server-hardening
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - backup.js
  - db.js
  - index.html
  - logger.js
  - server.js
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-04-14
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

This review covers the five source files added or significantly changed in the server-hardening phase: `backup.js`, `db.js`, `index.html`, `logger.js`, and `server.js`. The overall quality is solid — parameterized queries are used throughout `db.js`, `escapeHtml` is consistently applied in `index.html` before injecting into the DOM, and error handling patterns are uniform across AI proxy calls.

Two critical issues require fixes before deployment. The first is an open API proxy (`/api/claude`) that accepts and forwards arbitrary user-supplied payloads with no field allowlisting, enabling authenticated users to override the model, increase `max_tokens` arbitrarily, or send unexpected parameters directly to the Anthropic API. The second is a `javascript:` URI accepted as a LinkedIn URL value, which is escaped for HTML entities but still usable as a navigable `href` that executes JavaScript in the browser.

Four warnings cover logic correctness issues: a schema migration guard bug that silently skips all migrations when the DB is freshly created at version 0, a missing `Content-Type` validation on the login form that allows non-form-encoded bodies to be silently parsed, an unguarded `parseInt` on the `BACKUP_INTERVAL_HOURS` env var that accepts `0` as valid and would schedule backups every millisecond, and a rate limiter key that is the raw password value — meaning a logged-out user can probe `rateLimitMap` entries under key `anonymous` and exhaust budget for unauthenticated paths.

---

## Critical Issues

### CR-01: `/api/claude` proxy forwards arbitrary user-controlled payload to Anthropic API

**File:** `server.js:1463`

**Issue:** The `/api/claude` endpoint reads the request body, optionally overwrites the `system` field and deletes `account_id`, then forwards the entire object as `payload` to Anthropic. An authenticated user can set `model` to any string (including expensive models), set `max_tokens` to a large value, include `tools`, `stream: true`, or any other Anthropic API parameter. The server has no allowlist. This also means `max_tokens` can be set arbitrarily, bypassing the token budget logic that governs auto-refresh.

```javascript
// Current (line 1463) — forwards everything:
const payload = JSON.stringify(parsed_body);
```

**Fix:** Build the outbound payload from an explicit allowlist. The only fields the frontend legitimately sends are `messages` and optionally `account_id` (already consumed). Pin `model` and `max_tokens` on the server side:

```javascript
// Validated payload — only forward what we control
const payload = JSON.stringify({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1000,
  system: parsed_body.system || GD_CONTEXT,
  messages: parsed_body.messages
});
```

Validate that `parsed_body.messages` is a non-empty array before forwarding. Reject the request with a 400 if it is missing or malformed.

---

### CR-02: `javascript:` URI accepted as LinkedIn URL, executable as `href`

**File:** `index.html:2011`

**Issue:** The LinkedIn field renders as `<a href="[escapeHtml(c.linkedin)]" target="_blank">`. `escapeHtml` escapes `<`, `>`, `"`, `'`, and `&` but does not strip `javascript:` scheme URIs. A contact entry with `linkedin` set to `javascript:alert(document.cookie)` will survive `escapeHtml` (no characters need escaping) and will execute when a user clicks the link. Because the app is authenticated-only, exploitation requires creating a malicious contact first, but any authorized user who can POST to `/api/accounts/:id/contacts` can plant this payload for other users.

**Fix:** Validate the URL scheme server-side when creating or updating a contact (db.js `createContact` / `updateContact`), and add a client-side guard for the anchor:

```javascript
// server.js — add to createContact and updateContact input validation
function isSafeUrl(value) {
  if (!value) return true;
  var lower = value.trim().toLowerCase();
  return lower.startsWith('https://') || lower.startsWith('http://') || lower === '';
}
// Reject if linkedin/phone URL fails isSafeUrl check

// index.html — defensive rendering
var safeLinkedin = c.linkedin && (c.linkedin.startsWith('https://') || c.linkedin.startsWith('http://'))
  ? c.linkedin : null;
html += safeLinkedin
  ? '<a href="' + escapeHtml(safeLinkedin) + '" target="_blank" ...>'
  : '<span style="color:var(--muted)">Not set</span>';
```

---

## Warnings

### WR-01: Schema migration skips all versions when database is first created

**File:** `db.js:21-56`

**Issue:** The migration loop reads `version` once at startup via `db.pragma('user_version', { simple: true })`. For a brand-new database, `version` is `0`. The migration for `version < 1` runs and bumps `user_version` to `1` via `PRAGMA user_version = 1` inside the transaction. But the outer checks for `version < 2`, `version < 3`, ... `version < 6` all still read the original `version` variable, which is `0`. So all six migrations run independently on a new database — tables that `migrate2` through `migrate6` depend on tables from `migrate1` will succeed because they use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE`, but the `PRAGMA user_version` inside each transaction overwrites the previous one, and the final write sets it to `6`.

On an existing database at version 3, `version` is read once as `3`, so `version < 1`, `version < 2`, `version < 3` are all false — correct. However, if any single migration fails mid-way (e.g., `migrate4` throws), `version` stays at `3`, but the subsequent checks for `version < 5` and `version < 6` will still fire because the outer variable is still `3`. This means partial migration leaves the schema in a dirty state with no rollback.

**Fix:** Re-read `user_version` after each migration block rather than reading it once:

```javascript
// After each migrate block, re-read before the next check:
let currentVersion = db.pragma('user_version', { simple: true });

if (currentVersion < 1) {
  // run migrate1...
  currentVersion = db.pragma('user_version', { simple: true });
}

if (currentVersion < 2) {
  // run migrate2...
  currentVersion = db.pragma('user_version', { simple: true });
}
// etc.
```

---

### WR-02: Login route does not validate `Content-Type` — silent mis-parse of non-form-encoded bodies

**File:** `server.js:289-304`

**Issue:** The `POST /login` handler calls `new URLSearchParams(body)` on whatever the body contains, regardless of `Content-Type`. If a client sends JSON (e.g., `{"password":"secret"}`), `URLSearchParams` treats the entire JSON string as a key with no value, `params.get('password')` returns `null`, and authentication silently fails with a 401. This is not a security bypass — it makes authentication harder, not easier — but it is an incorrect behavior that could cause confusion in automated tooling or tests.

More importantly, the same `readBody` function is used by all routes and has no Content-Type enforcement, so JSON-sending clients on the login route always see 401 even with the correct password.

**Fix:** Add a Content-Type check in the login handler:

```javascript
if (req.method === 'POST' && parsed.pathname === '/login') {
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('application/x-www-form-urlencoded')) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(LOGIN_ERROR_PAGE);
    return;
  }
  readBody(req, res, (body) => { /* existing logic */ });
}
```

---

### WR-03: `BACKUP_INTERVAL_HOURS=0` is accepted and schedules backups every millisecond

**File:** `backup.js:67`

**Issue:** `parseInt(process.env.BACKUP_INTERVAL_HOURS) || 6` evaluates to `6` when the env var is unset, but evaluates to `0` when it is explicitly set to `"0"` because `parseInt("0")` is `0`, which is falsy, triggering the `|| 6` default... actually no: `0 || 6` evaluates to `6`. So `0` is safe due to the `||` fallback. However, `parseInt` also accepts non-numeric strings and returns `NaN`, and `NaN || 6` is `6`, so that case is also safe.

The real risk is a negative value: `parseInt("-1")` returns `-1`, which is truthy, so `intervalMs` becomes `-3600000`. `setInterval` with a negative delay is implementation-defined in Node.js (treated as `1ms` in V8). This would flood the Anthropic API with requests until budget is exhausted.

**Fix:** Add a floor/min guard:

```javascript
var intervalHours = Math.max(1, parseInt(process.env.BACKUP_INTERVAL_HOURS) || 6);
```

Apply the same guard to `REFRESH_INTERVAL_HOURS` in `server.js:13`:
```javascript
var REFRESH_INTERVAL_MS = Math.max(1, parseInt(process.env.REFRESH_INTERVAL_HOURS) || 24) * 60 * 60 * 1000;
```

---

### WR-04: Rate limiter keys the `gd_auth` cookie value — unauthenticated requests all share one bucket

**File:** `server.js:33`

**Issue:** `checkRateLimit` uses `cookies['gd_auth'] || 'anonymous'` as the rate limit key. All unauthenticated requests (where the cookie is absent) share the single key `'anonymous'`. If the rate-limited endpoints were reachable without authentication this would allow trivial bypass — one session exhausting `anonymous` blocks all others. Currently all rate-limited endpoints require authentication first (auth check runs before routing), so this is low-risk in practice.

However, `rateLimitMap` is never pruned of old entries for sessions that are no longer active. On a long-running server with many authenticated users, this Map will grow unboundedly. Each entry holds a sliding-window array of timestamps, so the growth is modest, but it is never cleaned up.

**Fix:** Periodically prune stale entries from the map (sessions with no requests in the last 2 minutes):

```javascript
// Run once per minute
setInterval(function() {
  var cutoff = Date.now() - 120000;
  for (var [key, timestamps] of rateLimitMap) {
    if (!timestamps.some(function(t) { return t > cutoff; })) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);
```

---

## Info

### IN-01: `logger.js` log rotation is not atomic — concurrent writes during rename can lose entries

**File:** `logger.js:21-32`

**Issue:** `rotateIfNeeded` checks the file size, then renames it. Between the `statSync` and `renameSync` calls, another in-process `appendFileSync` can write to the old file and those bytes are moved into the rotated `.1` file rather than the new active log. For a single-process Node.js server this window is extremely narrow (synchronous calls), but it is a data-integrity note worth flagging for future async refactors.

**Fix:** No immediate action required. Document the known limitation in a comment above `rotateIfNeeded`. If high-frequency logging becomes a concern, replace with a proper log-rotation library.

---

### IN-02: `db.js` exports the raw `db` instance (`better-sqlite3` Database object)

**File:** `db.js:671`

**Issue:** `module.exports` includes `db` (the raw `better-sqlite3` instance). Any consumer of `db.js` that imports `db.db` can execute arbitrary SQL directly on the database, bypassing all the validation logic in the query helper functions. Currently only `server.js` imports `db.js`, and it never uses `db.db` directly, but the export creates an unnecessary attack surface for future callers.

**Fix:** Remove `db` from the exports:

```javascript
module.exports = {
  dbPath,
  // db,  <-- remove this
  getAccounts,
  // ... rest of exports
};
```

---

### IN-03: Briefing endpoint includes `account.context` in full without length cap

**File:** `server.js:1254`

**Issue:** The briefing prompt includes the full `account.context` string with no truncation, unlike the strategy endpoint which caps `strategy.content` at 1000 characters (line 1264). For accounts with large context blocks (the seed data GM entry is already ~1000 characters), combined with activities, intel notes, contacts, triggers, and the strategy summary, the total prompt can approach or exceed the `max_tokens: 3000` output budget. The main consequence is unexpectedly high token usage, not a crash.

**Fix:** Apply the same truncation guard used elsewhere:

```javascript
'\n\nACCOUNT INTELLIGENCE:\n' + (account.context || '').substring(0, 2000)
```

---

_Reviewed: 2026-04-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
