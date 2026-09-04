
---
## Session end: 2026-09-03 17:33


---
## Session end: 2026-09-03 17:36


---
## Session end: 2026-09-03 17:42


---
## Session 2026-09-03 — EEV2-003 timing diagnostic + validation-gate audit

**Scope:** Resolve the CONTRACTS.md open diagnostic item for job
`form-20260902-135120-81f4fd27`. Read-only investigation. **No code was
changed.**

### 1. What was verified — and how

| Claim | How it was verified |
|---|---|
| A `ConstroVet-Validation-Errors` row exists for the job, `action_taken=PASSED_VALIDATION`, `error_count=0`, `warning_count=0`, `source_document_template=Procurement_*`, ts `2026-09-02T13:52:50.503Z` | Row supplied by owner from the live sheet `1htvKzTTPma9c4n2UjgzN28Eq9sPDJFjJ5qwoTU3n98U`. WebFetch against the sheet failed (auth redirect to `doc-08-54-sheets.googleusercontent.com` returned HTTP 400) — **not** read by me directly. |
| No `…-VALIDATION_FAILED.json` in the job outputs folder; `…-final-report.json` present | Owner-confirmed by inspecting the Drive outputs folder. Not inspected by me. |
| A client-facing report **was delivered** | Owner supplied full raw email incl. headers: `Message-ID autogen-java-d42edd7f-6c86-46b8-8761-c1c90560f9a9@google.com`, `Date: Wed, 02 Sep 2026 13:52:50 +0000`, To `bhagat.taran@gmail.com`, Subject `[Constrovet] Executive Action Plan - form-20260902-135120-81f4fd27`, `dkim=pass`. |
| **The `INR 12` figures predate the EEV2-003 fix** | Executed `node` probe against the five real OCR citation strings copied verbatim from the delivered email. Pre-fix regex reproduces `12` on all four affected docs; post-fix regex returns `34503245.66` on all four. The delivered email is reproducible only under pre-fix code. |
| Root cause of `INR 12` | Source OCR reads `Total Purchase Orders 12`. The pre-fix pattern `(?:₹\|INR\|Rs\.?)` matched the literal `rs` inside "Orde**rs**", so `rs 12` was read as a rupee amount. Confirmed by the executed probe, and consistent with the diff in `603e9ce`. |
| Arithmetic of the delivered headline | 8 docs × INR 12 + 1 doc × INR 454 = **INR 550**, matching the email's "recoverable leakage totals INR 550 across 9 finding(s)" exactly. |
| Fix commit timing | `git show -s 603e9ce` → `2026-09-02 23:19:54 +0530` (= 17:49:54 UTC), ~3h57m **after** the 13:52 UTC send. |
| The repo's form-intake path has **no** delivery-blocking gate | Read `apps-script/Code.gs:160-359`. The only condition guarding the send is `if (isValidEmail(submitterEmail))` at line 289, calling `sendReportEmail` at line 291. `report_quality_status` / `missing_evidence_queue` are computed but only set a job-state label at line 302, after the send. |
| The form path never calls `validatePayload` | `validatePayload` (line 830) requires `job_id` to match `/^cv-[a-zA-Z0-9-]+$/`; this job is `form-`prefixed and enters via `handleBoardroomFormSubmit` (line 160). |
| **The live validation layer exists in no commit in this repo** | `git log --all -S` for `PASSED_VALIDATION`, `action_taken`, `HELD_NOT_SENT`, `initValidationErrorLog` → **0 commits each**, across all 24 branches. Grep was sanity-checked first against known-present strings (`CONSTROVET_ROOT_FOLDER`, `boardroomFirstAmount`) to rule out a broken search. The repo's only sheet writer, `appendBoardroomAuditRow` (line 4942), targets a different spreadsheet (`AUDIT_SPREADSHEET_ID`, line 4990) with a different schema. |

**Conclusion on the open diagnostic item:** RESOLVED. The `INR 12` email
**predates the EEV2-003 regex fix**. It is *not* a separate failure of the
`!validationResult.isValid` branch. The absent blocking gate is a **second,
independent defect** that the EEV2-003 fix does not address.

### 2. What was NOT verified this session

- ~~**The live Apps Script code was never seen.**~~ **AMENDED — see the
  addendum at the end of this entry.** At the time this section was written the
  live code had not been seen. Later in the same session the owner supplied a
  partial copy (~18%), which changed this from "never seen" to "partially seen".
  The statements about the blocking path in §1 still describe the *repo* copy;
  the addendum records what the live copy independently confirmed.
- **Whether the EEV2-003 fix is live right now.** Commit `603e9ce` asserts
  "Already applied and verified live in the Apps Script project prior to this
  commit." This was not independently confirmed and is the single fact that
  decides what the next such submission would send.
