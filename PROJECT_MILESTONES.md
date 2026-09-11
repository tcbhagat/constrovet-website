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
| `main` `apps-script/Code.gs` md5 | `daad4bef6424c22cc07059c6c74aa6b0` |
| **Live** `Code.js` md5 | `daad4bef6424c22cc07059c6c74aa6b0` |
| Status | **MATCH** — verified 2026-09-11 by fresh `clasp pull` into a throwaway folder immediately after `clasp push` (founder-run), zero drift across all 43 `.gs` files, `appsscript.json` byte-identical to `main` |
| Merged but NOT deployed | *(none)* |
| Web app deployment | **LIVE, CURRENT** — "boardroom" deployment republished 2026-09-11 (version `@8` → `@15`, was 2 months stale, predating EEV2-012 through EEV2-017; see M13). EEV2-014's cap confirmed refusing a real POST correctly. |

All 43 `.gs` files and `appsscript.json` match live byte-for-byte. Live carries
EEV2-012 (`BOARDROOM_OCR_COLUMN_JOIN`), EEV2-013 (CHECK 8 /
`NO_VERIFIED_EVIDENCE`), EEV2-014 (the global spend/abuse caps), EEV2-016 (the
same global daily job cap also enforced on the form-trigger path — was live and
unmerged from 07:42Z to 16:13Z 2026-09-10; see the drift flag below), and
EEV2-017 (the single validation choke point inside `sendReportEmail`, pushed
live 2026-09-11 — see M15).

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
**State: DONE 2026-09-11**, verified by a real execution against a real job. This section
previously read "BUILT, NOT MERGED, NOT LIVE-TESTED," describing PR #23 before it merged
— stale; `EEV2AuditJob.gs` has actually been on `main` since `fd2a06f` and live since
(confirmed by checksum against a fresh `clasp pull`, 2026-09-11).

The remaining real gap was execution, not code: `clasp run` (from either this machine or
the founder's) fails with "Unable to run script function. Please make sure you have
permission to run the script function." — root cause not fully resolved (ruled out so
far: OAuth consent-screen test users, API-executable deployment access level, which is
already "Anyone"). Rather than keep debugging that Execution API permission wall, added a
temporary no-argument wrapper, `eev2AuditJobDiagnosticRun()` (`EEV2AuditJob.gs`, founder-
approved diff), so the founder could run the real function from the Apps Script editor's
own Run button instead — a path that does not depend on the Execution API at all.

**Real result, 2026-09-11**, job `form-20260905-053908-609f4190` (the same real job the
2026-09-09 verification attempt had already confirmed by hand): all four Contract 1
artifacts came back `held: true` — `contract_1_verdict: "GATE_HELD -- all four Contract 1
artifacts confirmed for this job_id."` This **matches** the already-known-by-hand answer
(`action_taken=REVERTED_NOT_SENT`) exactly. `eev2AuditJob` is confirmed working correctly
end-to-end against real Drive/Sheets/Gmail data — the acceptance criteria's intent (real
execution against a real job, verdict matches manual inspection) is met, via the editor
Run button rather than the originally-specified `clasp run`/Termux path, since that path
remains blocked by an unresolved Execution API permission issue.

**Deliberately kept, not deleted — founder decision 2026-09-11:**
`eev2AuditJobDiagnosticRun()` stays in place until the client-facing production
deployment has launched AND run one full month of successful real client testing. Until
then it remains the only working path to re-run this audit, since the underlying `clasp
run` Execution API permission issue is still unresolved (separate, lower-priority now
that the editor path proves the real function works).

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
**State: DONE 2026-09-11 — 3 of 3 consecutive clean cycles**, all real, all
independently verified against Drive artifacts (not inferred from delivery emails
alone). See "Third attempt," "Fourth attempt," and "Fifth attempt" below. Two earlier
real attempts (2026-09-09) each failed for a reason since fixed (EEV2-012, then
EEV2-013) — those do not count toward the 3 consecutive clean cycles required.

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

**Third attempt, 2026-09-11 — FIRST GENUINELY CLEAN CYCLE. State: 1 of 3.**

