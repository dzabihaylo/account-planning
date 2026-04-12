# Phase 2: Contact Intelligence - Research

**Researched:** 2026-04-11
**Domain:** Contact CRUD, AI-generated outreach guidance, outreach logging, staleness tracking
**Confidence:** HIGH

## Summary

Phase 2 adds a contact intelligence layer to each account: a "Contacts" tab displaying decision-maker cards grouped by influence level (Champion/Evaluator/Blocker), with AI-generated outreach rationale and warm path, outreach logging, and staleness indicators. The entire implementation builds on Phase 1 patterns -- same db.js query helper style, same server.js route patterns, same modal/rendering approach in index.html.

The technical risk is low. All required patterns (schema migration, REST routes, dynamic rendering, modals, escapeHtml, AI proxy) are already proven in Phase 1. The main complexity is UI density: contact cards with inline expansion, outreach log forms, AI generation states, and multiple badge types. The UI-SPEC is extremely detailed and prescriptive, which reduces ambiguity but increases the amount of CSS/HTML to implement accurately.

**Primary recommendation:** Structure the plan as three waves: (1) schema migration + API routes in db.js/server.js, (2) frontend contact rendering + CRUD modals, (3) AI generation + outreach logging. This mirrors Phase 1's successful db-first, then API, then frontend pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Contacts displayed as card grid within a new "Contacts" tab on each account panel -- grouped by influence level (Champion / Evaluator / Blocker)
- **D-02:** Each contact card shows at a glance: name, title, influence label (color-coded badge), and staleness indicator
- **D-03:** Click a contact card to expand inline detail view showing full fields -- outreach rationale, warm path, outreach history
- **D-04:** Reuse Phase 1 modal pattern for add/edit contact forms -- same `.modal-overlay`, `.btn-primary`, `.btn-destructive` classes
- **D-05:** AI outreach rationale and warm path generated on-demand via button per contact -- not automatic on creation (keeps token costs predictable)
- **D-06:** AI generation uses existing /api/claude proxy pattern -- sends account context + contact role/title + Grid Dynamics capabilities as system prompt
- **D-07:** Generated rationale stored in contact DB row (`ai_rationale` TEXT field) -- persists until manually refreshed
- **D-08:** Generated warm path stored in contact DB row (`warm_path` TEXT field) -- persists until manually refreshed
- **D-09:** Outreach attempts logged via inline form on contact detail view (not a separate modal)
- **D-10:** Outreach log fields: date, channel (email / LinkedIn / phone / meeting / other), outcome (connected / no response / declined / meeting scheduled), optional notes
- **D-11:** Outreach history displays as reverse-chronological list under each contact's detail view
- **D-12:** Staleness indicator is a color-coded badge on each contact card -- green (<30 days since researched_at), yellow (30-90 days), red (>90 days)
- **D-13:** Manual "Refresh" button per contact triggers AI re-research (updates rationale, warm path, and researched_at timestamp)
- **D-14:** Auto-refresh deferred to Phase 5 (Intelligence Refresh) -- this phase is manual-only
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

