---
phase: 07-server-hardening
verified: 2026-04-17T11:20:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Send 11 rapid AI requests in browser within 60 seconds"
    expected: "11th request shows 'Too many requests. Please wait before trying again.' inline in the chat panel, not a browser alert or silent failure"
    why_human: "Cannot start server and simulate rapid browser requests programmatically without running the app"
  - test: "Trigger an Anthropic API timeout in browser (requires AI_TIMEOUT_MS=1000 env var)"
    expected: "User sees 'The AI service took too long to respond. Please try again.' inline in the relevant panel"
    why_human: "Requires server running with modified env var and a real network request to observe frontend rendering"
  - test: "Confirm no raw error details appear in browser DevTools Network response for any AI endpoint failure"
    expected: "Response body contains only { error: 'user-friendly message', code: 'ERROR_CODE' } — no stack traces, no e.message, no API key fragments"
    why_human: "Cannot inspect live network responses without running the app; grep confirmed absence in source but runtime path needs human confirmation"
---

# Phase 7: Server Hardening Verification Report

**Phase Goal:** The server protects account data, handles AI failures gracefully, and leaves enough diagnostic trail to diagnose issues after the fact
**Verified:** 2026-04-17T11:20:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After calling logger.log(), a JSON line appears in /data/errors.log (or ./data/errors.log locally) | VERIFIED | `node -e "require('./logger').log(...)"` produced `{"timestamp":"2026-04-17T11:18:03.424Z","level":"info",...}` in ./data/errors.log |
| 2 | When the log file exceeds 10MB, it is rotated to errors.log.1 and a fresh file is started | VERIFIED | logger.js lines 21-32: `rotateIfNeeded()` checks `stat.size >= 10 * 1024 * 1024`, renames to `LOG_PATH + '.1'` |
| 3 | After server startup, a backup file intel-backup-{timestamp}.db exists in /data/backups/ | VERIFIED | `b.runBackup(db.dbPath)` created `intel-backup-2026-04-17T11-18-07Z.db` in ./data/backups/ |
| 4 | When 6 backups exist, the oldest is pruned to keep only 5 | VERIFIED | backup.js: `KEEP_COUNT = 5`, `files.slice(KEEP_COUNT)` deleted via `fs.unlinkSync` |
| 5 | Existing console.error calls in server.js also write to the persistent log file | VERIFIED | server.js: 15 `logger.log()` calls; only 2 `console.error` remain (lines 32, 37 — startup validation before logger is ready, intentional exception per plan) |
| 6 | When the Anthropic API times out, the user sees 'The AI service took too long to respond' instead of a silent failure or raw error | VERIFIED (code) | server.js: `proxy.on('timeout')` sets `requestTimedOut=true`, destroys socket; error handler returns `{ error: 'The AI service took too long to respond. Please try again.', code: 'TIMEOUT' }`; index.html: all 6 AI panels parse `errData.error` and display inline — HUMAN CHECK needed for browser rendering |
| 7 | Sending 11 AI requests in under 60 seconds results in a 429 response on the 11th request | VERIFIED (code) | `checkRateLimit()` (line 41): sliding window 60s, `RATE_LIMIT = 10`; wired to all 6 user-facing AI endpoints (lines 476, 519, 849, 1071, 1264, 1474); returns 429 + `{ error, code: 'RATE_LIMITED' }` — HUMAN CHECK needed for end-to-end browser behavior |

