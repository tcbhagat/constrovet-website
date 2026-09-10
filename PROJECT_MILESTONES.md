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

## Deployed vs. main — check this FIRST, update on every deploy

This block exists because its absence is what allowed M3's false-DONE: the repo
and the live script can agree perfectly while the live script still fails in real
conditions, and nobody could see at a glance which of those two things was being
claimed.

| | Value |
|---|---|
| `main` `apps-script/Code.gs` md5 | `282d2e972aa29d20e63b939e1e2bb081` |
| **Live** `Code.js` md5 | `282d2e972aa29d20e63b939e1e2bb081` |
| Status | **MATCH** — verified 2026-09-10 by fresh `clasp pull` into a throwaway folder, then confirmed again after merging `fix/eev2-016-global-limit-form-path` (`d8f55c4`) into `main` the same day |
| Merged but NOT deployed | *(none)* |
| Web app deployment | **ARCHIVED** — un-published 2026-09-10 pending EEV2-014 verification |

All 42 `.gs` files and `appsscript.json` match live byte-for-byte. Live carries
EEV2-012 (`BOARDROOM_OCR_COLUMN_JOIN`), EEV2-013 (CHECK 8 /
`NO_VERIFIED_EVIDENCE`), EEV2-014 (the global spend/abuse caps), and EEV2-016
(the same global daily job cap also enforced on the form-trigger path — was
live and unmerged from 07:42Z to 16:13Z 2026-09-10; see the drift flag below).

**Read the governance rule before trusting this table.** A checksum match proves
*deployment*, not *correctness*. EEV2-014's caps are live as bytes but remain
**unexercised against a real request** — no POST past the limit has yet been
observed being refused. Do not record that as verified until it is.

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

## Drift flag, resolved 2026-09-10 (EEV2-016)

Between 2026-09-10T07:42:47Z and 16:13:47+05:30 (≈8.5 hours), the live script ran
code (`Code.gs`, `EEV2FullRegressionGate.gs`, new
`EEV2GlobalDailyLimitFormPathRegression.gs`) that had been pushed to Apps Script
directly from the unmerged branch `fix/eev2-016-global-limit-form-path`
(`6479ff2`), while `main` and this doc's checksum table still recorded the
pre-EEV2-016 hash. During that window the "Deployed vs. main" table above was
false. Two real Test A jobs exercised the fix live before the branch was merged.
Resolved by merging `fix/eev2-016-global-limit-form-path` into `main` (`d8f55c4`,
merge commit, no conflicts) and re-verifying the checksum table above against a
fresh `clasp pull`. `npm test` (33/33) and `npm run check:fixtures` (OK, 23 files)
both pass on the merged `main`.

Separately, a same-day code trace (not yet a merged fix) found that
`onCorrectionFormSubmit` rebuilds and emails a report without ever calling
`validateReportOutput` — a client's own correction-form submission could bypass
the gate if that trigger were installed. **Checked directly in the Apps Script
Triggers UI, 2026-09-10: only one trigger exists, `onFormSubmit`. No
`onCorrectionFormSubmit` trigger is installed.** So this bypass exists as R1
(code exists) but is confirmed **not live** (no trigger fires it). Tracked as
M15 below; not urgent, but should be fixed before any correction-form trigger
is ever installed.

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
**State: EEV2-012 FIX CONFIRMED LIVE; M3's own acceptance criteria still open pending a
fresh whole-submission run.** This section previously read "REOPENED — deployed
correctly, but does not close the real defect," describing the state on 2026-09-09
*before* EEV2-012 existed. That framing is now stale — updated 2026-09-10 to reflect
what has happened since, not to silently mark this DONE.

