# Phase 3: Pursuit Tracking - Research

**Researched:** 2026-04-10
**Domain:** Activity logging, AI-powered debrief extraction, human review gate
**Confidence:** HIGH

## Summary

Phase 3 adds a pursuit activity log per account and an AI debrief extraction feature with a human review gate. The technical domain is well-understood because it follows patterns already established in Phases 1 and 2: SQLite schema migration (v2 to v3), query helpers in db.js, REST routes in server.js, and a new tab in the dynamically-rendered account panel in index.html.

The primary complexity is the AI debrief flow (PURS-02 + PURS-03). Unlike Phase 2's AI generation which saved directly to DB, Phase 3 requires an intermediate "review proposals" state where AI output is presented for user approval before any database writes occur. This is a new UX pattern for this codebase and needs careful design. The AI extraction prompt must reliably return structured JSON that can be parsed and rendered into individual reviewable entries.

**Primary recommendation:** Split into 3 plans: (1) DB schema v3 + activity API routes, (2) Activity tab UI with manual entry form + timeline, (3) AI debrief extraction + review panel UI. Keep the review panel entirely client-side until user approves, then POST approved entries to the same activity creation endpoint.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** New "Activity" tab added to each account panel -- placed after Contacts tab, before Ask AI
- **D-02:** Activity entries display as a reverse-chronological timeline within the Activity tab
- **D-03:** Each activity entry has: timestamp, type (meeting / call / email / note / other), participants (free text), summary (text), and optional linked_contacts (references to contact IDs in the contacts table)
- **D-04:** Users can manually add activity entries via a form at the top of the Activity tab (quick log without AI)
- **D-05:** Activity entries are immutable once saved -- no edit/delete to preserve audit trail integrity
- **D-06:** Free-text textarea at the top of the Activity tab with "Extract with AI" button -- user pastes or types a meeting debrief narrative
- **D-07:** AI extraction uses existing /api/claude proxy pattern -- sends debrief text + account context + recent activity history as system prompt
- **D-08:** AI extracts: structured activity log entries (date, type, participants, key takeaways, action items) and optionally proposes contact updates (new contacts, title changes, influence changes)
- **D-09:** AI response parsed into individual proposed entries displayed in a review panel below the textarea
- **D-10:** AI-proposed entries appear in a "Review Proposals" panel with approve/edit/reject controls per entry
- **D-11:** Each proposed entry shows the extracted fields (date, type, participants, summary) with inline edit capability
- **D-12:** "Approve" saves the entry to the database; "Reject" discards it; "Approve All" batch-saves all entries
- **D-13:** Rejected entries are discarded -- user can edit the debrief text and re-extract if needed
- **D-14:** Contact update proposals (new contacts, title/influence changes) follow the same approve/reject pattern
- **D-15:** Nothing is written to the database until the user explicitly approves -- this is the core PURS-03 guarantee
- **D-16:** New `activity_log` table: id (INTEGER PRIMARY KEY), account_id (TEXT FK), type (TEXT CHECK meeting/call/email/note/other), participants (TEXT), summary (TEXT NOT NULL), linked_contacts (TEXT -- JSON array of contact IDs), source (TEXT DEFAULT 'manual' CHECK manual/ai_debrief), ai_raw (TEXT -- original debrief text if source=ai_debrief), created_at (TEXT)
- **D-17:** Schema migration to version 3 via PRAGMA user_version (following Phase 1/2 pattern)
- **D-18:** No soft delete for activity entries -- immutable log per D-05

### Claude's Discretion
- Activity timeline visual design (card vs minimal list vs grouped by date)
- AI prompt engineering for optimal debrief extraction quality
- How linked_contacts are displayed (inline names vs tags)
- Review panel visual layout and animation
- Whether "Extract with AI" button is disabled until textarea has minimum content
- Textarea placeholder text and character guidance
- How action items from AI extraction are handled (saved as separate entries or embedded in summary)

