---
phase: 05-intelligence-refresh
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - db.js
  - server.js
  - index.html
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-14
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

This phase added intelligence refresh infrastructure: a `refresh_budget` and `refresh_log` schema migration in `db.js`, a `refreshAccount()` function plus auto-scheduler in `server.js`, and client-side refresh UI (staleness badges, manual refresh button, budget indicator) in `index.html`. The code is well-structured and follows established project conventions. XSS escaping is consistently applied to all DB-sourced output, and token budget enforcement prevents runaway API costs.

One critical issue was found: the `/api/accounts/:id/refresh` endpoint performs a redundant `isAuthenticated()` check that can never fail in practice but creates confusion — the real concern is that this endpoint bypasses the token budget gate for manual refreshes by design (`D-11`), but there is no rate-limiting or per-user guard, meaning an authenticated user can trigger unbounded serial API calls against any account. In addition, five warnings were found covering a schema migration race condition, error swallowing in the auto-refresh cycle, a missing response body size cap on Anthropic API responses, a `readBody` callback-continuation bug, and a UI state gap where the overview pane is not updated when the initial `loadAccounts()` response is stale.

---

## Critical Issues

### CR-01: Manual refresh endpoint has no rate limiting or budget gate

**File:** `server.js:417-442`
**Issue:** The `POST /api/accounts/:id/refresh` endpoint explicitly bypasses the token budget gate (comment: `D-11, D-19: Manual refresh bypasses the budget gate`). Any authenticated user can POST to this endpoint in a tight loop and exhaust the Anthropic API balance without bound. Each call costs up to 4000 output tokens. With 13 accounts, a rapid sequential loop would use ~52,000 tokens in seconds. No cooldown, no per-account last-refresh timestamp check, and no per-session rate limit exists.

**Fix:**
```javascript
// At the start of the manual refresh handler (server.js ~line 424):
var acct = db.getAccount(refreshAccountId);
if (!acct) { /* 404 */ }

// Add a cooldown: reject if refreshed within the last 5 minutes
var MANUAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
if (acct.last_refreshed_at) {
  var elapsed = Date.now() - new Date(acct.last_refreshed_at).getTime();
  if (elapsed < MANUAL_REFRESH_COOLDOWN_MS) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'This account was refreshed recently. Please wait a few minutes.' }));
    return;
  }
}
```

---

## Warnings

### WR-01: Schema migration version check is a race condition — version read once, used for all migrations

**File:** `db.js:21-187`
**Issue:** The migration version is read once at line 21 (`const version = db.pragma('user_version', { simple: true)`), then used across five independent `if (version < N)` blocks. If two processes start simultaneously (unlikely on Railway but possible during a redeploy race), both could read `version = 0` and attempt to run all migrations concurrently, causing `duplicate table` or `PRAGMA user_version` conflicts. The `user_version` PRAGMA is updated only inside the transaction, so the outer `version` variable is stale after the first migration runs.

**Fix:**
```javascript
// After each migration, re-read the version, or use a single guarded block:
function runMigrations() {
  let v = db.pragma('user_version', { simple: true });
  if (v < 1) { /* migrate1 */ v = 1; }
  if (v < 2) { /* migrate2 */ v = 2; }
  // etc.
}
runMigrations();
```
Alternatively, rely on SQLite's exclusive WAL lock — each migration transaction sets the new `user_version` before committing, so re-reading `user_version` after each block would be safe.

### WR-02: `readBody` does not stop accumulating after size limit is exceeded

**File:** `server.js:80-93`
**Issue:** When the body size exceeds `MAX_BODY`, the response is written and `req.destroy()` is called at line 87, but the `data` event handler is still registered and the `body` string has already grown beyond 1 MB. More critically, `req.destroy()` destroys the socket, but Node.js may still deliver buffered `data` events after the call. The `end` event then fires and `callback(body)` is invoked with the oversized body if `req.destroyed` is not checked correctly. The check at line 91 (`if (!req.destroyed) callback(body)`) is the intended guard, but `req.destroyed` is only set asynchronously, so there is a narrow window where the callback fires with a truncated body that includes data past the limit.

**Fix:**
```javascript
function readBody(req, res, callback) {
  let body = '';
  let aborted = false;
  req.on('data', chunk => {
    if (aborted) return;        // <-- guard added
    body += chunk;
    if (body.length > MAX_BODY) {
      aborted = true;
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request body too large' }));
      req.destroy();
    }
  });
  req.on('end', () => {
    if (!aborted) callback(body);
  });
}
```

### WR-03: Anthropic API response is buffered without a size cap

**File:** `server.js:139-141`, `server.js:509-511`, `server.js:856-858`
**Issue:** Every Anthropic API proxy handler (in `refreshAccount`, `generate`, `debrief`, `strategy`, and the generic `/api/claude` endpoint) accumulates the full response into a string `data += chunk` with no size limit. A pathological or error response from the API (e.g., a retry-after HTML page, a large error payload) can grow unboundedly in memory. The `refreshAccount` function requests `max_tokens: 4000` but the HTTP response can include metadata making it larger. The `/api/claude` chat endpoint uses `max_tokens: 1000` but still has no cap.

**Fix:** Add a size cap to all API response accumulators, consistent with `MAX_BODY`:
```javascript
var MAX_API_RESPONSE = 2 * 1024 * 1024; // 2 MB
apiRes.on('data', function(chunk) {
  data += chunk;
  if (data.length > MAX_API_RESPONSE) {
    apiRes.destroy();
    // handle oversized response error
  }
});
```

### WR-04: Auto-refresh swallows errors silently — stale `last_refreshed_at` written on parse failure