### Deferred Ideas (OUT OF SCOPE)
- Auto-refresh of contact intelligence -- belongs in Phase 5 (Intelligence Refresh)
- Bulk import of contacts from CSV/LinkedIn -- potential future feature
- Contact relationship mapping between accounts (same person at multiple companies) -- future consideration
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-01 | User can view a contact map per account showing key decision-makers with role, title, and influence level | Schema D-15 provides data model; D-01/D-02 define card grid display; UI-SPEC defines contact card, influence badge, and group header components |
| CONT-02 | Each contact has AI-generated outreach rationale | D-05/D-06/D-07 define on-demand generation via /api/claude proxy; AI prompt pattern in Architecture Patterns section |
| CONT-03 | Each contact has a warm path / reachability field | D-05/D-06/D-08 define on-demand generation; same AI proxy pattern as CONT-02 |
| CONT-04 | User can add, edit, and remove contacts per account | D-04/D-18 define modal reuse and soft delete; REST routes in Standard Stack section |
| CONT-05 | User can log outreach attempts per contact | D-09/D-10/D-11 define inline form with date/channel/outcome/notes; outreach_log table in D-16 |
| CONT-06 | Contacts display a staleness indicator based on researched_at timestamp | D-12 defines color thresholds (<30d green, 30-90d yellow, >90d red); UI-SPEC defines badge CSS |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Zero external dependencies beyond better-sqlite3:** No npm packages. All frontend is vanilla HTML/CSS/JS.
- **No build step:** index.html is the entire SPA, inline styles and scripts.
- **camelCase functions, kebab-case CSS:** Follow established naming conventions.
- **Inline onclick handlers:** Continue the existing event binding pattern (no addEventListener).
- **escapeHtml on all innerHTML:** Security requirement from Phase 1 threat model (T-02-01, T-02-02).
- **Server-side API key:** Anthropic key never reaches the browser.
- **Railway deployment:** Auto-deploys from main branch. Volume at /data for SQLite persistence.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 12.8.0 | SQLite driver for contacts and outreach_log tables | Already installed as sole npm dependency [VERIFIED: local node_modules] |
| Node.js built-in http/https | N/A | API routes and Claude proxy | Existing server pattern, no express needed [VERIFIED: server.js] |
| Vanilla JS/CSS/HTML | N/A | All frontend rendering | Project constraint -- no frameworks [VERIFIED: CLAUDE.md] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Chart.js | 4.4.1 (CDN) | Data visualization | Already loaded, not needed for Phase 2 but present |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw SQL migrations | knex/sequelize | Adds npm dependencies, violates project constraint |
| Express.js | N/A | Adds dependency, project intentionally uses raw http module |
| Fetch API for AI | axios | Already using fetch in browser, https.request on server |

**Installation:** No new packages needed. better-sqlite3 is already installed.

## Architecture Patterns

### Database Schema Extension (Migration v1 to v2)

**What:** Add `contacts` and `outreach_log` tables inside the existing PRAGMA user_version migration system in db.js.
**Pattern:** Follow the exact pattern from v0->v1 migration (lines 23-55 of db.js).

```javascript
// Source: db.js existing pattern + D-15/D-16/D-17 decisions
if (version < 2) {
  const migrate2 = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT '',
        influence TEXT NOT NULL CHECK(influence IN ('Champion', 'Evaluator', 'Blocker')),
        email TEXT NOT NULL DEFAULT '',
        linkedin TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        ai_rationale TEXT,
        warm_path TEXT,
        researched_at TEXT,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id);

      CREATE TABLE IF NOT EXISTS outreach_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        channel TEXT NOT NULL CHECK(channel IN ('email', 'linkedin', 'phone', 'meeting', 'other')),
        outcome TEXT NOT NULL CHECK(outcome IN ('connected', 'no response', 'declined', 'meeting scheduled')),
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (contact_id) REFERENCES contacts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_outreach_contact ON outreach_log(contact_id);
      PRAGMA user_version = 2;
    `);
  });
  migrate2();
}
```

**Key detail:** The migration check must use `if (version < 2)` not `if (version === 1)` to handle edge cases where future migrations also need to run. [VERIFIED: Phase 1 uses `if (version === 0)` which works but `< 2` is more robust for chaining]

### REST API Route Pattern

**What:** Add contact CRUD and outreach routes to server.js following the existing account routes pattern.
**Routes needed:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/accounts/:id/contacts` | List contacts for an account (exclude soft-deleted) |
| POST | `/api/accounts/:id/contacts` | Create a new contact |
| GET | `/api/contacts/:id` | Get single contact with outreach history |
| PUT | `/api/contacts/:id` | Update contact fields |
| DELETE | `/api/contacts/:id` | Soft delete contact |
| POST | `/api/contacts/:id/outreach` | Log an outreach attempt |
| POST | `/api/contacts/:id/generate` | Generate AI rationale + warm path |

**Pattern to follow:** The route matching uses regex on `parsed.pathname` (see server.js lines 133, 176, 256). New routes must be placed before the static file serving block and after authentication check.

```javascript
// Source: server.js existing pattern
const contactsMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)\/contacts$/);
const contactMatch = parsed.pathname.match(/^\/api\/contacts\/(\d+)$/);
const outreachMatch = parsed.pathname.match(/^\/api\/contacts\/(\d+)\/outreach$/);
const generateMatch = parsed.pathname.match(/^\/api\/contacts\/(\d+)\/generate$/);
```

