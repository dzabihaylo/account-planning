---
phase: 5
slug: intelligence-refresh
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner or manual curl verification |
| **Config file** | none — no test framework currently installed |
| **Quick run command** | `node -e "require('./db')"` (DB module loads without error) |
| **Full suite command** | `curl -s http://localhost:3000/api/accounts \| node -e "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))"` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | REFR-01 | — | N/A | integration | TBD | TBD | ⬜ pending |
| TBD | TBD | TBD | REFR-02 | — | N/A | integration | TBD | TBD | ⬜ pending |
| TBD | TBD | TBD | REFR-03 | — | N/A | integration | TBD | TBD | ⬜ pending |
| TBD | TBD | TBD | REFR-04 | — | N/A | integration | TBD | TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — no test framework installation needed. Verification is via API calls and DB inspection.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auto-refresh fires on schedule | REFR-01 | Requires waiting for interval timer | Start server, wait for interval, check DB timestamps |
| Budget gate stops refresh | REFR-02 | Requires accumulating token usage | Run multiple refreshes, verify skip when budget exceeded |
| Staleness badge colors | REFR-03 | Visual UI check | Open account, verify badge color matches time thresholds |
| Manual refresh button | REFR-04 | UI interaction | Click refresh button, verify data updates |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