**File:** `server.js:181-190`
**Issue:** When the AI response JSON cannot be parsed (any exception in the inner try/catch at line 181), the catch block at line 183 still calls `db.updateAccountFromRefresh()` to write `last_refreshed_at = now`. This is intentional ("to prevent retry loops") per the comment, but it means a persistent Anthropic API response format change would silently mark all 13 accounts as "just refreshed" — suppressing retries indefinitely — while the `changes_summary` stored in `refresh_log` would be `'Refresh completed but response could not be parsed: ...'`. There is no alerting, no increment of a failure counter, and the auto-scheduler would not retry for another 24 hours.

**Fix:** Consider a separate boolean column `refresh_failed` or a distinct `refresh_type` value of `'auto_failed'` to distinguish failed refreshes from successful ones in the `refresh_log`. At minimum, log at `console.error` level (not just `console.error` with message) when this happens, which is already done at line 182 — but the behavior of silently suppressing retries for 24 hours on parse failure warrants a comment noting the risk.

### WR-05: `loadAccounts()` result is used to render the initial account panel, but account data may be stale after a manual refresh

**File:** `index.html:1596-1614`
**Issue:** After `manualRefresh()` succeeds, the local `accounts` array is updated at line 1597 and the overview pane is re-rendered at line 1603. However, the `kpi-val` elements at lines 1611-1613 are updated by querying `.kpi-val` nodes using positional indexing (`kpiVals[0]`, `kpiVals[1]`). If the panel DOM has been partially modified by another operation (e.g., a concurrent edit via `openEditModal`), this positional lookup could update the wrong elements. Additionally, if the user has navigated away and back to the account between starting and completing the refresh, `document.getElementById('panel-' + accountId)` at line 1608 will find the correct panel (since panels are not removed on navigation), but the account name shown in the toast at line 1618 uses `data.account.name` which is safe.

This is lower severity because the UI is single-user, but the positional `.kpi-val` lookup is fragile.

**Fix:** Use named IDs for KPI elements at render time:
```javascript
// In renderAccountPanel, change:
html += '<div><div class="kpi-val">' + revenue + '</div>...'
// To:
html += '<div><div class="kpi-val" id="kpi-revenue-' + id + '">' + revenue + '</div>...'

// In manualRefresh:
var revenueEl = document.getElementById('kpi-revenue-' + accountId);
if (revenueEl) revenueEl.textContent = data.account.revenue || '';
```

---

## Info

### IN-01: Model name mismatch between chat and other AI endpoints

**File:** `index.html:1305`, `server.js:120`
**Issue:** The chat `sendMsg()` function sends `model: 'claude-sonnet-4-6'` (line 1305 of index.html), while all server-side AI calls use `model: 'claude-sonnet-4-20250514'` (e.g., server.js line 120). These are different model identifiers. `claude-sonnet-4-6` is likely a typo or outdated alias — the canonical model ID used everywhere else in the codebase is `claude-sonnet-4-20250514`. The server-side `/api/claude` handler passes the client-supplied model through unchanged, so the chat endpoint is calling a different (possibly deprecated) model.

**Fix:**
```javascript
// index.html line 1305 — change:
model: 'claude-sonnet-4-6',
// To:
model: 'claude-sonnet-4-20250514',
```

### IN-02: Redundant `isAuthenticated()` check inside already-authenticated route handler

**File:** `server.js:418-422`
**Issue:** The manual refresh handler at line 418 checks `!isAuthenticated(req)` and returns 401. This check is redundant because all routes past line 276 are already gated by the outer `isAuthenticated()` check. An unauthenticated request would have been redirected to the login page at line 272-275 before reaching this code. The same pattern appears in the budget endpoint at line 446. While not a security issue (the outer check is correct), the inner checks create misleading dead code.

**Fix:** Remove the inner `isAuthenticated` checks at lines 418-422 and 446-450. They never fire.

### IN-03: `restoreAccount` does not verify the account exists before returning

**File:** `db.js:423-426`
**Issue:** `restoreAccount(id)` runs the UPDATE unconditionally and then returns the result of a SELECT. If `id` does not exist in the database (not just soft-deleted, but never created), `db.prepare('SELECT * FROM accounts WHERE id = ?').get(id)` returns `undefined`. The server handler at `server.js:404-412` checks `if (!account)` and returns 404 — but this relies on `undefined` being falsy, which works correctly in JavaScript. The issue is just that the db function's return contract is inconsistent: `deleteAccount` explicitly checks `result.changes === 0` and returns `null`, while `restoreAccount` silently returns `undefined` on a no-op.

**Fix:**
```javascript
function restoreAccount(id) {
  const result = db.prepare("UPDATE accounts SET is_deleted = 0, updated_at = datetime('now') WHERE id = ?").run(id);
  if (result.changes === 0) return null;   // consistent with deleteAccount
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
}
```

### IN-04: `hexToRgb` does not handle short hex or malformed input

**File:** `index.html:2719-2723`
**Issue:** `hexToRgb()` parses hex colors of the form `#RRGGBB` using `parseInt(hex.slice(1,3), 16)`. If `t.category` maps to a fallback color `'#7C8DB5'` it works fine, but if someone passes a 3-character hex (`#RGB`) or no `#` prefix, `parseInt` returns `NaN` and the resulting CSS `rgba(NaN,NaN,NaN,0.15)` would be ignored by the browser (invisible badge). All current `TRIGGER_COLORS` entries are valid 6-character hex, so this does not cause a visible bug today.

**Fix:** Either add a guard or note this assumption in a comment:
```javascript
function hexToRgb(hex) {
  if (!hex || hex.length < 7) return '59,130,246'; // fallback to accent blue
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return r + ',' + g + ',' + b;
}
```

---

_Reviewed: 2026-04-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