### Deferred Ideas (OUT OF SCOPE)
- Activity entry editing/deletion -- deferred to maintain audit trail integrity (D-05)
- Automatic activity entry creation from contact outreach logs -- potential Phase 4+ feature
- Activity search/filtering -- potential future enhancement
- Activity export to CSV/PDF -- potential future enhancement
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PURS-01 | Pursuit activity log with timestamped entries per account -- what happened, who was involved, what was said | DB schema (activity_log table), REST API (GET/POST), Activity tab with timeline rendering, manual entry form |
| PURS-02 | AI debrief extraction -- user describes a meeting in natural language, AI extracts structured log entries and updates strategy | Debrief textarea + "Extract with AI" button, POST /api/accounts/:id/debrief endpoint, AI prompt engineering, JSON response parsing |
| PURS-03 | AI debrief uses human review gate -- AI proposes, user confirms before writes hit the database | Review proposals panel with approve/edit/reject per entry, client-side state management, only POST on explicit approval |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No npm dependencies** beyond better-sqlite3 (already installed). Node.js built-in modules only for server.
- **No framework** -- vanilla HTML/CSS/JS, no build step.
- **All inline** -- CSS, JS, and HTML in single index.html file.
- **Security** -- escapeHtml() MUST run before any .replace() that injects HTML tags. API key stays server-side.
- **Naming** -- camelCase functions, kebab-case CSS classes, UPPER_SNAKE_CASE constants.
- **Railway deployment** -- auto-deploys from main branch, Railway Volume at /data for SQLite.
- **GSD Workflow** -- file changes happen through GSD commands.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | (already installed) | SQLite database with schema migration v3 | Already in use since Phase 1; synchronous API matches server pattern [VERIFIED: codebase] |
| Node.js http/https | built-in | HTTP server and Anthropic API proxy | Zero-dependency pattern established in Phase 1 [VERIFIED: codebase] |
| Anthropic Messages API | 2023-06-01 | AI debrief extraction via /api/claude proxy | Already integrated; model claude-sonnet-4-20250514 [VERIFIED: server.js] |

### Supporting
No additional libraries needed. This phase uses entirely existing stack.

### Alternatives Considered
None. The stack is locked by project constraints. No new dependencies.

## Architecture Patterns

### Recommended Project Structure
No new files. All changes go into existing files:
```
db.js          # Add migration v3 (activity_log table) + query helpers
server.js      # Add activity API routes + debrief endpoint
index.html     # Add Activity tab, timeline rendering, debrief UI, review panel
```

### Pattern 1: Schema Migration v3 (following v1/v2 pattern)
**What:** Add `activity_log` table using the `version < 3` migration guard pattern established in Phase 2.
**When to use:** Always -- this is the only migration pattern in the project.
**Example:**
```javascript
// Source: db.js lines 57-97 (Phase 2 migration pattern)
if (version < 3) {
  const migrate3 = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('meeting', 'call', 'email', 'note', 'other')),
        participants TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL,
        linked_contacts TEXT,
        source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'ai_debrief')),
        ai_raw TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
      CREATE INDEX IF NOT EXISTS idx_activity_account ON activity_log(account_id);
      PRAGMA user_version = 3;
    `);
  });
  migrate3();
}
```
[VERIFIED: codebase db.js pattern]

### Pattern 2: REST API Routes (following contacts pattern)
**What:** Add routes for activity CRUD nested under accounts, plus a debrief extraction endpoint.
**When to use:** For all new endpoints.
**Routes needed:**
- `GET /api/accounts/:id/activity` -- list activity entries (reverse chronological)
- `POST /api/accounts/:id/activity` -- create manual activity entry
- `POST /api/accounts/:id/debrief` -- send debrief text to AI, return proposed entries (NO DB writes)

**Key difference from Phase 2 AI pattern:** The debrief endpoint MUST NOT write to the database. It processes the AI response and returns proposed entries as JSON to the client. The client renders these for review, and only on approval does it POST individual entries to the `/activity` creation endpoint.
[VERIFIED: server.js route patterns]

### Pattern 3: Tab Extension (following contacts tab pattern)
**What:** Add "Activity" tab to `renderAccountPanel()` after Contacts, before Ask AI. Use lazy loading with `dataset.loaded` flag.
**When to use:** For the new tab.
**Example:**
```javascript
// In renderAccountPanel(), after Contacts tab button:
html += '<button class="acct-tab" onclick="showTab(\'' + id + '\',\'activity\',this)">Activity</button>';

