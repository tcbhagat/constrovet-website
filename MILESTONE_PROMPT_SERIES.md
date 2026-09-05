# MILESTONE_PROMPT_SERIES.md — Ready-to-paste prompts for Milestones 2–7

**Use this file in Claude Code instead of writing new prompts each session.**
See `ROADMAP.md` for the milestone definitions and pass tests.
See `AGENTS.md` for the Delegation Boundaries and Security guardrails.

---

## Standing preamble — read before running ANY prompt in this file

```
Read AGENTS.md, CONTRACTS.md, and ROADMAP.md in full before anything else.
State the ACTIVE MILESTONE from ROADMAP.md before doing any work.

Quote the git commit hash of ROADMAP.md (`git log -1 --format=%H -- ROADMAP.md`)
at the top of your response. Added 2026-09-04, six-lens audit: without this, a
prompt's output can't later be checked against whether it read a stale version
of the roadmap — this is the same problem an orchestra solves by tuning every
instrument to one shared reference pitch before a drift compounds silently.

Security, every prompt, no exceptions:
- Never print, log, or paste the contents of an OAuth token, service-account
  key, or `.clasprc.json`. Referencing that a credential exists/expired is fine;
  its contents are not.
- `clasp login`, `clasp push`, any Apps Script version/deployment change, any
  structural change to the live Validation-Errors or Audit sheets, and any
  `init*` function are FOUNDER-ONLY, always. When you reach one, stop and hand
  back the exact command for the founder's own terminal — do not attempt it,
  and do not ask for a code/token to do it yourself.
- If a terminal command is genuinely unavoidable for you to run (e.g. a
  read-only `clasp pull`, running the local test suite, `git diff`), run it
  yourself. If it requires interactive auth or writes to a live system, it is
  not "unavoidable for you" — it's the founder's step; say so plainly.

Assumptions: if a fact isn't in the repo, a freshly-pulled live file, or a file
the founder gave you, say `UNKNOWN — need X` and stop. If you must assume
something to proceed, state the assumption plus its pros and cons and let the
founder pick — never guess silently (AGENTS.md guardrail #1).

Best-practice lens for every step: staging before production (Milestone 4),
diff before deploy (Milestone 6), rollback identified before any change is
proposed (V11 is preserved in git; `clasp pull --versionNumber <n>` is the
rollback mechanism), and a written incident record for anything that touches
production (append to SESSION_LOG.md).

End every response with: what you verified and how, what you did NOT verify,
and any assumption made with its pros/cons — even if short.
```

---

## Prompt 0 — Session start / context priming (run first, every session)

**Model: Haiku 4.5** — pure retrieval + confirmation, no novel reasoning.

**Content:**

Confirm the Recurring Failure Patterns in ROADMAP.md by name (all six). 
Confirm the Delegation Boundaries in AGENTS.md by name (all four categories 
+ the stop-and-report rule + the intake-path fact).

Do this by reciting them back to me, exact names or content, not paraphrased.

Stop after this confirmation — do not begin milestone work in the same turn.

---

## Prompt 1 — Milestones 2+3: build the merge candidate

**Model: Opus 5** — correctness-critical regex/merge work gating the prime directive.

**STATUS 2026-09-04: already run once, by Claude Code on Sonnet 5, not Opus —
worth a second review specifically for that reason.** `recovery-v11/Code.merged-
candidate.js` exists, passes the full harness plus new EEV2-005/EEV2-006 suites,
and now also contains Milestone 7's circuit-breaker (built the same session,
beyond this prompt's original Milestones-2+3 scope — see ROADMAP.md for why it
was bundled in). Re-running this prompt fresh is still valid if the founder
wants an independent Opus-model pass before pushing; the diff to review either
way is `recovery-v11/Code.v11-to-candidate.diff`.

**Content:**

You are building a fix for production that restores and hardens the validation 
gate, and your work will be read by a human (the founder) before it is deployed. 
Every line of your output is evidence, not a draft. 

**Goal:** Produce a verifiably correct, word-boundary-safe validation-gate 
candidate for the founder to review and push to HEAD — not a partial fix or 
something relying on "we'll fix it next time."

**Materials:**
- `recovery-v11/Code.v11.js` — the live code from 2026-09-02, 5,876 lines, 
  validation layer intact.
- `recovery-v11/Code.v12-current-HEAD.js` — current HEAD, 5,106 lines, 
  validation layer gone.
