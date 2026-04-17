---
phase: 07-server-hardening
plan: "02"
subsystem: server-hardening
tags: [rate-limiting, error-handling, timeout, security, api-resilience]
dependency_graph:
  requires: [07-01]
  provides: [rate-limiting, structured-error-responses, timeout-handling]
  affects: [server.js, index.html]
tech_stack:
  added: []
  patterns: [sliding-window-rate-limiter, structured-json-errors, timeout-flag-pattern, headersSent-guard]
key_files:
  created: []
  modified:
    - server.js
    - index.html
decisions:
  - "In-memory sliding window rate limiter keyed on gd_auth cookie value — single shared bucket per password (accepted, single-password app)"
  - "55s timeout (AI_TIMEOUT_MS) chosen to stay safely under Railway 60s request limit"
  - "requestTimedOut flag pattern used instead of checking error message string — more robust"
  - "headersSent guard added to both apiRes.on('end') and proxy.on('error') callbacks — prevents double response on race conditions"
  - "Raw e.message removed from all HTTP response bodies — logged server-side only via logger.log()"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-17"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 7 Plan 02: Rate Limiting and Error Hardening Summary

Rate limiting, 55s timeout handling, and structured JSON error responses added to all 6 Anthropic API endpoints in server.js; all 6 frontend AI panels updated to display error messages inline.

## What Was Built

### server.js Changes

**Rate Limiter (HARD-03):**
- `rateLimitMap` (in-memory Map) + `RATE_LIMIT` constant (default 10, configurable via `RATE_LIMIT_PER_MINUTE` env var)
- `checkRateLimit(req, res)` function: sliding window (60s), keyed on `gd_auth` cookie, returns 429 with `{ error, code: 'RATE_LIMITED' }` on exceed
- Added `if (!checkRateLimit(req, res)) return;` as first line in all 6 user-facing AI endpoints: `/api/claude`, `/api/accounts/:id/refresh`, `/api/accounts/:id/briefing`, `/api/accounts/:id/strategy`, `/api/accounts/:id/debrief`, `/api/contacts/:id/generate`
- The `refreshAccount()` internal function (called by scheduler, not user requests) is NOT rate limited

**Timeout Handling (HARD-02):**
- `AI_TIMEOUT_MS` constant (default 55000ms, configurable via `AI_TIMEOUT_MS` env var)
- Added `timeout: AI_TIMEOUT_MS` to options object for all 6 `https.request` calls
- Added `var requestTimedOut = false;` flag before each request
- Added `proxy.on('timeout', ...)` handler: sets flag, calls `proxy.destroy()`
- Structured error: `{ error: 'The AI service took too long to respond. Please try again.', code: 'TIMEOUT' }`

**Structured Error Responses (HARD-02):**
- Added `if (res.headersSent) return;` guard at top of all response callbacks
- All non-200 Anthropic status codes now return `{ error: '...', code: 'UPSTREAM_ERROR' }` instead of passing raw upstream data
- All `.on('error')` handlers use `requestTimedOut` flag to select TIMEOUT vs API_ERROR message
- All errors logged via `logger.log()` server-side; no `e.message` or `e.stack` in HTTP response bodies
- Manual refresh `.catch()` also hardened to use structured error message

### index.html Changes

All 6 AI panel fetch calls updated with `!r.ok` check + structured JSON error parsing:

| Panel | Function | Error Display Method |
|-------|----------|---------------------|
| Chat | `sendMsg()` | `removeTyping()` + `addMsg(id, 'ai', errMsg)` |
| Refresh | `manualRefresh()` | `showRefreshToast('Refresh Error', errMsg)` |
| Contact Generate | `generateAI()` | Inline HTML in rationale/warmpath body divs |
| Strategy | `generateStrategy()` | Inline in strategy card with retry button |
| Briefing | `generateBriefing()` | Inline in briefing card with retry button |
| Debrief | `extractDebrief()` | Inline in `statusEl` with error CSS class |

Pattern used in all panels:
```javascript
if (!r.ok) {
  return r.json().catch(function() { return {}; }).then(function(errData) {
    var errMsg = errData.error || 'Something went wrong. Please try again.';
    // display errMsg inline
    throw new Error('handled');
  });
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Raw e.message leaked in manual refresh .catch() response**
- **Found during:** Task 1 verification
- **Issue:** `res.end(JSON.stringify({ error: 'Refresh failed: ' + e.message }))` in the manual refresh `.catch()` handler exposed raw error detail in HTTP response body, violating D-10
- **Fix:** Replaced with `{ error: 'The AI service is temporarily unavailable. Please try again in a moment.', code: 'API_ERROR' }`. Raw message still logged via `logger.log()`
- **Files modified:** server.js
- **Commit:** ba1824b (included in Task 1 commit)

**2. [Rule 2 - Missing critical functionality] headersSent guard added to apiRes.on('end') callbacks**
- **Found during:** Task 1 implementation
- **Issue:** Plan specified `headersSent` guard on `.on('error')` handlers only, but a race condition can also occur in `apiRes.on('end')` if the timeout fires and destroys the socket while the response body is still being accumulated
- **Fix:** Added `if (res.headersSent) return;` at top of `apiRes.on('end')` callbacks for all 5 user-facing endpoints (not refreshAccount internal function)
- **Files modified:** server.js
- **Commit:** ba1824b

## Known Stubs

None — all error paths are fully wired.

## Threat Flags

None — all changes are mitigations of threats already documented in the plan's threat model (T-07-06 through T-07-10).

## Self-Check

## Self-Check: PASSED

| Item | Status |
|------|--------|
| server.js | FOUND |
| index.html | FOUND |
| 07-02-SUMMARY.md | FOUND |
| Commit ba1824b (Task 1) | FOUND |
| Commit 12eadfb (Task 2) | FOUND |
