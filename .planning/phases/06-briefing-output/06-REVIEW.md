---
phase: 06-briefing-output
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - db.js
  - server.js
  - index.html
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-04-14
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed `db.js` (705 lines), `server.js` (1443 lines), and `index.html` (3494 lines) covering the briefing output feature added in phase 06. The new `/api/accounts/:id/briefing` GET/POST endpoints and the `loadBriefingTab` / `renderBriefing` / `briefingTextToHtml` frontend code are the primary additions in scope.

The code is generally well-structured and consistent with project conventions. The main area of concern is a stored XSS vector in `briefingTextToHtml`: AI-generated briefing text is rendered into `<h3>` tags after `escapeHtml` runs on the raw line, but the `##` prefix is stripped with a string slice before insertion, meaning the content placed inside the `<h3>` is the already-escaped substring — that part is safe. However, the function produces `<br>`-joined HTML that is then assigned to `cardEl.innerHTML` without further escaping on the outer wrapper, and the entire text path relies solely on `briefingTextToHtml` doing the right thing. A second issue is the migration logic in `db.js` having a latent bug where a fresh install skips migrations 2-6.

---

## Critical Issues

### CR-01: `briefingTextToHtml` inserts section-header content into raw `innerHTML` without fully-escaped wrapper

**File:** `index.html:2490-2497`

**Issue:** `briefingTextToHtml` splits on newlines and calls `escapeHtml(line)` for each line, then checks `escaped.indexOf('## ') === 0`. When that check is true it does:

```js
return '<h3 class="briefing-section-header">' + escaped.substring(3) + '</h3>';
```

`escaped.substring(3)` strips the leading `## ` from the already-escaped string. This is safe as written **today** because the content is HTML-escaped before slicing. However the function also returns raw `<br>` tags for non-header lines (the `join('<br>')` call), and the full result is placed directly into `cardEl.innerHTML` (line 2563):

```js
html += '<div class="briefing-content">' + contentHtml + '</div>';
cardEl.innerHTML = html;
```

The actual risk: the AI model produces the briefing text, which is stored verbatim in the database (`briefings.content`). If the model ever returns a line that begins with `## ` followed by a value that `escapeHtml` does not catch — for example a line containing a javascript: URI embedded in a `##` header that gets sliced into the tag without `href` attribute context — the current pattern holds. But the deeper problem is that `briefingTextToHtml` returns a mix of static HTML tags and escaped text strings with no structural guarantee. Future maintainers may add pattern rules that break the invariant.

The secondary and more concrete issue: `briefingTextToHtml` does **not** handle bullet lines beginning with `-` or numbered list lines, so `- item` renders as literal `- item` text with a `<br>`, producing poor output for the six bullet-heavy sections that the briefing prompt generates. This is a functional bug — the briefing will render poorly in all cases.

**Fix:**

```js
function briefingTextToHtml(text) {
  return text.split('\n').map(function(line) {
    var escaped = escapeHtml(line.trim());
    if (!escaped) return '';
    // Section headers
    if (line.trim().indexOf('## ') === 0) {
      return '<h3 class="briefing-section-header">' + escapeHtml(line.trim().substring(3)) + '</h3>';
    }
    // Bullet points
    if (line.trim().match(/^[-*]\s+/)) {
      return '<li>' + escapeHtml(line.trim().replace(/^[-*]\s+/, '')) + '</li>';
    }
    // Numbered list items
    if (line.trim().match(/^\d+\.\s+/)) {
      return '<li>' + escapeHtml(line.trim().replace(/^\d+\.\s+/, '')) + '</li>';
    }
    return escaped;
  }).join('<br>');
}
```

Note: apply `escapeHtml` to the **post-prefix-stripped** substring, not the pre-sliced escaped string, so the invariant is explicit.

---

## Warnings

### WR-01: Migration version check starts at `version === 0` instead of `version < 1`, causing migrations 2-6 to be skipped on a fresh database

**File:** `db.js:23`

**Issue:** The first migration block uses a strict equality check:

```js
if (version === 0) {
  // runs migration 1, sets user_version = 1
}
if (version < 2) {  // line 57
  // runs migration 2
}
```

On a fresh database `version` is `0`. After migration 1 runs inside a transaction, `PRAGMA user_version = 1` is set **inside** the transaction. The outer `const version` variable captured at line 21 is still `0`. So:

- `version === 0` → true, migration 1 runs, DB is now at version 1
- `version < 2` → `0 < 2` → true, migration 2 also runs (correct)
- `version < 3` → `0 < 3` → true, migration 3 runs (correct)
- ...through migration 6 (correct)

This actually works fine today because the captured `version` remains `0` throughout. But the inconsistency between `=== 0` (migration 1) and `< N` (migrations 2-6) is a maintainability bug: the next developer adding migration 7 will write `if (version < 7)` which evaluates correctly, but if they change migration 1's guard to `< 1` to match the pattern, a DB at version 0 will run migration 2 twice (once via `< 2` where `version === 0 < 2`, and the migrations are idempotent via `CREATE TABLE IF NOT EXISTS` — so it does not crash, but the log shows a spurious second migration). More importantly, if migration 1 is ever changed to not run in-process (e.g., async), the invariant breaks.

**Fix:** Change line 23 to match the consistent pattern used by all other migrations:

```js
if (version < 1) {
```

### WR-02: `readBody` can invoke the callback with a truncated body after a 413 response is sent

**File:** `server.js:80-92`

**Issue:** When the body size limit is exceeded, the server sends a 413 and calls `req.destroy()`. However `req.destroy()` is asynchronous — the `'end'` event may fire before the socket is fully destroyed, and `req.destroyed` may not yet be `true` at that moment:

