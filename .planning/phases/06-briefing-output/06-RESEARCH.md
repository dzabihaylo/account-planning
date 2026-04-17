# Phase 6: Briefing & Output - Research

**Researched:** 2026-04-14
**Domain:** AI-composed executive briefing, browser print/PDF output, SQLite caching
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Briefing access point (BREF-01)**
- D-01: New "Briefing" tab on each account panel — placed after Strategy, before Ask AI
- D-02: Follows existing tab pattern: `showTab()` function, `.acct-tab` button, `.tab-pane` div
- D-03: Briefing tab renders a full one-pager view with a "Generate Briefing" button for first load and "Regenerate" for updates

**Briefing content structure (BREF-01)**
- D-04: Standard executive briefing sections in order: Account Overview, Key Contacts (Champion first), Current Strategy Summary, Recent Activity Highlights (last 5-10), Active Buying Triggers, Recommended Next Steps (AI-generated)
- D-05: AI composes the full briefing on demand using all available account data: account context, contacts with outreach history, pursuit activity log, private intel notes, strategy summary, buying triggers
- D-06: Briefing header includes account name, generation date, and Grid Dynamics branding

**AI generation approach (BREF-01)**
- D-07: Cache the last generated briefing in a new `briefings` table — display cached version on tab open
- D-08: "Regenerate Briefing" button triggers fresh AI composition — follows Phase 4's strategy Regenerate pattern
- D-09: First load of Briefing tab auto-generates if no cached briefing exists
- D-10: Briefing stored as structured HTML/markdown to preserve formatting for print

**Print/PDF layout (BREF-02)**
- D-11: CSS `@media print` styles that hide navigation, sidebar, tabs, and non-briefing elements
- D-12: Print layout formats the briefing as a clean, single-page document with appropriate margins and typography
- D-13: "Print / Save as PDF" button in the Briefing tab triggers `window.print()` — browser's native print-to-PDF
- D-14: Print stylesheet uses DM Sans font (already loaded), black text on white background, no dark theme

**Database schema**
- D-15: New `briefings` table: id (INTEGER PRIMARY KEY), account_id (TEXT FK UNIQUE), content (TEXT NOT NULL), generated_at (TEXT), tokens_used (INTEGER)
- D-16: Schema migration to version 6 via PRAGMA user_version
- D-17: UNIQUE constraint on account_id — one cached briefing per account, replaced on regenerate

### Claude's Discretion
- AI prompt engineering for briefing quality and conciseness
- Exact section formatting within the one-pager (bullet lists, paragraphs, headers)
- How many contacts to include (3-5 based on data availability)
- How many activity entries to summarize (5-10 based on recency)
- Loading state visual design during briefing generation
- Whether regeneration shows a confirmation dialog or regenerates immediately
- Print page break handling if content exceeds one page

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BREF-01 | Team briefing view — AI-composed one-pager per account: status, key contacts, current strategy, next steps | Tab system pattern from prior phases; strategy AI generation pattern; briefings table schema; all data sources available in db.js |
| BREF-02 | Briefing is printable / shareable (browser print-to-PDF) | `@media print` CSS pattern; `window.print()` trigger; no external library needed; DM Sans already loaded |
</phase_requirements>

---

## Summary

Phase 6 is the culminating layer of the intelligence hub — it synthesizes all data from Phases 1-5 (accounts, contacts, activity log, strategy, buying triggers) into a single AI-composed one-pager that any team member can read in two minutes. The work is entirely incremental: a new `briefings` table, two new server endpoints, a new tab in the existing tab system, and a `@media print` CSS block.

The Phase 4 strategy pattern (fetch → AI call → upsert → render) is the closest analog and should be followed almost verbatim. The primary new challenge is the `@media print` stylesheet, which must hide the entire application shell (nav, sidebar, tabs, action buttons) and render only the briefing content in a clean, professional format.

The briefing content format is the most discretionary element. The AI prompt must produce structured output that renders cleanly both on-screen and in print. Storing the content as plain text with markdown-style headers (converted to HTML at render time) is the right approach — it matches how the strategy tab works and allows the content to survive being copied or pasted elsewhere.

