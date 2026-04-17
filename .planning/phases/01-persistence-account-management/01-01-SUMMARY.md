---
phase: 01-persistence-account-management
plan: 01
subsystem: database-and-api
tags: [sqlite, rest-api, persistence, migration, seed-data]
dependency_graph:
  requires: []
  provides: [db.js, /api/accounts, sqlite-schema-v1]
  affects: [server.js, package.json, railway.toml, .gitignore]
tech_stack:
  added: [better-sqlite3]
  patterns: [PRAGMA-user_version-migration, WAL-mode, parameterized-queries, soft-delete]
key_files:
  created: [db.js, .gitignore, package-lock.json]
  modified: [server.js, package.json, railway.toml]
key_decisions:
  - "better-sqlite3 as sole npm dependency for zero-config persistence"
  - "GD_CONTEXT moved server-side to keep account intelligence in server.js"
  - "Soft delete via is_deleted flag rather than row removal"
  - "ID generation from name with collision avoidance suffix"
metrics:
  duration_seconds: 256
  completed: 2026-04-11T00:54:08Z
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 3
requirements: [PERS-01, PERS-02, PERS-03, ACCT-04]
---

# Phase 01 Plan 01: SQLite Database and Account REST API Summary

SQLite persistence layer with better-sqlite3, schema migration via PRAGMA user_version, all 13 accounts seeded from hardcoded data, and full CRUD REST API on server.js.

## What Was Done

### Task 1: Create db.js with SQLite schema, migration, seed data, and query helpers
**Commit:** `2ef9972`

- Installed `better-sqlite3` as the project's first and only npm dependency
- Created `db.js` with database path resolution: `DATABASE_PATH` env var > `/data/intel.db` (Railway) > `./data/intel.db` (local)
- Schema v1 migration via `PRAGMA user_version`: `accounts` table (12 columns including `dot_color`, `display_revenue`, `is_deleted`) and `chat_messages` table with foreign key to accounts
- WAL journal mode enabled for concurrent read performance
- Seeded all 13 accounts with full context strings copied verbatim from `index.html` ACCOUNTS object
- Exported 10 query helpers: `getAccounts`, `getAccount`, `createAccount`, `updateAccount`, `deleteAccount`, `restoreAccount`, `getChatMessages`, `addChatMessage`, `clearChatMessages`, plus `db` instance
- Created `.gitignore` with `data/` and `*.db` exclusions
- All queries use parameterized prepared statements (T-01-01 mitigation)

### Task 2: Add REST API routes to server.js for account CRUD
**Commit:** `7029dc3`

- Added 6 REST routes to `server.js`: GET /api/accounts, GET /api/accounts/:id, POST /api/accounts, PUT /api/accounts/:id, DELETE /api/accounts/:id, POST /api/accounts/:id/restore
- All routes placed after `isAuthenticated()` guard (T-01-04 mitigation)
- Moved `GD_CONTEXT` constant from `index.html` to `server.js` for server-side system prompt construction
- Enhanced `/api/claude` endpoint to accept `account_id` field and build system prompt from DB data (backward compatible)
- Updated CORS to include PUT and DELETE methods
- Added Railway volume mount documentation to `railway.toml`
- Input validation: `name` required on create (400 if missing), ID regex validation on delete (T-01-02 mitigation)
- Error handling: try/catch on all body parsing, 400 for invalid JSON, 404 for missing accounts

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `node -e "require('./db').getAccounts().length"` returns 13
- `node -e "require('./db').db.pragma('user_version',{simple:true})"` returns 1
- GET /api/accounts returns 200 with 13 accounts
- GET /api/accounts/gm returns 200 with correct name
- POST /api/accounts without name returns 400
- DELETE /api/accounts/gm returns 200, subsequent GET returns 404
- After soft delete, GET /api/accounts returns 12 accounts

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-01-01 | All db.js queries use parameterized prepared statements |
| T-01-02 | Account ID validated via regex `/^[a-z0-9-]+$/` in route matching |
| T-01-04 | All new routes placed after `isAuthenticated()` guard |

## Threat Flags

None - no new security surface beyond what was planned.

## Known Stubs

None - all endpoints are fully functional with real database queries.