- The 94-line EEV2-004 diff between them that landed correctly: 
  `BOARDROOM_LABEL_WINDOW = 40`, `boardroomTriggerOwnedAmount()` function 
  definition (lines 1581–1600), and the single call site at line 1506.
- `apps-script/eev2-003-amount-fabrication-fix-*.md` — the test suite for 
  EEV2-003 (the regex word-boundary fix that corrects `Rs.` matching to `bRs.b`).
- `apps-script/EEV2_004_LIVE_CHECK5E.md` — the proposed CHECK 5e layer 
  (currently in the repo but never deployed live).

**Subgoals, all required for "done":**

1. **Merge V11 + EEV2-004.** Start from `recovery-v11/Code.v11.js` (the source 
   of truth — it has the working validation layer) and apply exactly the 94 
   EEV2-004 lines from the V12 diff. Produce a merged candidate file. Do not 
   guess what those lines were; diff the two recovery files and extract the 
   actual insertion and look for the exact line range in V12.
   
2. **Fix `boardroomLeakageRe` word boundaries.** The test case you're about to 
   write will fail because the regex currently has a substring-matching bug: 
   `Cold storage civil works Rs.15,00,000` triggers `storage` containing "age", 
   and `Shuttering plate hire ... Rs.2,40,000` triggers `plate` containing 
   "late". Fix the regex so it only matches the 13 actual trigger *words* 
   (leakage/overrun/cost-variance/delay/delayed/extension/redesign/escalation/
   change-order/variation/contingency/contingency-use/supply-chain-lag), not 
   any substring of construction vocabulary. Word boundaries are the right 
   mechanism here, matching the EEV2-003 fix (`\bINR\b`).

3. **Write a regression fixture.** Create one test case that proves (a) 
   `Cold storage civil works Rs.15,00,000` and (b) `Shuttering plate hire 
   for slab casting Rs.2,40,000` both return `0` from 
   `boardroomTriggerOwnedAmount(..., boardroomLeakageRe())` after the fix, 
   while (c) `NGT imposed a penalty of Rs. 25,00,000` still correctly returns 
   `2500000`. The fixture must run and pass — this is not a placeholder. 
   (Reference: the test suite runs via `node`, same mechanism used in earlier 
   sessions to validate extraction against real production artifacts.)

4. **Run the full suite.** Execute the entire test suite (all `.test.js` files 
   in `apps-script/`). Zero regressions. EEV2-003's suites must stay green 
   specifically (they test the word-boundary fix already in place on the 
   currency amount regex).

5. **Produce the handoff for the founder.** Write two files in `recovery-v11/`:
   - `Code.merged-candidate.js` — the merged file from subgoal 1 + the 
     boardroomLeakageRe fix from subgoal 2.
   - `Code.v12-to-candidate.diff` — a unified diff from 
     `recovery-v11/Code.v12-current-HEAD.js` to the candidate, so the founder 
     can review the exact changes before copy-pasting to HEAD.

**What you will NOT do:**
- Do not run `clasp push`. That's founder-only.
- Do not create an Apps Script version. Founder-only.
- Do not touch any Google Sheet or Drive file.

**Why the constraint on diff-file handoff matters:** This is the one prompt 
in the series where `clasp push` would be emotionally tempting — you've just 
verified something critical works. The workaround (a unified diff) means the 
founder's own review is five minutes of `diff` + copy-paste, not a re-derivation 
from scratch. That human review is the step that was skipped on the 2026-09-04 
deploy that wiped the gate; building it back in here is load-bearing.

**Two more requirements on the founder's own push action, added 2026-09-04
after a six-lens audit — not on you, on them, but state them in your handoff:**
- **Cooling-off period.** The diff should sit for a minimum of a few hours
  before being pushed, not reviewed and pushed in the same sitting. Urgency was
  the condition under which the original incident happened; a deliberate pause
  converts that urgency into a structural delay instead of trusting willpower
  under pressure.
- **Structured read-back, not a blanket approval.** Before pushing, the founder
  should be able to name the specific change in `boardroomLeakageRe` and the
  specific merge decision from `recovery-v11/Code.v11.js`, not just "I looked
  at the diff." State this explicitly in your handoff message so it's an
  observable ask, not an assumption that review happened.

---

## Prompt 2 — Milestone 2: verify the real pass test

**Model: Sonnet 5** — methodical artifact verification across Drive/Gmail/Sheets.

