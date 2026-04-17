# Phase 8: UI Polish - Research

**Researched:** 2026-04-14
**Domain:** Vanilla CSS normalization, inline DOM editing, bulk SQL update, vanilla JS micro-interactions
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Category data model (UIPOL-02, UIPOL-03)**
- D-01: Use the existing `sector` TEXT field on the accounts table — no new categories table needed
- D-02: Categories are derived dynamically from distinct `sector` values in the DB (already how `renderSidebar()` works)
- D-03: Renaming a category = UPDATE all accounts with that sector value to the new value
- D-04: Moving an account = UPDATE that account's sector field to the target category value

**Move-to-category UX (UIPOL-02)**
- D-05: Add a "Category" dropdown to the existing account edit modal — populated with all current distinct sector values
- D-06: User opens edit modal, changes the category dropdown, saves — account moves to the new group in the sidebar
- D-07: Include a "New category..." option in the dropdown that lets the user type a new category name
- D-08: After save, sidebar re-renders to reflect the move immediately (no page reload needed)

**Category rename UX (UIPOL-03)**
- D-09: Double-click on a sidebar section header to enter inline edit mode
- D-10: Section header text becomes an input field, user types new name, presses Enter or clicks away to confirm
- D-11: On confirm, API call updates all accounts with the old sector value to the new value
- D-12: Sidebar re-renders with the new category name; all account panels referencing sector also update
- D-13: Escape key cancels the inline edit without saving

**Visual consistency pass (UIPOL-01)**
- D-14: Audit all 6 tabs for inconsistencies in spacing, typography, card styles, and color usage
- D-15: Define shared CSS classes for common patterns: `.card`, `.section-header`, `.inline-form`, `.action-btn`
- D-16: Apply shared classes across all tabs to replace ad-hoc inline styles and per-tab CSS
- D-17: Ensure consistent padding (16px card padding, 8px element gaps), font sizes (13px body, 15px headings, 11px labels), and color usage (--accent for interactive, --muted for secondary text)

**API endpoints**
- D-18: Account edit endpoint (PUT /api/accounts/:id) already exists — sector field is already updatable
- D-19: New endpoint: PUT /api/categories/rename — accepts `{ oldName, newName }`, updates all accounts with matching sector
- D-20: Category rename is a bulk operation — must be atomic (all accounts updated or none)

### Claude's Discretion
- Exact CSS class names and organization
- Which inline styles to extract vs leave
- Visual audit methodology (manual scan vs automated)
- Transition/animation for category rename inline edit
- Whether to add confirmation before bulk category rename

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UIPOL-01 | Visual consistency pass — spacing, typography, card styles, and color usage are uniform across all 6 tabs | UI-SPEC.md audit table identifies 7 specific fixes; shared CSS class definitions documented below |
| UIPOL-02 | User can move an account to a different industry category via the UI | Sector dropdown in edit modal; GET /api/categories feeds the `<select>`; existing PUT /api/accounts/:id handles sector update; renderSidebar() already groups by sector |
| UIPOL-03 | User can rename an existing industry category via the UI | New PUT /api/categories/rename runs a db.transaction UPDATE; double-click inline edit pattern documented below; existing toast infrastructure reusable |
</phase_requirements>

---

## Summary

Phase 8 is a pure frontend + minor server addition. All locked decisions are achievable with the existing stack (vanilla CSS, vanilla JS, Node.js built-ins, better-sqlite3). No new npm packages are required. The phase divides cleanly into three work streams: (1) CSS normalization pass, (2) category dropdown in the edit modal backed by a new `GET /api/categories` endpoint, and (3) inline sidebar rename backed by a new `PUT /api/categories/rename` endpoint. All three streams can be executed independently and merged in any order.

The most important framing for the planner: the `renderSidebar()` function is the single re-render point for both UIPOL-02 and UIPOL-03 side effects. After any category mutation, calling `await loadAccounts()` then `renderSidebar()` (which is what `loadAccounts` already does) is the complete re-render chain. No additional state management is needed.