Real submissions through the live form, both independently cross-checked against Drive
artifacts (not inferred from the delivery email alone):

- **Test A** — job `form-20260911-061501-26ea1f28`, the real 9-file Procurement_* set.
  Correctly held. `${jobId}-VALIDATION_FAILED.json` confirmed to exist in the outputs
  folder (fetched directly, 2026-09-11): `isValid: false`, error
  `NO_VERIFIED_EVIDENCE: All 9 finding(s) are narrative-only ... report must be held
  per EEV2-013`. `[VALIDATION FAILED]` alert email confirmed received. This is the
  first real cycle run since EEV2-012, EEV2-013, and EEV2-016 were all simultaneously
  live — the first attempt with every known prior defect already fixed.
- **Test B** — job `form-20260911-071426-312a19d8`, the delay-only CSV. Correctly sent.
  `job-state.json` confirmed (fetched directly): `email: "bhagat.taran@gmail.com"`,
  `email_status: "EMAIL_SENT"`, `state: "ACTION_REPORT_SENT"`. The real executive-report
  email was received and its content matches the real evidence (14 cited delay days,
  correct citations, correct 7/30/90 action plan).

**A genuine, real defect surfaced and was fixed mid-cycle, unrelated to the pipeline
logic itself.** The first Test B attempt (job `form-20260911-070443-5185abcf`) used a
mistyped recipient email (`bhagat.taran@gmail.co`, missing the final "m") in the test
form submission. `isValidEmail()` correctly accepted it as syntactically valid — a
format-only check cannot catch a wrong-but-valid-shaped domain — so the pipeline
correctly validated, generated, and attempted delivery (`email_status: EMAIL_SENT`),
but the report went to a nonexistent inbox, not a real one. This was a test-data-entry
error, not a pipeline defect; re-submitted with the correct address and confirmed
delivered.

**Also surfaced, real and separate: the daily cap conflicts with the testing
protocol.** `GLOBAL_DAILY_JOB_LIMIT=1` (its value before and after this session's
testing) allows only one form submission per calendar day — but one Test A/B cycle
needs two submissions same day. A same-day Test B attempt at limit=1 was correctly
refused (`Daily submission limit of 1 reached for today`, thrown from
`eev2ConsumeDailyBudget_` before any job id/Drive folder existed for that attempt —
consistent with EEV2-016's designed "before any Drive folder is created" placement).
**Founder decision 2026-09-11:** raise the cap temporarily (to exactly the number of
planned same-day submissions, no more) for testing days only, then revert immediately
after — not a permanent change to the production value. Cap was raised 1→2→3 across
this session's attempts and confirmed reverted to 1 immediately after the final real
Test B send.

**Incidentally, real evidence toward M13:** the daily-cap refusal above is the first
real observation of `enforceGlobalDailyJobLimit_`/`eev2ConsumeDailyBudget_` correctly
refusing a real over-cap submission in production — but via the **form-trigger path**
(`onFormSubmit`), not the anonymous public endpoint (`doPost`) M13's own acceptance
criteria specifically names, since the web app deployment is still archived and
`doPost` cannot be reached at all right now. Real, valuable, but does **not** by
itself close M13 — that still needs the web app republished and a real POST against
that specific path.

**Fourth attempt (cycle 2 of 3), 2026-09-11 — CLEAN.** Same real fixtures, same real
form, cap raised 1→2 then reverted to 1 immediately after (confirmed both ways):

- **Test A** — job `form-20260911-072958-4cc84073`, the real 9-file Procurement_* set.
  Correctly held. `${jobId}-VALIDATION_FAILED.json` confirmed to exist (fetched
  directly, 2026-09-11): `isValid: false`, `NO_VERIFIED_EVIDENCE`, identical shape to
  cycle 1's result.
- **Test B** — job `form-20260911-073728-c8a93a1c`, the delay-only CSV. Correctly sent.
  `job-state.json` confirmed (fetched directly): `email: "bhagat.taran@gmail.com"`
  (correct address, no repeat of the cycle-1 typo), `email_status: "EMAIL_SENT"`,
  `state: "ACTION_REPORT_SENT"`.

No new defects surfaced this cycle — clean on the first attempt, no resubmission
needed.

**Fifth attempt (cycle 3 of 3), 2026-09-11 — CLEAN. M10 CLOSES.**

- **Test A** — job `form-20260911-081331-0a29b962`, the real 9-file Procurement_* set.
  Correctly held. `${jobId}-VALIDATION_FAILED.json` confirmed to exist (fetched
  directly, 2026-09-11): `isValid: false`, `NO_VERIFIED_EVIDENCE`, identical shape to
  cycles 1 and 2.
- **Test B** — job `form-20260911-081530-57fe6f84`, the delay-only CSV. Correctly
  sent. `job-state.json` confirmed (fetched directly): `email:
  "bhagat.taran@gmail.com"`, `email_status: "EMAIL_SENT"`, `state:
  "ACTION_REPORT_SENT"`.

No new defects — clean on the first attempt, same as cycle 2. **3 of 3 consecutive
clean cycles achieved.** Contract 4's launch gate (founder decision 2026-09-10: held
exactly as written, no relaxation) is satisfied. M10 is DONE.

