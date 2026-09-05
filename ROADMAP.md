# ROADMAP.md — Constrovet validation programme

Written 2026-09-04. **Follow this; do not re-derive it each session.**
Read alongside AGENTS.md (authority) and CONTRACTS.md (definition of done).

## Goal

**A client-facing report can never leave this system with a fabricated or
mis-attributed figure.**

## Rule of sequence

Work the milestones in order. Do not skip ahead even when a later one looks
easy — deploying before Phase 0/1 verification existed is precisely what caused
the 2026-09-04 gate wipe. **Each session must state which milestone is active
before doing anything else.**

## Redundancy principle (added 2026-09-04, six-lens audit)

**No safety-critical step in this roadmap may depend on exactly one load path.**
Today, every control here terminates in "the founder reviews and acts" — one
person, one attention span, the same condition that produced the 2026-09-04
incident. A bridge with a single load path fails catastrophically and without
warning the moment that one member fails (see: I-35W, 2007, a single
undersized gusset plate with no redundant path for the load). A bridge with
redundant paths sags and cracks *visibly* long before it would ever collapse.
Every milestone below that introduces a new control must ask: **if the human
step is skipped or fails, is there a second, independent path that still
catches it?** Milestone 7's circuit-breaker requirement (added this same audit)
is the first instance of applying this principle; it should not be the last.

## ACTIVE MILESTONE: 2

---

### Milestone 1 — Intake path resolved with certainty ✅ DONE 2026-09-04

**Subgoal:** know, with evidence, which mechanism real client traffic executes.

**Pass test:** a one-sentence statement naming the mechanism, backed by evidence
that is not inference from the repo.

**Result:** PASSED. Real traffic runs on the installable `onFormSubmit` trigger,
which executes current saved HEAD; deployment version labels are irrelevant.
Evidence: ~201 Gmail report threads, all `form-` job ids; `form-` ids minted only
in `handleBoardroomFormSubmit`; `doPost` rejects `form-` ids by regex. Recorded
permanently in AGENTS.md so it is never re-derived.

**Consequence carried forward:** a deployment rollback does not restore code.
Only a change to HEAD does.

---

### Milestone 2 — Live validation layer restored and confirmed by a REAL run ⬅ ACTIVE

**Subgoal:** production has a working gate again, proven by an actual submission,
not a Node replay.

**Pass test — all of:**
1. HEAD contains `validateReportOutput`, `logValidationError`,
   `heldForValidationFailureDelivery_`, `heldForExtractionFailureDelivery_`,
   `boardroomTechnicalExtractionFailures_`, `detectDocumentTemplate`,
   `VALIDATION_LOG_SHEET_ID` — confirmed by `clasp pull`, not by assumption.
2. HEAD still contains `boardroomTriggerOwnedAmount` and its call site.
3. A real Test A submission (known-bad `Procurement_*` 9-file set, submitter
   pinned to an internal mailbox) produces all four Contract 1 artifacts,
   checked by hand, on the two separate sheets per Contract 1 artifact 4a/4b.
4. A real Test B submission (`boardroom-professional-actions-delay-only.csv`,
   internal address) satisfies Contract 2 — report sends, `PASSED_VALIDATION`
   row written.

**Then and only then:** Contract 1 moves from UNMET to met.

**Materials ready:** `recovery-v11/Code.v11.js` (5,876 lines, validation layer
intact, sha256 `c049a91156fcb749713a6376caef014b906d15f3aded8c35f37598c7840f1b5a`) and `recovery-v11/Code.v12-current-HEAD.js`.
Merge = V11 + the 94 EEV2-004 lines + milestone 3's fix. Rollback =
`clasp pull --versionNumber 12`.