**Content:**

You are an auditor confirming that production has a working gate again, by 
checking real artifacts against real expected behavior. The founder will do two 
things you cannot: (a) push the merged candidate to HEAD (read Prompt 1's 
deliverable), and (b) submit the actual Test A and Test B forms from an internal 
mailbox. This prompt runs after both of those steps.

**Goal:** Confirm, by hand, against real artifacts, that Milestone 2's four-part 
pass test is met — not inferred from a Node replay.

**Subgoals, all required:**

1. **Confirm the validation layer is in HEAD.** Run `clasp pull` (read-only) 
   into a scratch directory and confirm that HEAD contains all seven of these 
   functions: `validateReportOutput`, `logValidationError`, 
   `initValidationErrorLog`, `heldForValidationFailureDelivery_`, 
   `heldForExtractionFailureDelivery_`, `boardroomTechnicalExtractionFailures_`, 
   `detectDocumentTemplate`. Also confirm `boardroomTriggerOwnedAmount` and its 
   call site. Report the line numbers where each is defined.

2. **After the founder submits Test A** (the known-bad `Procurement_*` 9-file 
   set from an internal mailbox), verify all four Contract 1 artifacts by hand:
   - **1a:** No client-facing report email was sent. Search Gmail for a message 
     FROM the Apps Script (sender looks like `<noreply@...>`) TO the external 
     client with this job's ID in the subject. Confirm it does not exist.
   - **1b:** A `[VALIDATION FAILED]` alert email was sent to 
     `admin@constrovet.com`. Search Gmail for the alert subject line with this 
     job ID and confirm it exists and its timestamp.
   - **1c:** A `<job_id>-VALIDATION_FAILED.json` file exists in the job's 
     outputs folder on Drive. Verify by hand via the Drive UI or by downloading 
     it.
   - **1d:** Sheet rows exist on TWO SEPARATE SHEETS (this is the 2026-09-03 
     correction to the original Contract 1 wording):
     - On the `ConstroVet-Validation-Errors` sheet, tab `validation-errors`: 
       a row with `action_taken=REVERTED_NOT_SENT`.
     - On the Audit spreadsheet (`AUDIT_SPREADSHEET_ID`): a row with 
       `email_status=HELD_VALIDATION_FAILED`.
   
   Do not look for `email_status` on the validation-errors tab — it is not 
   there by construction (different functions, different sheets).

3. **After the founder submits Test B** 
   (`boardroom-professional-actions-delay-only.csv` from an internal mailbox), 
   verify Contract 2:
   - A report was generated and sent to the submitter address.
   - A sheet row was written to the validation-errors tab with 
     `action_taken=PASSED_VALIDATION`.

**Hard constraint:** The founder's internal mailbox is the submitter address 
for both tests (Contract 5 mandatory mitigation). Verify this before the tests 
run, and confirm the founder submitted from that address.

---

## Prompt 3 — Milestone 4: staging build-out

**Model: Sonnet 5** — procedural setup against an already-written design doc.

**Content:**

You are drafting the exact command sequence for standing up the staging Apps 
Script project described in `STAGING_PROPOSAL.md`, Option A. The founder will 
execute these commands and confirm they succeeded before moving to Milestone 5.

**Goal:** Draft the numbered command sequence and Script Properties list for 
the founder to run, and document the isolation checks to confirm staging is 
truly separate from production.

**Materials:** Read `STAGING_PROPOSAL.md` fully, especially the "Minimum viable 
staging (Option A)" section. Staging is a separate, standalone Apps Script 
project, not a deployment of the production script.

**Subgoals:**

1. **List the setup steps.** Number them 1–5 in the order the founder should 
   run them:
   - Create a new Apps Script project (how: the founder uses the Apps Script 
     editor at script.google.com, creates a new script, and gives you the 
     scriptId).
   - Add the Advanced Drive service (v2) to the staging script, same as 
     production (Apps Script UI: Services → add Google Drive API v2).
   - Create a separate Google Sheet for `ConstroVet-Validation-Errors` with 
     the same 9 columns as production (list them).
   - Create a separate Google Drive folder for staging job outputs 
     (`Constrovet-STAGING/projects`).
   - Set staging Script Properties (list each key and value):
     - `CONSTROVET_ROOT_FOLDER` → staging folder ID
     - `VALIDATION_LOG_SHEET_ID` → staging validation sheet ID
     - `BOARDROOM_AUDIT_SPREADSHEET` → staging audit sheet ID
     - `ENABLE_BOARDROOM_DEEP_ANALYSIS` → `false`
     - All Gemini flags → `false` (zero cost)
     - `BOARDROOM_NOTIFY_EMAIL` → `admin@constrovet.com` (internal alert address)
   - Do NOT run `initValidationErrorLog()` yet (the founder will do this once 
     only, locally, against the staging sheet).

