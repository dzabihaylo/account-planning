---
phase: 03-pursuit-tracking
plan: 01
subsystem: activity-log-backend
tags: [database, api, pursuit-tracking, sqlite]
dependency_graph:
  requires: [01-01, 02-01]
  provides: [activity_log table, activity API routes]
  affects: [03-02, 03-03]
tech_stack:
  added: []
  patterns: [schema migration v3, immutable append-only log]
key_files:
  created: []
  modified: [db.js, server.js]
decisions:
  - "Activity entries are immutable (no UPDATE/DELETE) per D-05 and D-18"
  - "linked_contacts stored as JSON string, parsed by clients"
  - "source field constrained to manual/ai_debrief to support both Plan 02 manual entry and Plan 03 AI debrief"
metrics:
  duration: 69s
  completed: "2026-04-13T21:23:10Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 03 Plan 01: Activity Log Backend Summary

Activity log schema migration v3 with GET/POST REST API for immutable pursuit activity entries per account.

## Completed Tasks

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Schema migration v3 and query helpers | 5006aec | db.js: activity_log table, getActivity/addActivity exports |
| 2 | Activity API routes | 7038542 | server.js: GET/POST /api/accounts/:id/activity with validation |

## What Was Built

### Schema Migration v3 (db.js)
- `activity_log` table with columns: id, account_id, type, participants, summary, linked_contacts, source, ai_raw, created_at
- CHECK constraints on `type` (meeting/call/email/note/other) and `source` (manual/ai_debrief)
- Foreign key to accounts table, index on account_id
- PRAGMA user_version bumped to 3

### Query Helpers (db.js)
- `getActivity(accountId, limit)` - returns entries in reverse chronological order, default limit 50
- `addActivity({...})` - inserts and returns the created row
- No update/delete helpers (immutable log)

### API Routes (server.js)
- `GET /api/accounts/:id/activity` - list activity entries, validates account exists (404)
- `POST /api/accounts/:id/activity` - create entry with validation:
  - type required, must be in allowlist
  - summary required, non-empty string
  - source defaults to 'manual', must be manual or ai_debrief
  - linked_contacts auto-serialized to JSON string if object passed
  - Returns 201 with created entry

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data paths are fully wired.

## Self-Check: PASSED