// Tab pane:
html += '<div class="tab-pane" id="' + id + '-activity"><div id="' + id + '-activity-panel"></div></div>';

// In showTab(), add lazy loading:
if (tab === 'activity') {
  var activityPanel = document.getElementById(account + '-activity-panel');
  if (activityPanel && !activityPanel.dataset.loaded) {
    activityPanel.dataset.loaded = '1';
    loadActivity(account);
  }
}
```
[VERIFIED: index.html showTab() lines 780-800]

### Pattern 4: AI Debrief Extraction (new pattern)
**What:** A two-phase AI interaction: (1) send debrief text to AI, get structured JSON back; (2) render proposals for human review; (3) on approval, POST each entry individually.
**When to use:** For the "Extract with AI" button flow.

**AI prompt strategy:** The debrief endpoint should instruct Claude to return a JSON array of proposed activity entries. Use a structured prompt that specifies the exact output format. Include account context and recent activity history so AI can make informed extractions.

**Response format to request from AI:**
```json
{
  "activities": [
    {
      "date": "2026-04-10",
      "type": "meeting",
      "participants": "Fred Killeen (CIO), Sterling Anderson (SVP Software)",
      "summary": "Discussed AI observability needs for NVIDIA workloads...",
      "action_items": "Schedule follow-up demo, Send case study"
    }
  ],
  "contact_updates": [
    {
      "action": "new",
      "name": "Sterling Anderson",
      "title": "SVP Software & Services",
      "influence": "Champion"
    }
  ]
}
```
[ASSUMED -- prompt engineering is Claude's discretion per CONTEXT.md]

### Pattern 5: Client-Side Review State (new pattern)
**What:** Hold AI-proposed entries in client-side JavaScript state (not in DOM attributes or localStorage). Render a review panel with approve/edit/reject controls. Only on approval, POST to the activity creation endpoint.
**When to use:** For the PURS-03 human review gate.

**Implementation approach:**
- Store proposals in a module-level variable: `var pendingProposals = { activities: [], contactUpdates: [] };`
- Render each proposal as an editable card with approve/reject buttons
- "Approve" calls `POST /api/accounts/:id/activity` with the entry data, then removes from pending
- "Approve All" iterates and POSTs each entry
- "Reject" removes from pending array and re-renders
- This ensures D-15: nothing hits the DB until explicit user approval

### Anti-Patterns to Avoid
- **Writing AI proposals to DB before review:** This violates PURS-03. The debrief endpoint must return proposals without saving.
- **Parsing AI text with regex instead of JSON.parse:** Request JSON output from Claude and use JSON.parse with error handling. If parsing fails, show the raw text and let user manually create entries.
- **Skipping escapeHtml on AI-extracted fields:** All AI output must be escaped before rendering via innerHTML. The established pattern is `escapeHtml(text).replace(/\n/g, '<br>')`.
- **Inline editing via contentEditable:** Use input/textarea elements for editing proposed entries. contentEditable is fragile and hard to extract values from.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON parsing of AI response | Custom text splitting with delimiters | `JSON.parse()` with try/catch + fallback UI | Phase 2 used SECTION_BREAK delimiter which was fragile; structured JSON is more reliable for multi-entry extraction |
| Date parsing/formatting | Custom date string manipulation | `datetime('now')` in SQLite for creation time; accept ISO date strings from AI/user | SQLite handles datetime consistently; no need for JS date library |
| Activity type validation | Client-only validation | CHECK constraint in SQLite + server-side validation | DB constraint is the source of truth; server validates before INSERT |
| XSS prevention | Custom sanitization | `escapeHtml()` already in codebase | Established pattern, well-tested across 2 phases |

## Common Pitfalls

### Pitfall 1: AI Returns Unparseable Response
**What goes wrong:** Claude returns text that doesn't match the expected JSON format, causing JSON.parse to fail.
**Why it happens:** LLMs don't always follow formatting instructions perfectly, especially with complex schemas.
**How to avoid:** (1) Use a clear, explicit prompt asking for JSON only. (2) Wrap JSON.parse in try/catch. (3) On failure, show a "Could not parse AI response" message with the raw text and let user manually create entries. (4) Consider requesting the response inside a JSON code block and extracting between ``` markers.
**Warning signs:** Test with varied debrief styles (short notes, long narratives, bullet points).