**Golden-sample governance (added 2026-09-04, six-lens audit).**
`recovery-v11/Code.v11.js` is now this project's golden sample — the physical,
preserved known-good artifact everything else gets diffed against, the way a
semiconductor fab diffs a production run against a preserved sample rather than
an abstract spec (specs get misread; a sample can't be). **It may only be
replaced by a deliberate, logged "this is now golden" decision — never
overwritten as a side effect of another change.** If Milestone 2 lands a new
verified-good state, that becomes the new golden sample via an explicit commit
saying so, not a silent file edit. Enforced by `npm run check:golden`
(`scripts/check-golden-sample.mjs`) — not yet wired into any gate, run
manually. It already caught one accidental append to this exact file during
its own build, seconds after being written — see SESSION_LOG.md.

**STATUS 2026-09-04, later same day — candidate built and tested, NOT YET
PUSHED.** `recovery-v11/Code.merged-candidate.js` exists: V11 (golden sample)
+ EEV2-004 + the Milestone 3 word-boundary fix + the Milestone 7 circuit-breaker
(see below). Passes the full existing 12-suite harness in isolation, plus two
new regression suites (EEV2-005, EEV2-006) written for the two fixes added this
session. **This does not move Milestone 2 to done** — the pass test requires a
real live Test A/B run (`MILESTONE_PROMPT_SERIES.md` Prompt 2), which has not
happened. Founder action required: review `recovery-v11/Code.v11-to-candidate.diff`
(170 lines), then push. See SESSION_LOG.md for the exact command list.

**STATUS 2026-09-05 — full multi-file candidate pushed to `apps-script/` and
committed (SESSION_LOG.md, Phase 4). Pass test items 1 and 2 (HEAD contains
the required functions and `boardroomTriggerOwnedAmount`) are MET — confirmed
by a fresh `clasp pull`, not assumption, same-day. Items 3 (Test A) and 4
(Test B) remain UNMET.** Assessed 2026-09-05 against real evidence supplied by
the founder (job artifacts, an alert email, and sheet/job-state content) —
**PARTIALLY MET, not closed. Do not round up.**

*Item 3 (Test A) — a real submission WAS held correctly, but not the named
fixture.* Job `form-20260905-053908-609f4190` (source template `M22_*`, per
its VALIDATION_FAILED.json and the founder-pasted validation-errors sheet row
— filenames include `M22_EnvCompliance_NORMAL`, `M22_EnergyConsumption_BAD`,
`M22_WasteManagement_BAD`, and others, a synthetic GOOD/BAD/NORMAL fixture set,
**not** the literal `Procurement_*` 9-file set this pass test names) was
correctly withheld: `MISSING_AMOUNT` errors on two `STRUCTURED_ACTUAL_BUDGET`
findings, `action_taken=REVERTED_NOT_SENT` on the validation-errors sheet, a
`[VALIDATION FAILED]` alert to the internal address only — no client-facing
send. This is real evidence the live gate works. **It does not satisfy this
pass test's literal wording**, because `Procurement_*` is not an arbitrary
stand-in: CONTRACTS.md ties that exact document set to the real 2026-09-02
incident (the `INR 454.16` unit-rate-as-leakage false negative). Test A exists
to prove the gate closes *that* specific hole; a different fixture tripping a
different check is evidence the gate is live, not evidence it closes the hole
Test A was written to test. CONTRACTS.md itself treats "Test A" as a named,
specific test once introduced ("Re-run Test A (known-bad Procurement_* 9-file
set)"), not a category. **Judgment call, stated plainly: this does not move
item 3 to met.**

Separately, even judged only against Contract 1's own four-artifact
requirement (not Milestone 2's stricter fixture wording), two of the four
artifacts have a real evidentiary gap on the evidence supplied so far:
artifact 3 (`<job_id>-VALIDATION_FAILED.json` existing in the outputs folder)
is referenced in the alert email's text but its presence was not
independently confirmed in the outputs-folder listing given; artifact 4b (the
**audit sheet's** `email_status=HELD_VALIDATION_FAILED` row, a specific
sheet CONTRACTS.md names separately from 4a) has not been shown at all — only
the job-state file's `metadata.email_status` field, a third, different file,
carries that string. 4a (the validation-errors sheet row,
`action_taken=REVERTED_NOT_SENT`) was pasted by the founder, not
independently opened.

*Item 4 (Test B) — UNMET, no evidence offered otherwise.* No submission
matching the literal named fixture (`boardroom-professional-actions-delay-only.csv`)
has been run. Roughly 11 clean submissions across several different document
families (an `M07` set, several `OTHER`/unclassified/`cashflow_*`/`BOQ_*`
templates, an `M11` set) were directly verified this session to show
`INR 0` quantified leakage and no fabrication — real, useful evidence the
gate does not false-positive on ordinary good-faith submissions in general —
but none is the named CSV, and Contract 2's should-pass side is written
around that one specific fixture the same way Contract 1's should-fail side
is. Not treating "structurally similar, never run" as "met."

**Also newly known and job-state.json (`609f4190`'s own copy, extracted from
a real outputs-folder zip): the pre-existing top-level `job_state` mislabeling
bug (`Code.gs:770` and 3 other call sites, `report.job_state` ignoring
`emailDelivery.email_status`) is confirmed present in this exact job's real
output — top-level `state` reads `ACTION_REPORT_SENT` while
`metadata.email_status` correctly reads `HELD_VALIDATION_FAILED` in the same
file. Not evidence against the hold; the email, the sheet row, and the
metadata field all agree the hold happened. It is evidence the bug is live in
production today, not just a Node-replay finding.**

**Net: Milestone 2 stays ACTIVE, not DONE.** Items 1–2 met. Item 3 has real,
positive evidence of a working gate but not the named fixture, plus two
artifact-chain gaps worth closing on a future Test A run. Item 4 has no
matching evidence at all. The next concrete step is unchanged from before
this evidence arrived: run the literal Procurement_* 9-file set and the
literal boardroom-professional-actions-delay-only.csv, both from an internal
address, and check all four Contract 1 artifacts by hand on the two named
sheets, not by pasted excerpt.

---

### Milestone 3 — `ld` / `late` word-boundary fix live, with its own fixture

**Subgoal:** `boardroomLeakageRe` stops matching inside ordinary words.

**Why it ships inside milestone 2, not after:** the same regex is the ownership
predicate for `boardroomTriggerOwnedAmount`. Restoring EEV2-004 without this
restores a fix that ordinary construction vocabulary defeats.

**Pass test:** a regression fixture in which `Cold storage civil works
Rs.15,00,000` and `Shuttering plate hire … Rs.2,40,000` both yield `0`, while
`NGT imposed a penalty of Rs. 25,00,000` still yields `2500000`. Full suite green,
zero regressions — EEV2-003's suites in particular must stay green.

**Measured before the fix, against live code 2026-09-04:** those two spans return
`1500000` and `240000`. 13 of 14 ordinary construction terms tested match the
regex by substring.

---

### Milestone 4 — Staging exists; Contract 3 runs against it

**Subgoal:** the regression habit stops meaning "test against the system serving
real clients."

**Pass test:** Test A and Test B both run end-to-end on a separate staging script
project with its own form, sheets and Drive root, and produce their expected
artifacts there. Production is touched only for a final confirmation run.

**Design:** `STAGING_PROPOSAL.md`, Option A. Option B (second deployment of the
same script) is rejected there and must not be re-proposed — one HEAD, one
trigger, no real isolation.

---

### Milestone 5 — CHECK 5e decided deliberately

**Subgoal:** CHECK 5e is either deployed or explicitly deferred, with a written
reason. No third state.

**Verified status 2026-09-04:** NOT deployed, and never was — `UNOWNED_AMOUNT` is
absent from Version 11 *and* Version 12. The patch is `apps-script/EEV2_004_LIVE_CHECK5E.md`.

**Pass test:** a dated decision recorded in CONTRACTS.md. If deploying, its
false-positive control (`form-20260902-072151-3a11bd12`, the genuine NGT penalty)
must still produce no new blocking error.

**Open question to settle first:** with milestone 3 done, does CHECK 5e still earn
its place, or does a boundary-corrected ownership check at extraction already
cover it? Decide on evidence, not preference.

---

### Milestone 6 — Repo and live reconciled, and kept that way

**Subgoal:** repo/live drift becomes structurally impossible, not a thing to
remember.

**How:** `clasp push` becomes the **only** path by which live code changes.
Manual paste-and-deploy into the Apps Script editor is retired entirely — that
practice is the direct cause of the 2026-09-04 wipe.

**Pass test:** `clasp pull` into a scratch dir produces a file byte-identical to
`apps-script/Code.gs` on the tracked branch, and `git log` shows the change that
put it there. Re-checked at the start of every session; drift is a stop-and-report.

**CAVEAT, added after a 2026-09-04 six-lens audit — do not treat this milestone
as closing drift risk alone.** This check is git-mediated: it only ever sees
code that went through `clasp push`. It has no visibility into a direct save
inside the Apps Script browser editor (`script.google.com`), which writes to
HEAD immediately with no review seam — the exact mechanism of the 2026-09-04
incident. Milestone 6 closes the git-bypass path. It does not close the editor
path. Only Milestone 7 does, because it observes runtime behavior regardless of
how HEAD was mutated. **Both milestones are required together; neither is
sufficient alone.**

---

### Milestone 7 — Scheduled gate self-check (load-bearing, not a fast-follow)

**Subgoal:** a future silent gate failure is caught in minutes, not discovered
days later during an unrelated diagnostic.

**Why:** the 2026-09-04 wipe was found by accident. Nothing would have reported it.
It is sequenced after Milestone 2 for a technical reason only — you cannot check
for the presence of a validation layer that doesn't exist yet — **not because it
is lower priority than Milestone 6.** A 2026-09-04 audit (six-lens review, see
SESSION_LOG.md) found this milestone is the only defense against the editor
bypass Milestone 6 cannot see; downgrading it to "fast-follow" in an earlier
draft of this document was itself an instance of the mistake it exists to catch.

**Pass test — now two parts, not one:**
1. **Detect:** a scheduled Apps Script function verifies the validation layer is
   present and was invoked on the most recent job, and emails
   `admin@constrovet.com` when either check fails. Proven by deliberately pointing
   it at a job with no validation row and confirming the alert fires.
2. **Circuit-breaker (new requirement):** on detecting failure, the function also
   sets a kill-switch (a Script Property, e.g. `GATE_HEALTH = "FAILED"`) that the
   send path checks before every delivery — not just an alert a human might miss,
   but an automatic halt of all outbound reports until a human clears it. This
   closes the single-load-path problem named in the same audit: today, "founder
   reads the alert in time" is the *only* thing standing between a silent gate
   failure and a delivered fabrication. This is a second, independent path that
   does not depend on anyone's attention.
   **BUILT 2026-09-04, later same day, in `recovery-v11/Code.merged-candidate.js`
   — not yet live.** `GATE_HEALTH_PROPERTY` checked inside `sendReportEmail`
   itself (one enforcement point covers all 5 call sites, not 5 separately-
   maintained checks — applying this same audit's redundancy principle to its
   own fix). `boardroomGateHealthCheck()` checks presence (5 required functions,
   `typeof` checks) and invocation (was the validation layer exercised on the
   most recent real job). `boardroomClearGateHealthKillSwitch_()` is the sole,
   manual, human-only reset — never auto-clears. Regression suite: EEV2-006
   (`apps-script/EEV2GateHealthCircuitBreakerRegression.gs`) — must be run in
   the real Apps Script TEST project, since it exercises real PropertiesService/
   MailApp that the local Node harness deliberately blocks; verified locally
   with mocks in the meantime (7/7 checks pass). **Still needed before this is
   live:** the founder must create the actual time-based trigger for
   `boardroomGateHealthCheck` — that's a live change, founder-only. Interval
   recommendation from the earlier hyperfocus pass stands: minutes, not daily.

---

## Recurring failure patterns — read before every session

1. Deploying before diffing against a freshly-confirmed live state (caused both
   the ₹27.6 crore incident and the 2026-09-04 gate wipe).
2. Treating the repo as a stand-in for live code without confirming sync first.
3. Conflating a deployment version label with what real traffic executes —
   settled by milestone 1: triggers ignore deployment versions entirely.
4. Assuming pasted code is genuinely live without independent confirmation
   (falsified once already; the paste turned out to be the repo copy).
5. Fixing one keyword/proximity defect and introducing another in the same
   mechanism (leakage regex → ownership regex, same word-boundary bug class).
6. Treating a session summary as durable memory. It is not. Restate constraints
   from AGENTS.md and this file at the start of every session.

## What this roadmap cannot guarantee

- It cannot make the founder run a command promptly. Every milestone has a real
  human wait-state, and production stays exposed during it.
- Until milestone 7, nothing detects a gate failure between sessions.
- A correct plan reviewed only by Claude is not a reviewed plan. The founder
  reading the diff before it goes live is the step that was skipped on
  2026-09-04, and no amount of process here substitutes for it.
