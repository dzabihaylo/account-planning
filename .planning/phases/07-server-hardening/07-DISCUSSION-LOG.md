# Phase 7: Server Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 07-server-hardening
**Areas discussed:** Backup strategy, Error display, Rate limiting scope, Logging destination
**Mode:** Auto (recommended defaults selected)

---

## Backup Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Scheduled file copy to Volume | fs.copyFileSync on interval, /data/backups/, zero deps | Yes |
| SQLite online backup API | Better-sqlite3's backup() method, handles concurrent writes | |
| External backup service | S3/GCS upload, requires new dependency and credentials | |

**User's choice:** [auto] Scheduled file copy (recommended — zero dependencies, Railway Volume persists)
**Notes:** 6-hour interval, keep 5 backups, rotate oldest.

---

## Error Display

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error message | Show error text in the relevant panel, follows existing chat pattern | Yes |
| Toast notification | Global toast overlay for all errors | |
| Modal dialog | Blocking error modal requiring dismissal | |

**User's choice:** [auto] Inline error message (recommended — consistent with existing chat UX)

---

## Rate Limiting Scope

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory sliding window | Per-session tracking, no deps, resets on restart | Yes |
| Express middleware | express-rate-limit package, more features | |
| Token-based budget | Track actual tokens used, not request count | |

**User's choice:** [auto] In-memory sliding window (recommended — zero dependencies, sufficient for single-user tool)
**Notes:** 10 req/min per session, all AI endpoints, 429 response.

---

## Logging Destination

| Option | Description | Selected |
|--------|-------------|----------|
| JSON log file on Volume | /data/errors.log, append-only, structured JSON lines | Yes |
| Railway log drain | External log service integration | |
| SQLite log table | Store logs in the database itself | |

**User's choice:** [auto] JSON log file on Volume (recommended — simple, persistent, no deps)
**Notes:** 10MB cap with rotation, dual output with console.error.

---

## Claude's Discretion

- API timeout values, backup API vs file copy, error message wording, rate limiter internals, log rotation approach

## Deferred Ideas

None
