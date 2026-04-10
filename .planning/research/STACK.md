# Technology Stack

**Project:** Grid Dynamics Pursuit Intelligence Hub — Milestone 2 Additions
**Researched:** 2026-04-10
**Scope:** Additions only — persistence, contact intelligence, AI-driven strategy, auto-refresh. Does not re-document the existing stack.

---

## Decision Framework

The existing project constraint is explicit: Dave values the zero-dependency, no-build-step approach. Every addition must justify its weight. The test for each library: "Can the existing built-in Node.js modules do this well enough?" Only add a dependency when the answer is clearly no.

---

## Recommended Stack

### Persistence Layer

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| `node:sqlite` (built-in) | Node.js 22 LTS | Account data, contacts, pursuit logs, chat history | MEDIUM |
| Railway Volume | N/A (platform feature) | Persistent file storage so SQLite survives deploys | HIGH |

**Why `node:sqlite` over `better-sqlite3`:**
`node:sqlite` is Node.js's built-in SQLite module, introduced in v22.5.0. As of early 2026 it has stability level 1.2 (Release Candidate — no longer behind an experimental flag on Node 22.13+). It requires zero npm dependencies and zero native compilation. `better-sqlite3` (v12.8.0) is a native module that requires `node-gyp` to compile C++ bindings at deploy time. Railway's Nixpacks builder has documented build failures with `better-sqlite3` due to native compilation issues. For this app — small dataset, single writer, internal team — `node:sqlite` is the correct choice.

**Why not `better-sqlite3`:** Native module compilation failures on Railway are a documented and active issue. Even when they succeed, they add build complexity that conflicts with the project's zero-dependency ethos. The synchronous API of `node:sqlite` is equivalent for this workload.

**Why not JSON files:** JSON-on-disk works for simple key/value persistence but breaks down for relational queries (contacts per account, logs ordered by date, strategy evolution history). SQLite handles all of this at zero additional cost.

**Railway Volume requirement:** Railway containers are ephemeral — the filesystem resets on every deploy. A SQLite file stored in the default container filesystem is wiped on each push. Railway Volumes (persistent storage) must be mounted at a defined path (e.g. `/data`) and the SQLite database file stored there. This is supported, documented, and in active use by Railway apps. Without this, all persistence is lost on every deploy.

**Schema design note (not a library, but load-bearing):** The SQLite database should use WAL (Write-Ahead Logging) mode for concurrent read access: `PRAGMA journal_mode=WAL`. This is a single SQL statement at startup — no library needed.

---

### AI — Structured Output for Contact Extraction

| Technology | Version/Header | Purpose | Confidence |
|------------|---------------|---------|------------|
| Anthropic API structured outputs | `output_config.format` (GA, no beta header required) | Extract contact profiles, strategy updates, debrief parsing as guaranteed JSON | HIGH |

**Why structured outputs:** When Claude parses a meeting debrief and must update a contact record or pursuit log, the output must be parseable JSON with required fields. Without structured outputs, you need retry logic and fallback JSON parsing. With them, the response is schema-guaranteed on the first try. The feature is now generally available (no beta header needed) for `claude-sonnet-4-6` (the model already in use).

**API shape (current):**
```javascript
// POST to /v1/messages — no special headers needed
{
  "model": "claude-sonnet-4-20250514",
  "output_config": {
    "format": {
      "type": "json_schema",
      "schema": {
        "type": "object",
        "properties": {
          "contact_name": { "type": "string" },
          "role": { "type": "string" },
          "influence_level": { "type": "string" },
          "key_insight": { "type": "string" }
        },
        "required": ["contact_name", "role", "influence_level"],
        "additionalProperties": false
      }
    }
  }
}
```

Note: The old `output_format` parameter and `structured-outputs-2025-11-13` beta header still work during a transition period but `output_config.format` is the current shape.

**Why not prompt-engineering JSON only:** Reliable but fragile. Claude occasionally adds prose before JSON, or omits required fields under context pressure. Structured outputs eliminate this class of bug without extra code.

---

### Auto-Refresh Intelligence (Web-Grounded AI)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Perplexity Sonar API | `sonar` model | Web-grounded account refresh: earnings, exec changes, tech signals | MEDIUM |

**Why Perplexity Sonar over Claude alone:** Claude's knowledge has a training cutoff. For auto-refreshing live signals (recent earnings, new executive hires, strategic announcements), the model needs current web access. Perplexity Sonar is a grounded LLM that searches the live web and returns source-attributed answers. It uses the OpenAI-compatible chat completions interface, so integration into the existing `/api/claude` pattern is minimal — just a different endpoint and API key.

**Why `sonar` not `sonar-pro`:** Pricing is $1/M input + $1/M output tokens for `sonar`. For periodic account refresh (13 accounts, quarterly or on-demand), cost is negligible. `sonar-pro` ($3/$15 per M tokens) is for complex multi-step research; overkill here.

**Why not the Perplexity Search API (launched Sept 2025):** The Search API returns raw ranked results at $5/1000 requests; you'd still need Claude to synthesize them into account intelligence. Sonar gives you the synthesis already done, with citations, in one call. Fewer moving parts.