The toast infrastructure already exists (`showRefreshToast`, `.refresh-toast` CSS) but uses a different visual contract than the UI-SPEC-defined toast for category rename errors. Both the CSS and JS for the new generic toast must be added — they do not conflict with the existing refresh toast.

**Primary recommendation:** Implement in wave order: CSS audit first (zero logic risk), then the dropdown (additive to existing modal), then the inline rename (new interaction pattern with the highest DOM manipulation complexity).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins (http, https, fs, path, url) | runtime | HTTP server, routing, API proxying | Project constraint — zero npm runtime dependencies on server |
| better-sqlite3 | already installed | SQLite DB queries including the bulk sector UPDATE | Already the project's DB driver; synchronous API means no async complexity |
| Vanilla CSS custom properties | n/a | Design tokens already in `:root` | Project constraint — no CSS framework |
| Vanilla JS (ES6+) | n/a | All frontend logic | Project constraint — no framework |

### No New Libraries Needed
All three requirements are implementable with what is already in the repo. No npm install step is required for this phase. [VERIFIED: inspected package.json and server.js imports]

---

## Architecture Patterns

### Recommended Project Structure
No new files needed. All changes are edits to:
```
index.html     — CSS additions/normalizations, modal HTML change, JS for dropdown + inline rename + toast
server.js      — Two new route handlers: GET /api/categories, PUT /api/categories/rename
db.js          — One new helper: getDistinctSectors(), one new helper: renameCategory(oldName, newName)
```

### Pattern 1: GET /api/categories — Derive from DB
**What:** A simple SELECT DISTINCT query. No new table. Returns an array of sector strings sorted alphabetically.
**When to use:** Called on every `openEditModal()` invocation to populate the dropdown with current values.
**Example:**
```javascript
// db.js
function getDistinctSectors() {
  return db.prepare(
    "SELECT DISTINCT sector FROM accounts WHERE is_deleted = 0 AND sector != '' ORDER BY sector"
  ).all().map(function(row) { return row.sector; });
}

// server.js route
if (req.method === 'GET' && parsed.pathname === '/api/categories') {
  var sectors = db.getDistinctSectors();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(sectors));
  return;
}
```
[VERIFIED: db.js uses better-sqlite3 synchronous `.all()` throughout; pattern is consistent with existing helpers]

### Pattern 2: PUT /api/categories/rename — Atomic Bulk UPDATE
**What:** A db.transaction wrapping a single UPDATE. All matching accounts move to the new name or none do.
**When to use:** Called by the inline rename confirm handler in the sidebar.
**Example:**
```javascript
// db.js
function renameCategory(oldName, newName) {
  var rename = db.transaction(function() {
    db.prepare(
      "UPDATE accounts SET sector = ?, updated_at = datetime('now') WHERE sector = ? AND is_deleted = 0"
    ).run(newName, oldName);
  });
  rename();
  return db.prepare(
    'SELECT COUNT(*) as count FROM accounts WHERE sector = ? AND is_deleted = 0'
  ).get(newName);
}

// server.js route
if (req.method === 'PUT' && parsed.pathname === '/api/categories/rename') {
  readBody(req, res, function(body) {
    var data;
    try { data = JSON.parse(body); } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
    if (!data.oldName || !data.newName || typeof data.oldName !== 'string' || typeof data.newName !== 'string') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'oldName and newName are required strings' }));
      return;
    }
    var result = db.renameCategory(data.oldName.trim(), data.newName.trim());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: result.count }));
  });
  return;
}
```
[VERIFIED: better-sqlite3 transaction pattern used in existing db.js seed data migration (lines 220-370)]