### Pitfall 2: Race Condition on Approve All
**What goes wrong:** User clicks "Approve All" and all POSTs fire simultaneously. If one fails, partial entries are saved with no way to know which succeeded.
**Why it happens:** Parallel async fetch calls without sequential error handling.
**How to avoid:** Process "Approve All" entries sequentially (await each POST). Show progress ("Saving 2 of 5..."). If one fails, stop and report which entries were saved and which failed. The user can then retry the failed ones.
**Warning signs:** Network errors during batch save.

### Pitfall 3: Debrief Text Exceeding Body Limit
**What goes wrong:** Long debrief narratives could approach the 1MB body limit in readBody(), and the combined payload (debrief text + account context + activity history in system prompt) could exceed Anthropic's context window.
**Why it happens:** Meeting debriefs can be lengthy, especially if pasted from transcription tools.
**How to avoid:** (1) Limit textarea to a reasonable length (e.g., 10,000 characters). (2) Limit the number of recent activity entries sent as context (e.g., last 20). (3) Use max_tokens: 4000 for the debrief response since it needs to return multiple structured entries.
**Warning signs:** 413 errors from server or truncated AI responses.

### Pitfall 4: linked_contacts Referencing Deleted Contacts
**What goes wrong:** An activity entry links to a contact ID that is later soft-deleted.
**Why it happens:** Contacts use soft delete; activity entries are immutable and retain their linked_contacts JSON.
**How to avoid:** When rendering linked contacts, gracefully handle missing contacts (show "Deleted contact" or just the ID). Don't enforce FK on linked_contacts since it's a JSON text field, not a real FK.
**Warning signs:** UI errors when rendering activity timeline for accounts with deleted contacts.

### Pitfall 5: Tab Order and showTab() Not Handling Activity
**What goes wrong:** Adding the Activity tab in renderAccountPanel() but forgetting to add the lazy-loading logic in showTab().
**Why it happens:** The tab system requires changes in two places: the panel HTML and the showTab() function.
**How to avoid:** Follow the exact pattern used for the Contacts tab in showTab() (lines 793-799): check tab name, find panel, check dataset.loaded, set flag, call loader function.
**Warning signs:** Activity tab shows blank content when first clicked.

## Code Examples

### Activity Query Helpers (db.js)
```javascript
// Source: Following pattern from db.js getContacts/addOutreachEntry
function getActivity(accountId, limit) {
  limit = limit || 50;
  return db.prepare(
    'SELECT * FROM activity_log WHERE account_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(accountId, limit);
}

function addActivity({ account_id, type, participants, summary, linked_contacts, source, ai_raw }) {
  var result = db.prepare(
    'INSERT INTO activity_log (account_id, type, participants, summary, linked_contacts, source, ai_raw) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    account_id, type, participants || '', summary,
    linked_contacts || null, source || 'manual', ai_raw || null
  );
  return db.prepare('SELECT * FROM activity_log WHERE id = ?').get(result.lastInsertRowid);
}
```
[VERIFIED: follows db.js helper patterns]