2. **Isolation check.** After setup, confirm staging is isolated from production 
   by hand:
   - `CONSTROVET_ROOT_FOLDER` on staging is NOT the same as 
     `CONSTROVET_ROOT_FOLDER` on production (production root is 
     `Constrovet/projects`, staging root is `Constrovet-STAGING/projects`).
   - Same check for the sheet IDs — staging validation sheet ≠ production 
     validation sheet (different Google Sheets).
   - If any ID matches, stop and report which one — that's a critical 
     misconfiguration.

**What you will NOT do:**
- Do not run `clasp clone` or `clasp push`. Founder-only.
- Do not run `initValidationErrorLog()` yourself. Founder-only; it initializes 
  the staging sheet.
- Do not touch production scripts, sheets, or folders.

---

## Prompt 4 — Milestone 5: CHECK 5e, decide on evidence

**Model: Sonnet 5** — evidence comparison against established test patterns.

**Content:**

You are deciding, on evidence, whether CHECK 5e still earns its place after 
Milestone 3's `boardroomLeakageRe` word-boundary fix, or whether the boundary-
corrected ownership check at extraction already covers what CHECK 5e would do.

**Goal:** Replay the CHECK 5e logic against the same real jobs used in this 
session's replays, post-fix, and produce a decision: deploy CHECK 5e or defer it, 
with written evidence either way.

**Materials:**
- `apps-script/EEV2_004_LIVE_CHECK5E.md` — the patch for CHECK 5e 
  (`UNOWNED_AMOUNT` error, scoped to `LEAKAGE_AND_OVERRUN` findings).
- The real production job `form-20260902-135120-81f4fd27-browser-report.json` 
  (59,609 bytes) and its live-validator replay results from earlier sessions.
- The false-positive control job `form-20260902-072151-3a11bd12` — a genuine 
  NGT penalty that must not be blocked by CHECK 5e.

**Subgoals:**

1. **Replay CHECK 5e logic, post-Milestone-3 fix.** For each of the 9 real 
   findings in the 135120 job, extract the finding text and the currency marker 
   within it, and check: is the marker preceded (within 40 characters) by a 
   construction trigger term? (Now that word boundaries are fixed in 
   `boardroomLeakageRe`, most false ownership claims should be suppressed.) 
   Record: finding ID → marker → `UNOWNED_AMOUNT` error? (yes/no).

2. **Confirm the false-positive control.** Replay the same check against the 
   genuine penalty finding in 072151. It must still produce NO 
   `UNOWNED_AMOUNT` error — the genuine `Rs. 25,00,000` penalty is not preceded 
   by a construction term, so it passes ownership. If it fails here, something 
   is broken.

3. **Produce the decision.** Write one of two CONTRACTS.md entries:
   - **If CHECK 5e is now redundant** (the boundary fix suppresses all false 
     ownership that CHECK 5e would catch): draft a deferral entry stating this, 
     attaching the replay evidence (table: finding ID, marker, error?).
   - **If CHECK 5e still catches things the fix misses**: draft a deployment 
     entry for CONTRACTS.md that records CHECK 5e as a live-required check, 
     attaching the same evidence table.
   
   Do NOT merge either entry into CONTRACTS.md itself — CONTRACTS.md wording 
   changes need explicit approval per AGENTS.md. Write the candidate text only.

---

## Prompt 5 — Milestone 6: push-only reconciliation

**Model: Sonnet 5** — well-trodden CI pattern.

**Content:**

You are making repo/live drift structurally impossible, so manual paste-and-
deploy into the Apps Script editor can never silently overwrite the repo again.

**Goal:** Draft a CI check (or pre-commit hook) that detects and fails loud on 
any repo/live divergence.

**Subgoals:**