### Pattern 3: Category Dropdown in Edit Modal
**What:** Replace the free-text `<input id="modalSector">` with a `<select id="modalSector">` plus a conditionally visible `<input id="modalSectorNew">`. Populate from `GET /api/categories` on modal open.
**Key constraint:** The existing `saveAccount()` function reads `document.getElementById('modalSector').value.trim()` — a `<select>` element's `.value` property works identically to an `<input>`, so no change to `saveAccount()` is needed for the normal case. The "New category..." branch must write the custom input value into a variable before the save fires.
**When to use:** Whenever `openEditModal()` or `openAddModal()` is called.
**Example:**
```javascript
// openEditModal (additions only)
async function populateCategoryDropdown(currentSector) {
  var select = document.getElementById('modalSector');
  var sectors = [];
  try {
    var resp = await fetch('/api/categories');
    sectors = await resp.json();
  } catch (e) { /* fall back to empty */ }

  var options = sectors.map(function(s) {
    return '<option value="' + escapeHtml(s) + '"' + (s === currentSector ? ' selected' : '') + '>' + escapeHtml(s) + '</option>';
  }).join('');
  options += '<option value="__new__">New category...</option>';
  select.innerHTML = options;

  // If currentSector not in list (new account), add it
  if (currentSector && !sectors.includes(currentSector)) {
    var opt = document.createElement('option');
    opt.value = currentSector;
    opt.textContent = currentSector;
    opt.selected = true;
    select.insertBefore(opt, select.lastElementChild);
  }
}
```
[ASSUMED: The HTML element swap from `<input>` to `<select>` requires updating the modal HTML and all three modal-open paths: `openAddModal()`, `openEditModal()`. Three sites to update.]

### Pattern 4: Inline Category Rename (Double-Click)
**What:** dblclick listener on the sector-name `<span>` inside each `.sidebar-section`. Replace span text with a `.sidebar-rename-input` `<input>`, wire Enter/blur/Escape.
**Critical detail:** `renderSidebar()` uses `toggleSection(index)` via onclick on the full `.sidebar-section` div. The dblclick target is the inner `<span>` (the sector name text). Event must `stopPropagation()` so it does not trigger `toggleSection`.
**When to use:** Added inside `renderSidebar()` after sidebar HTML is set via `sidebar.innerHTML = html`.
**Example:**
```javascript
// After sidebar.innerHTML = html; in renderSidebar()
document.querySelectorAll('.sidebar-section-label').forEach(function(span) {
  span.addEventListener('dblclick', function(e) {
    e.stopPropagation();
    startCategoryRename(span);
  });
});

function startCategoryRename(span) {
  var oldName = span.textContent;
  var input = document.createElement('input');
  input.type = 'text';
  input.value = oldName;
  input.className = 'sidebar-rename-input';
  span.replaceWith(input);
  input.focus();
  input.select();

  var committed = false;
  function commit() {
    if (committed) return;
    committed = true;
    var newName = input.value.trim();
    if (!newName || newName === oldName) {
      cancelRename();
      return;
    }
    confirmCategoryRename(oldName, newName, input);
  }
  function cancelRename() {
    if (committed) return;
    committed = true;
    input.replaceWith(span);
  }

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { cancelRename(); }
  });
  input.addEventListener('blur', commit);
}

async function confirmCategoryRename(oldName, newName, input) {
  try {
    var resp = await fetch('/api/categories/rename', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: oldName, newName: newName })
    });
    if (!resp.ok) throw new Error('rename failed');
    await loadAccounts();
    // sidebar re-rendered by loadAccounts -> renderSidebar
  } catch (e) {
    showToast('Rename failed. Please try again.', 'error');
    // Restore span by re-rendering sidebar (loadAccounts handles it)
    await loadAccounts();
  }
}
```
[VERIFIED: `renderSidebar()` sets `sidebar.innerHTML` each call, so event listeners added after innerHTML set are safe; no stale listener risk]

### Pattern 5: Generic Toast (new micro-component)
**What:** A general-purpose `showToast(message, variant)` function that creates a `.gd-toast` element distinct from the existing `.refresh-toast`. New CSS class to avoid conflict.
**Why new class:** The existing `.refresh-toast` has a larger padding (16px 20px), a title+body structure, and an 8-second auto-dismiss — different from the UI-SPEC's simpler single-line 3-second toast. They coexist as separate components.
**Example:**
```javascript
function showToast(message, variant) {
  // variant: 'error' | 'success'
  var existing = document.querySelector('.gd-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'gd-toast gd-toast-' + (variant || 'error');
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 150);
  }, 3000);
}
```
CSS:
```css
.gd-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2000;
  background: var(--card);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text);
  animation: fi 0.15s ease;
  transition: opacity 0.15s;
}
.gd-toast-error { border-left: 3px solid var(--red); }
.gd-toast-success { border-left: 3px solid var(--green); }
```
[VERIFIED: existing `.refresh-toast` CSS at line 438; new class does not conflict]