**Primary recommendation:** Follow the strategy endpoint and tab pattern exactly. The only genuinely new work is the `@media print` CSS block and the briefing AI prompt engineering.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | Already installed (Phase 1) | briefings table, migration v6 | Same sync SQLite pattern used in all prior phases |
| Node.js https | Built-in | Anthropic API proxy for briefing generation | Same pattern as strategy, contact generate, refresh endpoints |
| Vanilla JS | ES6+ | Briefing tab rendering, print trigger | Zero-dependency constraint; matches all prior phases |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS @media print | Browser native | Hide app chrome, render clean one-pager | The only correct approach for print-to-PDF without external libraries |
| window.print() | Browser native | Trigger browser's native print dialog | Matches D-13; user gets Save as PDF from OS |
| DM Sans (Google Fonts) | Already loaded | Print typography | Already in `<head>`, no additional load needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| window.print() | jsPDF, html2canvas | External library cost, no-dependency constraint violated, worse font rendering |
| @media print CSS | Separate print HTML page | Extra complexity, navigation logic; browser native print is sufficient |
| Plain text + newline-to-br rendering | Store as HTML | Storing raw HTML is an XSS risk; plain text with markdown headers is safer and matches strategy tab pattern |

**Installation:** No new packages required. All dependencies are already present.

---

## Architecture Patterns

### File Touch Map

```
server.js       — add GET/POST /api/accounts/:id/briefing endpoints (~80 lines)
db.js           — add migration v6, getBriefing/saveBriefing helpers (~30 lines)
index.html      — add Briefing tab button, tab-pane, CSS for briefing card + @media print, JS functions (~120 lines)
```

### Pattern 1: Briefings Table Migration (mirrors Phase 4 strategy_summaries)

**What:** New migration block `if (version < 6)` in db.js that creates the briefings table and advances PRAGMA user_version to 6.

**When to use:** At server startup, automatically runs if schema is at version 5.

```javascript
// Source: [VERIFIED: existing db.js migration pattern, Phase 4]
if (version < 6) {
  const migrate6 = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS briefings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        generated_at TEXT NOT NULL DEFAULT (datetime('now')),
        tokens_used INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
      PRAGMA user_version = 6;
    `);
  });
  migrate6();
}
```

### Pattern 2: getBriefing / saveBriefing db helpers (mirrors getStrategy / upsertStrategy)

**What:** Two helper functions added to db.js — `getBriefing(accountId)` returns the cached row or null; `saveBriefing(accountId, content, tokensUsed)` upserts (replaces on regenerate).

```javascript
// Source: [VERIFIED: existing db.js upsertStrategy pattern]
function getBriefing(accountId) {
  return db.prepare('SELECT * FROM briefings WHERE account_id = ?').get(accountId);
}

function saveBriefing(accountId, content, tokensUsed) {
  db.prepare(`
    INSERT INTO briefings (account_id, content, tokens_used, generated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(account_id) DO UPDATE SET
      content = excluded.content,
      tokens_used = excluded.tokens_used,
      generated_at = excluded.generated_at
  `).run(accountId, content, tokensUsed || 0);
  return db.prepare('SELECT * FROM briefings WHERE account_id = ?').get(accountId);
}
```

### Pattern 3: Server Endpoints (mirrors /api/accounts/:id/strategy)

**What:** Two endpoints added to server.js:
- `GET /api/accounts/:id/briefing` — returns cached briefing or 404 if none
- `POST /api/accounts/:id/briefing` — gathers all data, calls Anthropic, saves and returns result

**Key difference from strategy:** The briefing prompt should produce output structured for human reading AND print. The strategy prompt produces a pursuit-team-facing document; the briefing prompt produces a shareable executive one-pager with more formal language.

```javascript
// Source: [VERIFIED: existing server.js strategy endpoint pattern]
const briefingMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)\/briefing$/);

// GET /api/accounts/:id/briefing
if (req.method === 'GET' && briefingMatch) {
  var account = db.getAccount(briefingMatch[1]);
  if (!account) { res.writeHead(404, ...); return; }
  var briefing = db.getBriefing(briefingMatch[1]);
  if (!briefing) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'No briefing' })); return; }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(briefing));
  return;
}