**Score:** 7/7 truths verified (automated evidence); 3 items need human testing for runtime behavior

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `logger.js` | Persistent dual-output JSON lines logger, exports `log` | VERIFIED | 63 lines; exports `{ log }`; `appendFileSync`, `rotateIfNeeded` (2 occurrences), `10 * 1024 * 1024`, dual console output confirmed |
| `backup.js` | SQLite backup scheduler with pruning, exports `startBackupScheduler`, `runBackup` | VERIFIED | Exports `{ startBackupScheduler, runBackup }`; `copyFileSync`, `intel-backup-` pattern, `BACKUP_INTERVAL_HOURS`, `KEEP_COUNT=5`, `slice(KEEP_COUNT)` confirmed |
| `db.js` | Exports `dbPath` for backup module | VERIFIED | `dbPath,` added as first entry in `module.exports`; `node -e "require('./db').dbPath"` returns `./data/intel.db` |
| `server.js` | Logger + backup wired at startup; rate limiter; timeout; structured errors | VERIFIED | `require('./logger')` (line 7), `require('./backup')` (line 8), `startBackupScheduler(db.dbPath)` (line 1586), `checkRateLimit` (7 occurrences), `AI_TIMEOUT_MS`, `headersSent` guard (10 occurrences), `RATE_LIMITED`/`TIMEOUT`/`UPSTREAM_ERROR`/`API_ERROR` codes |
| `index.html` | Frontend 429 and error response handling for all AI panels | VERIFIED | 16 `!r.ok` or `!res.ok` checks; `errData`/`errMsg` pattern in all 6 AI panels: chat (`sendMsg`), refresh (`manualRefresh`), contact generate (`generateAI`), strategy (`generateStrategy`), briefing (`generateBriefing`), debrief (`extractDebrief`) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `backup.js` | `logger.js` | `require('./logger')` | WIRED | `const logger = require('./logger')` confirmed; `logger.log()` called in BACKUP_COMPLETE, BACKUP_FAILED, BACKUP_PRUNED, BACKUP_PRUNE_FAILED, BACKUP_PRUNE_ERROR paths |
| `server.js` | `logger.js` | `require('./logger')` | WIRED | Line 7; 15 `logger.log()` call sites covering all AI endpoint error paths |
| `server.js` | `backup.js` | `require('./backup')` | WIRED | Line 8; `startBackupScheduler(db.dbPath)` called in `server.listen` callback (line 1586) |
| `backup.js` | `db.js` | `dbPath from db module` | WIRED | `dbPath` added to `module.exports` in db.js; `b.runBackup(db.dbPath)` confirmed functional |
| `server.js` | `logger.js` | rate limit logging | WIRED | `logger.log('warn', req.url, 'RATE_LIMITED', ...)` in `checkRateLimit()` |
| `server.js` | Anthropic API | `https.request` with timeout | WIRED | `timeout: AI_TIMEOUT_MS` (55000ms default) in all 6 call sites; `proxy.on('timeout')` handler confirmed |
| `index.html` | `server.js` | fetch response status check | WIRED | `if (!res.ok)` / `if (!r.ok)` before JSON parse in all 6 AI panel handlers; `errData.error` extracted and displayed inline |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `logger.js` | log file entries | `fs.appendFileSync` | Yes — `node` spot-check wrote and read back valid JSON | FLOWING |
| `backup.js` | backup file | `fs.copyFileSync(dbPath, dest)` | Yes — spot-check created `intel-backup-2026-04-17T11-18-07Z.db` | FLOWING |
| `server.js` rate limiter | `rateLimitMap` | sliding window timestamps | Yes — in-memory Map populated per request | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| logger.log() writes JSON line | `node -e "require('./logger').log('info','test','TEST','verify',null)"` | JSON line written to ./data/errors.log | PASS |
| db.dbPath exported | `node -e "const db=require('./db');console.log(db.dbPath)"` | `./data/intel.db` | PASS |
| backup.js creates backup file | `node -e "require('./backup').runBackup(require('./db').dbPath)"` | `intel-backup-2026-04-17T11-18-07Z.db` created | PASS |
| Log file readable with valid JSON structure | Read last line of ./data/errors.log | `{"timestamp":"...","level":"info","endpoint":"backup",...}` | PASS |
| 429 response body structure | grep of server.js | `{ error: 'Too many requests...', code: 'RATE_LIMITED' }` confirmed in source | PASS |
| No raw e.message in HTTP response bodies | `grep "res.end.*e.message" server.js` | Zero matches | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HARD-01 | 07-01 | SQLite database backed up automatically | SATISFIED | backup.js: `startBackupScheduler()` runs at startup then every 6h; `copyFileSync` to `/data/backups`; prunes to 5 files; wired in `server.listen` callback |
| HARD-02 | 07-02 | AI endpoint errors caught and displayed gracefully | SATISFIED | All 6 AI endpoints: timeout (55s) + `requestTimedOut` pattern; structured `{ error, code }` responses; all 6 frontend panels parse and display inline |
| HARD-03 | 07-02 | AI endpoints rate limited | SATISFIED | `checkRateLimit()`: 10 req/min sliding window; 429 + `RATE_LIMITED` code; wired to all 6 user-facing AI endpoints; `RATE_LIMIT_PER_MINUTE` configurable |
| HARD-04 | 07-01 | Server logs errors to persistent location | SATISFIED | logger.js: JSON-lines to `/data/errors.log` (Railway Volume); 10MB rotation; 15 `logger.log()` call sites in server.js; spot-check confirmed write/read |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| index.html | 1660, 2567, 2640, 2719, 3123, 3360, 3464, 3527, 3571 | `throw new Error('Server error')` | Info | These are all CRUD endpoints (save contact, save strategy, load briefing GET, add intel note, log activity, approve debrief activity, approve contact update) — NOT Anthropic AI call sites. Not in scope for HARD-02/HARD-03. No action needed. |

