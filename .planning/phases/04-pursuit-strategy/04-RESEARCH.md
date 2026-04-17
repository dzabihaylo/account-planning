# Phase 4: Pursuit Strategy - Research

**Researched:** 2026-04-13
**Domain:** SQLite schema migration, AI prompt engineering for strategy synthesis, vanilla JS UI patterns
**Confidence:** HIGH

## Summary

Phase 4 adds a "Strategy" tab to each account panel containing three features: private intel notes (immutable, reverse-chronological), an AI-synthesized strategy summary (editable, regeneratable), and buying trigger tags (colored badges with timeline integration). All three features follow patterns already established in Phases 1-3: inline forms (Phase 3 activity), on-demand AI generation (Phase 2 contacts), colored badges (Phase 2 influence), and migration versioning (Phase 1 foundation).

The primary technical challenge is the AI strategy synthesis prompt. It must aggregate data from four sources (account context, activity logs, private intel, contacts with outreach history) into a coherent strategy recommendation. Token management matters here since concatenating all data could easily exceed input limits for accounts with extensive histories. The prompt should summarize or truncate older entries.

**Primary recommendation:** Follow the existing codebase patterns exactly. Add migration v4 with 3 new tables, add 6 API routes (CRUD for intel/strategy/triggers), add a new Strategy tab between Activity and Ask AI, and implement the AI synthesis endpoint using the same `https.request` proxy pattern from `/api/contacts/:id/generate` and `/api/accounts/:id/debrief`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** New "Strategy" tab on each account panel -- placed after Activity, before Ask AI
- **D-02:** Private intel notes displayed as a reverse-chronological list in the Strategy tab, each labeled "Internal" with a timestamp
- **D-03:** Inline textarea with "Add Note" button at top of notes section -- follows Phase 3's inline entry pattern
- **D-04:** Notes are stored in a new `private_intel` table with account_id, content, created_at
- **D-05:** Notes are immutable once saved (no edit/delete) -- preserves audit trail like activity entries (Phase 3 D-05)
- **D-06:** Prominent strategy summary card at the top of the Strategy tab -- shows AI-synthesized strategy text
- **D-07:** "Regenerate Strategy" button triggers AI synthesis on demand -- follows Phase 2's on-demand AI pattern
- **D-08:** AI synthesis uses ALL available account data: account context, pursuit activity logs, private intel notes, contact data (with outreach history), and chat history
- **D-09:** Strategy stored in a `strategy_summaries` table with account_id, content, generated_at, edited_at, is_edited (boolean)
- **D-10:** First load of Strategy tab auto-generates if no strategy exists yet -- subsequent updates are manual via Regenerate button
- **D-11:** Click "Edit" button on strategy summary card to enter edit mode -- textarea replaces the display text
- **D-12:** Save/Cancel buttons appear during edit mode -- Save persists edits, Cancel reverts
- **D-13:** Edited strategies display an "Edited" badge next to "AI-Generated" to show human modification
- **D-14:** Regenerating after manual edit warns: "This will replace your edits. Continue?" -- prevents accidental loss
- **D-15:** Tag-based system with predefined categories: CTO Change, Cost Cuts, Failed Vendor, Reorg, M&A, Digital Initiative, plus custom free-text tags
- **D-16:** Tags stored in a `buying_triggers` table with account_id, tag (TEXT), category (TEXT), notes (TEXT), created_at
- **D-17:** Tags display as colored badges on the Strategy tab below the strategy summary
- **D-18:** Tags also appear as entries in the Activity timeline with type "trigger"
- **D-19:** "Add Trigger" button opens inline form with category dropdown + optional notes
- **D-20:** Each predefined category gets a distinct color (follows Phase 2's influence badge color pattern)
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

### Deferred Ideas (OUT OF SCOPE)
- Strategy version history (track all regenerations)
- Trigger-based notifications (alert when trigger is stale)
- Strategy comparison (diff between AI-generated and manually edited)
- Trigger analytics (which triggers correlate with wins)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STRT-01 | Each account has a private intel layer -- user-contributed notes labeled as internal alongside public data | `private_intel` table, inline textarea form pattern, "Internal" label + timestamp display |
| STRT-02 | Each account has an evolving strategy summary that the AI synthesizes from pursuit logs, private intel, chat history, and contact data | `strategy_summaries` table, AI synthesis endpoint, prompt engineering pattern aggregating all data sources |
| STRT-03 | User can manually edit the strategy summary to correct or refine AI suggestions | Edit mode toggle, Save/Cancel buttons, is_edited flag, "Edited" badge |
| STRT-04 | "Why now" trigger tracking -- tag buying triggers to account timeline | `buying_triggers` table, category-based colored badges, timeline integration via activity_log type "trigger" |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | Already installed | Database (migration v4) | Already in use since Phase 1 [VERIFIED: db.js line 1] |
| Node.js built-in `https` | N/A | Anthropic API proxy for strategy synthesis | Already used for contact AI generate and debrief endpoints [VERIFIED: server.js] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Chart.js | 4.4.1 (CDN) | Already loaded, not needed for Phase 4 | N/A for this phase |

No new dependencies needed. Phase 4 uses the same zero-dependency approach as all prior phases. [VERIFIED: codebase inspection]

## Architecture Patterns

### Database Migration Pattern (v3 -> v4)

The existing pattern in `db.js` uses `if (version < N)` blocks with `db.transaction()`:

```javascript
// Source: db.js lines 99-119 (migration v3 pattern)
if (version < 4) {
  const migrate4 = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS private_intel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
      CREATE INDEX IF NOT EXISTS idx_intel_account ON private_intel(account_id);

      CREATE TABLE IF NOT EXISTS strategy_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        is_edited INTEGER NOT NULL DEFAULT 0,
        generated_at TEXT NOT NULL DEFAULT (datetime('now')),
        edited_at TEXT,
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE TABLE IF NOT EXISTS buying_triggers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        category TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );
      CREATE INDEX IF NOT EXISTS idx_triggers_account ON buying_triggers(account_id);
      PRAGMA user_version = 4;
    `);
  });
  migrate4();
}
```

[VERIFIED: pattern from db.js lines 99-119]

### API Route Pattern

Routes follow regex-based pattern matching in the monolithic `server.js` handler. Each resource has:
- `GET /api/accounts/:id/{resource}` - list for account
- `POST /api/accounts/:id/{resource}` - create new entry
- Body parsing via `readBody()` helper with 1MB limit
- JSON validation with try-catch
- Field validation with 400 error responses
- Account existence check before operations

New routes needed:
```
GET  /api/accounts/:id/intel         - list private intel notes
POST /api/accounts/:id/intel         - add a private intel note
GET  /api/accounts/:id/strategy      - get current strategy summary
POST /api/accounts/:id/strategy      - generate/regenerate AI strategy
PUT  /api/accounts/:id/strategy      - save manual edits
GET  /api/accounts/:id/triggers      - list buying triggers
POST /api/accounts/:id/triggers      - add a buying trigger
```

[VERIFIED: route patterns from server.js lines 132-577]

### AI Proxy Pattern

The existing AI generation pattern (contact generate, debrief extraction) uses:
1. Build system prompt from GD_CONTEXT + account data + contextual data
2. Build user message with specific instructions
3. Create `https.request` to `api.anthropic.com/v1/messages`
4. Parse response, extract text content
5. Store result in DB
6. Return updated record

For strategy synthesis, the endpoint should:
1. Gather ALL data: account context, activity logs, private intel, contacts (with outreach), and recent chat messages
2. Construct a comprehensive system prompt
3. Ask Claude to synthesize a pursuit strategy
4. Store in `strategy_summaries` table (INSERT or UPDATE via UPSERT)

[VERIFIED: AI proxy patterns from server.js lines 276-354 (contact generate) and 580-718 (debrief)]

### Frontend Tab Pattern

Tabs are dynamically generated in `renderAccountPanel()` at line 806. Adding Strategy tab requires:
1. Add tab button between Activity and Ask AI in the `acct-tabs` div
2. Add corresponding `tab-pane` div with `id="${id}-strategy"`
3. Add lazy-load trigger in `showTab()` function (like contacts at line 876, activity at line 883)

```javascript
// Source: index.html lines 876-889 (lazy load pattern)
if (tab === 'strategy') {
  var strategyPanel = document.getElementById(account + '-strategy-panel');
  if (strategyPanel && !strategyPanel.dataset.loaded) {
    strategyPanel.dataset.loaded = '1';
    loadStrategy(account);
  }
}
```

[VERIFIED: tab patterns from index.html lines 806-889]

### Inline Form Pattern

The activity entry form (index.html lines 1756-1773) establishes the pattern:
- Form div with inputs/textarea at top of tab content
- Error display div
- Submit button with onclick handler
- On submit: disable button, show "Saving...", POST to API, on success reload data, on error re-enable

[VERIFIED: inline form from index.html lines 1756-1773]

### Badge Color Pattern

Influence badges use the pattern: `background: rgba(R,G,B,0.1); border: 1px solid rgba(R,G,B,0.2); color: #{hex}` with CSS classes.

