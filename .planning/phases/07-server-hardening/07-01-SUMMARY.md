---
phase: 07-server-hardening
plan: "01"
subsystem: server-infrastructure
tags: [logging, backup, sqlite, railway-volume, hard-01, hard-04]
dependency_graph:
  requires: []
  provides: [logger.js, backup.js, db.dbPath]
  affects: [server.js, db.js]
tech_stack:
  added: []
  patterns: [json-lines-logging, scheduled-backup, log-rotation]
key_files:
  created:
    - logger.js
    - backup.js
  modified:
    - db.js
    - server.js
decisions:
  - "Log path resolves to /data/errors.log on Railway Volume, ./data/errors.log locally — matches db.js resolution pattern"
  - "Backup copies only the .db file, not .db-shm or .db-wal, to avoid WAL corruption on hot copy"
  - "KEEP_COUNT=5 backups, prune runs after every backup write"
  - "All non-startup console.error calls in server.js now route through logger for dual output"
metrics:
  duration_minutes: 10
  completed_date: "2026-04-17"
  tasks_completed: 2
  files_changed: 4
---

# Phase 07 Plan 01: Logging and Backup Infrastructure Summary

**One-liner:** JSON-lines persistent logger with 10MB rotation + scheduled SQLite backup with 5-file pruning, wired into server.js at boot.

---

## What Was Built

### logger.js (HARD-04)
- Exports a single `log(level, endpoint, errorType, message, accountId)` function
- Writes JSON-lines entries to `/data/errors.log` (Railway Volume) or `./data/errors.log` (local)
- Dual output: `console.error` for error level, `console.log` for info/warn
- Rotates at 10MB threshold, keeps one rotated file (`errors.log.1`)
- Never throws — file write failures fall back to console.error only
- Zero npm dependencies (fs, path built-ins only)

### backup.js (HARD-01)
- Exports `runBackup(dbPath)` and `startBackupScheduler(dbPath)`
- Creates timestamped backups: `intel-backup-{ISO8601}.db` in `/data/backups` or `./data/backups`
- Copies only the `.db` file (not `.db-shm` or `.db-wal`) to avoid WAL corruption
- Prunes to keep 5 most recent backups after every write
- Backup interval configurable via `BACKUP_INTERVAL_HOURS` env var (default: 6 hours)
- Runs once immediately at startup, then on interval
- All events logged through logger.js

### db.js update
- Added `dbPath` to `module.exports` so backup.js can reference the database file path

### server.js wiring
- Added `require('./logger')` and `require('./backup')` after existing db import
- Added `startBackupScheduler(db.dbPath)` in `server.listen` callback
- Replaced all 8 `console.error` calls (except 2 startup validation lines) with `logger.log('error', ...)` calls with endpoint and error_type context

---

## Commits

| Hash | Description |
|------|-------------|
| eedcf3f | feat(07-01): add persistent JSON-lines logger module (HARD-04) |
| cd180c6 | feat(07-01): add SQLite backup scheduler and wire logger+backup into server.js (HARD-01) |

---

## Deviations from Plan

### Minor Pattern Difference — rotation target stored as variable concatenation

**Found during:** Task 1 acceptance criteria check
**Issue:** The plan acceptance criteria `grep "errors.log.1" logger.js` would fail because the rotation filename is stored as `LOG_PATH + '.1'` (a variable concatenation), not a hardcoded literal. At runtime this produces `errors.log.1` as intended.
**Fix:** No code change needed — the runtime behavior is identical. The grep pattern in the acceptance criteria is a documentation artifact, not a correctness issue.

---

## Known Stubs

None. All functionality is fully wired.

---

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary changes introduced. All file paths come from environment variables (admin-controlled), not user input.

---

## Self-Check

**Files exist:**
- logger.js: FOUND
- backup.js: FOUND
- db.js (dbPath exported): FOUND
- server.js (logger + backup wired): FOUND

**Commits exist:**
- eedcf3f: FOUND
- cd180c6: FOUND

**Verification tests:** All 5 passed (logger writes JSON lines, dbPath exported, backup file created, log file readable, backup directory populated)

## Self-Check: PASSED