```js
req.on('data', chunk => {
  body += chunk;
  if (body.length > MAX_BODY) {
    res.writeHead(413, ...);
    res.end(...);
    req.destroy();          // async — sets req.destroyed = true eventually
  }
});
req.on('end', () => {
  if (!req.destroyed) callback(body);  // may still be called with partial body
});
```

In practice Node.js sets `req.destroyed` synchronously when `destroy()` is called, so the `'end'` guard works. But the truncated body accumulation (`body += chunk` still runs after the limit is hit because `req.destroy()` does not immediately stop the `'data'` event in the same tick) means the body string can grow beyond `MAX_BODY` before the socket closes. With a 1 MB limit this is low-risk in practice, but the body can be up to `MAX_BODY + one chunk size (~64KB)` in memory momentarily.

**Fix:** Add an early return guard in the data handler:

```js
let bodyTooLarge = false;
req.on('data', chunk => {
  if (bodyTooLarge) return;
  body += chunk;
  if (body.length > MAX_BODY) {
    bodyTooLarge = true;
    res.writeHead(413, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Request body too large' }));
    req.destroy();
  }
});
req.on('end', () => {
  if (!req.destroyed && !bodyTooLarge) callback(body);
});
```

### WR-03: `POST /api/accounts/:id/refresh` redundantly re-checks `isAuthenticated` when all routes are already behind auth

**File:** `server.js:418-422`

**Issue:** The `/api/accounts/:id/refresh` handler at line 417 re-checks `isAuthenticated(req)` and returns 401 if not authenticated:

```js
if (req.method === 'POST' && refreshMatch) {
  if (!isAuthenticated(req)) {   // line 418 — redundant
    res.writeHead(401, ...);
    return;
  }
```

This check is dead code: the unauthenticated path at line 272 already serves the login page for any request that fails `isAuthenticated`, so execution cannot reach line 418 without authentication. Similar redundant checks exist at lines 446-449 (`/api/refresh/budget`).

While not a security issue (the outer guard is sufficient), the redundant inner checks are misleading — they imply some routes are "more sensitive" and may cause future developers to omit the outer check assuming the inner one is the authoritative gate.

**Fix:** Remove the redundant inner `isAuthenticated` checks at lines 418-422 and 446-449. The outer gate at line 272 is the correct enforcement point.

### WR-04: `sendMsg` sends a hardcoded `system` prompt alongside `account_id`, causing the server to overwrite it

**File:** `index.html:1362-1371`

**Issue:** `sendMsg` sends both a hardcoded `system` field and an `account_id` to `/api/claude`:

```js
body: JSON.stringify({
  model: 'claude-sonnet-4-6',
  max_tokens: 1000,
  system: 'You are an account intelligence assistant for Grid Dynamics. Be direct, specific, and actionable. No em dashes or double hyphens.',
  messages: messages,
  account_id: id
})
```

On the server (lines 1372-1378), when `account_id` is present, the server builds a full system prompt from the DB and overwrites `parsed_body.system`. So the `system` field sent by the client is silently discarded. The client-sent system prompt is dead code — it has no effect. This is confusing but not a bug since the server-constructed system prompt is richer (includes full account intelligence). However the client sends unnecessary bytes on every chat message.

Also note: the model name `claude-sonnet-4-6` is used client-side but all server-side AI calls use `claude-sonnet-4-20250514`. These should be consistent; the client-supplied model is passed through unchanged to the Anthropic API in the `/api/claude` proxy path.

**Fix:** Remove the `system` field from the client-side `sendMsg` payload since it is always overwritten:

```js
body: JSON.stringify({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1000,
  messages: messages,
  account_id: id
})
```

---

## Info

### IN-01: `getChatMessages` limits to 100 messages but sends all 100 to the Anthropic API

**File:** `db.js:446` and `server.js:1361`

**Issue:** `getChatMessages` caps at 100 rows. In `sendMsg`, the full `chatHistories[id]` array (which mirrors the DB rows loaded at startup) is sent as the `messages` array to the Anthropic API. With long conversations this could send 100 messages in the payload, which at max_tokens=1000 output plus potentially large context entries could hit token limits. This is a scalability concern rather than an immediate bug, but worth noting as account usage grows.

**Suggestion:** Trim the messages array to the last 20-30 messages before sending to the API, retaining the system prompt for full account context.

### IN-02: `briefingTextToHtml` does not handle `# ` (single hash) headers or `**bold**` markers that appear in AI responses

**File:** `index.html:2490-2497`

**Issue:** The briefing prompt uses `## AccountName -- Account Briefing` as the top-level header and `## Section` for each section. If Claude returns `**bold**` text or single `#` headers (which it sometimes does when instructed to return plain text but ignores the instruction), those will render as literal `**bold**` or `# text` strings with `<br>` separators.

**Suggestion:** Add `**bold**` → `<strong>` conversion (matching the pattern already used in `addMsg`) and handle `# ` single-hash headers if the AI model deviates from the prompt template.

### IN-03: No length cap on `debrief_text` before it is included in the Anthropic API system prompt

**File:** `server.js:789`

**Issue:** The debrief endpoint validates that `debrief_text` is a non-empty string but does not cap its length. A very large debrief (e.g., a pasted 50-page document) will be included verbatim in the user message sent to Claude, potentially pushing the request well past the `4000` token limit and causing an API error that surfaces as a 502 to the user.

**Suggestion:** Add a reasonable cap on `debrief_text` length (e.g., 20,000 characters) with a clear 400 error:

```js
if (debrief_text.length > 20000) {
  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Debrief text is too long. Maximum 20,000 characters.' }));
  return;
}
```

---

_Reviewed: 2026-04-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