**What M10's closure does and does not establish:** every submission in all 3 cycles
used the same two real fixtures (the 9-file Procurement_* set, the delay-only CSV).
This proves the pipeline handles these two known, well-characterized cases correctly
and repeatedly — it does not by itself prove correctness against document shapes not
yet tried (see M8/M9, accepted-open) or against EEV2-017's own send-gate choke point,
which is merged to `main` but **not yet pushed live** (confirmed by fresh `clasp pull`
immediately after this cycle: live `Code.js` md5 still `282d2e972aa29d20e63b939e1e2bb081`,
the pre-EEV2-017 hash; `main` is at `daad4bef6424c22cc07059c6c74aa6b0`). None of these
3 cycles exercised EEV2-017's new internal gate in `sendReportEmail`, since the
already-existing `handleBoardroomFormSubmit` gate (unchanged by EEV2-017) is what
actually held/sent each of these 6 real submissions.

### M11 — Auto-push trust count
**State: 0 of 5 cycles logged.** Was blocked on M7; M7 is now DONE (2026-09-11,
`eev2AuditJob` verified working against a real job), so this can start — no cycles have
been logged yet.
**Acceptance criteria for DONE:** `AUTO_PUSH_TRUST_LOG.md` shows 5 consecutive cycles
where the automated verdict matched the real outcome.

### M12 — First real pilot client
**State: STARTABLE — M10 closed 2026-09-11 (3 of 3 clean cycles).** Not yet started;
this milestone's own work (identifying and onboarding a real pilot client) has not
begun. **Founder decision 2026-09-10 on the launch bar:** Contract 4 is held **exactly
as written** — 3 consecutive fresh clean cycles required, now satisfied. **M8
(large/dense document) and M9 (scanned/image PDF) are ACCEPTED-OPEN**, not blockers: no
real fixture exists in Drive for either, and manufacturing one is not a good use of the
pre-launch window. They are to be disclosed to the pilot client as known-untested
paths, with scanned/image PDFs declared out of scope for v1.

**EEV2-017 is DONE** (M15 closed 2026-09-11) — the send-gate choke point covers
`resendBoardroomReport` and the correction-form path, live and exercised for real
(a real resend under the live code correctly passed through the new gate; see M15
for the full evidence). No remaining gap here blocking M12.

**M13 is DONE** (2026-09-11) — the real production web app deployment ("boardroom")
was found stale (2 months old, predating EEV2-012 through EEV2-017) and republished;
its endpoint cap confirmed refusing a real over-limit request correctly. This closes
the last open code-side gap M12 was implicitly waiting on beyond M10 itself.