### Debrief API Route (server.js)
```javascript
// Source: Following /api/contacts/:id/generate pattern from server.js
// POST /api/accounts/:id/debrief -- AI extracts proposals, returns JSON, NO DB write
const debriefMatch = parsed.pathname.match(/^\/api\/accounts\/([a-z0-9-]+)\/debrief$/);
if (req.method === 'POST' && debriefMatch) {
  readBody(req, res, (body) => {
    var parsed_body;
    try { parsed_body = JSON.parse(body); } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
    var debrief_text = parsed_body.text;
    if (!debrief_text || typeof debrief_text !== 'string' || !debrief_text.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'text is required' }));
      return;
    }
    var accountId = debriefMatch[1];
    var account = db.getAccount(accountId);
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Account not found' }));
      return;
    }
    // Build AI prompt with account context + recent activity
    var recentActivity = db.getActivity(accountId, 10);
    // ... construct system prompt and user message, call Anthropic API
    // ... parse JSON response, return proposals WITHOUT saving to DB
  });
  return;
}
```
[VERIFIED: follows server.js route patterns]

### AI System Prompt for Debrief Extraction
```javascript
// Source: Recommended prompt structure [ASSUMED -- Claude's discretion]
var systemPrompt = GD_CONTEXT +
  '\n\nACCOUNT: ' + account.name +
  '\nSECTOR: ' + account.sector +
  '\nACCOUNT INTELLIGENCE:\n' + account.context +
  '\n\nRECENT ACTIVITY:\n' + recentActivity.map(function(a) {
    return a.created_at + ' [' + a.type + '] ' + a.summary;
  }).join('\n');

var userMessage = 'Extract structured activity log entries from the following meeting debrief. ' +
  'Return ONLY valid JSON with no additional text. Use this exact format:\n' +
  '{"activities": [{"date": "YYYY-MM-DD", "type": "meeting|call|email|note|other", ' +
  '"participants": "Name (Title), Name (Title)", "summary": "What happened and key takeaways", ' +
  '"action_items": "Next steps"}], ' +
  '"contact_updates": [{"action": "new|update", "name": "Full Name", ' +
  '"title": "Job Title", "influence": "Champion|Evaluator|Blocker", ' +
  '"changes": "what changed (for updates only)"}]}\n\n' +
  'DEBRIEF:\n' + debrief_text;
```

