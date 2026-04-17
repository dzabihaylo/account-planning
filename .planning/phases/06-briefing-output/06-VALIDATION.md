---
phase: 6
slug: briefing-output
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner / manual browser verification |
| **Config file** | none — no test framework installed |
| **Quick run command** | `node -e "require('./db')"` |
| **Full suite command** | `node server.js & sleep 2 && curl -s http://localhost:3000/ | head -1` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node -e "require('./db')"`
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | BREF-01 | — | N/A | integration | `grep "briefings" db.js` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | BREF-01 | — | escapeHtml on AI content | integration | `grep "briefing" server.js` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | BREF-01 | — | N/A | manual | Browser: open Briefing tab | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | BREF-02 | — | N/A | manual | Browser: Ctrl+P on Briefing tab | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework to install — verification is via grep, curl, and manual browser testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Briefing renders in tab | BREF-01 | Visual output | Open any account, click Briefing tab, verify AI content renders |
| Print layout is clean | BREF-02 | Print CSS | Click Print button, verify PDF preview shows clean one-pager |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
