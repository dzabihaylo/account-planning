# Phase 4: Pursuit Strategy - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning
**Source:** Auto-mode with chain (recommended defaults selected)

<domain>
## Phase Boundary

Each account gets a living strategy layer — a new "Strategy" tab containing private intel notes, an AI-synthesized strategy summary, and buying trigger tags. The strategy summary draws on all available account data (pursuit logs, contacts, private intel, chat history) and can be manually edited. Buying triggers are tagged to accounts and appear in the timeline.

</domain>

<decisions>
## Implementation Decisions

### Private intel layer (STRT-01)
- **D-01:** New "Strategy" tab on each account panel — placed after Activity, before Ask AI
- **D-02:** Private intel notes displayed as a reverse-chronological list in the Strategy tab, each labeled "Internal" with a timestamp
- **D-03:** Inline textarea with "Add Note" button at top of notes section — follows Phase 3's inline entry pattern
- **D-04:** Notes are stored in a new `private_intel` table with account_id, content, created_at
- **D-05:** Notes are immutable once saved (no edit/delete) — preserves audit trail like activity entries (Phase 3 D-05)

### AI strategy synthesis (STRT-02)
- **D-06:** Prominent strategy summary card at the top of the Strategy tab — shows AI-synthesized strategy text
- **D-07:** "Regenerate Strategy" button triggers AI synthesis on demand — follows Phase 2's on-demand AI pattern
- **D-08:** AI synthesis uses ALL available account data: account context, pursuit activity logs, private intel notes, contact data (with outreach history), and chat history
- **D-09:** Strategy stored in a `strategy_summaries` table with account_id, content, generated_at, edited_at, is_edited (boolean)
- **D-10:** First load of Strategy tab auto-generates if no strategy exists yet — subsequent updates are manual via Regenerate button

### Strategy editing (STRT-03)
- **D-11:** Click "Edit" button on strategy summary card to enter edit mode — textarea replaces the display text
- **D-12:** Save/Cancel buttons appear during edit mode — Save persists edits, Cancel reverts
- **D-13:** Edited strategies display an "Edited" badge next to "AI-Generated" to show human modification
- **D-14:** Regenerating after manual edit warns: "This will replace your edits. Continue?" — prevents accidental loss

### Buying trigger tracking (STRT-04)
- **D-15:** Tag-based system with predefined categories: CTO Change, Cost Cuts, Failed Vendor, Reorg, M&A, Digital Initiative, plus custom free-text tags
- **D-16:** Tags stored in a `buying_triggers` table with account_id, tag (TEXT), category (TEXT), notes (TEXT), created_at
- **D-17:** Tags display as colored badges on the Strategy tab below the strategy summary
- **D-18:** Tags also appear as entries in the Activity timeline with type "trigger"
- **D-19:** "Add Trigger" button opens inline form with category dropdown + optional notes
- **D-20:** Each predefined category gets a distinct color (follows Phase 2's influence badge color pattern)

### Database schema
- **D-21:** New `private_intel` table: id (INTEGER PRIMARY KEY), account_id (TEXT FK), content (TEXT NOT NULL), created_at (TEXT)
- **D-22:** New `strategy_summaries` table: id (INTEGER PRIMARY KEY), account_id (TEXT FK UNIQUE), content (TEXT NOT NULL), is_edited (INTEGER DEFAULT 0), generated_at (TEXT), edited_at (TEXT)
- **D-23:** New `buying_triggers` table: id (INTEGER PRIMARY KEY), account_id (TEXT FK), tag (TEXT NOT NULL), category (TEXT NOT NULL), notes (TEXT DEFAULT ''), created_at (TEXT)
- **D-24:** Schema migration to version 4 via PRAGMA user_version

### Claude's Discretion
- Strategy tab visual layout and section ordering
- AI prompt engineering for strategy synthesis quality
- Color assignments for predefined trigger categories
- Whether strategy auto-generation shows a loading state or generates in background
- Note/trigger form validation rules
- How chat history is summarized for AI context (full vs recent N messages)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/REQUIREMENTS.md` — STRT-01 through STRT-04 requirement definitions
- `.planning/ROADMAP.md` — Phase 4 success criteria (4 criteria that must be TRUE)

### Prior phase artifacts
- `.planning/phases/01-persistence-account-management/01-CONTEXT.md` — Modal patterns, SQLite patterns, dynamic rendering
- `.planning/phases/02-contact-intelligence/02-CONTEXT.md` — Contact schema, AI on-demand pattern, card grid
- `.planning/phases/03-pursuit-tracking/03-CONTEXT.md` — Activity log schema, inline entry pattern, AI debrief/review pattern

### Existing codebase
- `db.js` — Database module with migration v3, query helper patterns
- `server.js` — API route patterns, /api/claude proxy, body size limits
- `index.html` — Dynamic tab system, inline forms, timeline rendering, escapeHtml

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Tab system — add Strategy tab (4th tab after Activity)
- Inline form pattern (Phase 3 activity entry) — reuse for Add Note and Add Trigger
- On-demand AI generation pattern (Phase 2 contacts) — reuse for Regenerate Strategy
- Timeline rendering (Phase 3 activity) — extend with trigger entries
- escapeHtml() — apply to all user content
- db.js migration pattern — increment to v4

### Established Patterns
- Fire-and-forget saves for notes (like chat messages)
- On-demand AI with loading state (like contact AI generation)
- Immutable entries (like activity log)
- Colored badges (influence badges, staleness badges) — extend for trigger categories

### Integration Points
- `db.js` — Add 3 tables in migration v4, add query helpers
- `server.js` — Add routes: /api/accounts/:id/intel, /api/accounts/:id/strategy, /api/accounts/:id/triggers
- `index.html` — Add Strategy tab, private intel list, strategy card, trigger tags, trigger form

</code_context>

<specifics>
## Specific Ideas

No specific requirements — auto-mode selected recommended defaults for all areas.

</specifics>

<deferred>
## Deferred Ideas

- Strategy version history (track all regenerations) — potential future enhancement
- Trigger-based notifications (alert when trigger is stale) — belongs in Phase 5 or v2
- Strategy comparison (diff between AI-generated and manually edited) — future enhancement
- Trigger analytics (which triggers correlate with wins) — v2 analytics feature

</deferred>

---

*Phase: 04-pursuit-strategy*
*Context gathered: 2026-04-13 via auto-mode with chain*
