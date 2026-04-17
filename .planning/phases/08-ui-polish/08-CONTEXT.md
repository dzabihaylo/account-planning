# Phase 8: UI Polish - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Source:** Auto-mode with chain (recommended defaults selected)

<domain>
## Phase Boundary

The UI looks and feels consistent across every tab, and users can reorganize accounts into categories and rename categories — all without touching code. This phase is pure frontend + minor API work on the existing `sector` field.

</domain>

<decisions>
## Implementation Decisions

### Category data model (UIPOL-02, UIPOL-03)
- **D-01:** Use the existing `sector` TEXT field on the accounts table — no new categories table needed
- **D-02:** Categories are derived dynamically from distinct `sector` values in the DB (already how `renderSidebar()` works)
- **D-03:** Renaming a category = UPDATE all accounts with that sector value to the new value
- **D-04:** Moving an account = UPDATE that account's sector field to the target category value

### Move-to-category UX (UIPOL-02)
- **D-05:** Add a "Category" dropdown to the existing account edit modal — populated with all current distinct sector values
- **D-06:** User opens edit modal, changes the category dropdown, saves — account moves to the new group in the sidebar
- **D-07:** Include a "New category..." option in the dropdown that lets the user type a new category name
- **D-08:** After save, sidebar re-renders to reflect the move immediately (no page reload needed)

### Category rename UX (UIPOL-03)
- **D-09:** Double-click on a sidebar section header to enter inline edit mode
- **D-10:** Section header text becomes an input field, user types new name, presses Enter or clicks away to confirm
- **D-11:** On confirm, API call updates all accounts with the old sector value to the new value
- **D-12:** Sidebar re-renders with the new category name; all account panels referencing sector also update
- **D-13:** Escape key cancels the inline edit without saving

### Visual consistency pass (UIPOL-01)
- **D-14:** Audit all 6 tabs for inconsistencies in spacing, typography, card styles, and color usage
- **D-15:** Define shared CSS classes for common patterns: `.card`, `.section-header`, `.inline-form`, `.action-btn`
- **D-16:** Apply shared classes across all tabs to replace ad-hoc inline styles and per-tab CSS
- **D-17:** Ensure consistent padding (16px card padding, 8px element gaps), font sizes (13px body, 15px headings, 11px labels), and color usage (--accent for interactive, --muted for secondary text)

### API endpoints
- **D-18:** Account edit endpoint (PUT /api/accounts/:id) already exists — sector field is already updatable
- **D-19:** New endpoint: PUT /api/categories/rename — accepts `{ oldName, newName }`, updates all accounts with matching sector
- **D-20:** Category rename is a bulk operation — must be atomic (all accounts updated or none)

### Claude's Discretion
- Exact CSS class names and organization
- Which inline styles to extract vs leave
- Visual audit methodology (manual scan vs automated)
- Transition/animation for category rename inline edit
- Whether to add confirmation before bulk category rename

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/REQUIREMENTS.md` — UIPOL-01 through UIPOL-03 requirement definitions
- `.planning/ROADMAP.md` — Phase 8 success criteria (3 criteria that must be TRUE)

### Existing codebase
- `index.html` — All 6 tab renderers, sidebar with expand/collapse, existing CSS variables and patterns
- `server.js` — Account CRUD endpoints (PUT /api/accounts/:id already handles sector)
- `db.js` — Accounts table with `sector TEXT` field, query helpers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `renderSidebar()` — already groups accounts by sector, has expand/collapse, re-renders dynamically
- Account edit modal — already exists with fields for name, sector, revenue, employees, HQ
- CSS variables — `--dark`, `--surface`, `--text`, `--accent`, `--muted`, `--border`, `--card` already defined in `:root`
- `escapeHtml()` — used throughout for safe rendering

### Established Patterns
- Sidebar section headers with chevron toggle (quick task 260414-g35)
- Modal forms for account add/edit (Phase 1)
- Inline forms for contacts, activity, strategy (Phases 2-4)
- `fetch()` + JSON response pattern for all API calls

### Integration Points
- `renderSidebar()` — add double-click handler on section headers for rename
- Account edit modal — add category dropdown
- `server.js` — add PUT /api/categories/rename endpoint
- CSS — extract shared classes, apply across all tab renderers

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for UI consistency and category management.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-ui-polish*
*Context gathered: 2026-04-17*
