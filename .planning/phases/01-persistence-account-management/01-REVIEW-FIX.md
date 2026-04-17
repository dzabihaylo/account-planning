---
phase: 01-persistence-account-management
fixed_at: 2026-04-10T12:30:00Z
review_path: .planning/phases/01-persistence-account-management/01-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-04-10T12:30:00Z
**Source review:** .planning/phases/01-persistence-account-management/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: No request body size limit allows denial-of-service

**Files modified:** `server.js`
**Commit:** 27c9b2c
**Applied fix:** Added a `readBody(req, res, callback)` helper function with a 1 MB size limit (`MAX_BODY = 1024 * 1024`). The helper accumulates body chunks and responds with HTTP 413 if the limit is exceeded, destroying the request. Replaced all 5 inline `req.on('data')` / `req.on('end')` patterns across POST and PUT endpoints with calls to `readBody`.

### CR-02: Wildcard CORS policy bypasses cookie-based authentication

**Files modified:** `server.js`
**Commit:** 006ff03
**Applied fix:** Removed the three `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` response headers. The SPA is served from the same origin, so cross-origin headers are not needed. Added a comment explaining the same-origin design.

### WR-01: DELETE /api/accounts/:id returns success even when account does not exist

**Files modified:** `server.js`, `db.js`
**Commit:** 841d81d
**Applied fix:** Updated `deleteAccount()` in `db.js` to add `AND is_deleted = 0` to the WHERE clause and check `result.changes === 0`, returning `null` when no row was affected. Updated server.js DELETE handler to return HTTP 404 when `deleteAccount()` returns null.

### WR-02: POST /api/accounts/:id/chat does not validate account existence

**Files modified:** `db.js`
**Commit:** ce5e3bf
**Applied fix:** Added `db.pragma('foreign_keys = ON')` after opening the database, immediately after the WAL mode pragma. This enables SQLite foreign key constraint enforcement so chat messages cannot reference nonexistent account IDs.

### WR-03: restoreAccount returns null without 404 handling

**Files modified:** `server.js`
**Commit:** 937e621
**Applied fix:** Added a null check on the return value of `db.restoreAccount()` in the POST /api/accounts/:id/restore handler. When the account is not found, the endpoint now returns HTTP 404 with `{ error: 'Account not found' }` instead of HTTP 200 with null.

### WR-04: Redundant ID validation on DELETE but not on other endpoints

**Files modified:** `server.js`
**Commit:** 189fb83
**Applied fix:** Removed the redundant `if (!/^[a-z0-9-]+$/.test(accountMatch[1]))` check from the DELETE handler. The route regex `(/^\/api\/accounts\/([a-z0-9-]+)$/)` already constrains the ID to the same character set. Added a comment noting this.

### WR-05: context field rendered with .replace after escapeHtml ordering dependency

**Files modified:** `index.html`
**Commit:** a7901b8
**Applied fix:** Added `escapeHtml()` call to the context rendering on line 600 (was missing entirely, only `.replace(/\n/g, '<br>')` was applied without escaping). Added security comments at both locations (context rendering and `addMsg` function) documenting that `escapeHtml` MUST run before any `.replace()` that injects HTML tags.

---

_Fixed: 2026-04-10T12:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