**Contract 5's weekly canary has no automation or reminder — worth setting up as
part of going live, not after.** It is currently a fully manual practice (resubmit
the known-bad Procurement_* set weekly, pinned to an internal address per Contract
5's mandatory mitigation) with nothing prompting the founder to actually do it each
week. Given the founder's ~2 hrs/week budget, an unprompted manual weekly task is a
real risk of being forgotten exactly when it matters.

**`GLOBAL_DAILY_JOB_LIMIT` is currently `1`** (set for M10/M13's testing), which will
not work for real client use. See `work_M12_launch_plan_20260911.md` for a proposed
value and full pre-onboarding checklist.

### M13 — Endpoint security (EEV2-014)
**State: DONE 2026-09-11.** Found during the pre-launch audit and not previously
tracked: the web app deploys as `access: ANYONE_ANONYMOUS` + `executeAs:
USER_DEPLOYING`, and the only limit — `enforceRateLimit()` — keyed on
`payload.email`, a caller-supplied field, so it was bypassed by changing one string.
`runGeminiVerifier`'s paid `gemini-2.5-pro` call had no cap at all. `GEMINI_DAILY_CALL_LIMIT`
did not mitigate this: it gates only the `gemini-2.5-flash` relevance path, and that gate
is off by default.

Fixed by two global, date-keyed daily budgets that read no caller-supplied field
(PR #38, `0b2a8ff`): the job cap runs before any Drive folder is created, the verifier cap
before the paid fetch, both under a fail-closed `LockService` lock.

**Serious finding surfaced while exercising this milestone, now fixed:** the actual
production web app deployment (`AKfycbwKAbhU2WNR7BSNQS9XMMqhlvYMBb-QwKckfkiAiNIdf4pPD-dBBACO42lE5omKH4E9kQ`
— the one `assets/js/constrovet-app-config.js` genuinely points to) was pinned to a
**frozen version 8, created 2026-07-03** — over two months stale, predating EEV2-012,
EEV2-013, EEV2-014, EEV2-016, and EEV2-017 entirely. An earlier redeploy attempt this
session (following a generic "edit the existing deployment" instruction, before the
name mismatch was caught) bumped a *different*, unnamed deployment (now `@14`) instead,
leaving the real one still at `@8`. Discovered via a genuinely confusing chain: `curl`
POSTs failed with a generic Drive "file not found" page across multiple redirect/
content-type variants (ruled out as curl-specific, since a real browser `fetch()`
succeeded); the successful request then revealed the cap wasn't firing despite a
confirmed `GLOBAL_DAILY_JOB_LIMIT=1` and a confirmed real stored counter of `9`
(`eev2DailyBudgetDiagnosticRun()`, temporary read-only diagnostic) — a contradiction only
explained once `clasp deployments` showed "boardroom" pinned at a stale numbered
version rather than tracking current code. Fixed by explicitly redeploying the
correctly-named "boardroom" deployment (confirmed via `clasp deployments`:
`@8` → `@15`, 2026-09-11).

**Real exercise, post-redeploy, 2026-09-11:** a real POST to the live, now-current
"boardroom" endpoint was refused: `{"ok":false,"error":"Daily submission limit of 1
reached for today. Please try again tomorrow."}` — the exact expected message.
Independently confirmed via Drive search for the refused job's id
(`cv-eev2-014-cap-check-007`): **zero results**, meaning no folder or file was created
anywhere — satisfies "no Drive folder created." No Gemini call was made either, by
construction: `eev2ConsumeDailyBudget_`'s `throw` happens before
`props.setProperty` (the only write) and long before any Drive/Gemini code executes,
confirmed by reading the function directly rather than a further live test.

**Acceptance criteria for DONE, met:** web app republished (the *correct*, named
deployment) — done; a real POST past the cap observed to refuse with no Drive folder
created and no Gemini call made — done, both independently verified above.

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

### M15 — Correction-form report path bypasses the validation gate (EEV2-017)
**State: DONE 2026-09-11 — merged, live, and exercised for real.** Merged via PR #44
(`3d90693`), pushed live by the founder 2026-09-11, confirmed via fresh `clasp pull`:
live `Code.js` md5 `daad4bef6424c22cc07059c6c74aa6b0` matches `main` exactly, zero
drift across all 43 `.gs` files, manifest byte-identical.

**Real exercise, 2026-09-11:** `resendBoardroomReport` (one of the two paths this fix
closes) was called for real via a founder-approved temporary wrapper
(`eev2ResendDiagnosticRun`), resending job `form-20260911-081530-57fe6f84` (M10 cycle
3's Test B, already known-correct). Independently confirmed via Drive (fetched the real
`final-report.json`, not the execution log's ambiguous "started/completed" alone —
that log showed no error but also no return value, and the founder's own Cloud Logging
screen showed an unrelated audit entry, not this run's real output): `email_delivery:
{email_to: "bhagat.taran@gmail.com", email_status: "EMAIL_SENT", resend: true}`,
`email_source_mode: "MANUAL_EXACT_JOB_RESEND"`, sent at `2026-09-11T08:38:08.186Z`.
EEV2-017's new internal gate correctly let this legitimate resend through — did not
wrongly hold it. `onCorrectionFormSubmit`/`rerunBoardroomJobWithCorrections` remains
unexercised (that path additionally needs the correction-form trigger installed, which
it is not) — not a blocker, since `resendBoardroomReport`'s real pass proves the shared
`sendReportEmail` gate mechanism itself works correctly for a real caller.

Found by code trace 2026-09-10: `onCorrectionFormSubmit`
in `apps-script/Code.gs` rebuilds and emails a report on client-submitted correction
evidence without ever calling `validateReportOutput`. Confirmed **not currently live** —
the Apps Script Triggers UI shows only `onFormSubmit` installed, no
`onCorrectionFormSubmit` row (checked directly by the founder, 2026-09-10). Also found:
the manual `resendBoardroomReport` / `resendLatestBoardroomReportSmallThenFull` family
reloads and emails `final-report.json` with no gate check — reachable today, but only by
a founder manually invoking the function, not by any automated or client-facing path.
Confirmed against a real production job (`form-20260909-165508-4076a2ce`'s own
`job-state.json`, `email_status: EMAIL_SENT`) that this exact gap was reachable and
bypassed at least once already.

Founder approved **Option A** (2026-09-10): single gate inside `sendReportEmail`,
covering every current and future sender. Built: `sendReportEmail` now runs
`validateReportOutput` internally before any `MailApp.sendEmail` call, on any caller;
on failure it writes `VALIDATION_FAILED.json` (when a `folders` argument is supplied)
and returns the same `HELD_VALIDATION_FAILED` shape the 2 already-gated callers already
produce. All 4 real callers updated to pass `folders`. New suite
`EEV2SendGateChokePointRegression.gs` + `tests/eev2-send-gate-chokepoint.test.mjs`
(17/17 checks pass against real `Code.gs`; a mutation-check proof confirms the checker
can fail). `npm test` 35/35, harness 20/20 (unchanged — new suite is Node-safe and
already runs via `npm test`, deliberately not added to the release-gate registry),
`check:fixtures` OK (24 files). Full detail in `work_M15_decision_memo_20260910.md`'s
"Implementation note."

**Acceptance criteria for DONE, met 2026-09-11:** merged (PR #44), deployed (checksum-
verified live), and exercised for real (`resendBoardroomReport` resend of a known-
correct job, confirmed via Drive — see above). `onCorrectionFormSubmit` remains
unexercised, since it needs a trigger that is not installed — tracked as a follow-up
if/when that trigger is ever installed, not a blocker to closing M15 now.

**Cleanup remaining:** `eev2ResendDiagnosticRun()` (`Code.gs`) is a temporary wrapper,
same disposition as `eev2AuditJobDiagnosticRun()` — kept per founder decision until the
client-facing production deployment launches and runs one full month of successful real
client testing, not deleted now.

## Resolved, no longer tracked
- PR #17 — confirmed merged (`e4fc9c5`) prior to this doc; earlier "parked" note is stale.

## Compliance rule going forward
Every PR description should name the milestone ID it advances (e.g. "Advances M3").
Every session summary claiming a milestone moved to DONE must include the actual
verification command output it ran, not a restated claim from a prior session.
