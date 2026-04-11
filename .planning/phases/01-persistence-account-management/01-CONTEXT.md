# Phase 1: Persistence & Account Management - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace hardcoded account data in index.html with a SQLite database on Railway Volume. Migrate all 13 existing accounts to the database. Add UI for users to add, edit, and remove accounts without touching code. Persist chat history across page reloads.

</domain>

<decisions>
## Implementation Decisions

### Database integration
- **D-01:** Use better-sqlite3 as the SQLite driver — this becomes the first and only npm dependency
- **D-02:** Raw SQL only, no ORM or migration framework — keep the codebase simple
- **D-03:** Use PRAGMA user_version for schema versioning (per PERS-03)

### Account management UI
- **D-04:** Modal form for adding new accounts — an "Add Account" button opens a modal with fields: name, sector, revenue, employees, HQ
- **D-05:** Same modal pattern for editing — pre-filled with current account data
- **D-06:** Soft delete for account removal — account is hidden but data stays in DB, can be restored later

### Data migration
- **D-07:** Remove hardcoded ACCOUNTS object and per-account HTML panels from index.html after migration — clean break, no dual sources of truth
- **D-08:** index.html renders dynamically from API/DB data after migration

### Claude's Discretion
- Migration approach: Claude decides whether to auto-migrate on startup or use a separate script
- DB file location: Claude decides the path strategy (e.g., /data/intel.db with env var override)
- File structure: Claude decides whether to keep server.js monolithic or split into a few files (e.g., db.js)
- Migration scope: Claude decides which account data fields go to DB (structured fields only vs everything including rich content)
- Seeding approach: Claude decides how the 13 initial accounts get into the database
- Edit control placement: Claude decides where edit/delete buttons appear in the UI
- AI context field: Claude decides whether the add/edit form includes the AI context text area now or defers to Phase 5
- Chat persistence design: Claude decides storage format, history limits, and retrieval strategy for PERS-04

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above and in `.planning/REQUIREMENTS.md` (PERS-01 through PERS-04, ACCT-01 through ACCT-04).

### Project context
- `.planning/REQUIREMENTS.md` — Full requirement definitions for PERS-01..04 and ACCT-01..04
- `.planning/ROADMAP.md` — Phase 1 success criteria (5 criteria that must be TRUE)
- `.planning/STATE.md` — Key decisions locked (SQLite + Railway Volume, accounts migrate in Phase 1)

### Existing codebase
- `server.js` — Current HTTP server, auth, API proxy (~190 lines)
- `index.html` — Current monolithic SPA with hardcoded accounts (~1,226 lines)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- CSS variable system (`:root` with `--dark`, `--surface`, `--accent`, etc.) — new modals should use these
- Sidebar structure with `.sidebar-item` pattern — new account entries follow this
- Account panel pattern (`.account-panel` with tabs) — dynamic rendering should replicate this structure
- `GD_CONTEXT` constant — Grid Dynamics system prompt for AI chat, reuse in DB-backed chat

### Established Patterns
- camelCase functions with verb-first naming (`showAccount()`, `sendMsg()`, `filterAccounts()`)
- kebab-case CSS classes with component prefixes (`.acct-*`, `.msg-*`, `.ai-*`)
- Inline `onclick` handlers (not addEventListener)
- Template literals for HTML generation (`initAIPanel()` uses innerHTML with backtick strings)
- Cookie-based auth with `gd_auth` cookie checked on every request

### Integration Points
- `server.js` request handler needs new API routes: GET/POST/PUT/DELETE for accounts, GET for chat history
- `index.html` ACCOUNTS object and all 13 account panel HTML blocks are replaced by dynamic rendering
- `/api/claude` endpoint needs to read account context from DB instead of inline JS object
- Sidebar rendering switches from static HTML to dynamic population from API

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- Chat persistence was not discussed in detail — Claude has full discretion on implementation approach for PERS-04

</deferred>

---

*Phase: 01-persistence-account-management*
*Context gathered: 2026-04-10*
