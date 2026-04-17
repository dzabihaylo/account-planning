# Phase 2: Contact Intelligence - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning
**Source:** Auto-mode (recommended defaults selected)

<domain>
## Phase Boundary

For each account, users can see and manage a map of key decision-makers with AI-generated outreach guidance. Contacts are stored per account in the database. Users can add, edit, remove contacts, log outreach attempts, and request AI-generated rationale and warm paths on demand.

</domain>

<decisions>
## Implementation Decisions

### Contact layout & display
- **D-01:** Contacts displayed as card grid within a new "Contacts" tab on each account panel — grouped by influence level (Champion / Evaluator / Blocker)
- **D-02:** Each contact card shows at a glance: name, title, influence label (color-coded badge), and staleness indicator
- **D-03:** Click a contact card to expand inline detail view showing full fields — outreach rationale, warm path, outreach history
- **D-04:** Reuse Phase 1 modal pattern for add/edit contact forms — same `.modal-overlay`, `.btn-primary`, `.btn-destructive` classes

### AI-generated fields
- **D-05:** AI outreach rationale and warm path generated on-demand via button per contact — not automatic on creation (keeps token costs predictable)
- **D-06:** AI generation uses existing /api/claude proxy pattern — sends account context + contact role/title + Grid Dynamics capabilities as system prompt
- **D-07:** Generated rationale stored in contact DB row (`ai_rationale` TEXT field) — persists until manually refreshed
- **D-08:** Generated warm path stored in contact DB row (`warm_path` TEXT field) — persists until manually refreshed

### Outreach logging
- **D-09:** Outreach attempts logged via inline form on contact detail view (not a separate modal)
- **D-10:** Outreach log fields: date, channel (email / LinkedIn / phone / meeting / other), outcome (connected / no response / declined / meeting scheduled), optional notes
- **D-11:** Outreach history displays as reverse-chronological list under each contact's detail view

### Staleness & lifecycle
- **D-12:** Staleness indicator is a color-coded badge on each contact card — green (<30 days since researched_at), yellow (30-90 days), red (>90 days)
- **D-13:** Manual "Refresh" button per contact triggers AI re-research (updates rationale, warm path, and researched_at timestamp)
- **D-14:** Auto-refresh deferred to Phase 5 (Intelligence Refresh) — this phase is manual-only

### Database schema
- **D-15:** New `contacts` table: id (INTEGER PRIMARY KEY), account_id (TEXT FK), name (TEXT), title (TEXT), role (TEXT), influence (TEXT CHECK Champion/Evaluator/Blocker), email (TEXT), linkedin (TEXT), phone (TEXT), ai_rationale (TEXT), warm_path (TEXT), researched_at (TEXT), is_deleted (INTEGER DEFAULT 0), created_at (TEXT), updated_at (TEXT)
- **D-16:** New `outreach_log` table: id (INTEGER PRIMARY KEY), contact_id (INTEGER FK), date (TEXT), channel (TEXT), outcome (TEXT), notes (TEXT), created_at (TEXT)
- **D-17:** Schema migration to version 2 via PRAGMA user_version (following Phase 1 pattern D-03)
- **D-18:** Soft delete for contacts (following Phase 1 pattern D-06)

### Claude's Discretion
- Contact card visual design details (spacing, shadows, typography within the established CSS variable system)
- Exact Contacts tab placement relative to existing Overview and Ask AI tabs
- Whether the inline detail view pushes content down or overlays
- AI prompt engineering for rationale and warm path generation
- Contact form field ordering and which fields are required vs optional
- Outreach log entry validation rules

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/REQUIREMENTS.md` — CONT-01 through CONT-06 requirement definitions
- `.planning/ROADMAP.md` — Phase 2 success criteria (6 criteria that must be TRUE)

### Prior phase artifacts
- `.planning/phases/01-persistence-account-management/01-CONTEXT.md` — Phase 1 decisions (modal patterns D-04/D-05, soft delete D-06, dynamic rendering D-08, SQLite patterns D-01/D-02/D-03)
- `.planning/phases/01-persistence-account-management/01-01-SUMMARY.md` — db.js structure, query helper patterns, API route patterns
- `.planning/phases/01-persistence-account-management/01-02-SUMMARY.md` — Dynamic rendering approach, escapeHtml pattern, modal implementation

### Existing codebase
- `db.js` — Database module with schema migration pattern, query helpers to replicate for contacts
- `server.js` — API route patterns, /api/claude proxy for AI generation, body size limits
- `index.html` — Dynamic rendering engine, modal system, escapeHtml, CSS variable system

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Modal system (`.modal-overlay`, `.modal`, `.modal-hdr`, `.modal-ftr`) — reuse for add/edit contact
- Button variants (`.btn-primary`, `.btn-secondary`, `.btn-destructive`) — reuse for contact actions
- `escapeHtml()` utility — apply to all contact data rendered via innerHTML
- `db.js` query helper pattern — replicate for contact CRUD (getContacts, createContact, etc.)
- Account panel tab system (`.acct-tabs`, `.tab-pane`) — add Contacts as new tab
- CSS variables (`:root` with `--dark`, `--surface`, `--accent`, `--green`, `--red`, `--gold`) — use for influence badges and staleness colors

### Established Patterns
- camelCase functions with verb-first naming — follow for `loadContacts()`, `saveContact()`, `logOutreach()`
- kebab-case CSS classes with component prefixes — use `.contact-*` prefix for new classes
- Inline `onclick` handlers — continue pattern for contact interactions
- Fire-and-forget API saves (from chat persistence) — use for outreach logging
- PRAGMA user_version migration — increment to version 2 for contacts/outreach_log tables

### Integration Points
- `db.js` — Add contacts table, outreach_log table, query helpers in migration v2
- `server.js` — Add REST routes: /api/accounts/:id/contacts, /api/contacts/:id, /api/contacts/:id/outreach, /api/contacts/:id/generate
- `index.html` — Add Contacts tab to dynamic panel rendering, contact card grid, contact detail view, outreach log form
- `/api/claude` — Reuse for AI generation endpoint (contact-specific system prompt)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — auto-mode selected recommended defaults for all areas.

</specifics>

<deferred>
## Deferred Ideas

- Auto-refresh of contact intelligence — belongs in Phase 5 (Intelligence Refresh)
- Bulk import of contacts from CSV/LinkedIn — potential future feature
- Contact relationship mapping between accounts (same person at multiple companies) — future consideration

</deferred>

---

*Phase: 02-contact-intelligence*
*Context gathered: 2026-04-11 via auto-mode*
