---
name: project-milestones
description: Constrovet production-readiness milestones, established 2026-09-08 as the single source of truth for project state. Every PR/commit from this point forward should reference the milestone it advances. A milestone only moves to DONE when its stated acceptance criteria is independently verified against a real artifact (checksum, real regression run, real document test) — not when a session reports it as complete. Read this first in any new session to know real current state.
---

# Constrovet — Project Milestones

**Governance rule, effective 2026-09-08:** no milestone is marked DONE on a session's
own say-so. It moves to DONE only when its acceptance criteria has been independently
verified against a real artifact — a checksum match, a real regression run's raw output,
a real document test result. A summary claiming success is not verification. This
mirrors the standard already used throughout this project's history (EEV2-004, EEV2-008,
EEV2-009 were each independently re-verified before being trusted) — this doc makes it
a formal, permanent requirement rather than something re-decided each session.

## Drift flag — RESOLVED 2026-09-09
Was: M3 (the actual production-safety fix) built and verified but left unmerged while
lower-priority work (M4, M5, M6) proceeded and merged instead. Resolved: M3 merged
(PR #32), pushed live, and checksum-verified — see M3 below. No longer blocking.

## Milestones completed

### M1 — Mobile-first operating structure
**State: DONE**, verified via a real phone → Claude Code cloud → branch → PR → CI cycle.
No self-running agent; Claude Code cloud sessions as default; `clasp push` manual,
device-agnostic; client feedback via direct email; CI on push (`eev2-harness-ci.yml`,
path-filtered to `apps-script/**`).

### M2 — Production status audit
**State: DONE**, verified by checksum. EEV2-004 (ownership fix) and CHECK 5e are live in
production, matching the repo's `Code.gs` exactly (md5 `c7d231e96249dbfb5a0201f81d26214f`
confirmed both sides, 2026-09-08). Prior docs claiming these were undeployed were stale
and have been superseded by this finding.

### M4 — Canary roadmap redefined
**State: DONE**, merged (PR #21). Traffic-percentage framing (assumed live client
traffic that doesn't exist) replaced with phases built around real test-coverage gaps.

### M6 — Auto-push trust plan
**State: DONE**, merged. Phase A/B structure, N=5 consecutive matching cycles, permanent
circuit breaker. Founder chose Path A (`clasp run` executed personally from Termux, not
a stored CI credential) over Path B for the audit mechanism specifically.

### M3 — EEV2-008/009 fix (citation truncation + cross-row label bleed)
**State: DONE**, verified by checksum. Merged to `main` via PR #32 (cherry-picked from
`claude/eev2-008-citation-truncation-fix` commit `c0ba15d` onto current `main`, since
that branch had gone stale behind everything merged since — a raw `git merge` would
have deleted PROJECT_MILESTONES.md, the auto-push trust plan, EEV2-010, and
`EEV2AuditJob.gs`). `clasp push` run by the founder. Live checksum
`6c6ef5dbf26c9121849388453dde52e4` matches `main`'s `apps-script/Code.gs` — confirmed
three ways: the founder's own check from his Ubuntu machine, an independent fresh
`clasp pull` run in the same session that opened PR #32, and the repo's tracked file —
all three agree exactly (2026-09-09). This closes a real path by which a mislabeled
currency figure could reach a client report: the new suite's own `SEVERITY` check
proved that, pre-fix, the exact real mislabeled finding passed `validateReportOutput`
with `isValid=true` — a fabricated leakage figure would have shipped.

### M5 — EEV2-010 (currency symbol encoding)
**State: DOCUMENTED, ROOT QUESTION UNRESOLVED.** Doc merged (PR #22), but the load-bearing
unknown — whether Gemini's real extraction path produces the same `■` substitution as
Drive's `read_file_content` tool did — has not been tested.
**Acceptance criteria for DONE:** `M01_MonthlySummary.pdf` or `M01_IPC.pdf` run through
the real intake pipeline; Gemini's actual extracted text inspected for the same artifact.

### M7 — `eev2AuditJob` (Contract 1 audit function)
**State: BUILT, NOT MERGED, NOT LIVE-TESTED.** PR #23 (`feat/eev2-audit-job-contract1`),
16/16 and 26/26 locally. Blocked on confirming the Apps Script project has an
API-executable deployment (separate from the existing Web App deployment).
**Acceptance criteria for DONE:** merged; `clasp run eev2AuditJob` executed for real by
the founder from Termux against a real job ID; verdict matches manual inspection.

## Milestones not yet started

### M8 — Phase 2 gap #1: large/dense document
**State: OPEN, no real fixture exists.** Confirmed via the `national_Highway_PROJ`
corpus — every candidate file produces at most 1 evidence window, nowhere near the
40-match cap.
**Acceptance criteria for DONE:** a real submission (single document or combined batch)
genuinely exceeds 40 evidence matches and is handled correctly.

### M9 — Phase 2 gap #2: scanned/image PDF
**State: OPEN, no real fixture exists anywhere in Drive.**
**Acceptance criteria for DONE:** a real scanned document sourced and tested; OCR-path
behavior confirmed.

### M10 — Launch gate: consecutive clean Test A/B runs
**State: IN PROGRESS — M3 shipped 2026-09-09, cycle counting starts now.**
**Acceptance criteria for DONE:** Test A (9-file Procurement, must-block) and Test B
(delay-only CSV, must-pass) both run cleanly several consecutive times under
post-M3 code.

### M11 — Auto-push trust count
**State: 0 of 5 cycles logged.** Cannot start meaningfully until M7 is live.
**Acceptance criteria for DONE:** `AUTO_PUSH_TRUST_LOG.md` shows 5 consecutive cycles
where the automated verdict matched the real outcome.

### M12 — First real pilot client
**State: NOT STARTED.** Depends on M8–M10 being closed or explicitly accepted open by
the founder.

## Resolved, no longer tracked
- PR #17 — confirmed merged (`e4fc9c5`) prior to this doc; earlier "parked" note is stale.

## Compliance rule going forward
Every PR description should name the milestone ID it advances (e.g. "Advances M3").
Every session summary claiming a milestone moved to DONE must include the actual
verification command output it ran, not a restated claim from a prior session.