1. **Draft the check logic.** A CI action or local pre-commit hook that:
   - Runs `clasp pull` into a scratch directory (read-only, requires 
     `.clasp.json` with the scriptId; credentials are the founder's).
   - Diffs the pulled `Code.js` byte-for-byte against 
     `apps-script/Code.gs` on the tracked branch.
   - On any diff, exits non-zero and reports which functions are missing/added 
     (a new 21-function wipe would be obvious).
   - Runs on every push to `main` and every pull request that touches 
     `apps-script/Code.gs`.

2. **Draft the policy statement.** Write one paragraph for the repo README 
   stating: (a) manual paste-and-deploy into the Apps Script editor is 
   **retired**; (b) `clasp push` is the only path by which live code changes; 
   (c) if someone has direct write access to the Apps Script project, they 
   must use `clasp push` from a local clone, not the editor's "Deploy" button.

**What you will NOT do:**
- Do not actually create or merge the CI action — that touches the release gate 
  and needs founder approval.
- Do not run `clasp push` yourself.

---

## Prompt 6 — Milestone 7: scheduled gate self-check

**Model: Sonnet 5** — live monitoring function design.

**Content:**

You are building an automated alarm so that a future silent gate failure is 
caught in minutes, not discovered days later during an unrelated diagnostic 
(the way the 2026-09-04 wipe was found).

**Goal:** Draft the scheduled function + trigger + alert logic, write the test 
case as a fixture, and document before proposing any live change.

**Subgoals:**

1. **Draft the scheduled function.** A time-based Apps Script function that:
   - Runs on a schedule (suggest: daily at 06:00 UTC).
   - Fetches the most recent job from the validation-errors sheet (most recent 
     by timestamp).
   - Checks: (a) does a `PASSED_VALIDATION` or `REVERTED_NOT_SENT` row exist 
     for that job? (b) if `REVERTED_NOT_SENT`, is the row's `timestamp` within 
     the last 24 hours? (any hold older than 24h is a stale indicator and 
     should not alarm).
   - If no validation row exists for a recent job (within 24h), or if the check 
     cannot be run, send an alert email to `admin@constrovet.com` with the 
     exact job ID and the reason.

2. **Write the test fixture.** Create a test that points the check at a job 
   with NO validation row and confirms the alert fires. Confirm it runs and 
   passes.

3. **Draft the deployment plan.** How to create the time-based trigger once the 
   founder decides to deploy this (using `ScriptApp.newTrigger(...)`). Do not 
   create the trigger yourself — that's a live change, founder-only.

**Constraint:** Building this is a live change — no code lands without founder 
approval.

---

## Prompt 7 — Professional status write-up (bonus: best use of Fable 5.1)

**Model: Fable 5.1** — narrative synthesis, not code verification.

**Content:**

You are turning the technical state of Milestones 2–7 into a polished status 
narrative for the founder to share with stakeholders (board, clients, ops team). 
Write prose, not bullet points. Source only from `ROADMAP.md` and `CONTRACTS.md` 
— do not invent new claims.

**Important caveat on this model choice:** Fable 5.1's positioning in the Claude 
5 family suggests a narrative/long-form orientation, which is a better fit for 
prose synthesis than for code-level correctness work. This is an inference, not 
a benchmarked capability. You must fact-check every sentence against 
`ROADMAP.md`/`CONTRACTS.md` before trusting it. Fluency is not evidence — that 
is the project's own prime directive applied to your output. Never use this 
narrative pass for anything correctness-critical.

**Goal:** One paragraph per milestone (Milestones 2–7), 150–200 words each, 
stating the goal and subgoals in plain professional language.

**Subgoals:**

1. Milestone 2 paragraph: validation gate restoration, four artifacts, real Test 
   A/B runs.
2. Milestone 3 paragraph: word-boundary fix, regression suite.
3. Milestone 4 paragraph: staging environment, isolation from production.
4. Milestone 5 paragraph: CHECK 5e decision (deploy or defer, with evidence).
5. Milestone 6 paragraph: repo/live sync via `clasp push`, CI drift detection.
6. Milestone 7 paragraph: scheduled self-check, alert on missing validation rows.

After writing all six, fact-check each paragraph sentence by sentence against 
the original source files. Flag any sentence that cannot be traced back to 
something you read in `ROADMAP.md` or `CONTRACTS.md`.

---

## End of series

Prompts 0–7 are ready to paste into Claude Code, one per session.
See Prompt 0's output before starting any other prompt in the series.

For questions about which prompt to run when, see `ROADMAP.md`'s "ACTIVE 
MILESTONE" line and the milestone descriptions.