### Anti-Patterns to Avoid
- **Replacing `renderSidebar()` innerHTML inline:** The function already handles all sidebar state including sectionState collapse tracking. Do not manage the sidebar div's innerHTML directly outside this function.
- **Using `var` in new inline event listeners inside `renderSidebar()`:** The function uses `var` + index-based IDs throughout. New event listeners added after innerHTML should also use `var` for consistency with the project's existing style.
- **Calling `renderSidebar()` independently from `loadAccounts()`:** `loadAccounts()` both fetches accounts and calls `renderSidebar()`. For operations that mutate account data (sector rename, sector move), always call `loadAccounts()` — not `renderSidebar()` directly — to keep the in-memory `accounts` array in sync.
- **Modifying `saveAccount()` to handle the "New category..." special case inline:** The safer pattern is to resolve the custom category value before calling `saveAccount()`, writing the resolved value into the select's value before the existing save logic reads it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic bulk UPDATE | Multi-step JS loop calling PUT /api/accounts/:id per account | `db.transaction()` wrapping one UPDATE | Single round-trip, ACID guarantee, no partial rename state |
| Dropdown from live data | Hardcoded `<option>` list | `GET /api/categories` + dynamic `<option>` generation | Categories can change — hardcoded list is immediately stale after any rename |
| Toast dismiss timer | `setInterval` polling loop | `setTimeout` + CSS opacity transition | Simpler, garbage-collects cleanly, matches existing pattern |
| Input→span swap on cancel | Manual DOM node cloning | `input.replaceWith(originalSpan)` where `originalSpan` is saved before swap | Browser handles the reflow; no need to reconstruct the span |

**Key insight:** The bulk rename is a DB operation, not a JS loop. Using `better-sqlite3` transactions keeps the server synchronous and consistent with all other db.js patterns.

---

## Common Pitfalls

### Pitfall 1: Double-fire of blur + Enter on inline rename
**What goes wrong:** When user presses Enter, `keydown` fires `commit()` which calls `input.blur()` (implicit, from `input.replaceWith()`), triggering the `blur` handler a second time. The second call sends a duplicate API request.
**Why it happens:** The `blur` event fires when any focus change occurs, including programmatic ones caused by replacing the input element.
**How to avoid:** Use a `committed` boolean flag (see Pattern 4 above). Check `if (committed) return;` at the top of both `commit()` and `cancelRename()`.
**Warning signs:** Network tab shows two `PUT /api/categories/rename` requests on a single Enter press.

### Pitfall 2: `sectionState` index drift after rename
**What goes wrong:** `sectionState` is keyed by `index` (integer), but `toggleSection(index)` derives the sector name from the DOM at time of toggle. After a rename and re-render, indices may shift (sectors re-sort alphabetically). A section that was expanded at index 2 is now at index 1.
**Why it happens:** The current `renderSidebar()` uses numeric indices for section IDs (`sec-0`, `sec-1`, ...) and collapse state is tracked by sector name via `sectionState[sector]`. The state tracking is actually by sector name — the existing code reads `var sectorSpan = secEl.querySelector('span'); var sector = sectorSpan ? sectorSpan.textContent : '';` to derive the key. This means the collapse state will correctly follow the renamed category as long as `sectionState` is updated on rename.
**How to avoid:** After a rename completes and before `loadAccounts()`, update `sectionState`: `sectionState[newName] = sectionState[oldName]; delete sectionState[oldName];`
**Warning signs:** After rename, a previously-collapsed section is shown expanded (or vice versa).