- **Whether a `[VALIDATION FAILED]` admin alert email exists** (Contract 1
  artifact #2) — not searched.
- **The test suite was not run this session.** No pass/fail counts are claimed.
  The "26/26 tests, 11/11 suites" figure in `603e9ce` is that commit's claim,
  not a result reproduced here.
- **Whether `34503245.66` would actually reach a delivered report** under the
  fixed regex. The probe shows the regex returns it *in isolation*; downstream
  filters between extraction and the email were not traced.
- Contract 2 (`boardroom-professional-actions-delay-only.csv` should-pass case)
  was not exercised.

### 3. Assumptions made

**Assumption A — owner-supplied artifacts are accurate and unaltered.** The
sheet row, the Drive folder contents, and the email were provided by the owner
rather than read by me (Google auth blocked direct access).
*Pro:* internally consistent — the email `Date` (13:52:50Z) sits 0.5s before the
sheet timestamp (13:52:50.503Z) and 22s after the report's stated generation
time (13:52:28.097Z); the INR 550 total reconciles exactly against the citation
strings. Fabricated inputs would be unlikely to cohere to the millisecond.
*Con:* it remains second-hand. If the pasted row were from the wrong tab or an
edited copy, the "gate did not block" conclusion would need re-testing.

**Assumption B — the pre-fix regex in `603e9ce`'s diff is what actually ran in
production on 2026-09-02.** *Pro:* it reproduces the delivered figures exactly,
on four independent documents, and the post-fix version cannot. *Con:* this
infers live behaviour from repo history while this same session proved the repo
and the live project have diverged. The inference is strong but not a
substitute for the live export.

**Assumption C — the empty session headings in this file were produced by the
`Stop` hook in `~/.claude/settings.json`** (`echo "## Session end: $(date …)" >>
SESSION_LOG.md`). *Pro:* the hook's output format matches the existing headings
character-for-character. *Con:* not observed firing. Note this hook runs *after*
the turn ends and can only stamp a heading — it cannot write the content above,
so summaries land above the stamp, not under it.

### 4. Contract status

- **Contract 1 — FAILED.** The known-bad `Procurement_*` 9-file set produced
  none of the four required artifacts: a report was generated and emailed, no
  `VALIDATION_FAILED.json` was written, and the sheet recorded
  `PASSED_VALIDATION` rather than `HELD_NOT_SENT`. A board pack containing 9
  fabricated cited findings reached an inbox — a breach of the prime directive.
- **Contract 4 — launch gate remains closed.** No client onboarding.

### 5. Open items carried forward

1. Export the live `Code.gs` from the Apps Script editor and diff against the
   repo copy. Blocks any pipeline fix (AGENTS.md guardrail #4).
2. Confirm whether EEV2-003 is live in the Apps Script project today.
3. Search Gmail for `form-20260902-135120-81f4fd27` to settle Contract 1
   artifact #2.
4. **New risk:** the regex fix corrects the *number* but not the *semantics* —
   any figure near a trigger word is still treated as recoverable leakage. Under
   the fixed regex the same documents yield the project's total procurement
   value (₹3.45 crore), a larger client-facing error than ₹12. Needs a
   separate decision.
5. `REVERTED_NOT_SENT` vs `HELD_NOT_SENT` mismatch — still unreconciled, still
   deliberately unchanged.

### Addendum (same session) — partial review of the LIVE `Code.gs`

Supersedes the first bullet of §2. The owner pasted the live `Code.gs` into
chat and stated it is the live file.

**What was received:** the paste was truncated by the harness at its 50,000
character limit. It ends mid-statement at
`if (privateLookingFileName(name)) return { accept: false, reason` — just
before repo line 938. That is approximately **936 of 5,068 lines (~18%)**.
The remaining ~82% was not received.

**Verified from the live copy — and how:** the received 18% happens to contain
all three delivery paths in full, read end to end. In every one, the email send
is reached with no validation gate:

| Live function | Only guard before send | Gate present? |
|---|---|---|
| `doPost` | none — `sendReportEmail` inside a bare try/catch | No |
| `handleBoardroomFormSubmit` | `if (isValidEmail(submitterEmail))` | No |
| `rerunBoardroomJobWithCorrections` | `if (isValidEmail(recipient))` | No |

No `HELD_NOT_SENT`, `PASSED_VALIDATION`, `VALIDATION_FAILED.json` creation, or
`initValidationErrorLog` appears anywhere in the received portion. The live
`handleBoardroomFormSubmit` is structurally identical to the repo's.

This upgrades the §1 finding "no caller gates the send" from a repo-only claim
to one **confirmed against live code**.

**NOT verified — stated explicitly:**

- **Whether EEV2-003 is live remains UNKNOWN.** `boardroomFirstAmount` (repo
  line 1562) and `boardroomLastAmount` (repo line 1572) are ~630 lines past the
  truncation point and were not received. Their live state was *not* inferred
  from the repo. This is still the fact that decides what the next such
  submission would send.
- **Whether a gate exists inside a callee.** Three functions invoked by the
  delivery paths could themselves block a send and are all past the cutoff,
  unexamined: `sendReportEmail`, `finalizeBoardroomEmailDelivery`,
  `buildReport`. Correct statement: *no calling path blocks a send; whether a
  called function does is unknown.*
- **A live-vs-repo diff was not performed.** In the overlapping regions read
  from both (repo lines 1–100, 160–359, 826–855, 938–955) no differences were
  detected, but no mechanical diff was run — the live content existed only as
  truncated chat text. "No differences detected in the fraction compared" is
  the supportable claim; "no differences exist" is not.

**Attempted and failed:** `clasp pull` into a scratch directory (not over the
repo copy), using the `scriptId` from `apps-script/.clasp.json`. clasp 3.4.1 is
installed and `~/.clasprc.json` exists, but the credentials have expired:
`{"error":"invalid_grant","error_description":"reauth related error
(invalid_rapt)"}`. Re-auth needs an interactive browser login, unavailable in
this session. **Unblock:** owner runs `clasp login` once, then a full pull and
a real 5,068-line diff can settle open items 1–3 in one pass.

**Assumption D — the pasted code is genuinely the live export.** Owner-stated.
*Pro:* it is the owner's own project and they had just been asked for exactly
this artifact. *Con:* not independently confirmed; the received portion is
consistent with the repo copy, so a re-paste of the repo file would be
indistinguishable from a live export in the region received. A `clasp pull`
removes this assumption entirely.

### Addendum 2 (same session) — FULL live pull. Major corrections.

Owner re-authenticated clasp. `clasp pull` succeeded into a scratch directory
(repo copy untouched): **30 files, live `Code.js` = 278,015 bytes / 5,876
lines** vs repo `Code.gs` 235,021 bytes / 5,068 lines.

**CORRECTION 1 — Assumption D is FALSIFIED.** The code pasted into chat was
**not** the live file. Live `handleBoardroomFormSubmit` contains a validation
gate at `Code.js:654-671` that is absent from the pasted copy. The paste
matched the *repo*. Every conclusion in Addendum 1 drawn "from live code" was
in fact drawn from repo content and is withdrawn.

**CORRECTION 2 — the claim "no caller gates the send" is WRONG for live.**
Live `Code.js:657-677` is a three-way branch:

```
657  if (technicalExtractionFailures.length) {            -> heldForExtractionFailureDelivery_
662  } else if (!validationResult.isValid) {              -> writes <job>-VALIDATION_FAILED.json
670                                                          -> heldForValidationFailureDelivery_
671  } else if (isValidEmail(submitterEmail)) {           -> sendReportEmail
```

The gate exists, is wired in, and precedes the send. `doPost` (`Code.js:103-134`)
has an equivalent block. The repo has neither.

**CORRECTION 3 — EEV2-003 IS live.** `Code.js:2186` and `:2196` both carry
`\bINR\b` / `\bRs\.?`. Open item 2 is RESOLVED. (Previously UNKNOWN — the
functions sat ~630 lines past the paste truncation.)

**Verified — how:** extracted live `validateReportOutput` verbatim
(`Code.js:219-386`) into `scratchpad/live-validate-extracted.js` and replayed it
under node against findings reconstructed from the **real delivered email**.
Only the 5 findings whose citation text appears verbatim in that email were
replayed; the "…and 1 more" items were not reconstructed (no source text — would
have been fabrication).

Result: **isValid=false, 8 errors, 1 warning.**
4 × `UNVERIFIED_AMOUNT` + 4 × `COUNT_READ_AS_AMOUNT` on the INR 12 findings;
`MULTI_AMOUNT_CITATION` warning on the INR 454 finding.
At `Code.js:662` that means **HELD — `VALIDATION_FAILED.json` written, admin
alerted, client email not sent.** The live gate *would* block this report today.

**Why it passed on 2026-09-02 (inference, not verified):** live CHECK 5b's own
comment at `Code.js:281` lists `"INR 12" x7 findings <- was "Total Purchase
Orders 12"` as an observed failure it was written to catch, and the function
carries a header comment reading *"CORRECTED validateReportOutput … Replace your
old validateReportOutput with this one."* The coherent reading is that an
earlier, weaker `validateReportOutput` ran at 13:52:50 (the sheet row proves
`logValidationError` fired) and CHECK 5b/5c were added afterwards in response.
**Not verified** — no version history of the live project was examined.

**Contract 1 artifact #4 mismatch — CONFIRMED in live code.** `HELD_NOT_SENT`
does not exist anywhere in the live project. `Code.js:435` writes
`validationResult.isValid ? "PASSED_VALIDATION" : "REVERTED_NOT_SENT"`.
`Code.js:1585` uses `email_status: "HELD_VALIDATION_FAILED"`. So even a correct
block will never write the literal string CONTRACTS.md Contract 1 asks for.
Open item 5 is now evidenced rather than assumed.

**Full divergence inventory (repo → live):** 55 diff hunks; 864 lines present
only in live, 55 only in repo; no function exists in repo but not live (the repo
is a strict functional subset). **21 live-only functions**, including the entire
validation layer: `validateReportOutput`, `logValidationError`,
`initValidationErrorLog`, `heldForValidationFailureDelivery_`,
`heldForExtractionFailureDelivery_`, `boardroomTechnicalExtractionFailures_`,
`detectDocumentTemplate`, plus `boardroomDisputedFigures_`,
`boardroomRecomputedRateFindings_`, `boardroomRecomputeStatedRate_`,
`boardroomParseRateContradiction_`, `boardroomCitationDisputeNote_`,
`boardroomVariationOrderEvidence_`, `boardroomSignalStatement_`,
`boardroomFindingStatementLines_`, `boardroomMatchedTerm_`,
`boardroomTruncateWithNotice_`, `boardroomIsTransientDriveError_`,
`claimBoardroomSubmission_`, `getBoardroomResponseId_`,
`renderFindingStatementsEmailHtml`.

**9 files differ; 1 is live-only:**

| File | repo | live |
|---|---|---|
| `Code` | 235,021 | 278,015 |
| `EEV2StructuredRouting` | 1,513 | 3,670 |
| `EEV2LiveScheduleBridge` | 5,890 | 7,607 |
| `EEV2LiveScheduleBridgeRegression` | 3,843 | 5,459 |
| `EEV2ProgressModule` | 10,703 | 11,740 |
| `EEV2ScheduleReconciliation` | 7,546 | 7,917 |
| `EEV2ScheduleStatusModule` | **absent** | 9,457 |
| `EEV2AmountFabricationRegression` | 4,553 | 4,552 |
| `EEV2FullRegressionGate` | 5,331 | 5,330 |

**Still NOT verified after this pull:**
- Why the 2026-09-02 run passed (above — inferred from code comments only).
- Whether the other 4 delivered findings would also fail the gate; their
  citation text was never available.
- The test suite still has not been run this session.
- No live-vs-repo reconciliation has been *performed* — only measured. The repo
  remains 808 lines behind production.


---
## Session end: 2026-09-03 18:01


---
## Session end: 2026-09-03 18:20


---
## Session end: 2026-09-03 18:22


---
## Session end: 2026-09-03 18:41


---
## Session end: 2026-09-03 18:49


---

# EEV2-004 — Trigger-term label ownership — 2026-09-04

Merged from the working `session_log.md` per founder decision 2026-09-04.
Read-only Phase 1 → Phase 4. **Nothing deployed, nothing merged, nothing pushed.**

## Environment

This session had file read/write bridging to `taran-ms-7c95` but **no shell on
that machine**. The repo was staged into a cloud container and `npm test` /
`npm run test:harness` were run there, on real repo files, with real output
pasted below. `clasp` was never run.

Both Phase-1 blockers were cleared from Google Drive without founder action:

| Artifact | Drive id |
|---|---|
| Live Apps Script project, 30 files, `Code.js` = **5877 lines** (exported as `application/vnd.google-apps.script+json`) | `1ous3k8pH6pwyH0g-O44nIvmcQTvr9pYuWSfn2apVlnLFRdPWhc5WWvbo` |
| `form-20260902-184403-e5014284-browser-report.json` | `175FxC-ZipDgeAswX1TlSUSekkryoihyh` |
| `form-20260902-152539-b6de1624-browser-report.json` | `1t5fb7LKflyhysQpsFjWr0yhiTg0HJZsL` |
| `form-20260902-072151-3a11bd12-browser-report.json` (false-positive control) | `10YOeIUUNkYkS-wXmPTm_KsZOBKw4Lbb3` |

`Code.js` = 5877 lines confirms CONTRACTS.md:7's "5,876". Live project
`modifiedTime` = **2026-09-02T17:31:56Z** — load-bearing, see below.

---

## DEFECT A — RETIRED. It does not exist. Two jobs were merged into one symptom.

Live gate at `Code.js:654-677` is real and correctly wired: a three-way branch
(`technicalExtractionFailures` → held; `!validationResult.isValid` → held; else
send), with `logValidationError(jobId, validationResult, browserReport)` at
`Code.js:657` logging pass AND fail through one call. `validateReportOutput` has
exactly ONE definition (`Code.js:219`) and two call sites (`Code.js:103` doPost,
`Code.js:655` form path). No duplicate. Hypotheses (i) and (ii) are both dead.

The live validator, extracted verbatim and replayed against the real findings:

```
===== job 152539 =====
isValid: false | errors: 16 | warnings: 1
  8 x UNVERIFIED_AMOUNT + 8 x COUNT_READ_AS_AMOUNT
===== job 184403 =====
isValid: true  | errors:  0 | warnings: 1   (MULTI_AMOUNT_CITATION)
```

- The **8 × INR 12 findings are job 152539, 15:26Z**. The live project was saved
  at **17:31:56Z, 2h05m later**. CHECK 5b (`Code.js:315`) and CHECK 5c
  (`Code.js:333`) — the checks that produce those 16 errors — did not exist when
  that job ran. Nothing was lost; nothing was there to lose.
- The **`PASSED_VALIDATION` + one `MULTI_AMOUNT_CITATION` row is job 184403,
  18:45Z**, after the save. The validator genuinely returns 0 errors, 1 warning
  for it. **The sheet row is a faithful record of a real pass.**

"Errors are being lost, warnings are not" is **false**. For 184403 the error
count really was zero.

**CONTRACTS.md Open Item 4 → downgrade to "evidenced, one link outstanding", do
not close.** One save timestamp proves *a* save happened between the two jobs; it
does not prove *that* save added CHECK 5b/5c. Apps Script version history was not
accessible from this session.

## DEFECT A′ — the real safety problem, and it is new

**The gate cannot catch Defect B, and job 184403 is the proof.** A ₹27.6 crore
client-facing headline scored `isValid=true`, zero errors, correctly by the
validator's own rules:

- CHECK 5b asks *is this figure next to a currency marker?* `Rs.34503245.66` — yes.
- CHECK 5c asks *does it follow a counting phrase?* It follows `Total Procurement
  Value`, absent from `COUNT_PHRASES` (`Code.js:324`).

**Every check tests whether the number is REAL. None tests whether it BELONGS to
the trigger term.** ₹12 was catchable because 12 is not money. ₹3,45,03,246 is
uncatchable because it *is* money — another line item's. The EEV2-003 fix moved
this defect from inside the net to outside it.

---

## DEFECT B — root cause, `Code.gs:1496-1497`

```javascript
    if (boardroomLeakageRe().test(lower)) {
      const amount = boardroomFirstAmount(span) || Math.max(actual || 0, 0);
```

`.test()` returns a boolean and **discards the match index**. Line 1497 then
scans the whole span from character 0. The trigger decides THAT a finding fires;
`boardroomFirstAmount` independently decides WHICH number it carries.

`boardroomValueNear` (`Code.gs:1549`) already implements proximity and lines
1488-89 already use it for budget/actual. **1497 was the one path in the block
that skipped the mechanism the file already had.**

### Proximity was proposed, measured, and REJECTED. Do not re-propose it.

| Case | Trigger @ | Figure @ | Gap |
|---|---|---|---|
| Job 184403 findings 0-4, 6-8 (**fabricated**) | 123-144 | 108-129 | **−15** |
| Job 184403 finding 5 (cement PO table) | 145 | 212 | +67 |
| `...(NGT) penalty of Rs. 25,00,000` (**genuine**) | 8 | 115 | **+107** |

To block the fabrication you need |N| < 15. To keep the genuine penalty you need
N ≥ 107. **The ranges are inverted — the fabricated figure is CLOSER to its
trigger than the genuine one is. No N exists.**

### The discriminator is OWNERSHIP, not distance

`Rs.34503245.66` is immediately preceded by `Total Procurement Value`. That label
owns the figure; `delay` does not. Same mechanism live CHECK 5c already uses
(40-char preceding window), generalised from counts to any label. The
40-character window is **inherited from that existing check**, not chosen freshly.

### Spec correction — finding 5, accepted by founder 2026-09-04

The brief listed `Rs.454.16` under MUST STILL EXTRACT. The real span shows it is
the cement **unit rate** under column header `Unit Rate`, with the trigger coming
from column header `Delivery_Delay_Days`. Fabricated by the identical mechanism.
**Moved to MUST-BE-0.**

---

## PHASE 3 — implemented

### C2. The suite failed FIRST. Real pre-fix output:

```
EEV2-004 PRE-FIX LABEL OWNERSHIP REGRESSION
{ "ticket": "EEV2-004", "ok": false, "checks": [
  { "check": "fabrication -> 0 : \"PRJ-2026-5578 Document Type Governance Category Procurement ...\"", "pass": false },
  { "check": "fabrication -> 0 : \"PRJ-2026-5578 All Purchase Orders PO_Number Material_Descrip...\"", "pass": false },
  ... 10 further checks pass ...
```

The two failing cases are the exact real spans that emailed a client ₹27.6 crore.
The other four "must be 0" cases already returned 0 before the fix — recorded
honestly rather than presented as newly fixed.

### C4a. `npm run test:harness` — real output, after fix

```
  "ok": true,
  "regression": { "suite_count": 12, "pass_count": 12, "fail_count": 0,
                  "pass_rate_pct": 100, "failed_suite_ids": [] },
  "release_decision": "READY_FOR_CONTROLLED_TEST_PROJECT_VALIDATION",
  "local_guard": { "external_call_count": 0, "passed": true }
```

### C4b. `npm test` — real output, after fix

```
# tests 26
# pass 26
# fail 0
```

Baseline before any edit was also **26/26, 0 fail**. Zero regressions.
(An earlier reading of "3 fail" was an artifact of incomplete file staging into
the container — index.html, claim-companion/*, assets/css/style.css and
.github/workflows/claim-companion-ci.yml were missing. Corrected before baseline
was taken. No repo test was ever failing.)

### Real-world effect on both production jobs

```
===== job 184403 =====                          ===== job 152539 =====
 findings 0-4,6-8: 34503245.66 -> 0              findings 0-4,6-8: 12 -> 0
 finding  5      :      454.16 -> 0              finding  5      : 454.16 -> 0
 shipped: INR 27,60,26,419.44                    shipped: INR 550.16
 after  : INR 0                                  after  : INR 0
```

**Every rupee figure both jobs shipped was fabricated.** Narrative and days
evidence are retained; no finding is dropped.

### C5. Diff summary

| File | +/− | Why |
|---|---|---|
| `apps-script/Code.gs` | +39 / −1 | New `boardroomTriggerOwnedAmount` + `BOARDROOM_LABEL_WINDOW=40`; line 1497 now calls it. `boardroomFirstAmount`/`boardroomLastAmount` deliberately untouched so EEV2-003 stays green. |
| `apps-script/EEV2ProximityRegression.gs` | +127 (new) | EEV2-004 suite. Fixtures are verbatim real `quoted_span` values, not the truncated excerpts from the brief. |
| `apps-script/EEV2FullRegressionGate.gs` | +4 / −2 | EEV2-004 added to `suites` and to `eev2ResolveRegressionFunction` registry. |
| `tests/eev2-evidence-harness.test.mjs` | +2 / −2 | `suite_count` and `pass_count` 11 → 12. |
| `apps-script/EEV2_004_LIVE_CHECK5E.md` | +127 (new) | Paste-ready CHECK 5e for the LIVE `Code.js`. **Not applied.** |

Note: the fallback `|| Math.max(actual || 0, 0)` was **removed** from line 1497,
per B5 property 3 ("must not fall back to the nearest number"). Verified not to
regress the structured budget/actual path, which is a computed difference in
`boardroomCsvBudgetActualFinding` (`Code.gs:1505`) and never routes through here.

---

## CHECK 5e — second layer, founder-approved 2026-09-04, NOT DEPLOYED

Lives only in `apps-script/EEV2_004_LIVE_CHECK5E.md`. Verified offline:

| Job | live today | with CHECK 5e |
|---|---|---|
| 184403 (emailed ₹27.6 cr) | isValid=true, 0 errors | **isValid=false, 9 errors** |
| 152539 (₹12 × 8) | isValid=false, 16 errors | isValid=false, 25 errors |
| 072151 (genuine NGT penalty) | isValid=false, 4 errors | isValid=false, **4 errors**, +4 warnings |

**Scoped deliberately.** The strict form flagged an ESG compliance quotation
(`...quotation of Rs. 3,50,000 ... anti-smog`) on job 072151 that a human reader
would accept. So CHECK 5e raises an ERROR only for `LEAKAGE_AND_OVERRUN` — the
category the defect lives in and the one driving the client-facing headline —
and a WARNING for `BASELINE_BUDGET` and `ESG_METRIC`. Widening it needs a real
counter-example, not an assumption.

---

## PHASE 4 — HANDOFF

### Verified (with the command output above)
- `npm run test:harness`: 12/12 suites, `ok: true`, 0 external calls.
- `npm test`: 26/26, 0 fail. Baseline was also 26/26.
- EEV2-004 suite fails before the fix, passes after.
- Both production jobs replayed through fixed extraction: every shipped figure → 0.
- CHECK 5e replayed against three real jobs including a false-positive control.

### NOT verified
- **That the 17:31:56Z save added CHECK 5b/5c.** Apps Script version history not
  reachable. Single outstanding link in the Defect A explanation.
- **Nothing was run inside Apps Script.** Everything ran under Node in a cloud
  container. Apps Script V8 and Node agree on this JS, but the suite has not
  executed in the TEST project.
- **Live `Code.js` extraction path was not diffed against repo `Code.gs`.** The
  live file is present in the session; the comparison was not run. The fix is
  written against repo `Code.gs:1496-1497`.
- Only 3 of ~20 jobs from 2026-09-02 were replayed.
- Whether `doPost` (`Code.js:103`) and the form path (`Code.js:655`) can both
  fire for one submission.
- Other callers of `boardroomFirstAmount` (`Code.gs:1501` ESG, `Code.gs:1586`)
  were not analysed for the same defect.
- `boardroomLeakageRe` still has **no word boundaries** — `ld`, `late`, `idle`,
  `excess` match inside unrelated words. Latent false-positive source, untouched.

### Live drift — where this repo and production disagree
The repo is **809 lines / 21 functions behind** live. The EEV2-004 extraction fix
is in the repo only; **production is unchanged and still ships the defect.** Two
separate deployments are needed, and the founder holds both:
1. `boardroomTriggerOwnedAmount` + the line-1497 change into live `Code.js`.
2. CHECK 5e into live `validateReportOutput`.
Live `Code.js` line numbers differ from repo `Code.gs` — locate by function name,
not by line.

### The single next test to run by hand
In the Apps Script **TEST** project, run `eev2RunFullRegressionGate()` and confirm
`suite_count: 12, pass_count: 12`. That proves EEV2-004 executes under real Apps
Script V8, which is the one thing this session could not prove.

Do not run any `init*` / setup function.


---
## Session 2026-09-03 (cont.) — Open Item 5 closed; CONTRACTS.md edits applied

**Scope:** apply the six approved CONTRACTS.md corrections (A–F), and close
Open Item 5 by testing against the real production artifact rather than a
reconstruction. No application code changed.

### Verified — and how

| Claim | How |
|---|---|
| The real job artifact has 9 findings, all `LEAKAGE_AND_OVERRUN`, all `CITED_AMOUNT`, amounts `[12 ×8, 454.16]` | Downloaded `form-20260902-135120-81f4fd27-browser-report.json` from Drive (fileId `15i1EnGJzXWRZt3HTavO9sVaGHH_z8XcH`), base64-decoded, byte count 59,609 matched Drive's reported size, parsed with `jq`. |
| **My earlier schema inference was correct** | The previous replay *assumed* `LEAKAGE_AND_OVERRUN` / `CITED_AMOUNT` from the delivered email's summary block. The real artifact confirms both for all 9. This mattered: `STRUCTURED_ACTUAL_BUDGET` findings are exempt from CHECK 5b (`Code.js:294-298`), so a wrong guess would have invalidated the result. The inference is now removed, not just corroborated. |
| **Open Item 5 — RESOLVED.** Live validator vs all 9 real findings: `isValid=false`, **16 errors**, 1 warning | Extracted live `validateReportOutput` verbatim (`Code.js:219-386` from the clasp pull) and replayed under node against the real `findings[]`. 8 × `UNVERIFIED_AMOUNT` + 8 × `COUNT_READ_AS_AMOUNT`. Supersedes the earlier 8-error figure, which came from 5 reconstructed findings. |
| **8 of 9 caught; finding [3] `INR 454.16` NOT caught** | Per-finding breakdown in the replay output. Finding [3] yields **zero errors** — only a `MULTI_AMOUNT_CITATION` warning, which does not affect `isValid`. |
| No `VALIDATION_FAILED.json` exists in the job's outputs folder | Drive file listing for the job — **first-hand this time**, upgrading the earlier owner-reported claim. |

**The `INR 454.16` result is the significant finding.** `Rs.454.16` really is in
the source text — it is the **unit rate for cement per MT** from a PO table,
correctly extracted and then labelled recoverable leakage. Every check the
validator has asks *"is this figure really a currency amount in the cited
text?"*; none asks *"does it mean what the finding says it means."* Had that
submission produced only this finding, `isValid` would have been **true** and the
report would have been delivered. Open Item 7 is therefore demonstrated against
real data, not hypothesised, and the gate as designed does not cover it.

### CONTRACTS.md — all six approved edits now applied

A first attempt applied only edit B before being interrupted; the other five were
verified missing and then applied. Post-edit check confirmed all nine new markers
present and all three stale strings (`and never has`, `8 errors, which at
Code.js:662`, `source text was never available`) gone.

- **A** Artifact 4 split into 4a (validation-errors sheet, `action_taken`) and 4b (audit sheet, `email_status`) — they are written by different functions to different spreadsheets, so the old single-row wording was unsatisfiable. Added footnote that `reverted_to_version` is the hardcoded constant `"7"` (Code.js:436) and carries no information.
- **B** Artifact 1 reworded to "no report is EMAILED" — live writes all report files at `Code.js:628-652`, before the gate at :654, so their presence never indicates gate failure.
- **C** "and never has" trimmed in two places; the live project's version history was never examined.
- **D** Contract 5 canary mitigation made MANDATORY — pin submitter to an internal mailbox; extended to Contract 3's Test B, which is a should-pass case and delivers on every run.
- **E** Status downgraded to "by code inspection and isolated replay"; **Contract 1 explicitly marked UNMET pending a real Test A.**
- **F** Open Item 5 marked RESOLVED with the per-finding result; Open Item 7 rewritten with the `454.16` evidence.

### NOT verified this session

- **No live end-to-end run.** Everything about the gate remains code inspection
  plus an isolated node replay. Contract 1 is unmet by its own standard.
- **Open Item 4 is untouched** — why the 2026-09-02 run passed is still the
  working theory (earlier/weaker validator), with no live version history examined.
- The test suite was not run.
- Contract 2 (should-pass case) still not exercised.
- I did not verify the EEV2-004 / CHECK 5e work recorded in the entry above this
  one; it was not mine and I have not reviewed it.
- **Discrepancy noted, not resolved:** the entry above states the repo is *809*
  lines behind live. My measurement was *808* (live `Code.js` 5,876 − repo
  `Code.gs` 5,068). Whichever is right, one of the two numbers in this file is
  wrong; likely a trailing-newline counting difference.

### Assumption

**The Drive artifact is the one that produced the delivered email.** Its findings
reconcile exactly to the email's headline (8 × 12 + 454.16 = 550.16 → "INR 550"),
its byte count matches Drive's metadata, and its creation timestamp (13:52:28.949Z)
sits between report generation and send. *Pro:* multiple independent
reconciliations. *Con:* the file could in principle have been modified after the
send; `modifiedTime` (13:53:00.045Z) is 31s after creation, which is consistent
with the pipeline's own later `setContent` calls but was not separately confirmed.

---
## Session end: 2026-09-04 16:38



---
## Session 2026-09-04 — EEV2-004 / CHECK 5e post-deployment verification: BLOCKED

**Scope:** verify what actually landed live after the founder deployed
`boardroomTriggerOwnedAmount` + line-1497 and CHECK 5e. Read-only. **No code
changed, no init/setup function run, no deployment or revert attempted.**

**HEADLINE: the deployment could NOT be verified. `clasp` auth is dead, so no
fresh pull was possible. Nothing below describes live code.**

### Steps requested vs. what was possible

| # | Task | Outcome |
|---|---|---|
| 1 | `clasp pull` into fresh scratch dir | **BLOCKED** — `{"error":"invalid_grant","error_description":"reauth related error (invalid_rapt)"}`. `clasp login` needs an interactive browser and hung until timeout; not retried. |
| 2 | Locate live `boardroomTriggerOwnedAmount` / CHECK 5e | **BLOCKED** — depends on (1). Refused to substitute the repo or the 2026-09-03 pull, per explicit instruction and AGENTS.md guardrail #1. |
| 3 | Diff live vs intended | **BLOCKED** — depends on (2). Intended side was read in full and is characterised below. |
| 4 | Live Test A / Test B submissions | **NOT ATTEMPTED** — no capability to submit files to a Google Form (no browser automation), and the Drive/Gmail MCP connectors disconnected this session, so artifacts could not have been read back either. |
| 5 | Confirm 4 Contract 1 artifacts by hand | **BLOCKED** — depends on (4). |
| 6 | Does CHECK 5e cover the INR 454.16 blind spot? | **ANSWERED for the INTENDED fix** — see below. Not answerable for live. |
| 7 | No init/setup functions | Complied. None run. |

### CONTRADICTION — flagged, not resolved (AGENTS.md guardrail #5)

The brief states CHECK 5e was deployed. The repo's own records say it was not:

- `apps-script/EEV2_004_LIVE_CHECK5E.md:3` — `**Status: NOT APPLIED. Paste-ready. The founder holds deploy.**`
- `SESSION_LOG.md:475` — "Paste-ready CHECK 5e for the LIVE `Code.js`. **Not applied.**"
- `SESSION_LOG.md:484` — "CHECK 5e — second layer, founder-approved 2026-09-04, **NOT DEPLOYED**"

Both cannot be true. Resolving this requires the pull. Until then the live state
of CHECK 5e is **UNKNOWN — need a `clasp pull`**.

### Verified — and how (INTENDED fix only; repo + paste-ready doc, NOT live)

Sources: `apps-script/Code.gs` (committed `5f0645b`) for the extraction change;
`apps-script/EEV2_004_LIVE_CHECK5E.md` for CHECK 5e. Both extracted verbatim and
executed under node. Fixture text is the citation span quoted verbatim from the
report email really delivered for job `form-20260902-135120-81f4fd27` —
**email-sourced this session, not artifact-sourced**: the scratchpad holding
yesterday's downloaded `browser-report.json` was cleared, and Drive MCP is
disconnected, so the artifact could not be re-fetched.

**Step 6 answer — the brief's premise is wrong. The intended fix covers the
INR 454.16 case, at BOTH layers:**

| Layer | Result |
|---|---|
| Extraction — `boardroomTriggerOwnedAmount` | returns **0** where `boardroomFirstAmount` returned `454.16`. The finding would carry no amount at all. |
| Validation — CHECK 5e | if such a finding existed anyway: **1 error**, `UNOWNED_AMOUNT`, blocking (category is `LEAKAGE_AND_OVERRUN`). |

Per-marker trace on the real PO span shows why: the 40-char label window before
`Rs.454.16` is `"PO-5578-001Cement (OPC 53 Grade) 144 MT "` — no leakage term, so
the figure is not owned by the "delay" trigger.

**Control cases (extraction layer):**

| Span | `boardroomFirstAmount` | `boardroomTriggerOwnedAmount` |
|---|---|---|
| Procurement boilerplate (the ₹3.45 cr risk flagged 2026-09-03) | 34,503,245.66 | **0** |
| PO unit-rate table (INR 454.16 blind spot) | 454.16 | **0** |
| **False-positive control** — genuine `NGT ... penalty of Rs. 25,00,000` | 2,500,000 | **2,500,000 preserved** |

So the intended fix suppresses both fabricated/unowned figures while leaving a
genuine penalty intact. **Open Item 7 would be closed by this fix — if it is
actually live.**

### NEW DEFECT FOUND in the intended fix — `ld` / `late` false ownership

`boardroomLeakageRe` (`Code.gs:1551`) has no word boundaries. Previously logged
as a latent false-*positive* source. Under EEV2-004 it becomes something worse:
the same regex is now the **ownership test**, so an ordinary word in the label
window can make an unrelated figure look owned — a false **negative** in the
gate, the dangerous direction.

13 of 14 ordinary construction terms tested match via substring:
`Building`, `Scaffolding`, `Welding`, `Moulding`, `Cold storage`, `Field survey`,
`Shield wall`, `Threshold`, `Weldment`, `Boulder soling` (all `"ld"`);
`Shuttering plate`, `Insulated panel`, `Plate girder` (all `"late"`).
Only `Bulkhead` did not match.

Realistic spans, run through `boardroomTriggerOwnedAmount`:

    "Shuttering plate hire for slab casting Rs.2,40,000 billed..."  -> 240000
    "Cold storage civil works Rs.15,00,000 as per BOQ item 4.2"     -> 1500000
    "Boulder soling works completed at plot boundary Rs.8,75,000"   -> 0 (window fell short)

Two of three produce a figure claimed as `LEAKAGE_AND_OVERRUN` because a word
contained `ld` or `late`. This weakens both the extraction fix and CHECK 5e,
since both use this regex as the ownership predicate. **Not a reason to revert
EEV2-004** — it is still a large net improvement — but it should be fixed with
word boundaries and a regression fixture before Contract 4 is considered.

### Discrepancies in the EEV2-004 documentation — flagged, unverifiable now

- `EEV2_004_LIVE_CHECK5E.md:31-33` attributes "INR 12 × 8 / isValid=false, 16
  errors" to job `form-20260902-152539-b6de1624`. The job measured at exactly 16
  errors on 2026-09-03 was `form-20260902-135120-81f4fd27`. Two different IDs,
  identical profile. Either two similar jobs exist or one ID is a transcription
  error. Not resolvable without Drive.
- The same doc cites job `form-20260902-184403-e5014284` as having emailed a
  client an **INR 27,60,26,419** headline. That incident is larger than the one
  this log has tracked and has never had its own Contract 1 check. It should get
  one.

### NOT verified this session

- **Anything about live code.** No pull. The live state of
  `boardroomTriggerOwnedAmount`, the line-1497/1506 call site, and CHECK 5e is
  entirely UNKNOWN. Whether the founder's deployment matches the intended text —
  the actual question asked — is unanswered.
- Contract 1 and Contract 3 were **not** re-run. No live submission was made.
  Contract 1 remains UNMET, exactly as CONTRACTS.md already states.
- No Contract 1 artifact was inspected (no email, no `VALIDATION_FAILED.json`,
  no sheet row) — Drive and Gmail connectors are down.
- CHECK 5e was **not** executed inside Apps Script V8, only under node.
- The EEV2-004 regression suite (`EEV2ProximityRegression.gs`) was not run, and
  `eev2RunFullRegressionGate()` was not run — neither locally nor in the TEST
  project. No pass/fail counts are claimed.
- The `ld`/`late` finding is demonstrated on **constructed** spans that use real
  construction vocabulary; it is not yet demonstrated on a real production
  document.

### Assumptions

**Assumption E — the repo's committed `boardroomTriggerOwnedAmount` (5f0645b) is
textually what the founder deployed.** Used only to characterise the *intended*
fix; every conclusion above is labelled as intended-not-live.
*Pro:* it is the only committed version, and the brief describes deploying "the
line-1497 change", matching `Code.gs:1506`. *Con:* the brief also says the
deployment was not diffed before going out, which is precisely the scenario where
deployed text drifts from committed text. This assumption is why step 3 cannot be
faked and was refused rather than estimated.

**Assumption F — the email-quoted citation span equals the artifact's
`quoted_span`.** *Pro:* on 2026-09-03 the same span, read from the real Drive
artifact, produced results consistent with the email. *Con:* the email renders
with soft line wrapping; a whitespace difference could shift the 40-character
label window, which is load-bearing for every ownership result above. The
Drive artifact is the authority and should be re-read when connectors return.

### The single most important next test

**Re-authenticate and pull, then diff — nothing else is worth doing first.**

    clasp login                       # founder, interactive
    # then, into a scratch dir only:
    clasp pull
    grep -n "boardroomTriggerOwnedAmount\|CHECK 5e\|UNOWNED_AMOUNT" Code.js

Confirm three things: (a) `boardroomTriggerOwnedAmount` exists live and matches
`Code.gs:1581-1600` character-for-character; (b) the leakage call site uses it,
not `boardroomFirstAmount`; (c) CHECK 5e is present inside `validateReportOutput`
immediately before `// CHECK 6`. Until that runs, the deployment is unverified
and Contract 1 stays UNMET.

---
## Session end: 2026-09-04 16:51



---
## 2026-09-04 17:00 — INCIDENT: the deployment WIPED the live validation layer

**Severity: production has no validation gate right now.** Verified by
`clasp pull` at 2026-09-04 17:00 into a scratch dir. Read-only; nothing changed,
reverted or redeployed.

### What happened

The deployment overwrote live `Code.js` with the repo's `apps-script/Code.gs`.
`diff` reports **2 differing lines — a trailing newline and nothing else.**

| | lines | bytes |
|---|---|---|
| live `Code.js` pulled 2026-09-03 | 5,876 | 278,015 |
| **live `Code.js` pulled 2026-09-04 17:00** | **5,106** | **237,153** |
| repo `apps-script/Code.gs` | 5,107 | 237,154 |

**770 lines / ~41 KB of live-only code were destroyed.**

### Confirmed present / absent in live, by grep

**Live (EEV2-004 did land):**
- `BOARDROOM_LABEL_WINDOW = 40` — `Code.js:9`
- `boardroomTriggerOwnedAmount` — defined `Code.js:1581`, called `Code.js:1506`

**ABSENT — the entire validation layer:**
`validateReportOutput`, `logValidationError`, `initValidationErrorLog`,
`heldForValidationFailureDelivery_`, `heldForExtractionFailureDelivery_`,
`boardroomTechnicalExtractionFailures_`, `detectDocumentTemplate`,
`VALIDATION_LOG_SHEET_ID`, `PASSED_VALIDATION`, `REVERTED_NOT_SENT`,
`HELD_VALIDATION_FAILED`, `CHECK 5b`, `UNVERIFIED_AMOUNT`, `COUNT_READ_AS_AMOUNT`.

**ABSENT — CHECK 5e was never applied**: no `UNOWNED_AMOUNT`, no
`OWNERSHIP_RE_BY_CATEGORY`. The repo's own status line was correct all along;
the brief's premise that it had been deployed was wrong.

(The 2 remaining `CHECK 5c` hits at `Code.js:6` and `:1574` are comment prose
inside the EEV2-004 block referring to a check that no longer exists live.)

### The send path in live today

    let emailDelivery = missingUserEmailDelivery(jobId);
    if (isValidEmail(submitterEmail)) {
      try {
        emailDelivery = sendReportEmail(submitterEmail, jobId, report, ...);

One guard: is the address well-formed. **The three-way branch is gone.** No
`VALIDATION_FAILED.json` can be written, no `[VALIDATION FAILED]` alert can be
sent, no row can reach `ConstroVet-Validation-Errors` — the sheet ID constant
itself no longer exists in the deployed code. This is the pre-incident
2026-09-02 architecture.

### Contract status

- **Contract 1 — CANNOT PASS.** Not "unmet pending a test": three of the four
  required artifacts are now unproducible by construction.
- **Contract 2 — CANNOT PASS.** No `PASSED_VALIDATION` row can be written.
- **Contract 4 — launch gate hard closed.**

### Partial mitigation (do not over-rely on it)

EEV2-004 *is* live, and it suppresses the known fabrication classes at the
extraction layer — replayed this session, `boardroomTriggerOwnedAmount` returns
`0` for both the Procurement boilerplate (was ₹3.45 cr) and the PO unit-rate
span (was ₹454.16), while preserving a genuine `penalty of Rs. 25,00,000`. So
the specific defects that caused the original incident are blocked at source.

But there is now **no backstop behind it**, and the `ld`/`late` word-boundary
hole in `boardroomLeakageRe` (logged earlier today) lets ordinary construction
vocabulary — `Building`, `Welding`, `Cold storage`, `Shuttering plate` — satisfy
the ownership test. Anything EEV2-004 misses now goes straight to a client.

### Recovery

**No local copy of the lost code exists.** Yesterday's 5,876-line pull was in the
session scratchpad, which has since been cleared; `find` across `/tmp` returns
only today's 5,106-line pull. `validateReportOutput` survives in this repo only
as prose in `CONTRACTS.md` / `SESSION_LOG.md` and as the CHECK 5e patch in
`EEV2_004_LIVE_CHECK5E.md` — **not as a recoverable full function body.**

The only restore source is **Apps Script's own version history** in the editor
(File → Version history), which was never examined and is now the single most
valuable artifact in the project. It should be opened before any further edit to
the live project, because continued editing can age out or complicate the
restore point.

### NOT verified

- Whether Apps Script version history actually retains a pre-deployment version
  — not checked; no access from here.
- When the overwrite happened, or whether any submission ran against the
  gate-less code since. No job folders or sheet rows were inspected (Drive and
  Gmail connectors are disconnected this session).
- Whether the live `boardroomTriggerOwnedAmount` is character-identical to
  `Code.gs:1581-1600` — the byte-level diff shows only the trailing newline
  differing across the whole file, which implies identity, but the function was
  not separately diffed.
- No live submission was made; Contract 1 and Contract 3 were not re-run.

### The single most important next action

**Open Apps Script → File → Version history and confirm a pre-deployment version
exists.** If it does, that is the restore path for the validation layer. Do not
make further live edits until that check is done. Founder holds the decision;
no revert was attempted from here.

---
## Session end: 2026-09-04 17:02



---
## 2026-09-04 19:00 — Phases 0-2: intake path resolved, V11 RECOVERED, no traffic lost

Read AGENTS.md + CONTRACTS.md in full first. Read-only throughout. **No
`clasp push`, no deploy, no version change, no `init*` function, no revert.**

### PHASE 0 — ANSWERED: real traffic runs on the installable `onFormSubmit` trigger

**One sentence:** every real submission reaches this project through the
installable `onFormSubmit` trigger on the script, which executes the script's
current saved HEAD, **not** through any Web App deployment.

Evidence (all first-hand this session):

1. **Traffic fingerprint.** Gmail, `subject:Constrovet newer_than:7d in:anywhere`
   — ~201 matching threads, 29 inspected. **Every** report carries a `form-`
   prefixed job id and `Mode: FORM_INTAKE_REPORT`. **Zero `cv-` jobs exist.**
2. **`form-` ids are minted in exactly one place.** `Code.js:854`
   `` return `form-${stamp}-${random}`; `` inside `makeBoardroomJobId`, called
   only at `Code.js:167` inside `handleBoardroomFormSubmit`.
3. **That function is reached only from the trigger.** `Code.js:157`
   `function onFormSubmit(e) { return handleBoardroomFormSubmit(e); }`, and
   `Code.js:578` `ScriptApp.newTrigger("onFormSubmit").forForm(form).onFormSubmit().create()`.
4. **The Web App path cannot produce these jobs.** `doPost` → `validatePayload`
   requires `job_id` matching `/^cv-[a-zA-Z0-9-]+$/`; a `form-` id throws
   "Valid job_id is required." (Verified in the repo copy, which is currently
   byte-identical to live — see below.)

**Certainty: high on the mechanism.** Not verified directly: the Triggers panel
and the Google Form's own settings are browser UI and were not opened, so a
*second* trigger, or a Web App path that produces no email, cannot be excluded.
Neither would change the conclusion for the traffic that actually generates
client reports.

**CONSEQUENCE — this is the load-bearing finding.** Installable triggers ignore
deployment version labels and always run current HEAD. Therefore:
- The wipe is live for real traffic **right now**. There is no "an older
  deployment is still serving clients" cushion.
- **Rolling back or re-pointing a deployment will NOT restore the gate.** The
  fix must write code back to HEAD.

### No traffic has been lost — two independent confirmations

- Gmail: newest Constrovet report is `form-20260902-184403-e5014284`,
  **2026-09-02 18:45:11Z**. Nothing on 09-03 or 09-04.
- Drive: newest job folder is the same job, created **2026-09-02 18:44:04Z**.
  A control query (same shape, no date bound) returns many 09-02 folders, so the
  empty post-09-03 result is real, not a malformed query.

**No submission has run since the wipe. No client report has gone out ungated.**

### PHASE 1 — verified inventory of the real live path (HEAD, pulled 18:59)

Live HEAD: **5,106 lines / 237,153 bytes**. Two independent pulls (17:00 and
18:59) agree. Byte-identical to repo `apps-script/Code.gs` apart from a trailing
newline.

| Function | in real live path? | tested this session | result |
|---|---|---|---|
| `validateReportOutput` | **ABSENT** | n/a | gate cannot run |
| `logValidationError` | **ABSENT** | n/a | no sheet row can be written |
| `initValidationErrorLog` | **ABSENT** | not run (hard stop) | — |
| `boardroomTriggerOwnedAmount` | PRESENT (1581) | yes, extracted from live | works as intended |
| `boardroomFirstAmount` | PRESENT (1601) | yes | EEV2-003 fix present |
| `boardroomLastAmount` | PRESENT (1611) | yes | EEV2-003 fix present |
| `handleBoardroomFormSubmit` | PRESENT (165) | not executed | send guarded only by `isValidEmail` |
| `doPost` | PRESENT (60) | not executed | not in the real traffic path |
| `sendReportEmail` | PRESENT (4036) | not executed | reachable with no gate before it |
| `onFormSubmit` | PRESENT (157) | not executed | delegates to the above |

**Confirmed working:** EEV2-004 extraction. Live functions extracted and run:

    Procurement boilerplate (was 3.45cr)   firstAmount 34503245.66 -> triggerOwned 0
    PO unit-rate row (was 454.16)          firstAmount      454.16 -> triggerOwned 0
    CONTROL genuine NGT penalty            firstAmount     2500000 -> triggerOwned 2500000

**Confirmed broken:** the whole validation/blocking layer (absent).
**Confirmed broken — `ld`/`late` false ownership, now demonstrated in LIVE code:**

    Cold storage civil works Rs.15,00,000      -> triggerOwned 1500000
    Shuttering plate hire ... Rs.2,40,000      -> triggerOwned  240000

Both figures are claimed as LEAKAGE_AND_OVERRUN because an ordinary word
contains `ld` / `late`. With no validation layer behind it, nothing catches this.

**Unknown — could not verify:** whether a second trigger exists; whether any
Web App deployment receives traffic; Apps Script quota/runtime behaviour.

### PHASE 2 — Version 11 RECOVERED (read-only; no restore performed)

`clasp list-versions` → 12 versions. **`clasp pull --versionNumber 11`** succeeded
— this is a read and needed no founder action.

**V11 `Code.js` = 5,876 lines / 278,015 bytes — byte-for-byte the size of the
2026-09-03 pull.** V11 is what was live yesterday. Validation layer intact:
`validateReportOutput`, `logValidationError`, `initValidationErrorLog`,
`heldForValidationFailureDelivery_`, `VALIDATION_LOG_SHEET_ID`,
`PASSED_VALIDATION`, `REVERTED_NOT_SENT`, `UNVERIFIED_AMOUNT`,
`COUNT_READ_AS_AMOUNT` all present. EEV2-003 present (`:2186`, `:2196`).

**Preserved locally** (the session scratchpad was wiped twice today, so this was
not left there): `recovery-v11/Code.v11.js` and `recovery-v11/Code.v12-current-HEAD.js`,
UNTRACKED in the repo working tree. sha256 of V11 begins `c049a91156fcb749`.
Delete freely once recovery is done — they are evidence copies, not code changes.

**Exactly what the deploy did:** 864 lines lost, 94 gained. 21 functions lost:
`validateReportOutput`, `logValidationError`, `initValidationErrorLog`,
`heldForValidationFailureDelivery_`, `heldForExtractionFailureDelivery_`,
`boardroomTechnicalExtractionFailures_`, `detectDocumentTemplate`,
`boardroomDisputedFigures_`, `boardroomRecomputedRateFindings_`,
`boardroomRecomputeStatedRate_`, `boardroomParseRateContradiction_`,
`boardroomCitationDisputeNote_`, `boardroomVariationOrderEvidence_`,
`boardroomSignalStatement_`, `boardroomFindingStatementLines_`,
`boardroomMatchedTerm_`, `boardroomTruncateWithNotice_`,
`boardroomIsTransientDriveError_`, `claimBoardroomSubmission_`,
`getBoardroomResponseId_`, `renderFindingStatementsEmailHtml`.
**Exactly one function gained:** `boardroomTriggerOwnedAmount`.

**CHECK 5e status — verified, not assumed: NOT DEPLOYED and never was.**
`UNOWNED_AMOUNT` is absent from V11 *and* from V12. The repo's own
"NOT APPLIED" status line was correct; the brief's premise was wrong.

**Merge plan (proposal — founder executes):** start from `Code.v11.js`; apply the
94 V12-only lines, i.e. `BOARDROOM_LABEL_WINDOW` (`:9`), the
`boardroomTriggerOwnedAmount` body, and the single call-site change in the
leakage branch; add word boundaries to `boardroomLeakageRe` in the same change,
since it is the ownership predicate for the fix being restored and is
demonstrably broken; decide CHECK 5e deliberately. Rollback = V12 is preserved
and is also reproducible by `clasp pull --versionNumber 12`.

### NOT verified this session

- No live submission. Contract 1 and Contract 3 **not** re-run; Contract 1 stays
  UNMET, and is currently **unpassable** (three of four artifacts unproducible).
- Triggers panel and Form settings not inspected (browser UI).
- V11 not diffed function-by-function against the 2026-09-03 pull beyond byte
  count — the 2026-09-03 copy no longer exists to diff against.
- `boardroomTriggerOwnedAmount` in live not character-diffed against
  `Code.gs:1581`; whole-file diff shows only a trailing newline differing, which
  implies identity.
- The `ld`/`late` demonstration uses constructed spans with real construction
  vocabulary, not a real production document.
- Phases 3-5 of the master prompt (staging proposal, AGENTS.md delegation
  section, ROADMAP.md) not yet written.

### The single most important next action

**Founder merges V11 + EEV2-004 + the `boardroomLeakageRe` word-boundary fix and
pushes it to HEAD.** Not a deployment change — HEAD is what the trigger runs.
Until then production has no gate. Nothing has been lost yet only because no
submission has arrived since 2026-09-02 18:44; the next one is unprotected.

---
## Session end: 2026-09-04 19:01



---
## 2026-09-04 19:15 — Phases 3-5 delivered (documents only)

Written this turn, no code and no live change:

- **AGENTS.md** — appended a permanent "Delegation boundaries" section (Phase 4):
  what an agent may do autonomously (reads, including
  `clasp pull --versionNumber`), what needs written approval, what only the
  founder may ever execute (`clasp login`, `clasp push`, version/deployment
  changes, sheet-structure changes, any `init*`), and a stop-and-report rule for
  any live/expected mismatch. Also records the intake-path fact permanently so it
  is never re-derived: real traffic runs the `onFormSubmit` trigger on HEAD, so
  **a deployment rollback does not restore code**.
- **STAGING_PROPOSAL.md** (new, Phase 3) — proposal only, nothing built. Option A:
  a separate Apps Script project with its own form, sheets and Drive root.
  Option B ("second deployment of the same script") is recorded as **rejected** —
  one HEAD, one trigger, no real isolation — so it is not re-proposed. Notes that
  staging is the one sanctioned place to run `initValidationErrorLog()`, against
  the staging sheet only.
- **ROADMAP.md** (new, Phase 5) — goal, sequencing rule, and 7 milestones each
  with a pass/fail test. **Active milestone recorded as 2.** Milestone 1 marked
  DONE with its evidence. Milestone 3 (`ld`/`late`) is deliberately folded into
  milestone 2's push rather than left as a follow-up, because the same regex is
  the ownership predicate for the fix being restored. Milestone 7 adds the
  scheduled gate self-check the master prompt flagged as a gap.

### NOT verified

- These are documents; nothing in them has been executed or tested.
- Milestone 2 remains untouched: production still has no validation layer.
  Contract 1 is still unpassable, and no live submission has been made.
- The staging proposal's setup steps have not been trialled; effort and the
  Advanced Drive service requirement are read off `apps-script/README.md`, not
  confirmed by building it.

### Working-tree state at end of session

Modified: `AGENTS.md`, `SESSION_LOG.md`.
New, untracked: `ROADMAP.md`, `STAGING_PROPOSAL.md`, `recovery-v11/`.
Nothing committed, nothing pushed, nothing deployed — founder holds all of that.

### Next action, unchanged from 19:00

Merge V11 + EEV2-004 + the `boardroomLeakageRe` word-boundary fix and push to
**HEAD**. That is milestone 2, and it is the only thing standing between
production and the next unprotected submission.

---
## Session end: 2026-09-04 19:10


---
## Session end: 2026-09-04 19:13


---
## Session end: 2026-09-04 19:23

