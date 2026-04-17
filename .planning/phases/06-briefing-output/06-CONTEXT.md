# Phase 6: Briefing & Output - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Source:** Auto-mode with chain (recommended defaults selected)

<domain>
## Phase Boundary

Any team member can generate a shareable, print-ready one-pager briefing for any account that captures current status, key contacts, strategy, and next steps. The briefing is AI-composed on demand and can be printed or saved as PDF using the browser's native print function.

</domain>

<decisions>
## Implementation Decisions

### Briefing access point (BREF-01)
- **D-01:** New "Briefing" tab on each account panel — placed after Strategy, before Ask AI
- **D-02:** Follows existing tab pattern: `showTab()` function, `.acct-tab` button, `.tab-pane` div
- **D-03:** Briefing tab renders a full one-pager view with a "Generate Briefing" button for first load and "Regenerate" for updates

### Briefing content structure (BREF-01)
- **D-04:** Standard executive briefing sections in order: Account Overview (company, sector, HQ, revenue, employees), Key Contacts (top 3-5 by influence — Champion first, then Evaluators), Current Strategy Summary (from Phase 4 strategy_summaries), Recent Activity Highlights (last 5-10 entries from activity_log), Active Buying Triggers (from buying_triggers table), Recommended Next Steps (AI-generated based on all data)
- **D-05:** AI composes the full briefing on demand using all available account data: account context, contacts with outreach history, pursuit activity log, private intel notes, strategy summary, buying triggers
- **D-06:** Briefing header includes account name, generation date, and Grid Dynamics branding

### AI generation approach (BREF-01)
- **D-07:** Cache the last generated briefing in a new `briefings` table — display cached version on tab open
- **D-08:** "Regenerate Briefing" button triggers fresh AI composition — follows Phase 4's strategy Regenerate pattern
- **D-09:** First load of Briefing tab auto-generates if no cached briefing exists
- **D-10:** Briefing stored as structured HTML/markdown to preserve formatting for print

### Print/PDF layout (BREF-02)
- **D-11:** CSS `@media print` styles that hide navigation, sidebar, tabs, and non-briefing elements
- **D-12:** Print layout formats the briefing as a clean, single-page document with appropriate margins and typography
- **D-13:** "Print / Save as PDF" button in the Briefing tab triggers `window.print()` — leverages browser's native print-to-PDF
- **D-14:** Print stylesheet uses DM Sans font (already loaded), black text on white background, no dark theme

### Database schema
- **D-15:** New `briefings` table: id (INTEGER PRIMARY KEY), account_id (TEXT FK UNIQUE), content (TEXT NOT NULL), generated_at (TEXT), tokens_used (INTEGER)
- **D-16:** Schema migration to version 6 via PRAGMA user_version
- **D-17:** UNIQUE constraint on account_id — one cached briefing per account, replaced on regenerate

### Claude's Discretion
- AI prompt engineering for briefing quality and conciseness
- Exact section formatting within the one-pager (bullet lists, paragraphs, headers)
- How many contacts to include (3-5 based on data availability)
- How many activity entries to summarize (5-10 based on recency)
- Loading state visual design during briefing generation
- Whether regeneration shows a confirmation dialog or regenerates immediately
- Print page break handling if content exceeds one page

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/REQUIREMENTS.md` -- BREF-01 and BREF-02 requirement definitions
- `.planning/ROADMAP.md` -- Phase 6 success criteria (2 criteria that must be TRUE)
- `.planning/PROJECT.md` -- Core value: "Every pursuit team member can open this tool and get a current, actionable briefing on any account"

### Prior phase artifacts
- `.planning/phases/01-persistence-account-management/01-CONTEXT.md` -- SQLite patterns (better-sqlite3, PRAGMA user_version), dynamic rendering, tab system
- `.planning/phases/02-contact-intelligence/02-CONTEXT.md` -- Contact schema, influence levels (Champion/Evaluator/Blocker), AI on-demand pattern
- `.planning/phases/03-pursuit-tracking/03-CONTEXT.md` -- Activity log schema, timeline rendering
- `.planning/phases/04-pursuit-strategy/04-CONTEXT.md` -- Strategy summary schema, AI synthesis pattern, Regenerate button pattern, buying triggers schema

### Existing codebase
- `db.js` -- Database module with migration v5, query helpers, all table schemas
- `server.js` -- API route patterns, /api/claude proxy, AI request forwarding
- `index.html` -- Dynamic tab system (`renderAccountPanel`, `showTab`), existing 5 tabs, CSS variables, print will need new `@media print` block

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `renderAccountPanel()` in index.html — generates tab HTML dynamically; new Briefing tab slots in here
- `showTab()` function — handles tab switching; already supports arbitrary tab names
- `/api/claude` proxy endpoint in server.js — existing AI request forwarding can be reused or a dedicated briefing endpoint created
- Phase 4's strategy Regenerate pattern — same UX flow: display cached, button to regenerate, loading state

### Established Patterns
- Tab system: button with `onclick="showTab('id','tabname',this)"` + `<div class="tab-pane" id="id-tabname">`
- AI on-demand: Button triggers fetch to server endpoint, server calls Anthropic API, response rendered in panel
- Database: better-sqlite3 with PRAGMA user_version migrations, one migration per phase
- CSS: Dark theme with CSS variables (--dark, --surface, --text, --accent), DM Sans/DM Mono fonts

### Integration Points
- `renderAccountPanel()` — add Briefing tab button and pane
- `db.js` — add briefings table, migration v5→v6, getBriefing/saveBriefing helpers
- `server.js` — add GET/POST /api/accounts/:id/briefing endpoints
- `index.html` CSS — add @media print block for briefing-specific print layout

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The briefing should be the culmination of all intelligence gathered in Phases 1-5, presented in a format that any team member can read in 2 minutes and be ready for a meeting.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-briefing-output*
*Context gathered: 2026-04-14*