### Pitfall 3: Sector name used as a DOM id
**What goes wrong:** The sidebar renders `id="sec-0"` and `id="group-0"` using a numeric index, not the sector name directly — so a sector with special characters in the name does not corrupt DOM ids. This is safe. However the `acct-tag` header in each account panel renders the sector as text: `'Account Intelligence &middot; ' + sector`. After a rename, panels already in the DOM (rendered before the rename) will show the old sector name until re-rendered.
**Why it happens:** Account panels are cached in `mainContent` and not automatically re-rendered on sector changes.
**How to avoid:** After a successful rename, `document.getElementById('mainContent').innerHTML = ''` then call `loadAccounts()` then `showAccount(currentAccount)`. This is the same pattern `saveAccount()` uses at line 1667.
**Warning signs:** The panel header still shows the old category name after rename.

### Pitfall 4: `<select>` value is `"__new__"` when user saves without filling custom input
**What goes wrong:** User selects "New category...", does not type in the custom input, and clicks Save. The `modalSector` select value is `"__new__"` which gets written to the DB as the sector.
**Why it happens:** `saveAccount()` reads `document.getElementById('modalSector').value` directly with no validation of the sentinel value.
**How to avoid:** In `saveAccount()` (or in a pre-save validation step), check `if (sectorValue === '__new__') { sectorValue = document.getElementById('modalSectorNew').value.trim(); }` and reject save if sectorValue is empty.
**Warning signs:** Accounts appear under a category named `"__new__"` in the sidebar.

### Pitfall 5: `.card` padding normalization breaks existing layouts
**What goes wrong:** Changing `.card { padding: 18px 20px }` to `16px` all around shifts content inside cards. Cards that contain `.g2`/`.g3`/`.g4` grids that were designed around 18px/20px may look tighter or items may wrap differently at `16px`.
**Why it happens:** Padding change is global — it affects all `.card` uses across all tabs simultaneously.
**How to avoid:** Test all 6 tabs after the `.card` padding change. The change is intentional per UI-SPEC but should be verified visually on at least the Overview and Contacts tabs which have the most dense card layouts.
**Warning signs:** Grid columns in `.g3` or `.g4` cards wrap when they previously didn't.

---

## Code Examples

Verified patterns from existing codebase:

### Existing: renderSidebar() — where to attach dblclick handler
```javascript
// index.html line 1118-1150
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  var groups = {};
  accounts.forEach(function(a) {
    if (!groups[a.sector]) groups[a.sector] = [];
    groups[a.sector].push(a);
  });
  var html = '<div class="sidebar-items">';
  // ... builds html string ...
  sidebar.innerHTML = html;
  // ADD: attach dblclick listeners here after innerHTML is set
}
```
[VERIFIED: index.html lines 1118-1150]

### Existing: saveAccount() reads sector value
```javascript
// index.html line 1636
sector: document.getElementById('modalSector').value.trim(),
```
A `<select>` element's `.value` property is identical in behavior to an `<input>`, so the read here works without changes for the normal selection case. The `__new__` sentinel requires one guard. [VERIFIED: index.html line 1636]

### Existing: loadAccounts() — the correct re-render entry point
```javascript
// index.html line 1098-1112
async function loadAccounts() {
  try {
    const res = await fetch('/api/accounts');
    accounts = await res.json();
  } catch (e) {
    accounts = [];
  }
  renderSidebar();
  // ...
}
```
This is the correct call to make after any category mutation. It keeps `accounts` in sync. [VERIFIED: index.html lines 1098-1112]

### Existing: updateAccount — sector is already an allowed field
```javascript
// db.js line 417
const allowedFields = ['name', 'sector', 'hq', 'revenue', 'employees', 'context', 'dot_color', 'display_revenue'];
```
Moving an account to a different category via PUT /api/accounts/:id with `{ sector: newCategory }` already works with no server changes. [VERIFIED: db.js line 417]