**History:** was marked DONE on 2026-09-09 on checksum verification alone (merged via PR
#32, `clasp push` run, live checksum matched `main`'s `apps-script/Code.gs`), then
reopened the same day when a real Test A submission (job
`form-20260909-072421-33a43b52`) shipped the exact fabricated AAC Blocks unit-rate
figure (`amount_inr=3670.55`, `INR 3,671`) EEV2-009's row-boundary guard was supposed to
stop. Root cause: that guard only narrows `boardroomTriggerOwnedAmount`'s label window
when a newline is present; real Gemini OCR extraction contains no newlines at all, so
the guard was a no-op in production, and the EEV2-008/009 regression suite's own `\n\n`
fixture never actually exercised the real-world shape. Full root-cause in
`EEV2_011_ROW_BOUNDARY_PROPOSAL_20260909.md`.

**What has since changed, real evidence:** EEV2-012 (merged `4201e86`, PR #36) replaced
the newline guard with an OCR-column-join veto, built and verified against this exact
job's own real `quoted_span`. A **second** real Test A submission (job
`form-20260909-165508-4076a2ce`, same 9-file Procurement_* set, submitted after
EEV2-012 shipped) confirmed it working live: the specific fabricated figure EEV2-012
targets came back `INR 0` — no fabrication. **This specific defect (fabricated per-
figure attribution via the row-boundary/newline gap) is closed and live-verified.**

**Why this is not DONE yet:** that same second attempt still failed Test A **overall**,
for a separate, unrelated reason — the missing whole-submission MUST-BLOCK gate (see
M10), now closed by EEV2-013. No fresh real Test A submission has been run since
EEV2-013 shipped to confirm the *whole* submission is correctly held under all current
code together. M3's acceptance criteria was written as "a fresh real Test A submission
correctly held under the new code" — that specific proof, at the whole-submission level,
is M10's job to produce (the next clean-cycle attempt), not a fact M3 can claim on its
own. Do not mark M3 DONE from this section alone; watch M10's next real cycle instead.

**Acceptance criteria for DONE, restated:** the specific citation-truncation/row-
boundary defect fix, verified offline and against two real jobs (done, above) — AND a
fresh real Test A submission, run under all currently-merged fixes together, that comes
back correctly held for the whole submission, not just this one figure. Checksum match
alone is not sufficient, per this doc's own governance rule.

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
diff. **MERGED 2026-09-09 as `9c868df` (committed directly to `main`, not via PR) and
DEPLOYED 2026-09-10 — checksum-verified live.** (This line previously read "not yet
merged, pending review", which contradicted `SESSION_LOG.md`; `git log` settled it.):

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
**State: NOT STARTED.** Depends on M10 closing. **Founder decision 2026-09-10 on the
launch bar:** Contract 4 is held **exactly as written** — no client is onboarded until
Test A passes cleanly on 3 consecutive fresh runs, not once. **M8 (large/dense document)
and M9 (scanned/image PDF) are ACCEPTED-OPEN**, not blockers: no real fixture exists in
Drive for either, and manufacturing one is not a good use of the pre-launch window.
They are to be disclosed to the pilot client as known-untested paths, with scanned/image
PDFs declared out of scope for v1.

### M13 — Endpoint security (EEV2-014)
**State: DEPLOYED 2026-09-10, NOT YET EXERCISED.** Found during the pre-launch audit and
not previously tracked: the web app deploys as `access: ANYONE_ANONYMOUS` +
`executeAs: USER_DEPLOYING`, and the only limit — `enforceRateLimit()` — keyed on
`payload.email`, a caller-supplied field, so it was bypassed by changing one string.
`runGeminiVerifier`'s paid `gemini-2.5-pro` call had no cap at all. `GEMINI_DAILY_CALL_LIMIT`
did not mitigate this: it gates only the `gemini-2.5-flash` relevance path, and that gate
is off by default.

Fixed by two global, date-keyed daily budgets that read no caller-supplied field
(PR #38, `0b2a8ff`): the job cap runs before any Drive folder is created, the verifier cap
before the paid fetch, both under a fail-closed `LockService` lock. Deployment was
archived on discovery and remains archived.

**Acceptance criteria for DONE:** web app republished, AND a real POST past the cap
observed to refuse with **no Drive folder created and no Gemini call made**. A checksum
match is explicitly not sufficient — see the Deployed vs. main block.

### M14 — CI observability (EEV2-015)
**State: DONE 2026-09-10**, verified on a live CI run. `eev2-harness-ci.yml` was a single
fail-fast job with `check:fixtures` first, so one unrelated fixture violation silently
skipped the harness and both test suites — confirmed across four consecutive commits on
`main` (`580e779` → `0b2a8ff`), a window in which **EEV2-012 and EEV2-013 both merged
without CI ever running their regression suites**. Fixed with `if: always()` on each
independent step (PR #40, `999d2a3`); all four now report independently while the job
still fails if any fail. See `eev2-015-ci-fail-fast-masking-20260910.md`.

Related, closed the same day: Phase 4 tier-1 fixture-provenance cleanup (PR #39,
`ff07d3b`) replaced the Drive-shaped `\n\n` fixture at
`EEV2CitationTruncationRegression.gs:65` with the real Gemini `quoted_span` from job
`form-20260909-072421-33a43b52`. Fixture violations **7 → 0**, fixed rather than silenced
with a `KNOWN-SYNTHETIC` marker it did not deserve.

### M16 — Global daily job cap on the form-trigger path (EEV2-016)
**State: DONE 2026-09-10**, merged (`d8f55c4`) and confirmed live-deployed via checksum
(see "Deployed vs. main" above and the drift flag). `enforceGlobalDailyJobLimit()` was
called on the anonymous-endpoint (`doPost`) path but missing from the form-trigger path,
so a form submission never hit `GLOBAL_DAILY_JOB_LIMIT` regardless of setting. Fix adds
the same call at the same "before any Drive folder is created" point, before
`prepareJobFolders()`. Regression suite `EEV2GlobalDailyLimitFormPathRegression.gs`
registered in the gate. Live-exercised by two real Test A jobs before the branch was
merged (see drift flag above for the deployed-before-merged timeline).

### M15 — Correction-form report path bypasses the validation gate (EEV2-017, proposed)
**State: NOT STARTED.** Found by code trace 2026-09-10: `onCorrectionFormSubmit` in
`apps-script/Code.gs` rebuilds and emails a report on client-submitted correction
evidence without ever calling `validateReportOutput`. Confirmed **not currently live** —
the Apps Script Triggers UI shows only `onFormSubmit` installed, no
`onCorrectionFormSubmit` row (checked directly by the founder, 2026-09-10). Also found:
the manual `resendBoardroomReport` / `resendLatestBoardroomReportSmallThenFull` family
reloads and emails `final-report.json` with no gate check — reachable today, but only by
a founder manually invoking the function, not by any automated or client-facing path.
Two fix options proposed (in an unmerged patch set, not yet in this repo — `work/M15.md`
does not exist on `main` as of this writing): (A) one gate inside `sendReportEmail`
covering every current and future sender — recommended, single choke point; (B) gate each
caller individually. Needs founder decision + written approval before any `apps-script/`
write, per this repo's founder-only production-mutation rule.
Not urgent while the trigger stays uninstalled, but should close before
`onCorrectionFormSubmit` is ever wired up live.

## Resolved, no longer tracked
- PR #17 — confirmed merged (`e4fc9c5`) prior to this doc; earlier "parked" note is stale.

## Compliance rule going forward
Every PR description should name the milestone ID it advances (e.g. "Advances M3").
Every session summary claiming a milestone moved to DONE must include the actual
verification command output it ran, not a restated claim from a prior session.
