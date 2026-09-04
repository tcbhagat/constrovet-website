
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