**Integration pattern:** Add a new server endpoint `/api/refresh-account` that calls Perplexity Sonar with the account name + specific research questions, receives grounded answers, then persists the result via the SQLite layer. No new npm packages — the `https` built-in module handles the Perplexity API call identically to how it currently handles the Anthropic call.

**New environment variable required:** `PERPLEXITY_API_KEY` — add to Railway Variables.

---

### Scheduled Auto-Refresh

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| `node:timers` (built-in) | Built-in | In-process scheduling for periodic account refresh | HIGH |

**Why built-in timers over `node-cron` or `node-schedule`:** For this use case — trigger account refresh every N hours while the server is running — `setInterval` or a recursive `setTimeout` with drift correction is sufficient. `node-cron` adds a dependency for cron syntax that this app doesn't need. The schedule is simple: "refresh stale accounts once a day." No complex calendar logic required.

**Caveat:** In-process scheduling only works while the server is running. Railway keeps the server alive continuously (it's not serverless), so this is fine. Scheduled refreshes won't run during a deploy restart window (~30 seconds), which is acceptable.

**Anti-pattern to avoid:** Do not use Railway's cron job feature as a separate service — it would require a second Railway service and inter-service communication, adding infrastructure complexity.

---

### Data Export / Briefing View

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Node.js built-in `http` response | Built-in | Serve HTML briefing pages from server-rendered templates | HIGH |

**Why not a PDF library:** The briefing view is a shareable, printable HTML page — the browser's native print-to-PDF handles formatting without any server-side library. Adding `puppeteer` or `pdfkit` for a print-friendly page is massive overkill.

---

## What NOT to Add

| Rejected Option | Why Rejected |
|-----------------|-------------|
| `express` or `fastify` | The existing plain Node.js HTTP server handles routing fine; adding a framework for 4-5 routes is unnecessary complexity |
| `better-sqlite3` | Native compilation fails on Railway; `node:sqlite` is equivalent for this workload |
| `prisma` or `drizzle` ORM | ORMs add a build step and abstraction layer for a schema with ~5 tables; raw SQL with `node:sqlite` is clearer and simpler |
| `apollo.io` / `clearbit` API | Contact data APIs with per-seat or per-enrichment pricing; for 13 accounts with manually curated contacts, Perplexity Sonar + Claude extraction is sufficient |
| `node-cron` / `node-schedule` | Cron syntax unnecessary; `setInterval` covers the refresh scheduling requirement |
| Any React/Vue frontend framework | The existing vanilla JS SPA works; adding a frontend framework requires a build step and invalidates the no-build-step constraint |
| `dotenv` | Railway injects environment variables natively; `dotenv` is only needed for local `.env` files, and the project explicitly uses shell exports locally |

---

## Updated Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `ANTHROPIC_API_KEY` | Existing | Anthropic Claude API |
| `APP_PASSWORD` | Existing | Login auth |
| `PORT` | Existing (Railway auto-assigns) | HTTP server port |
| `PERPLEXITY_API_KEY` | New — add to Railway Variables | Perplexity Sonar API for web-grounded refresh |
| `DB_PATH` | New — set to `/data/intel.db` | SQLite database file path on Railway Volume |

---

## Deployment Changes Required

1. **Railway Volume:** Create a volume in Railway dashboard, mount at `/data`. Set `DB_PATH=/data/intel.db`. Without this, SQLite data is lost on every deploy.
2. **Node.js version pin:** Confirm Railway is using Node.js 22 LTS (for `node:sqlite`). Add `"engines": { "node": ">=22.13.0" }` to `package.json`.
3. **No other deployment changes** — the existing `railway.toml` and Nixpacks setup remain unchanged.

---

## Installation

No new npm packages are required. All additions use:
- `node:sqlite` — Node.js 22 built-in
- `node:https` — already used
- `node:timers` — built-in
- Anthropic API structured outputs — existing API, new parameter shape
- Perplexity Sonar — new API key, same `https` proxy pattern

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| `node:sqlite` as persistence layer | MEDIUM | Release candidate (stability 1.2), not fully stable, but no-flag-required on Node 22.13+; risk is API changes before GA |
| Railway Volume for SQLite persistence | HIGH | Documented Railway feature with active SQLite use cases |
| Anthropic structured outputs | HIGH | Generally available, verified against official docs |
| Perplexity Sonar for refresh | MEDIUM | API launched Sept 2025; pricing and models verified; integration pattern inferred from OpenAI-compatible interface |
| `setInterval` for scheduling | HIGH | Core Node.js, zero risk |
| Rejecting `better-sqlite3` | HIGH | Native module Railway failures documented in Railway Help Station |

---

## Sources

- Node.js sqlite docs (stability 1.2, no flag on 22.13+): https://nodejs.org/api/sqlite.html
- better-sqlite3 Railway build failures: https://station.railway.com/questions/i-can-t-get-my-railway-image-working-wit-ec67ee4d
- Railway Volumes for SQLite persistence: https://docs.railway.com/volumes
- Anthropic structured outputs (GA, current API shape): https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Perplexity Sonar API and pricing: https://docs.perplexity.ai/getting-started/models/models/sonar-pro
- node:sqlite vs better-sqlite3 community discussion: https://github.com/WiseLibs/better-sqlite3/discussions/1245
