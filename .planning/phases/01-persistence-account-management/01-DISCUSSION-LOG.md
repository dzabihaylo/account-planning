# Phase 1: Persistence & Account Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 01-persistence-account-management
**Areas discussed:** Database integration, Account management UI, Data migration

---

## Database integration

### SQLite driver choice

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, better-sqlite3 | Add better-sqlite3 as the sole npm dependency. Synchronous, fast, most popular. | ✓ |
| Minimal dependencies only | Use better-sqlite3 but keep as only dependency — no ORMs, raw SQL only. | |
| You decide | Claude picks the best SQLite approach. | |

**User's choice:** Yes, better-sqlite3
**Notes:** User accepts breaking the zero-dependency pattern for SQLite.

### Migration management

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-migrate on startup | server.js checks PRAGMA user_version on boot and runs pending migrations inline. | |
| Separate migration script | A standalone migrate.js that runs before server starts. | |
| You decide | Claude picks the approach. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on migration approach.

### Database file location

| Option | Description | Selected |
|--------|-------------|----------|
| /data/intel.db | Store at /data/intel.db on Railway Volume. Locally falls back to ./data/intel.db. | |
| Configurable via env var | DATABASE_PATH env var (defaults to /data/intel.db on Railway, ./data/intel.db locally). | |
| You decide | Claude picks the path strategy. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on path strategy.

### File structure

| Option | Description | Selected |
|--------|-------------|----------|
| Keep server.js monolithic | Add DB init, migrations, and routes all in server.js. | |
| Split into a few files | e.g., server.js (HTTP), db.js (database init + queries). | |
| You decide | Claude picks the structure. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on file structure.

---

## Account management UI

### Adding accounts

| Option | Description | Selected |
|--------|-------------|----------|
| Modal form | 'Add Account' button opens modal with fields: name, sector, revenue, employees, HQ. | ✓ |
| Inline in sidebar | Expandable form at top of sidebar. | |
| Separate admin page | Dedicated /admin page for account management. | |
| You decide | Claude picks the UI pattern. | |

**User's choice:** Modal form
**Notes:** None.

### Editing accounts

| Option | Description | Selected |
|--------|-------------|----------|
| Edit button in header | Pencil icon in account panel header, opens pre-filled modal. | |
| Context menu on sidebar | Right-click or three-dot menu on sidebar item. | |
| Both | Edit in header AND context menu on sidebar. | |
| You decide | Claude picks the placement. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on edit control placement.

### Deleting accounts

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm dialog | Confirmation modal before deletion. | |
| Soft delete | Account hidden but data stays in DB, can be restored later. | ✓ |
| You decide | Claude picks the safety level. | |

**User's choice:** Soft delete
**Notes:** User wants forgiving deletion — data preserved, account can be restored.

### AI context field

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include it | Large text area in add/edit modal for AI context. | |
| Auto-generate later | Skip context field for now, Phase 5 handles it. | |
| You decide | Claude determines whether to include now or defer. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion.

---

## Data migration

### What migrates to DB

| Option | Description | Selected |
|--------|-------------|----------|
| Everything to DB | All account data including rich HTML content. index.html becomes pure shell. | |
| Structured fields only | Only name, sector, HQ, revenue, employees, AI context. Tab content stays as HTML. | |
| You decide | Claude determines the right scope. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on migration scope.

### Seeding initial data

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-seed on first run | If DB empty on server start, populate from seed data file. | |
| Migration script | One-time script that reads ACCOUNTS object and inserts into DB. | |
| You decide | Claude picks the seeding approach. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion.

### Post-migration cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Remove hardcoded data | Clean break — delete ACCOUNTS object and HTML panels. Render dynamically. | ✓ |
| Keep as fallback | Keep ACCOUNTS as read-only fallback if DB unavailable. | |
| You decide | Claude determines cleanup strategy. | |

**User's choice:** Remove hardcoded data
**Notes:** User wants a clean break — no dual sources of truth.

---

## Claude's Discretion

- Migration approach (startup vs separate script)
- DB file location and path strategy
- File structure (monolithic vs split)
- Migration scope (structured fields vs everything)
- Seeding approach
- Edit/delete control placement
- AI context field inclusion
- Chat persistence implementation (PERS-04)

## Deferred Ideas

- Chat persistence details — deferred to Claude's discretion rather than discussed