// POST /api/accounts/:id/briefing
if (req.method === 'POST' && briefingMatch) {
  // gather all data sources (same as strategy)
  // build AI prompt (see briefing prompt section below)
  // call Anthropic API
  // saveBriefing(accountId, text, totalTokens)
  // return saved row
}
```

### Pattern 4: Briefing Tab in renderAccountPanel (mirrors Strategy tab)

**What:** One additional tab button and one additional tab-pane div added inside `renderAccountPanel()`. Tab order: Overview | Contacts | Activity | Strategy | **Briefing** | Ask AI.

```javascript
// Source: [VERIFIED: existing renderAccountPanel() in index.html]
// Tab button — insert after Strategy tab line:
html += '<button class="acct-tab" onclick="showTab(\'' + id + '\',\'briefing\',this)">Briefing</button>';

// Tab pane — insert after Strategy pane, before AI pane:
html += '<div class="tab-pane" id="' + id + '-briefing"><div id="' + id + '-briefing-panel"></div></div>';
```

### Pattern 5: showTab() Briefing Lazy Load (mirrors Strategy tab load)

**What:** Inside `showTab()`, add a `if (tab === 'briefing')` block that initializes the panel and loads the cached briefing (or auto-generates if none).

```javascript
// Source: [VERIFIED: existing showTab() strategy block in index.html]
if (tab === 'briefing') {
  var briefingPanel = document.getElementById(account + '-briefing-panel');
  if (briefingPanel && !briefingPanel.dataset.loaded) {
    briefingPanel.dataset.loaded = '1';
    loadBriefingTab(account);
  }
}
```

### Pattern 6: @media print CSS

**What:** A `@media print` block in the `<style>` section of index.html that:
1. Hides: `.topnav`, `.sidebar`, `.acct-header`, `.acct-tabs`, all tab-panes except the active briefing
2. Makes the briefing content fill the page with white background, black text
3. Sets appropriate print margins and font size
4. Hides the action buttons (Generate Briefing / Regenerate / Print) inside the briefing panel

**Why this works:** The browser's native print function reads the `@media print` CSS and renders only what's visible. Since the user must be on the Briefing tab to click "Print", the `.tab-pane.active` containing the briefing is already visible.

```css
/* Source: [ASSUMED — standard CSS @media print pattern, well established] */
@media print {
  /* Hide the entire app chrome */
  .topnav,
  .sidebar,
  .acct-header,
  .acct-tabs,
  .briefing-actions { display: none !important; }

  /* Remove dark background, restore white page */
  body, html { background: #fff !important; color: #000 !important; }

  /* Tab panes: hide all non-active; active briefing fills page */
  .tab-pane { display: none !important; }
  .tab-pane.active { display: block !important; }

  /* Briefing content: full width, readable margins */
  .acct-content { border: none !important; padding: 0 !important; }
  .briefing-card { box-shadow: none !important; border: none !important; background: #fff !important; color: #000 !important; max-width: 100% !important; }

  /* Page settings */
  @page { margin: 20mm; }
}
```

**Critical detail:** The `display: none !important` is required because inline styles and specificity battles can override rules without `!important`. The dark theme sets background colors as CSS variables — the print block must override these explicitly.

### Pattern 7: AI Briefing Prompt Engineering

**What:** The system prompt gathers the same data sources as the strategy endpoint (account, contacts, activities, intel, triggers) but the user-facing request asks for an executive briefing with a specific output format.

**Format decision (Claude's discretion):** The briefing should be rendered as plain text with markdown-style headers (`## Section Name`) that the frontend converts to HTML using a simple line-by-line renderer (same `escapeHtml().replace(/\n/g, '<br>')` approach used in the strategy tab, with additional heading conversion).

**Recommended prompt structure:**

```
You are preparing a pre-meeting executive briefing for a Grid Dynamics pursuit team.
This briefing will be printed and distributed before a meeting with [ACCOUNT NAME].

Write a professional, concise one-pager that a team member can read in 2 minutes.
Avoid jargon. Do not use em dashes or double hyphens.

Structure your response exactly as follows:

## [ACCOUNT NAME] — Account Briefing
Generated: [ask the model to note it was AI-generated on this date]

## Company Snapshot
[2-3 sentences: what the company does, revenue, employees, HQ]

## Key Contacts
[For each contact: Name | Title | Influence Level — one-line rationale for engaging them]

## Current Strategy
[3-5 bullets: where we are, what we've heard, what's working]

## Recent Activity
[3-5 bullets: most significant recent log entries]

## Buying Triggers
[2-4 bullets: active triggers that make this the right time]

## Recommended Next Steps
[3-4 numbered actions to take in the next 2 weeks]
```

**Token budget:** 3000 max_tokens is appropriate. The briefing is a one-pager — 4000 would allow bloat. [ASSUMED — based on observed strategy output lengths; validate against first generated briefing]

### Pattern 8: Briefing Render (frontend)

**What:** `renderBriefing(accountId, briefing)` function that converts the stored text to HTML and renders it inside the briefing panel div. Uses the same `escapeHtml().replace(/\n/g, '<br>')` approach as the strategy tab, but adds heading detection.

**Heading conversion:** Lines starting with `## ` should become `<h3>` elements in the rendered output for visual hierarchy on-screen and clean print output.

```javascript
// Source: [ASSUMED — pattern extension of existing strategy render]
function briefingTextToHtml(text) {
  return text.split('\n').map(function(line) {
    var escaped = escapeHtml(line);
    if (escaped.indexOf('## ') === 0) {
      return '<h3 class="briefing-section-header">' + escaped.substring(3) + '</h3>';
    }
    return escaped || '&nbsp;';
  }).join('<br>');
}
```

### Anti-Patterns to Avoid

- **Storing briefing as raw HTML:** Risk of XSS if AI response contains HTML tags. Store as plain text, convert at render time using `escapeHtml()` first.
- **Calling `window.print()` from a non-briefing tab:** The print button must only appear on the Briefing tab; clicking it while on another tab would print that tab's content.
- **Using `display: none` without `!important` in print CSS:** The dark theme's inline and high-specificity styles will win without `!important`.
- **Generating the briefing on page load for all accounts:** Only generate on first Briefing tab visit (`dataset.loaded` guard), same as strategy and activity tabs.
- **Separate `/api/claude` proxy for briefing:** Do not reuse the generic chat endpoint. Use a dedicated `/api/accounts/:id/briefing` endpoint that controls the system prompt and data gathering, consistent with all other AI endpoints in Phase 2-5.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom PDF library (jsPDF, Puppeteer) | `window.print()` + `@media print` | Project has zero-dependency constraint; browser print-to-PDF is indistinguishable from generated PDF for this use case |
| Markdown parsing | Custom markdown renderer | Simple line-by-line `## → <h3>` conversion | Full markdown library is overkill; the AI prompt controls the output format |
| Content caching layer | Redis, in-memory LRU | SQLite briefings table with UNIQUE constraint | Already have SQLite; one row per account is sufficient |

**Key insight:** The browser is already a world-class document renderer. `@media print` + `window.print()` produces a professional PDF without any dependencies. This is the right tool for this project.

---

## Common Pitfalls

### Pitfall 1: Print CSS Specificity Failures
**What goes wrong:** Dark theme CSS variables and inline styles override the `@media print` rules, producing a dark-background PDF that is unreadable when printed.
**Why it happens:** CSS variables like `--dark` and `--surface` are set on `:root` and cascade through. `@media print` rules without `!important` lose specificity battles.
**How to avoid:** Every color override in the print block must use `!important`. Also explicitly set `background: #fff !important; color: #000 !important` on `body`, `html`, `.briefing-card`, and every wrapper element.
**Warning signs:** Test by pressing Ctrl+P while on the Briefing tab — if the print preview shows a dark background, specificity rules are failing.

### Pitfall 2: Tab Pane Visibility During Print
**What goes wrong:** All tab panes except the active one are `display: none`. If the print CSS hides "all tab-panes" without a carve-out for `tab-pane.active`, the briefing itself disappears from the print output.
**Why it happens:** The print block `display: none !important` on `.tab-pane` is too broad.
**How to avoid:** Use `.tab-pane { display: none !important; } .tab-pane.active { display: block !important; }` — the second rule must come after the first.
**Warning signs:** Print preview shows the correct app chrome hidden but a blank content area.

### Pitfall 3: Briefing Generation Token Creep
**What goes wrong:** The briefing prompt gathers all data from all tables and sends a very large context, driving up token costs unexpectedly.
**Why it happens:** Unlike the strategy endpoint (which already limits to 20 activities, 20 intel items, 30 chat messages), the briefing endpoint might gather unbounded data if not capped.
**How to avoid:** Apply the same caps as the strategy endpoint: `getActivity(accountId, 10)`, `getIntel(accountId).slice(0, 10)`, contacts limited to 5. The briefing is a one-pager — it does not need 30 chat messages of context.
**Warning signs:** Token usage per briefing exceeds 3000 input tokens for a well-populated account.

### Pitfall 4: AI Returns Markdown Code Fences
**What goes wrong:** The AI response is wrapped in ` ```markdown ... ``` ` fences, which get stored in the database and rendered as literal backtick characters.
**Why it happens:** Claude sometimes wraps structured responses in code blocks despite instructions not to.
**How to avoid:** Include explicit instruction in the user message: "Return plain text only. Do not use markdown code fences." Also add the same code-fence strip fallback used in the refresh endpoint:
```javascript
if (text.indexOf('```') !== -1) {
  text = text.replace(/```(?:markdown)?\s*/g, '').replace(/```\s*$/g, '').trim();
}
```
**Warning signs:** Briefing card renders with ` ``` ` at the top.

### Pitfall 5: Missing `data-loaded` Guard on Tab Switch
**What goes wrong:** Every time the user clicks the Briefing tab, a new API call fires, overwriting the displayed briefing with a fresh generation.
**Why it happens:** Forgetting to add the `dataset.loaded` guard, or clearing it after generation.
**How to avoid:** Mirror the exact strategy tab pattern: `if (briefingPanel && !briefingPanel.dataset.loaded) { briefingPanel.dataset.loaded = '1'; loadBriefingTab(account); }`. The `dataset.loaded` is set before the fetch begins, not after it resolves.
**Warning signs:** Briefing flickers or regenerates on each tab click.

---

## Code Examples

### Full loadBriefingTab() flow (composite of verified patterns)

```javascript
// Source: [VERIFIED: mirrors loadStrategyTab() and loadStrategy() in index.html]

var briefingCache = {};

function loadBriefingTab(accountId) {
  var panel = document.getElementById(accountId + '-briefing-panel');
  if (!panel) return;
  var safeId = escapeHtml(accountId);

  var html = '<div id="' + safeId + '-briefing-card"><div class="strategy-loading">Loading briefing...</div></div>';
  html += '<div class="briefing-actions" id="' + safeId + '-briefing-actions" style="display:none">';
  html += '<button class="primary" onclick="regenerateBriefing(\'' + safeId + '\')">Regenerate Briefing</button>';
  html += '<button onclick="window.print()">Print / Save as PDF</button>';
  html += '</div>';
  panel.innerHTML = html;

  loadBriefing(accountId);
}

function loadBriefing(accountId) {
  var cardEl = document.getElementById(accountId + '-briefing-card');

  fetch('/api/accounts/' + encodeURIComponent(accountId) + '/briefing')
    .then(function(r) {
      if (r.status === 404) {
        // D-09: Auto-generate on first load
        if (cardEl) cardEl.innerHTML = '<div class="strategy-loading">Generating briefing...</div>';
        generateBriefing(accountId);
        return null;
      }
      if (!r.ok) throw new Error('Server error');
      return r.json();
    })
    .then(function(data) {
      if (data) {
        briefingCache[accountId] = data;
        renderBriefing(accountId, data);
      }
    })
    .catch(function() {
      if (cardEl) cardEl.innerHTML = '<div class="strategy-empty">Failed to load briefing.</div>';
    });
}

function generateBriefing(accountId) {
  var cardEl = document.getElementById(accountId + '-briefing-card');

  fetch('/api/accounts/' + encodeURIComponent(accountId) + '/briefing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(function(r) {
      if (!r.ok) throw new Error('Server error');
      return r.json();
    })
    .then(function(data) {
      briefingCache[accountId] = data;
      renderBriefing(accountId, data);
    })
    .catch(function() {
      if (cardEl) {
        cardEl.innerHTML = '<div class="strategy-empty">Failed to generate briefing. ' +
          '<button style="background:none;border:none;color:var(--accent);cursor:pointer;font-family:var(--font);font-size:13px;text-decoration:underline" ' +
          'onclick="generateBriefing(\'' + escapeHtml(accountId) + '\')">Try again</button></div>';
      }
    });
}

function renderBriefing(accountId, briefing) {
  var cardEl = document.getElementById(accountId + '-briefing-card');
  var actionsEl = document.getElementById(accountId + '-briefing-actions');
  if (!cardEl) return;
  briefingCache[accountId] = briefing;

  var dateStr = briefing.generated_at ? 'Generated ' + formatActivityDate(briefing.generated_at) : '';
  var contentHtml = briefingTextToHtml(briefing.content);

  var html = '<div class="briefing-card">';
  html += '<div class="briefing-meta">' + escapeHtml(dateStr) + '</div>';
  html += '<div class="briefing-content">' + contentHtml + '</div>';
  html += '</div>';
  cardEl.innerHTML = html;

  if (actionsEl) actionsEl.style.display = 'flex';
}

function regenerateBriefing(accountId) {
  var cardEl = document.getElementById(accountId + '-briefing-card');
  if (cardEl) cardEl.innerHTML = '<div class="strategy-loading">Regenerating briefing...</div>';
  var actionsEl = document.getElementById(accountId + '-briefing-actions');
  if (actionsEl) actionsEl.style.display = 'none';
  generateBriefing(accountId);
}
```

### @media print block (complete)

```css
/* Source: [ASSUMED — standard CSS @media print, verified pattern for SPA print isolation] */
@media print {
  /* Hide app chrome */
  .topnav,
  .sidebar,
  .acct-header,
  .acct-tabs,
  .briefing-actions,
  .stale-badge,
  .acct-actions { display: none !important; }

  /* Reset dark theme */
  body, html { background: #fff !important; color: #000 !important; }
  .main-content { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  .acct-content { border: none !important; background: #fff !important; }

  /* Hide all tabs except active briefing */
  .tab-pane { display: none !important; }
  .tab-pane.active { display: block !important; }

  /* Briefing card print styles */
  .briefing-card { box-shadow: none !important; border: none !important; background: #fff !important; color: #000 !important; padding: 0 !important; }
  .briefing-section-header { color: #000 !important; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 16px; }
  .briefing-meta { color: #666 !important; font-size: 11px !important; }
  .briefing-content { font-size: 12px !important; line-height: 1.6 !important; }

  /* Page layout */
  @page { margin: 20mm; size: A4 portrait; }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External PDF libraries (jsPDF) | browser `window.print()` + CSS | Modern browsers | No dependencies, fonts render perfectly, no canvas rasterization |
| Separate print-specific HTML page | @media print on same page | CSS3 standard | Simpler, no routing needed |

**No deprecated patterns in this phase.** The techniques are all stable browser standards.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | max_tokens 3000 is sufficient for the briefing one-pager format | Architecture Patterns (Pattern 7) | Briefing gets truncated for dense accounts; fix: increase to 4000 |
| A2 | `@media print` + `display: none !important` will override dark theme CSS variables reliably across Chrome, Firefox, Safari | Common Pitfalls (Pitfall 1) | Print output may show dark background in some browsers; fix: add explicit white background to every wrapper |
| A3 | The `dataset.loaded` guard on the briefing panel is set before the first fetch (not after) — consistent with strategy tab | Code Examples | If set after, rapid tab switching could trigger multiple generations; validate against strategy tab code at line ~1223 |

---

## Open Questions

1. **Regeneration confirmation dialog**
   - What we know: D-08 says Regenerate follows Phase 4 strategy pattern; Phase 4 shows `confirm()` only when `is_edited === 1`
   - What's unclear: Briefings table has no `is_edited` field — there are no manual edits to a briefing
   - Recommendation: Skip the confirmation dialog for briefing regeneration (no manual edits to protect). Regenerate immediately, same as clicking "Regenerate" on an unedited strategy.

2. **Print page breaks for long briefings**
   - What we know: The decision is Claude's discretion; most briefings should fit one page at 12px font
   - What's unclear: Dense accounts with many contacts, triggers, and activity entries may overflow
   - Recommendation: Add `page-break-inside: avoid` on each `h3.briefing-section-header` and its following content block. This is a CSS-only fix requiring no logic changes.

---

## Environment Availability

Step 2.6: SKIPPED — this phase adds no new external dependencies. All required tools (better-sqlite3, Node.js built-ins, Anthropic API) are already present and verified from prior phases.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Manual browser testing (no automated test framework configured in project) |
| Config file | none |
| Quick run command | `node server.js` then navigate to any account's Briefing tab |
| Full suite command | Generate briefing, print preview (Ctrl+P), verify sections, verify cached load |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BREF-01 | Briefing tab appears on every account panel | smoke | Manual: open any account, verify Briefing tab button | N/A |
| BREF-01 | Generate Briefing auto-runs on first tab open | smoke | Manual: open Briefing tab on account with no cached briefing | N/A |
| BREF-01 | Cached briefing loads without AI call on subsequent visits | smoke | Manual: open Briefing tab twice, verify no loading spinner on second visit | N/A |
| BREF-01 | Regenerate Briefing replaces cached content | smoke | Manual: click Regenerate, verify new generation date | N/A |
| BREF-01 | DB migration v6 runs cleanly on v5 schema | smoke | `node -e "require('./db')"` — check console output for "Schema version: 6" | ❌ Wave 0 |
| BREF-02 | Print / Save as PDF button triggers browser print dialog | smoke | Manual: Ctrl+P equivalent, verify print preview shows only briefing | N/A |
| BREF-02 | Print preview hides sidebar, nav, tabs | smoke | Manual: print preview visual check | N/A |
| BREF-02 | Print output is white background, black text | smoke | Manual: print preview visual check | N/A |

### Sampling Rate

- **Per task commit:** `node server.js` — verify server starts with "Schema version: 6"
- **Per wave merge:** Full browser smoke test — generate briefing, verify all 6 sections present, trigger print preview
- **Phase gate:** Both BREF-01 and BREF-02 verified in browser before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] No automated test file needed — manual smoke tests are sufficient for this phase. The schema migration is the only testable artifact (`node -e "require('./db')"` confirms version 6).

*(If no gaps: existing test infrastructure covers all phase requirements — this project has no automated test framework; manual smoke tests are the standard verification approach used in all prior phases)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `isAuthenticated()` cookie check on all routes — briefing endpoints inherit this |
| V3 Session Management | no | No new sessions added |
| V4 Access Control | no | All users share a single password; no per-account access control |
| V5 Input Validation | yes | `escapeHtml()` MUST run before any `.innerHTML` insertion of AI-generated content |
| V6 Cryptography | no | No new cryptographic operations |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| AI response containing HTML/script tags | Tampering / XSS | `escapeHtml()` before all innerHTML assignment — this is the established pattern in the codebase (see index.html line 1145 comment: "SECURITY: escapeHtml MUST run before any .replace()") |
| Unauthenticated briefing access | Information Disclosure | `briefingMatch` routes are inside the authenticated section of server.js — no special handling needed |
| Briefing content leaked via AI response logging | Information Disclosure | No server-side logging of AI response content in existing pattern — maintain this |

**Security note:** The `briefingTextToHtml()` function must call `escapeHtml(line)` BEFORE any heading detection substitution. The pattern `escapeHtml(line)` then `if (escaped.indexOf('## ') === 0)` is correct because it escapes first, then checks the escaped string for safe heading markers.

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: db.js migration v5] — confirmed schema version, migration pattern, upsertStrategy pattern
- [VERIFIED: server.js strategy endpoint, lines 984-1105] — confirmed AI data-gather pattern, Anthropic API call pattern, response handling
- [VERIFIED: index.html renderAccountPanel(), lines 1105-1160] — confirmed tab structure, lazy-load pattern
- [VERIFIED: index.html loadStrategyTab()/generateStrategy()/renderStrategy(), lines 2246-2432] — confirmed full strategy tab lifecycle
- [VERIFIED: index.html strategy CSS, lines 566-659] — confirmed reusable CSS class names for briefing card
- [VERIFIED: index.html @media (max-width: 900px), line 866] — confirmed existing media query pattern; `@media print` block follows same syntax

### Secondary (MEDIUM confidence)

- [ASSUMED + well-established: CSS @media print with !important overrides for SPA apps] — standard browser behavior, no library-specific risk

### Tertiary (LOW confidence)

- None — all claims verified against existing codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all patterns verified in prior phases
- Architecture: HIGH — directly mirrors Phase 4 strategy pattern with one new element (@media print)
- Pitfalls: HIGH — identified from direct codebase inspection of existing patterns and known CSS print behaviors
- AI prompt: MEDIUM — content format is Claude's discretion; token estimates are assumed

**Research date:** 2026-04-14
**Valid until:** Stable — no fast-moving dependencies. Valid until project stack changes.
