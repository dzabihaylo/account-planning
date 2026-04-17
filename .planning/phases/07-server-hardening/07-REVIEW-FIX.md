---
phase: 07-server-hardening
fixed_at: 2026-04-14T00:00:00Z
review_path: .planning/phases/07-server-hardening/07-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 07: Code Review Fix Report

**Fixed at:** 2026-04-14
**Source review:** .planning/phases/07-server-hardening/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: `/api/claude` proxy forwards arbitrary user-controlled payload to Anthropic API

**Files modified:** `server.js`
**Commit:** f62958d
**Applied fix:** Replaced `JSON.stringify(parsed_body)` with an explicit allowlist payload that pins `model` to `claude-sonnet-4-20250514` and `max_tokens` to `1000` server-side. Added upfront validation that `parsed_body.messages` is a non-empty array, returning 400 if missing or malformed. The system prompt is now built from a local variable rather than forwarded from the client.

---

### CR-02: `javascript:` URI accepted as LinkedIn URL, executable as `href`

**Files modified:** `server.js`, `index.html`
**Commit:** f62958d (server.js — `isSafeUrl` helper + validation in create/update routes), bdb2d3e (index.html — defensive render)
**Applied fix:** Added `isSafeUrl()` helper in server.js that requires `http://` or `https://` scheme. Applied the check in both `POST /api/accounts/:id/contacts` (createContact) and `PUT /api/contacts/:id` (updateContact) routes, returning 400 on invalid URLs. In index.html, the LinkedIn anchor now only renders as a link when the stored value starts with `http://` or `https://`; otherwise it renders as "Not set".

---

### WR-01: Schema migration skips all versions when database is first created

**Files modified:** `db.js`
**Commit:** 5c354ab
**Applied fix:** Changed the single `const version` read at startup to `let currentVersion`, then added a `currentVersion = db.pragma('user_version', { simple: true })` re-read after each migration block (migrations 1 through 6). The existing `const currentVersion` logging variable at line 378 was renamed to `schemaVersion` to avoid the redeclaration conflict.

---

### WR-02: Login route does not validate `Content-Type` — silent mis-parse of non-form-encoded bodies

**Files modified:** `server.js`
**Commit:** f62958d
**Applied fix:** Added a Content-Type check before `readBody` in the `POST /login` handler. If the request `Content-Type` does not include `application/x-www-form-urlencoded`, the handler immediately returns 400 with `LOGIN_ERROR_PAGE` without reading the body.

---

### WR-03: `BACKUP_INTERVAL_HOURS=0` is accepted and schedules backups every millisecond

**Files modified:** `backup.js`, `server.js`
**Commit:** f498cfc
**Applied fix:** Wrapped both interval calculations with `Math.max(1, ...)` to enforce a floor of 1 hour. In `backup.js`: `Math.max(1, parseInt(process.env.BACKUP_INTERVAL_HOURS) || 6)`. In `server.js`: `Math.max(1, parseInt(process.env.REFRESH_INTERVAL_HOURS) || 24)`.

---

### WR-04: Rate limiter keys the `gd_auth` cookie value — map grows unboundedly

**Files modified:** `server.js`
**Commit:** 676f8ef
**Applied fix:** Added a `setInterval` that runs once per minute and deletes any `rateLimitMap` entry whose timestamp array contains no values within the last 2 minutes (120 seconds). This prevents unbounded growth on long-running servers with many authenticated sessions.

---

_Fixed: 2026-04-14_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
