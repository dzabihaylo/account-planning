# Phase 3: Pursuit Tracking - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning
**Source:** Auto-mode (recommended defaults selected)

<domain>
## Phase Boundary

Users can log what happened during account pursuits and have AI extract structured entries from natural-language meeting debriefs. A new "Activity" tab per account shows a reverse-chronological timeline of pursuit events. AI debrief extraction proposes structured entries that the user must approve before they're saved.

</domain>

<decisions>
## Implementation Decisions

### Activity log structure
- **D-01:** New "Activity" tab added to each account panel — placed after Contacts tab, before Ask AI
- **D-02:** Activity entries display as a reverse-chronological timeline within the Activity tab
- **D-03:** Each activity entry has: timestamp, type (meeting / call / email / note / other), participants (free text), summary (text), and optional linked_contacts (references to contact IDs in the contacts table)
- **D-04:** Users can manually add activity entries via a form at the top of the Activity tab (quick log without AI)
- **D-05:** Activity entries are immutable once saved — no edit/delete to preserve audit trail integrity

### AI debrief UX
- **D-06:** Free-text textarea at the top of the Activity tab with "Extract with AI" button — user pastes or types a meeting debrief narrative
- **D-07:** AI extraction uses existing /api/claude proxy pattern — sends debrief text + account context + recent activity history as system prompt
- **D-08:** AI extracts: structured activity log entries (date, type, participants, key takeaways, action items) and optionally proposes contact updates (new contacts, title changes, influence changes)
- **D-09:** AI response parsed into individual proposed entries displayed in a review panel below the textarea

### Human review gate (PURS-03)
- **D-10:** AI-proposed entries appear in a "Review Proposals" panel with approve/edit/reject controls per entry
- **D-11:** Each proposed entry shows the extracted fields (date, type, participants, summary) with inline edit capability
- **D-12:** "Approve" saves the entry to the database; "Reject" discards it; "Approve All" batch-saves all entries
- **D-13:** Rejected entries are discarded — user can edit the debrief text and re-extract if needed
- **D-14:** Contact update proposals (new contacts, title/influence changes) follow the same approve/reject pattern
- **D-15:** Nothing is written to the database until the user explicitly approves — this is the core PURS-03 guarantee

### Database schema
- **D-16:** New `activity_log` table: id (INTEGER PRIMARY KEY), account_id (TEXT FK), type (TEXT CHECK meeting/call/email/note/other), participants (TEXT), summary (TEXT NOT NULL), linked_contacts (TEXT — JSON array of contact IDs), source (TEXT DEFAULT 'manual' CHECK manual/ai_debrief), ai_raw (TEXT — original debrief text if source=ai_debrief), created_at (TEXT)
- **D-17:** Schema migration to version 3 via PRAGMA user_version (following Phase 1/2 pattern)
- **D-18:** No soft delete for activity entries — immutable log per D-05

### Claude's Discretion
- Activity timeline visual design (card vs minimal list vs grouped by date)
- AI prompt engineering for optimal debrief extraction quality
- How linked_contacts are displayed (inline names vs tags)
- Review panel visual layout and animation
- Whether "Extract with AI" button is disabled until textarea has minimum content
- Textarea placeholder text and character guidance
- How action items from AI extraction are handled (saved as separate entries or embedded in summary)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/REQUIREMENTS.md` — PURS-01 through PURS-03 requirement definitions
- `.planning/ROADMAP.md` — Phase 3 success criteria (3 criteria that must be TRUE)

### Prior phase artifacts
- `.planning/phases/01-persistence-account-management/01-CONTEXT.md` — Phase 1 decisions (modal patterns, soft delete, SQLite patterns, dynamic rendering)
- `.planning/phases/02-contact-intelligence/02-CONTEXT.md` — Phase 2 decisions (contact schema, AI on-demand pattern, card grid layout)
- `.planning/phases/02-contact-intelligence/02-01-SUMMARY.md` — Contact API patterns, query helper structure
- `.planning/phases/02-contact-intelligence/02-02-SUMMARY.md` — Tab system extension pattern, card rendering approach

### Existing codebase
- `db.js` — Database module with migration v2, query helper patterns to replicate for activity_log
- `server.js` — API route patterns, /api/claude proxy for AI extraction, body size limits
- `index.html` — Dynamic tab system, modal system, card rendering, escapeHtml utility

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Tab system (`.acct-tabs`, `showTab()`) — add Activity tab alongside Overview, Contacts, Ask AI
- Modal system — reuse for manual activity entry form if needed (or use inline form like outreach logging in Phase 2)
- `escapeHtml()` utility — apply to all activity data rendered via innerHTML
- `/api/claude` proxy pattern — reuse for AI debrief extraction
- db.js migration pattern (PRAGMA user_version) — increment to version 3
- `readBody()` helper with 1MB limit — reuse for debrief text submission

### Established Patterns
- Phase 2's inline form for outreach logging — similar pattern for manual activity entry
- Phase 2's on-demand AI generation — similar pattern for "Extract with AI" button
- Contact card grid with detail expansion — could inform activity entry rendering
- Fire-and-forget saves — NOT appropriate here due to PURS-03 review gate

### Integration Points
- `db.js` — Add activity_log table in migration v3, add query helpers
- `server.js` — Add routes: GET/POST /api/accounts/:id/activity, POST /api/accounts/:id/debrief
- `index.html` — Add Activity tab, timeline rendering, debrief textarea, review panel

</code_context>

<specifics>
## Specific Ideas

No specific requirements — auto-mode selected recommended defaults for all areas.

</specifics>

<deferred>
## Deferred Ideas

- Activity entry editing/deletion — deferred to maintain audit trail integrity (D-05)
- Automatic activity entry creation from contact outreach logs — potential Phase 4+ feature
- Activity search/filtering — potential future enhancement
- Activity export to CSV/PDF — potential future enhancement

</deferred>

---

*Phase: 03-pursuit-tracking*
*Context gathered: 2026-04-11 via auto-mode*