Recommended trigger category colors (Claude's discretion):

| Category | Color Variable | Hex | Rationale |
|----------|---------------|-----|-----------|
| CTO Change | --accent (blue) | #3B82F6 | Leadership change = strategic signal |
| Cost Cuts | --red | #EF4444 | Cost pressure = urgency |
| Failed Vendor | --gold | #F59E0B | Opportunity signal |
| Reorg | --purple | #A78BFA | Structural change |
| M&A | --teal | #14B8A6 | Transaction event |
| Digital Initiative | --green | #22C55E | Tech investment signal |
| Custom | --muted | #7C8DB5 | User-defined, neutral |

[ASSUMED: color assignments are Claude's discretion per CONTEXT.md]

### Recommended Project Structure (within existing monolithic files)

```
db.js additions:
  - Migration v4 block (3 tables)
  - 7 new query helpers: getIntel, addIntel, getStrategy, upsertStrategy, updateStrategyContent, getTriggers, addTrigger

server.js additions:
  - 7 new route matchers and handlers
  - 1 AI synthesis endpoint (POST /api/accounts/:id/strategy)

index.html additions:
  - CSS: ~60 lines (strategy card, intel list, trigger badges, edit mode)
  - JS: ~250 lines (loadStrategy, renderStrategy, submitIntel, generateStrategy, editStrategy, saveStrategy, addTrigger)
  - Tab button + tab pane in renderAccountPanel()
  - showTab() lazy-load hook
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite upsert | Manual SELECT then INSERT/UPDATE | `INSERT ... ON CONFLICT(account_id) DO UPDATE` | SQLite supports UPSERT since 3.24.0; better-sqlite3 handles it natively [ASSUMED] |
| HTML escaping | Custom regex replacements | Existing `escapeHtml()` function | Already in codebase, covers all XSS vectors [VERIFIED: index.html line 713] |
| Date formatting | New date utility | Existing `formatActivityDate()` function | Already in codebase for activity timeline [VERIFIED: index.html line 1813] |
| AI proxy boilerplate | New abstraction | Copy existing proxy pattern | Matches codebase style; no abstraction layers [VERIFIED: server.js pattern] |

**Key insight:** This phase introduces no new technical problems. Every pattern needed already exists in the codebase from Phases 1-3. The primary value is careful assembly and good AI prompt engineering.

## Common Pitfalls

### Pitfall 1: Strategy Synthesis Token Overflow
**What goes wrong:** Concatenating ALL account data (context + all activity logs + all intel notes + all contacts + all chat messages) into one prompt easily exceeds input limits or produces expensive requests.
**Why it happens:** Decision D-08 says "ALL available account data" but some accounts could accumulate hundreds of entries over time.
**How to avoid:** Limit each data source: recent 20 activity entries, recent 20 intel notes, all contacts (usually <20), recent 30 chat messages. Use `max_tokens: 4000` for the response (matches debrief pattern). Include a comment explaining the truncation logic.
**Warning signs:** API 400 errors or unexpectedly high token costs.

### Pitfall 2: UNIQUE Constraint on strategy_summaries
**What goes wrong:** Attempting INSERT when a strategy already exists for an account, or UPDATE when none exists.
**Why it happens:** D-22 specifies `account_id TEXT FK UNIQUE` meaning one strategy per account. First generation is INSERT, regeneration is UPDATE.
**How to avoid:** Use SQLite UPSERT: `INSERT INTO strategy_summaries ... ON CONFLICT(account_id) DO UPDATE SET content = excluded.content, generated_at = excluded.generated_at, is_edited = 0, edited_at = NULL`. This handles both cases atomically.
**Warning signs:** SQLITE_CONSTRAINT errors on regeneration.

### Pitfall 3: Activity Timeline Type "trigger" Not in CHECK Constraint
**What goes wrong:** D-18 says triggers appear in the Activity timeline with type "trigger", but the existing `activity_log` table has a CHECK constraint: `type IN ('meeting', 'call', 'email', 'note', 'other')`.
**Why it happens:** Phase 3 schema didn't anticipate trigger entries.
**How to avoid:** Migration v4 must ALTER the CHECK constraint, OR store trigger timeline entries as type "other" with a marker in the summary, OR create a separate view that UNIONs activity_log and buying_triggers for timeline display. Recommended: Display triggers inline in the timeline by querying both tables and merging client-side (sorted by created_at). This avoids altering the activity_log schema.
**Warning signs:** INSERT failures if trying to add type "trigger" to activity_log.

### Pitfall 4: Auto-Generate on First Load Race Condition
**What goes wrong:** D-10 says first load of Strategy tab auto-generates if no strategy exists. If user clicks away and back quickly, two AI requests fire.
**Why it happens:** Lazy-load pattern uses `dataset.loaded` flag but AI generation is async.
**How to avoid:** Set a `dataset.generating` flag before the API call, check it before starting. Clear on completion or error. Show a loading spinner during generation.
**Warning signs:** Duplicate strategy entries (mitigated by UNIQUE constraint, but wastes API calls).

### Pitfall 5: Edit Mode State Loss on Tab Switch
**What goes wrong:** User starts editing strategy, switches to another tab, switches back -- unsaved edits are lost.
**Why it happens:** Tab switching may re-render content or simply hide/show panes.
**How to avoid:** The existing tab system uses `display: none/block` toggling (CSS `.tab-pane.active`), which preserves DOM state. As long as the edit textarea is in the persistent DOM (not re-rendered), this is fine. Do NOT re-render on tab re-entry if already loaded.
**Warning signs:** Users losing mid-edit text.

## Code Examples

### Query Helper: Upsert Strategy

```javascript
// Pattern: matches existing db.js query helper style
function upsertStrategy(accountId, content) {
  db.prepare(`
    INSERT INTO strategy_summaries (account_id, content, generated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(account_id) DO UPDATE SET
      content = excluded.content,
      generated_at = excluded.generated_at,
      is_edited = 0,
      edited_at = NULL
  `).run(accountId, content);
  return db.prepare('SELECT * FROM strategy_summaries WHERE account_id = ?').get(accountId);
}
```

[VERIFIED: better-sqlite3 supports UPSERT syntax -- SQLite 3.24.0+ feature, and better-sqlite3 bundles a recent SQLite version]

### Query Helper: Update Strategy Content (manual edit)

```javascript
function updateStrategyContent(accountId, content) {
  var result = db.prepare(`
    UPDATE strategy_summaries 
    SET content = ?, is_edited = 1, edited_at = datetime('now')
    WHERE account_id = ?
  `).run(content, accountId);
  if (result.changes === 0) return null;
  return db.prepare('SELECT * FROM strategy_summaries WHERE account_id = ?').get(accountId);
}
```

[VERIFIED: matches update pattern from db.js updateContact/updateAccount]

### AI Strategy Synthesis Prompt Structure

```javascript
// System prompt: GD_CONTEXT + account data (same as debrief pattern)
var systemPrompt = GD_CONTEXT +
  '\n\nACCOUNT: ' + account.name +
  '\nSECTOR: ' + account.sector +
  '\nHQ: ' + account.hq +
  '\nREVENUE: ' + account.revenue +
  '\n\nACCOUNT INTELLIGENCE:\n' + account.context;

// Append pursuit activity (recent 20)
if (activities.length > 0) {
  systemPrompt += '\n\nPURSUIT ACTIVITY LOG:\n' + activities.map(function(a) {
    return a.created_at + ' [' + a.type + '] ' + a.summary;
  }).join('\n');
}

// Append private intel (recent 20)
if (intel.length > 0) {
  systemPrompt += '\n\nPRIVATE INTEL NOTES:\n' + intel.map(function(n) {
    return n.created_at + ': ' + n.content;
  }).join('\n');
}

// Append contacts with outreach
if (contacts.length > 0) {
  systemPrompt += '\n\nKEY CONTACTS:\n' + contacts.map(function(c) {
    return c.name + ' - ' + c.title + ' (' + c.influence + ')' +
      (c.ai_rationale ? ' | Rationale: ' + c.ai_rationale.substring(0, 200) : '');
  }).join('\n');
}

// Append buying triggers
if (triggers.length > 0) {
  systemPrompt += '\n\nBUYING TRIGGERS:\n' + triggers.map(function(t) {
    return t.created_at + ' [' + t.category + '] ' + t.tag +
      (t.notes ? ' - ' + t.notes : '');
  }).join('\n');
}

// Append recent chat (last 30 messages, summarized)
if (chatMessages.length > 0) {
  systemPrompt += '\n\nRECENT AI CHAT INSIGHTS:\n' + chatMessages.slice(-30).map(function(m) {
    return '[' + m.role + '] ' + m.content.substring(0, 300);
  }).join('\n');
}

var userMessage = 'Synthesize a pursuit strategy for this account based on ALL the data above. ' +
  'Structure your response as:\n\n' +
  '**Current Situation**: What we know about this account and where things stand.\n\n' +
  '**Why Now**: What buying triggers or signals make this the right time to engage.\n\n' +
  '**Recommended Approach**: Specific entry points, which contacts to prioritize, what to pitch.\n\n' +
  '**Key Risks**: What could go wrong and how to mitigate.\n\n' +
  '**Next Steps**: Concrete actions to take in the next 2 weeks.\n\n' +
  'Be specific, actionable, and concise. Reference specific people, events, and data points from the intelligence above.';
```

[ASSUMED: prompt structure is Claude's discretion; this follows the established pattern from debrief endpoint]

### Timeline Integration for Triggers (Client-Side Merge)

```javascript
// Merge activity_log entries and buying_triggers into unified timeline
// Both sorted by created_at DESC
function renderCombinedTimeline(activities, triggers) {
  var combined = [];
  for (var i = 0; i < activities.length; i++) {
    combined.push({ type: 'activity', data: activities[i], time: activities[i].created_at });
  }
  for (var j = 0; j < triggers.length; j++) {
    combined.push({ type: 'trigger', data: triggers[j], time: triggers[j].created_at });
  }
  combined.sort(function(a, b) { return b.time.localeCompare(a.time); });
  // Render each item with appropriate template
}
```

[ASSUMED: client-side merge approach recommended to avoid altering activity_log CHECK constraint]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded account data | SQLite with migrations | Phase 1 | All new features build on DB layer |
| No AI integration beyond chat | On-demand AI generation for contacts + debrief | Phase 2-3 | Strategy synthesis follows same pattern |
| Single activity type display | Multiple source types with badges | Phase 3 | Triggers extend this with new badge type |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SQLite UPSERT (`ON CONFLICT ... DO UPDATE`) works with better-sqlite3 bundled SQLite version | Code Examples | Would need separate INSERT/UPDATE logic; low risk since better-sqlite3 bundles SQLite 3.40+ |
| A2 | Trigger category color assignments (blue, red, gold, purple, teal, green, gray) | Badge Color Pattern | Purely aesthetic; can be changed trivially |
| A3 | Strategy prompt structure (5 sections: Current Situation, Why Now, Approach, Risks, Next Steps) | Code Examples | Prompt is Claude's discretion; can be refined without code changes |
| A4 | Client-side merge for timeline (instead of altering activity_log CHECK) | Pitfall 3 / Code Examples | If team prefers ALTER approach, migration v4 can include `ALTER TABLE activity_log...` but SQLite ALTER TABLE limitations make this harder |
| A5 | Truncation limits (20 activities, 20 intel notes, 30 chat messages) for AI prompt | Pitfall 1 | Too low = missing context; too high = token waste. Tunable without structural changes |

## Open Questions

1. **Activity timeline integration approach for triggers**
   - What we know: D-18 says triggers appear in activity timeline. The activity_log table has a CHECK constraint limiting type values.
   - What's unclear: Whether to (a) modify the CHECK constraint in migration v4, (b) insert triggers as type "other" with metadata, or (c) merge client-side from both tables.
   - Recommendation: Client-side merge is safest. SQLite does not support `ALTER TABLE ... ALTER COLUMN` to modify CHECK constraints. Would need to recreate the table. Client-side merge avoids this complexity.

2. **Chat history truncation for AI synthesis**
   - What we know: D-08 includes chat history in synthesis. Chat can grow large.
   - What's unclear: Optimal number of messages to include.
   - Recommendation: Last 30 messages, truncated to 300 chars each. This caps chat context at roughly 9,000 chars, manageable within the prompt.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual browser testing (no automated test framework detected) |
| Config file | None |
| Quick run command | `node server.js` + manual browser verification |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRT-01 | Add private intel note, verify "Internal" label and timestamp | manual | N/A | N/A |
| STRT-02 | Generate AI strategy, verify it references account data | manual | N/A | N/A |
| STRT-03 | Edit strategy text, save, verify "Edited" badge appears | manual | N/A | N/A |
| STRT-04 | Add buying trigger, verify badge on Strategy tab + entry in Activity timeline | manual | N/A | N/A |

### Sampling Rate
- **Per task commit:** `node server.js` + manual browser check of changed feature
- **Per wave merge:** Full manual walkthrough of all 4 STRT requirements
- **Phase gate:** All 4 success criteria verified manually

### Wave 0 Gaps
None -- no automated test infrastructure exists in this project (vanilla JS, no framework). All testing is manual browser verification.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (existing auth unchanged) | Existing cookie-based auth |
| V3 Session Management | No | Existing session unchanged |
| V4 Access Control | No (single-user, all authenticated users have full access) | Cookie check on all routes |
| V5 Input Validation | Yes | `escapeHtml()` for all user content display; server-side type/length validation |
| V6 Cryptography | No | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via private intel notes | Tampering | `escapeHtml()` on all user-entered content before DOM insertion [VERIFIED: existing pattern] |
| XSS via strategy content (AI-generated or manually edited) | Tampering | `escapeHtml()` before rendering; `.replace(/\n/g, '<br>')` AFTER escaping [VERIFIED: index.html line 816-817 pattern] |
| XSS via trigger tag/notes | Tampering | `escapeHtml()` on all fields |
| Prompt injection via private intel or trigger notes | Tampering | Low risk since synthesis prompt is server-constructed; user content is data, not instructions. No mitigation needed beyond standard prompt structure. |
| Oversized request body | Denial of Service | Existing `MAX_BODY = 1MB` limit in `readBody()` [VERIFIED: server.js line 77] |

## Sources

### Primary (HIGH confidence)
- `db.js` -- Full migration pattern, query helper patterns, all 3 existing migration blocks inspected
- `server.js` -- All API route patterns, AI proxy pattern (contact generate lines 276-354, debrief lines 580-718), body parsing, validation
- `index.html` -- Tab system (lines 806-889), inline form pattern (lines 1756-1773), badge CSS (lines 419-428, 535-541), escapeHtml (line 713), activity timeline rendering (lines 1799-1835)
- `.planning/phases/04-pursuit-strategy/04-CONTEXT.md` -- All 24 locked decisions

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` -- Phase 4 success criteria and dependency chain
- `.planning/REQUIREMENTS.md` -- STRT-01 through STRT-04 definitions

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns verified in existing codebase
- Architecture: HIGH -- every pattern (migration, routes, tabs, forms, AI proxy) has exact precedent in Phases 1-3
- Pitfalls: HIGH -- identified through direct code inspection (CHECK constraint, UNIQUE constraint, token limits)

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable -- no external dependencies changing)