### Query Helper Pattern

**What:** Add contact and outreach query functions to db.js following the existing getAccounts/createAccount pattern.
**Functions needed:**

```javascript
// Source: db.js existing pattern
function getContacts(accountId) { /* SELECT WHERE account_id = ? AND is_deleted = 0 ORDER BY influence, name */ }
function getContact(id) { /* SELECT WHERE id = ? AND is_deleted = 0 */ }
function createContact({ account_id, name, title, role, influence, email, linkedin, phone }) { /* INSERT */ }
function updateContact(id, fields) { /* UPDATE with allowedFields list, same pattern as updateAccount */ }
function deleteContact(id) { /* SET is_deleted = 1, same pattern as deleteAccount */ }
function getOutreachLog(contactId) { /* SELECT WHERE contact_id = ? ORDER BY date DESC, created_at DESC */ }
function addOutreachEntry(contactId, { date, channel, outcome, notes }) { /* INSERT */ }
function updateContactAI(id, { ai_rationale, warm_path }) { /* UPDATE ai_rationale, warm_path, researched_at */ }
```

### Frontend Dynamic Rendering Pattern

**What:** Add "Contacts" tab to the renderAccountPanel function and create contact card rendering.
**Pattern:** Follow the existing tab system (lines 592-604 of index.html).

The Contacts tab is inserted as the second tab (after Overview, before Ask AI) per UI-SPEC:

```javascript
// Source: index.html existing renderAccountPanel pattern
html += '<button class="acct-tab" onclick="showTab(\'' + id + '\',\'contacts\',this)">Contacts</button>';

// And the tab pane:
html += '<div class="tab-pane" id="' + id + '-contacts"></div>';
```

Contact rendering happens lazily when the Contacts tab is first shown (similar to AI panel init pattern). This avoids rendering contact grids for all accounts on page load.

### AI Generation Pattern