No blockers. The `throw new Error('Server error')` occurrences are on non-AI fetch calls (CRUD data mutations) that are outside the plan's scope.

### Human Verification Required

#### 1. Rate Limit End-to-End — Browser

**Test:** Open the app in a browser, navigate to any account's Ask AI tab. Send 11 messages in rapid succession (under 60 seconds).
**Expected:** The 11th message response displays "Too many requests. Please wait before trying again." inline as an AI message in the chat panel. No browser alert. No silent failure.
**Why human:** Cannot start server and simulate rapid browser requests without running the app. Source code path is verified but runtime rendering requires observation.

#### 2. Timeout Error Message — Browser

**Test:** Set `AI_TIMEOUT_MS=1000` env var, start server locally, send an AI request to any panel (chat, briefing, strategy, debrief).
**Expected:** After ~1 second, user sees "The AI service took too long to respond. Please try again." inline in the panel — not a spinner that never resolves.
**Why human:** Requires server running with modified env var and a live Anthropic API call (or network blockage) to trigger the timeout path and observe frontend rendering.

#### 3. No Raw Error Leakage in Network Responses

**Test:** Open browser DevTools > Network tab. Trigger an AI error (e.g., disconnect network, then send a chat message). Inspect the HTTP response body.
**Expected:** Response JSON is `{ "error": "...", "code": "..." }` only. No stack traces, no `e.message` content, no API key fragments.
**Why human:** `grep "res.end.*e.message" server.js` returned zero matches confirming source-level correctness, but the actual network response body needs visual confirmation during a live failure.

### Gaps Summary

No gaps found. All 7 observable truths are verified against the codebase:

- HARD-04 (logging): `logger.js` is fully implemented, dual-outputs to console + file, rotates at 10MB, never throws. Wired into server.js at boot. Verified functional by spot-check.
- HARD-01 (backup): `backup.js` creates timestamped SQLite backups, prunes to 5 files, runs at startup + every 6h. `db.dbPath` exported. Wired via `startBackupScheduler(db.dbPath)` in server listen callback. Verified functional by spot-check.
- HARD-03 (rate limiting): `checkRateLimit()` sliding window enforced on all 6 user-facing AI endpoints. Returns 429 with structured JSON. Configurable via env var. Stale-entry cleanup via `setInterval`.
- HARD-02 (error handling): All 6 Anthropic API call sites have 55s timeout + `requestTimedOut` flag + `headersSent` guard. All error responses use `{ error, code }` structured JSON. All 6 frontend panels display errors inline. No raw error details in response bodies.

Three human verification items remain to confirm runtime behavior in the browser — these are observational confirmations of code paths already verified to exist and be correctly wired.

---

_Verified: 2026-04-17T11:20:00Z_
_Verifier: Claude (gsd-verifier)_
