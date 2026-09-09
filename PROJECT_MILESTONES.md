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

## Drift flag, live as of 2026-09-09
M3 was marked DONE earlier today on checksum verification alone, then reopened the
same day when a real Test A submission proved the underlying defect is still live —
the deployed code matched what was intended to ship, but that code doesn't actually
close the bug in real conditions. This is exactly why this doc's governance rule
requires a real artifact, not a summary: a checksum match confirms deployment, not
correctness. See M3 below. M10 (launch-gate cycle counting) is blocked again until a
real fix ships.

Prior drift flag (M3 built-but-unmerged while M4/M5/M6 proceeded) was resolved earlier
2026-09-09 by merging PR #32 — that specific drift is not the current issue.

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

## Milestones in progress or blocked

### M3 — EEV2-008/009 fix (citation truncation + cross-row label bleed)
**State: REOPENED 2026-09-09 — deployed correctly, but does not close the real defect.**
Was marked DONE earlier the same day on checksum verification alone (merged via PR #32,
`clasp push` run, live checksum `6c6ef5dbf26c9121849388453dde52e4` matched `main`'s
`apps-script/Code.gs`, confirmed three independent ways). **That checksum match was
real and remains true — the code that was intended to ship did ship.** What it did not
confirm: whether that code actually closes the bug in real conditions. It does not.

A real Test A submission the same day (job `form-20260909-072421-33a43b52`, the 9-file
Procurement_* set, submitted from `bhagat.taran@gmail.com`) was **sent, not held** —
`amount_inr=3670.55` (`INR 3,671`), the exact AAC Blocks unit-rate figure EEV2-009 was
built to stop, shipped as `LEAKAGE_AND_OVERRUN`. Root cause: EEV2-009's row-boundary
guard narrows `boardroomTriggerOwnedAmount`'s label window only when a newline (`\n`)
is present in the citation text. Real Gemini OCR extraction for this document contains
no newlines at all — the guard is a no-op in production. The EEV2-008/009 regression
suite's own fixture used `\n\n` between table rows, a formatting choice made when
building the test, not copied from a real extraction artifact — so the suite passed
(16/16, still true) while the real-world case it represented was never actually
covered. Full root-cause and two candidate fix approaches (neither built yet, pending
review) in `EEV2_011_ROW_BOUNDARY_PROPOSAL_20260909.md`.

**Acceptance criteria for DONE, restated:** a fix chosen and built against the real
`form-20260909-072421-33a43b52` citation text (not a reconstructed fixture), verified
offline, merged, pushed, AND a fresh real Test A submission correctly held under the
new code — checksum match alone is not sufficient, per this doc's own governance rule.

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
**State: BLOCKED — second real cycle attempted 2026-09-09, Test A FAILED again. Still
0 of 3 consecutive clean cycles, not 1.**

**First attempt** — job `form-20260909-072421-33a43b52` (real 9-file Procurement_* set)
was sent, not held. Root cause was EEV2-009's no-op newline row-boundary guard — see M3
above. Fixed by EEV2-012 (merged `4201e86`, PR #36): OCR column-join veto, verified
against this job's own real `quoted_span`.

**Second attempt** — job `form-20260909-165508-4076a2ce` (same 9-file Procurement_* set,
submitted after EEV2-012 shipped). **EEV2-012 confirmed working live**: the specific
fabricated figure it targets came back `INR 0`, no fabrication — the row-boundary /
OCR-column-join defect is closed for this document. **Test A still failed overall**,
for a separate, still-open reason: the Procurement_* set is documented (per
`validation-layer-audit-20260902.md`, a Drive doc not present in this repo — not
independently re-verified here beyond what that doc is understood to specify) as a
MUST-BLOCK submission in its own right, regardless of any single figure's correctness.
No code in `apps-script/` implements that whole-submission gate — confirmed by search,
zero hits for any Procurement_*-set-level block/reject mechanism. EEV2-004 through
EEV2-012 have only ever fixed per-figure attribution bugs; none of them touch this
separate, still-missing gate. So a submission with zero fabricated figures can still be
exactly the submission that must never send, and today it isn't stopped.

**Four-artifact status (Contract 1) for `form-20260909-165508-4076a2ce`: NOT run this
session.** `eev2AuditJob(jobId)` exists (`EEV2AuditJob.gs`, on `main`) specifically to
get this from a real function call instead of inferring it from the email alone, but
neither of its two documented paths was available here: the Apps Script editor path
(PLAN_01) needs an interactive, logged-in browser session this tool doesn't have, and
running it via `clasp run` from this desktop Claude Code session would cross the exact
tool-boundary `multi-tool-workflow.md` (added in this same PR) exists to prevent —
`clasp run`/`clasp push` belong to Termux, not desktop Claude Code, even where `clasp`
happens to be installed and authenticated locally. Still needs to be run for real,
from Termux or the Apps Script editor, against this job id.

**Blocked on EEV2-013** (`eev2-013-missing-must-block-gate-20260909.md`) — the missing
whole-submission MUST-BLOCK gate identified above now has a founder decision and a
diff, **not yet merged, pending review**:

**Decision (founder, 2026-09-09): Option A.** If every finding in a report is
narrative-only — no finding has complete, verified evidence — hold the report
entirely instead of emailing it with caveats. Permanent behavior change for every
future submission, not scoped to the Procurement_* set: a genuine first-time client
submission whose every finding is narrative-only will also be held under this rule.

Implemented as CHECK 8 in `validateReportOutput` (`apps-script/Code.gs`). "Verified"
means `evidence_quality` is `STRUCTURED_ACTUAL_BUDGET`, `CITED_AMOUNT`, or
`CITED_DAYS` — narrowed further to `STRUCTURED_ACTUAL_BUDGET` alone in an early draft,
but that broke five distinct, pre-existing, deliberately-designed single-finding
regression tests across three suites (EEV2-005, EEV2-007, EEV2-008), all asserting a
lone, correctly-verified `CITED_AMOUNT` finding must still pass — widened to match the
codebase's own established position instead of silently reversing it.

Verified against three real jobs, not synthetic data: job
`form-20260909-165508-4076a2ce` (second real attempt, all 9 findings narrative-only)
is correctly held; job `form-20260902-065743-34adf820` (real GOOD/BAD/NORMAL reference
set with 3 genuine `STRUCTURED_ACTUAL_BUDGET` findings, itself carrying an unrelated
open evidence-gap item and legitimately sent) is correctly NOT held — the adversarial
counter-example proving the gate keys off per-finding evidence, not the document-level
`evidence_status` field (which would have wrongly held that legitimate job too). Job
`form-20260909-072421-33a43b52` (first, pre-EEV2-012 attempt) is deliberately **not**
re-caught by this check alone — its one fabricated `CITED_AMOUNT` finding is
mechanically indistinguishable from a legitimate one at this layer; that specific
fabrication path is EEV2-012's closed problem, not this gate's. Full harness 18/18
(new suite `EEV2MustBlockGateRegression.gs`, EEV2-013), `check:fixtures` unaffected
(same 7 pre-existing violations, zero new).

**Not run this session:** `eev2AuditJob`'s four-artifact status for either real job —
same tool-boundary limitation as before.

**Acceptance criteria for DONE:** the EEV2-013 diff reviewed and merged; Test A
(9-file Procurement_*, must-block **as a whole submission**) and Test B (delay-only
CSV, must-pass) both run cleanly 3 consecutive times under the merged code.

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