### Review Panel Rendering (index.html)
```javascript
// Source: New pattern for Phase 3 [ASSUMED -- design is Claude's discretion]
function renderProposals(accountId, proposals) {
  var panel = document.getElementById(accountId + '-review-panel');
  if (!panel) return;
  var html = '<div class="review-header">';
  html += '<span>' + proposals.activities.length + ' entries extracted</span>';
  html += '<button class="btn btn-primary" onclick="approveAll(\'' + escapeHtml(accountId) + '\')">Approve All</button>';
  html += '</div>';

  proposals.activities.forEach(function(entry, index) {
    html += '<div class="proposal-card" id="proposal-' + index + '">';
    html += '<div class="proposal-type">' + escapeHtml(entry.type) + '</div>';
    html += '<div class="proposal-date">' + escapeHtml(entry.date) + '</div>';
    html += '<div class="proposal-summary">' + escapeHtml(entry.summary) + '</div>';
    html += '<div class="proposal-actions">';
    html += '<button class="btn btn-primary" onclick="approveEntry(\'' + escapeHtml(accountId) + '\',' + index + ')">Approve</button>';
    html += '<button class="btn btn-secondary" onclick="editEntry(' + index + ')">Edit</button>';
    html += '<button class="btn btn-destructive" onclick="rejectEntry(' + index + ')">Reject</button>';
    html += '</div>';
    html += '</div>';
  });

  panel.innerHTML = html;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SECTION_BREAK text delimiter (Phase 2) | JSON structured output for multi-entry extraction | Phase 3 | More reliable parsing for complex multi-entry responses |
| Direct DB write from AI endpoint (Phase 2 generate) | Return proposals to client, write only on approval | Phase 3 | Enables human review gate (PURS-03) |

**Deprecated/outdated:**
- None. All existing patterns are current and reusable.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Claude will reliably return valid JSON when instructed to do so | Architecture Pattern 4 | Need fallback UI for parsing failures; covered in Pitfall 1 |
| A2 | max_tokens: 4000 is sufficient for debrief extraction response | Pitfall 3 | May need to increase; monitor response truncation |
| A3 | Action items should be embedded in the summary field rather than stored separately | Claude's Discretion | If separate storage needed later, would require schema change |

## Open Questions

1. **Action items storage**
   - What we know: AI will extract action items from debriefs (D-08)
   - What's unclear: Whether action items should be a separate field in activity_log, embedded in summary, or stored as separate activity entries of type "note"
   - Recommendation: Embed in summary text for Phase 3 simplicity. If tracking/completion of action items becomes important, add a dedicated table in a future phase.

2. **Contact update proposals from debrief**
   - What we know: D-14 says contact update proposals follow same approve/reject pattern
   - What's unclear: Whether contact updates from debrief should use existing contact API endpoints or a new batch endpoint
   - Recommendation: Use existing individual `POST /api/accounts/:id/contacts` (for new) and `PUT /api/contacts/:id` (for updates) endpoints. No new backend needed for this.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected -- no test infrastructure exists |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PURS-01 | Activity entries persist and display in timeline | manual | Verify via browser: add entry, reload, confirm visible | N/A |
| PURS-02 | AI extracts structured entries from debrief text | manual | Paste debrief text, click Extract, verify proposals appear | N/A |
| PURS-03 | Nothing saved until user approves | manual | Extract entries, verify DB empty, approve one, verify DB has one | N/A |

### Wave 0 Gaps
- No test infrastructure exists in this project. All validation is manual via browser testing.
- This is consistent with Phases 1 and 2 which also had no automated tests.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing cookie-based auth (gd_auth) -- no changes needed [VERIFIED: server.js] |
| V3 Session Management | no | N/A for this phase |
| V4 Access Control | yes | All new routes check isAuthenticated() before processing [VERIFIED: server.js pattern] |
| V5 Input Validation | yes | escapeHtml() for all rendered content; CHECK constraints in SQLite; server-side type validation |
| V6 Cryptography | no | N/A for this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via AI-generated debrief content | Tampering | escapeHtml() before innerHTML -- established pattern [VERIFIED: index.html] |
| XSS via user-entered activity summary | Tampering | escapeHtml() before innerHTML |
| SQL injection via activity fields | Tampering | Parameterized queries via better-sqlite3 prepare() [VERIFIED: db.js] |
| Debrief prompt injection | Tampering | AI output is always reviewed by human before DB write (PURS-03) |
| Large debrief payload DoS | Denial of Service | readBody() 1MB limit already enforced [VERIFIED: server.js line 77] |

## Sources

### Primary (HIGH confidence)
- `db.js` -- Current schema migration pattern (v1, v2), query helper structure, better-sqlite3 usage
- `server.js` -- Current route patterns, /api/claude proxy, readBody() helper, Anthropic API integration
- `index.html` -- Tab system (renderAccountPanel, showTab), lazy loading, escapeHtml, AI panel rendering

### Secondary (MEDIUM confidence)
- `.planning/phases/02-contact-intelligence/02-01-SUMMARY.md` -- Phase 2 backend patterns
- `.planning/phases/02-contact-intelligence/02-03-SUMMARY.md` -- Phase 2 AI generation and XSS patterns

### Tertiary (LOW confidence)
- None. All research based on verified codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, entirely existing stack
- Architecture: HIGH -- follows established patterns from Phase 1/2 with one new pattern (review gate)
- Pitfalls: HIGH -- derived from codebase analysis and known LLM integration challenges

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable -- no external dependency changes expected)