**What:** Use the existing /api/claude proxy to generate outreach rationale and warm path per contact.
**Pattern:** The `/api/contacts/:id/generate` endpoint builds a specialized system prompt combining:
1. GD_CONTEXT (Grid Dynamics identity)
2. Account context (from the contact's parent account)
3. Contact-specific prompt requesting rationale and warm path

```javascript
// Source: D-06 decision + existing /api/claude pattern in server.js
// Server-side: build prompt, call Anthropic API, parse response, store in contact row
const systemPrompt = GD_CONTEXT + '\n\nACCOUNT: ' + account.name + '\nSECTOR: ' + account.sector +
  '\n\nCONTACT: ' + contact.name + '\nTITLE: ' + contact.title + '\nROLE: ' + contact.role +
  '\nINFLUENCE: ' + contact.influence +
  '\n\nACCOUNT INTELLIGENCE:\n' + account.context;

const userMessage = 'Generate two sections:\n\n' +
  '1. OUTREACH RATIONALE: Why would ' + contact.name + ' (' + contact.title + ') care about Grid Dynamics? ' +
  'What specific problems can Grid Dynamics solve for them based on their role and the account intelligence?\n\n' +
  '2. WARM PATH: How can we reach ' + contact.name + '? Identify potential mutual connections, ' +
  'shared networks, events, referral paths, or direct channels. Be specific and actionable.';
```

The response is parsed to extract the two sections and stored in `ai_rationale` and `warm_path` fields. The `researched_at` timestamp is updated to `datetime('now')`.

### Anti-Patterns to Avoid
- **Rendering all contacts on page load:** Use lazy rendering (render contacts when Contacts tab is first activated, same as AI panel pattern).
- **Calling /api/claude directly from browser for generation:** Use a dedicated `/api/contacts/:id/generate` endpoint that handles prompt construction server-side. This keeps the prompt logic server-side and avoids exposing account context in request bodies.
- **Storing AI prompts in the browser:** The system prompt contains full account intelligence. Keep prompt construction in server.js.
- **Forgetting escapeHtml on contact data:** Every contact field rendered via innerHTML must go through escapeHtml first. This is critical because contact names, titles, and AI-generated text could contain HTML characters.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting for staleness | Custom date parser | `new Date(researched_at)` + simple day diff math | JavaScript Date handles ISO datetime strings from SQLite |
| Form validation | Complex validation framework | Simple required-field checks + `.form-error` display | Only 3 required fields (name, title, influence), same pattern as Phase 1 account form |
| AI response parsing | Regex-based section extraction | Structured prompt with clear delimiters + simple string split | Ask Claude to use `---RATIONALE---` and `---WARM_PATH---` delimiters for reliable parsing |
| Outreach date picker | Custom date widget | `<input type="date">` native browser control | Sufficient for internal tool, no external library needed |

**Key insight:** This phase is mostly wiring -- connecting existing patterns (db queries, REST routes, dynamic rendering, modals, AI proxy) to new data types (contacts, outreach). The complexity is in UI detail, not in novel technical problems.

## Common Pitfalls

### Pitfall 1: Migration Ordering with Foreign Keys
**What goes wrong:** Creating the outreach_log table before contacts table causes a foreign key error.
**Why it happens:** SQLite foreign_keys pragma is ON (set in db.js line 18).
**How to avoid:** Create contacts table first in the migration transaction, outreach_log second. Both in the same transaction.
**Warning signs:** "FOREIGN KEY constraint failed" error on startup.

### Pitfall 2: Forgetting escapeHtml on AI-Generated Content
**What goes wrong:** AI-generated rationale or warm path text may contain angle brackets, ampersands, or quotes that break innerHTML rendering.
**Why it happens:** Claude responses can include HTML-like formatting, code snippets, or special characters.
**How to avoid:** Apply escapeHtml() to all AI-generated text before rendering. Apply escapeHtml BEFORE any .replace() that adds HTML tags (bold, line breaks).
**Warning signs:** Broken card layouts, visible HTML tags in the UI.

### Pitfall 3: Route Ordering in server.js
**What goes wrong:** Generic route matches steal requests from more specific routes.
**Why it happens:** server.js uses sequential if/return blocks with regex matching. `/api/contacts/5/outreach` could match a generic `/api/contacts/:id` pattern if checked first.
**How to avoid:** Place more specific routes (with sub-paths like `/outreach`, `/generate`) BEFORE generic single-resource routes. Follow the existing pattern where `/api/accounts/:id/chat` is matched before `/api/accounts/:id`.
**Warning signs:** 404 errors on outreach or generate endpoints.

### Pitfall 4: Staleness Calculation Timezone Issues
**What goes wrong:** Staleness badge shows wrong color because of timezone mismatch between SQLite `datetime('now')` (UTC) and JavaScript `new Date()` (local time).
**Why it happens:** SQLite stores UTC timestamps, browser calculates with local timezone.
**How to avoid:** Always compare dates in UTC. Use `new Date(researched_at + 'Z')` to ensure UTC interpretation, or just use day-level precision (30/90 day thresholds are coarse enough that timezone differences are negligible).
**Warning signs:** Badge showing "STALE" for a contact just researched, or "FRESH" for one researched months ago.

### Pitfall 5: Contact Modal Colliding with Account Modal
**What goes wrong:** Opening a contact add/edit modal while an account modal is also using the same overlay element causes state confusion.
**Why it happens:** Phase 1 account modal uses `id="accountModal"`. If Phase 2 reuses the same DOM element, form fields and save handlers conflict.
**How to avoid:** Create a separate modal element for contacts (`id="contactModal"`) with its own form fields and handlers. Reuse the CSS classes (`.modal-overlay`, `.modal`, `.modal-hdr`, etc.) but not the DOM element.
**Warning signs:** Contact form showing account fields, or saving a contact overwriting an account.

### Pitfall 6: Large AI Response Truncation
**What goes wrong:** AI-generated rationale is cut off because max_tokens is too low.
**Why it happens:** Existing /api/claude uses max_tokens: 1000. Rationale + warm path combined may need more.
**How to avoid:** Use max_tokens: 1500 or 2000 for the generate endpoint. The response contains two sections.
**Warning signs:** Incomplete warm path text, abrupt endings.

## Code Examples

### Staleness Badge Calculation

```javascript
// Source: D-12 decision + UI-SPEC staleness badge specification
function getStalenessClass(researchedAt) {
  if (!researchedAt) return 'stale-stale';
  var now = new Date();
  var researched = new Date(researchedAt);
  var days = Math.floor((now - researched) / (1000 * 60 * 60 * 24));
  if (days < 30) return 'stale-fresh';
  if (days < 90) return 'stale-aging';
  return 'stale-stale';
}

function getStalenessLabel(researchedAt) {
  if (!researchedAt) return 'STALE';
  var now = new Date();
  var researched = new Date(researchedAt);
  var days = Math.floor((now - researched) / (1000 * 60 * 60 * 24));
  if (days < 30) return 'FRESH';
  if (days < 90) return 'AGING';
  return 'STALE';
}
```

### Contact Card Rendering

```javascript
// Source: UI-SPEC contact card component + existing renderAccountPanel pattern
function renderContactCard(contact) {
  var c = contact;
  var initials = escapeHtml(c.name).split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2);
  var influenceClass = 'influence-' + escapeHtml(c.influence).toLowerCase();
  var staleClass = getStalenessClass(c.researched_at);
  var staleLabel = getStalenessLabel(c.researched_at);

  var html = '<div class="contact-card" onclick="toggleContactDetail(' + c.id + ')">';
  html += '<div class="contact-card-hdr">';
  html += '<div class="contact-av">' + initials + '</div>';
  html += '<div class="contact-info">';
  html += '<div class="contact-name">' + escapeHtml(c.name) + '</div>';
  html += '<div class="contact-title">' + escapeHtml(c.title) + '</div>';
  html += '</div>';
  html += '<div class="contact-badges">';
  html += '<span class="influence-badge ' + influenceClass + '">' + escapeHtml(c.influence) + '</span>';
  html += '<span class="stale-badge ' + staleClass + '">' + staleLabel + '</span>';
  html += '</div>';
  html += '</div>';
  html += '<div class="contact-detail" id="contact-detail-' + c.id + '"></div>';
  html += '</div>';
  return html;
}
```

### AI Generation API Handler

```javascript
// Source: D-06 decision + existing /api/claude proxy pattern
// In server.js, POST /api/contacts/:id/generate
const contact = db.getContact(generateMatch[1]);
if (!contact) { /* 404 */ }
const account = db.getAccount(contact.account_id);
if (!account) { /* 404 */ }

const systemPrompt = GD_CONTEXT +
  '\n\nACCOUNT: ' + account.name + '\nSECTOR: ' + account.sector +
  '\nHQ: ' + account.hq + '\nREVENUE: ' + account.revenue +
  '\n\nACCOUNT INTELLIGENCE:\n' + account.context;

const userMessage = 'You are helping a sales team at Grid Dynamics prepare outreach to a specific contact.\n\n' +
  'CONTACT: ' + contact.name + '\nTITLE: ' + contact.title + '\nINFLUENCE LEVEL: ' + contact.influence + '\n\n' +
  'Provide two sections separated by the exact delimiter ---SECTION_BREAK---\n\n' +
  'SECTION 1 - OUTREACH RATIONALE: Why would this person care about Grid Dynamics? What specific problems can GD solve for them?\n\n' +
  'SECTION 2 - WARM PATH: How to reach this person. Mutual connections, shared networks, events, referral paths, or direct channels. Be specific and actionable.';

// Send to Anthropic, parse response, split on ---SECTION_BREAK---, store in contact
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded accounts in HTML | Dynamic rendering from SQLite via REST API | Phase 1 (just completed) | Phase 2 builds on this -- contacts are a new table in the same DB |
| AI chat only | AI for structured generation (rationale, warm path) | Phase 2 (this phase) | First use of Claude for non-chat structured output |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | max_tokens of 1500-2000 is sufficient for rationale + warm path generation | Common Pitfalls | If too low, responses get truncated; if too high, costs increase. Easy to adjust. |
| A2 | Using `---SECTION_BREAK---` delimiter for parsing AI response will be reliable | Code Examples | Claude may not consistently use the delimiter. Fallback: store entire response as rationale if parsing fails. |
| A3 | SQLite datetime('now') produces UTC-compatible strings parseable by JS Date | Common Pitfalls | If format differs, staleness calculation breaks. SQLite produces `YYYY-MM-DD HH:MM:SS` which JS Date can parse. |

## Open Questions

1. **AI prompt tuning**
   - What we know: D-06 specifies using account context + contact role/title + GD capabilities
   - What's unclear: Exact prompt wording for best rationale quality; whether to ask for bullet points or prose
   - Recommendation: Start with prose format, iterate after seeing output quality. Claude's discretion per CONTEXT.md.

2. **Contact `role` field vs `title` field distinction**
   - What we know: D-15 schema includes both `role TEXT` and `title TEXT` along with `influence TEXT`
   - What's unclear: Whether `role` is intended as a free-text functional role (e.g., "Decision Maker for Cloud") distinct from job title (e.g., "VP Engineering")
   - Recommendation: Treat `title` as job title, `role` as optional functional role descriptor. Role field not shown in UI-SPEC modal form fields -- it may be AI-populated or deferred. Include in schema but don't require in form.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual verification (no test framework installed) |
| Config file | none |
| Quick run command | `node -e "require('./db')"` (validates DB loads without errors) |
| Full suite command | Manual API testing via curl |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | Contact map displays per account | smoke | `curl -s localhost:3000/api/accounts/gm/contacts` | N/A - manual |
| CONT-02 | AI rationale generates on demand | integration | `curl -X POST localhost:3000/api/contacts/1/generate` | N/A - manual |
| CONT-03 | Warm path generates on demand | integration | Same as CONT-02 (combined endpoint) | N/A - manual |
| CONT-04 | CRUD operations work | smoke | `curl -X POST localhost:3000/api/accounts/gm/contacts -d '{...}'` | N/A - manual |
| CONT-05 | Outreach logging works | smoke | `curl -X POST localhost:3000/api/contacts/1/outreach -d '{...}'` | N/A - manual |
| CONT-06 | Staleness badge displays correctly | unit | `node -e "..."` inline staleness function test | N/A - manual |

### Sampling Rate
- **Per task commit:** `node -e "require('./db')"` + manual curl verification
- **Per wave merge:** Full manual walkthrough of contact CRUD + AI generation
- **Phase gate:** All 6 CONT requirements verified via browser + API

### Wave 0 Gaps
None -- no test framework to set up. This project uses manual verification consistent with Phase 1 approach.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (existing) | Cookie-based gd_auth check on all routes (already implemented) |
| V4 Access Control | yes | All new contact/outreach routes placed after isAuthenticated() guard |
| V5 Input Validation | yes | escapeHtml on all rendered fields; parameterized SQL queries; CHECK constraints on influence/channel/outcome |
| V6 Cryptography | no | No crypto operations in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via contact name/title in innerHTML | Tampering | escapeHtml() applied before all innerHTML insertions |
| XSS via AI-generated content in innerHTML | Tampering | escapeHtml() applied to ai_rationale and warm_path before rendering |
| SQL injection via contact fields | Tampering | Parameterized prepared statements in all db.js queries |
| Unauthorized contact CRUD | Elevation of Privilege | isAuthenticated() check before all /api/contacts routes |
| Malformed influence/channel values | Tampering | CHECK constraints in SQLite schema + server-side validation |

## Sources

### Primary (HIGH confidence)
- `db.js` (local codebase) -- schema migration pattern, query helpers, better-sqlite3 usage
- `server.js` (local codebase) -- route matching pattern, /api/claude proxy, readBody helper, auth guard
- `index.html` (local codebase) -- renderAccountPanel, showTab, escapeHtml, modal system, CSS variables
- `02-CONTEXT.md` -- all 18 locked decisions (D-01 through D-18)
- `02-UI-SPEC.md` -- complete visual/interaction contract for all Phase 2 components
- `01-01-SUMMARY.md` -- Phase 1 db.js structure and API route patterns
- `01-02-SUMMARY.md` -- Phase 1 dynamic rendering and modal implementation

### Secondary (MEDIUM confidence)
- better-sqlite3 v12.8.0 verified installed locally

### Tertiary (LOW confidence)
- None -- all findings derived from codebase inspection and locked decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, everything already in place from Phase 1
- Architecture: HIGH -- all patterns are direct extensions of proven Phase 1 patterns
- Pitfalls: HIGH -- identified from codebase inspection of actual code patterns

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable -- no external dependency changes expected)