### Existing: db.transaction() pattern
```javascript
// db.js lines 25-56 (schema migration v1)
const migrate = db.transaction(() => {
  db.exec(`...`);
});
migrate();
```
The same pattern applies to `renameCategory()`. [VERIFIED: db.js lines 25-56]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sector as free-text input | Sector as dropdown populated from DB | Phase 8 (this phase) | Users can only assign valid existing sectors or intentionally create new ones |
| Category rename required code edit | Double-click inline rename via UI | Phase 8 (this phase) | Dave can reorganize accounts without touching index.html |
| Per-tab ad-hoc CSS | Shared `.card`, `.section-header`, `.inline-form` classes | Phase 8 (this phase) | Future tab additions inherit consistent styles automatically |

---

## Visual Consistency Audit — Prescriptive Fix List

The UI-SPEC.md documents exactly which inconsistencies exist. Reproduced here for planner task mapping:

| Tab | Inconsistency | Required Fix | Source |
|-----|--------------|--------------|--------|
| All tabs | `.card` padding `18px 20px` vs `16px` vs `12px 14px` | Normalize `.card { padding: 16px }` | UI-SPEC line 113 |
| Contacts tab | Section headers use ad-hoc inline styles | Apply `.section-header` class | UI-SPEC line 217 |
| Activity tab | Entry spacing uses margin-bottom inconsistently | Set `gap: 8px` on `.activity-timeline` container | UI-SPEC line 218 |
| Strategy tab | Inline form inputs may differ from `.form-input` spec | Audit `.strategy-edit-area`, apply `.form-input` style | UI-SPEC line 219 |
| Briefing tab | `.briefing-section-header` at 15px | Retain 15px — document heading role, not card label | UI-SPEC line 220 |
| Overview tab | `.stat-val` at 22px | Normalize to 20px (display role); if visually wrong, retain and document exception | UI-SPEC line 221 |
| All tabs | `font-size: 12px` in `.bar-row` and `.topnav-count` | Normalize to 11px (label role) | UI-SPEC line 222 |

**Additional audit items confirmed in codebase:**
- `sidebar-revenue` is already 10px (line 107) — within the 11px label rule; normalize to 11px for consistency [VERIFIED: index.html line 107]
- `sig-meta` is already 10px (line 214) — same — normalize to 11px [VERIFIED: index.html line 214]
- `exec-loc` is already 10px (line 243) — normalize to 11px [VERIFIED: index.html line 243]
- `.sidebar-section` font-size is 10px (line 83) — this is a non-interactive label row per UI-SPEC exception; retain 10px or bump to 11px at discretion
- `activity-meta` is 12px (line 561) — normalize to 11px
- `activity-form-error` is 12px (line 501) — normalize to 11px

---

## New CSS Classes to Define

Per D-15 and UI-SPEC, these classes are new or normalized this phase:

```css
/* .section-header — new shared class for in-tab heading rows */
.section-header {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  margin-bottom: 8px;
}

/* .sidebar-rename-input — inline edit for category rename */
.sidebar-rename-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--accent);
  color: var(--text);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: var(--font);
  outline: none;
  width: 100%;
}

/* .gd-toast — generic toast (distinct from .refresh-toast) */
.gd-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2000;
  background: var(--card);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text);
  animation: fi 0.15s ease;
  transition: opacity 0.15s;
}
.gd-toast-error { border-left: 3px solid var(--red); }
.gd-toast-success { border-left: 3px solid var(--green); }

/* Normalize .card padding */
.card { padding: 16px; } /* was: 18px 20px */
```
[VERIFIED: existing CSS at lines 178-183 and 83; new classes do not conflict with existing names]

---

## Environment Availability

Step 2.6: SKIPPED — This phase is purely code/CSS/JS changes within existing files. No new external tools, databases, services, or CLI utilities are required beyond what is already running.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured — manual visual verification |
| Config file | None |
| Quick run command | `node server.js` + browser visual inspection |
| Full suite command | Same — no automated test suite exists for frontend |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UIPOL-01 | .card padding is 16px on all tabs | manual visual | load each of 6 tabs, confirm card padding | N/A |
| UIPOL-01 | No 12px font-size in .bar-row or .topnav-count | manual + CSS grep | `grep -n "12px" index.html` | N/A |
| UIPOL-02 | Edit modal shows category dropdown | manual visual | open edit modal, verify `<select>` not `<input>` | N/A |
| UIPOL-02 | Saving with new category moves account in sidebar | manual | edit account, change sector, save, verify sidebar | N/A |
| UIPOL-03 | Double-click sidebar header enters rename mode | manual | dblclick category header, verify input appears | N/A |
| UIPOL-03 | Enter confirms rename, Escape cancels | manual | test each key, verify API call / no API call | N/A |
| UIPOL-03 | Rename is atomic — all accounts in sector updated | manual + DB check | rename, verify all accounts moved in sidebar | N/A |

