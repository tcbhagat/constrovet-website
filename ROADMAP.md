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
intact, sha256 `c049a91156fcb749…`) and `recovery-v11/Code.v12-current-HEAD.js`.
Merge = V11 + the 94 EEV2-004 lines + milestone 3's fix. Rollback =
`clasp pull --versionNumber 12`.

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

---

### Milestone 7 — Scheduled gate self-check (fast-follow, post-milestone 2)

**Subgoal:** a future silent gate failure is caught in minutes, not discovered
days later during an unrelated diagnostic.

**Why:** the 2026-09-04 wipe was found by accident. Nothing would have reported it.

**Pass test:** a scheduled Apps Script function verifies the validation layer is
present and was invoked on the most recent job, and emails
`admin@constrovet.com` when either check fails. Proven by deliberately pointing
it at a job with no validation row and confirming the alert fires.

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