**No automated test gaps to address in Wave 0** — the project has no test infrastructure. All verification is manual.

### Sampling Rate
- **Per task commit:** Visual inspection of affected tab/component in browser
- **Per wave merge:** Load all 6 tabs, exercise dropdown, exercise rename
- **Phase gate:** All 6 tabs visually consistent, category move works end-to-end, category rename works end-to-end

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not modified in this phase |
| V3 Session Management | no | Not modified in this phase |
| V4 Access Control | yes | All new routes protected by existing `isAuthenticated()` gate — ensure new routes are not added before the auth check |
| V5 Input Validation | yes | `oldName` and `newName` must be validated as non-empty strings; route must not accept empty or whitespace-only values |
| V6 Cryptography | no | Not applicable |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mass rename via crafted POST | Tampering | Validate `oldName` exists as a current sector value before running bulk UPDATE (or accept the no-op as safe) |
| XSS via sector name | Tampering | `escapeHtml()` already used throughout `renderSidebar()` — apply to new `<option>` values as well |
| Unauthenticated category rename | Elevation of Privilege | Route must appear after the `isAuthenticated(req)` check in `server.js` — verify placement during implementation |

**Critical placement note:** In `server.js`, the auth gate is at line 330 (`if (!isAuthenticated(req))`). Both new routes (`GET /api/categories` and `PUT /api/categories/rename`) must be placed after line 330, consistent with all other authenticated routes. [VERIFIED: server.js line 330]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The HTML element swap from `<input>` to `<select>` for `modalSector` requires updating openAddModal(), openEditModal(), and the existing `saveAccount()` guard | Architecture Patterns — Pattern 3 | If there are additional modal open paths (e.g. "Add & Research"), they also need to call `populateCategoryDropdown()` — inspect `addAndResearch()` function |

**All other claims were verified against the codebase in this session.**

---

## Open Questions

1. **Does `addAndResearch()` (the "Add & Research" workflow) use `openAddModal()`?**
   - What we know: `openAddModal()` sets up the modal for new account creation. The "Add & Research" button in the modal footer calls `addAndResearch()` directly.
   - What's unclear: Whether `addAndResearch()` opens its own modal state or relies on the modal already being open via `openAddModal()`.
   - Recommendation: Read `addAndResearch()` before implementing the dropdown swap to confirm it goes through the same sector field. If it does, `populateCategoryDropdown()` should also be called in the new-account modal open path.

---

## Sources

### Primary (HIGH confidence)
- `index.html` lines 1-700 (all CSS), lines 1098-1180 (renderSidebar, loadAccounts), lines 1580-1679 (edit modal JS), lines 946-993 (modal HTML) — directly read
- `db.js` lines 1-440 (schema, getAccounts, updateAccount, transaction pattern) — directly read
- `server.js` lines 292-580 (route handlers, auth gate, readBody pattern) — directly read
- `08-CONTEXT.md` — all decisions read
- `08-UI-SPEC.md` — all spec constraints read

### Secondary (MEDIUM confidence)
- `REQUIREMENTS.md` and `STATE.md` — project context confirmed

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all patterns verified against existing code
- Architecture: HIGH — all patterns derived from verified codebase reading, not assumptions
- Pitfalls: HIGH — each pitfall identified from direct code inspection (double-fire is a known JS pattern issue, not speculation)
- Visual audit targets: HIGH — verified against actual CSS in index.html

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable codebase; no third-party dependencies involved)
