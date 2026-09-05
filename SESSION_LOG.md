
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


---
## Session end: 2026-09-04 19:25


---
## Session end: 2026-09-04 21:39


---
## Session end: 2026-09-04 21:49


---
## Session end: 2026-09-04 21:52


---
## Session end: 2026-09-04 21:55


---
## Session end: 2026-09-04 21:57


---
## Session end: 2026-09-04 21:59


---
## Session end: 2026-09-04 22:00



---
## 2026-09-04 21:50 — Six-lens structural audit + integration edits

**Scope:** User requested a six-technique "atomic reasoning" audit (hyperfocus,
divergent ideation, pattern analysis, contradiction hunting, pre-mortem,
cross-domain translation) run in sequence against the recovery plan produced
this session, then asked for the findings integrated into one robust system.
No code executed, nothing pushed or deployed — this is documentation-layer work
only, consistent with every other change made today.

### What each lens found (full reasoning in the conversation transcript)

1. **Hyperfocus** — Apps Script's browser editor makes editing and publishing
   the same keystroke; Milestone 6's CI check is git-mediated and cannot see a
   direct editor save. Milestone 7 (labeled "fast-follow" in the original draft)
   is actually the only defense against this, not a lower-priority add-on.
2. **Divergent ideation** — 15 cross-domain ideas (nuclear SCRAM, cryptographic
   nonce-reuse-as-metaphor-for-`reverted_to_version="7"`, golden-sample
   formalization, ATC read-back, orchestral tuning-note doc-version pinning,
   four-eyes failure mode, kata-style cooling-off period, among others).
3. **Pattern analysis** — every defect this project has produced, across every
   layer (regex, schema, naming, deploy mechanics, provenance, and — live, in
   this conversation — scope/goal) shares one shape: an assumed boundary that
   wasn't verified. Detection has never once been by design; every past catch
   was accidental. Milestone 1's structured-investigation methodology is the
   one exception found.
4. **Contradiction hunting** — found and resolved: (a) "autonomous,
   self-sustaining, self-improving" vs. the "Human-reviewed" answer chosen
   earlier this session for the Brain's feedback loop; (b) "integrate now" vs.
   `BRAIN_ROADMAP.md`'s own Milestone-2-gate; (c) "unassailable" vs.
   `CONTRACTS.md`'s own nine listed Known Gaps; (d) the still-open 808/809
   line-count discrepancy in this very file (lines 530, 597 — not yet fixed by
   this entry, flagged again, not silently reconciled); (e) `AGENTS.md` and
   `CONTRACTS.md` independently maintaining a word-for-word identical "Hard
   stops" list with no cross-reference.
5. **Pre-mortem** — ten failure modes ranked by likelihood × cost. Top three:
   Milestone 6 shipping while believed to close what only 7 closes (HIGH /
   CATASTROPHIC); founder review-fatigue under increasing load, precedented by
   the actual 2026-09-04 incident (HIGH / HIGH); the Brain's immutable KG
   getting seeded from a validation gate proven once, not durably, per
   Contract 4's "multiple consecutive fresh runs" bar vs. Milestone 2's
   single-run pass test (MEDIUM / VERY HIGH).
6. **Cross-domain translation** — the fracture-critical bridge analogy (I-35W,
   2007): every control in this plan currently has exactly one load path
   (founder attention), which already failed once under the exact condition
   it will face again. The fix is structural (a second, independent path),
   not behavioral (asking the one existing path to try harder).

### Edits made to integrate the findings (all local, nothing pushed/deployed)

- **`ROADMAP.md`:**
  - Added a caveat under Milestone 6 stating explicitly that its check is
    git-mediated and does not close the editor-bypass risk.
  - Re-titled Milestone 7 from "fast-follow, post-milestone 2" to "load-bearing,
    not a fast-follow"; added a second, required pass-test criterion — a
    circuit-breaker that halts the send pipeline automatically on detected gate
    failure, not just an email alert. **Not yet built — a new design
    requirement, stated as such.**
  - Added a "Redundancy principle" section under Rule of Sequence: no
    safety-critical step may depend on exactly one load path (the bridge
    finding, made a standing rule for all future milestone work).
  - Added "Golden-sample governance" to Milestone 2: `recovery-v11/Code.v11.js`
    may only be replaced by a deliberate, logged decision, never a silent edit.
- **`AGENTS.md`:** Removed the duplicated Hard Stops list; it now points to
  `CONTRACTS.md`'s copy as canonical, closing the exact drift-precondition the
  contradiction-hunting pass caught live.
- **`BRAIN_ROADMAP.md`:**
  - Added a precise, binding definition of "self-improving": the system may
    autonomously *propose* a KG delta or extraction refinement; it may never
    autonomously *apply* one to what a client sees. This is the resolution to
    finding 4(a) above, not a dodge of it.
  - Added a structured read-back requirement to the human-approval step
    (Subgoal 3, step 4): the approver must affirmatively state what changed,
    not click a single approve button — closing pre-mortem finding 5 (rubber-
    stamping at scale) before the Brain has any real volume to expose it under.
- **`MILESTONE_PROMPT_SERIES.md`:**
  - Standing preamble now requires every prompt to quote the git commit hash of
    `ROADMAP.md` it read (the tuning-note fix for prompt-to-prompt drift).
  - Prompt 1's handoff now explicitly states two requirements on the founder's
    own push action: a cooling-off period before pushing, and a structured
    read-back of the specific merge/regex decisions — not a blanket approval.

### What this did NOT do — stated honestly, not papered over

- Did not build the Milestone 7 circuit-breaker, the golden-sample enforcement,
  or any UI for the Brain's structured read-back. All of the above are now
  *required design elements*, written into the governing documents — none are
  implemented. `ROADMAP.md`'s own milestones still gate all of that behind
  founder execution, unchanged.
- Did not resolve the still-open 808/809 discrepancy (this entry names it
  again rather than guessing which number is right).
- Did not touch `CONTRACTS.md` — its Hard Stops section is now the sole
  canonical copy, referenced rather than duplicated, but its content is
  unchanged and no wording in it was altered (CONTRACTS.md wording changes
  require separate explicit approval per AGENTS.md's Delegation Boundaries).
- Did not build or provision anything for the Brain track — `BRAIN_ROADMAP.md`
  remains design-only, unchanged in status.
- The pre-mortem's remaining seven risks (staging drift, second-system sprawl
  for Utopia, budget-guardrail bypass under pressure, correction-loop
  overload, model-pin staleness, and others) are recorded in the transcript
  but not yet written into any governing document. Carried forward, not
  resolved.

### Next action, unchanged in substance from earlier today

Milestone 2 is still not done. Production still has no validation gate. Every
edit made in this entry strengthens the plan for restoring it; none of it
restores it. That remains `MILESTONE_PROMPT_SERIES.md` Prompt 1, run by the
founder's own choice, on the founder's own timeline.

---
## Session end: 2026-09-04 22:05



---
## 2026-09-04 22:15 — Building autonomously: merge candidate, circuit-breaker,
## golden-sample enforcement (nothing pushed; founder commands listed below)

**Scope:** user asked to proceed on the three items flagged as "required,
still unbuilt" after the six-lens audit, building autonomously wherever
possible and asking for founder-run terminal commands wherever not. Auto mode
active. No `clasp login`, `clasp push`, deployment/version change, live sheet
change, or `init*` function was run — all founder-only per AGENTS.md, all
still pending founder action.

### 1. The merge candidate (Milestones 2+3) — built, tested, NOT pushed

Extracted the real diff between `recovery-v11/Code.v11.js` (golden sample) and
`recovery-v11/Code.v12-current-HEAD.js` before writing anything, rather than
trusting the prior session's 94-line-diff summary. **This surfaced three
previously undocumented regressions from the 2026-09-04 wipe**, beyond the
validation layer already known lost:
- `boardroomVariationOrderEvidence_` — V11 correctly classified approved
  variation/change orders as `BASELINE_BUDGET` (monitor), not leakage. V12
  lost this distinction entirely.
- `boardroomSignalStatement_` — V11's richer finding narrative (names the
  trigger term, states "supporting evidence is required before any recovery
  action"). V12 replaced it with a flatter, less informative statement.
- `boardroomRecomputedRateFindings_` — an arithmetic cross-check on ESG rate
  claims. Also: `findings.push(...recomputedRateFindings)` and
  `findings.push(...scheduleStatusFindings)` are simply absent from V12's
  version of the function — `scheduleStatusFindings` is computed nowhere and
  never reaches output at all in V12.

Built `recovery-v11/Code.merged-candidate.js` from V11 (not V12), applying
exactly four targeted changes, each guarded by a Python assertion that the
target text existed exactly once before replacing it:
1. Added `BOARDROOM_LABEL_WINDOW = 40`.
2. Swapped the leakage-amount call site to `boardroomTriggerOwnedAmount`,
   preserving V11's `boardroomSignalStatement_` narrative (not V12's flatter one).
3. Added `boardroomTriggerOwnedAmount` (verbatim from V12 — this function itself
   was correct, only its regex input needed fixing).
4. Fixed `boardroomLeakageRe`.

**On point 4 — corrected a claim from earlier in this session.** The prior
6-lens audit asserted both `ld` and `late` were live substring-match bugs.
Testing V11's actual regex (not V12's, which was what earlier tests
unknowingly used) against a 30-word construction-vocabulary sweep found:
**V11 already had the `\bld\b` fix**, applied 2026-09-01, and it worked
correctly — "Cold storage," "Building," "welding," "ladder," "solder," 12
other terms all correctly did not match. **The only live substring bug is
bare `late`**, matching inside "plate," "template," "escalated," "calculate,"
"translate," "relate," "inflate." Separately, and worse: **V12 (current live
HEAD) regressed the `\bld\b` fix that V11 already had** — live's regex has
bare `ld`, V11's has `\bld\b`. This is a fourth previously-undocumented
regression from the wipe. The fix applied here is `\blate\b` only, precisely
scoped to the actual measured defect — not both terms, since one was already
fixed and the fix should not be described more broadly than the evidence supports.

**Verification, all against the real candidate file, not a reconstruction:**
- `node --check` — valid syntax.
- Functions extracted directly from the file via a byte-offset brace-matcher
  and executed — not re-typed from memory — confirming: the two original false
  positives (Cold storage, Shuttering plate) now return 0; the two original
  2026-09-02 incident amounts (₹3.45cr procurement boilerplate, ₹454.16 unit
  rate) now return 0; the NGT penalty control and two other genuine cases
  (liquidated damages, standalone "late fee") still correctly return nonzero.
- Full existing 12-suite harness (`scripts/run-eev2-harness.mjs`), run against
  the candidate in an isolated scratch copy — **never against the tracked repo's
  `apps-script/Code.gs`**, since overwriting that file would itself jump ahead
  of founder review. Result: 12/12 pass, including EEV2-004's own "Trigger-term
  label ownership guard" suite.
- **A gap found in the existing suite, independent of anything built today:**
  the same 12/12-pass, `READY_FOR_CONTROLLED_TEST_PROJECT_VALIDATION` result
  was obtained running the harness against the *current, unmodified* repo
  `apps-script/Code.gs` — which has NO validation layer at all. The existing
  test suite does not check for the gate's presence. It would have said
  "ready" the entire time production had no gate, had anyone run it. This is a
  real, separate defect in the test suite itself, not yet fixed, carried
  forward.

New regression file: `apps-script/EEV2LeakageWordBoundaryRegression.gs`
(ticket EEV2-005), matching the house style of the 15 existing `EEV2*.gs`
files exactly. **Negative-control tested**: run against the deliberately
unfixed regex, 3 of 4 fabrication checks correctly fail (the exact "plate"/
"template" cases), proving the test detects the bug it claims to, not
vacuously passing. **Not wired into `EEV2FullRegressionGate.gs`'s suite
list** — that's "a new regression suite becoming part of the release gate,"
which needs explicit approval per `AGENTS.md`. The one line it would take is
named in this entry's command list below, left for the founder to add.

Diffs written: `recovery-v11/Code.v11-to-candidate.diff` (170 lines — this is
the one to actually review) and `recovery-v11/Code.v12-to-candidate.diff`
(1,344 lines — restores V11's full content, not a small patch on V12; large
by design, not by accident).

### 2. The circuit-breaker (Milestone 7) — built, tested, NOT live

Bundled into the same candidate file rather than deferred, since Milestone 7's
own re-prioritization (this session, six-lens audit) makes it co-primary with
Milestone 2, not a later add-on.

Design choice, applying this same session's own redundancy finding to itself:
enforced the kill-switch inside `sendReportEmail` — the single function all 5
send call sites funnel through — rather than adding a separate check at each
of the 5 call sites independently. Five independently-maintained checks is
exactly the boundary-conflation shape this whole audit was about; one
enforcement point closes it structurally instead of by discipline.

- `GATE_HEALTH_PROPERTY` constant + guard clause at the top of `sendReportEmail`:
  throws `GATE_HEALTH_FAILED: ...` if set to `"FAILED"`. Reuses existing
  `failedEmailDelivery`/`email_error` machinery at every call site — no call
  site needed modification, confirmed by reading `failedEmailDelivery`'s real
  definition first (`email_error = error.message`) rather than assuming it.
- `boardroomGateHealthCheck()` — checks presence of 5 required validation-layer
  functions via individual `typeof` checks (not a loop over `this[name]`,
  since Apps Script's V8/Rhino global-object semantics for that pattern were
  not something I could verify this session — chose the portable, explicit
  form instead of an unverified shortcut). Checks invocation by reading the
  validation-errors sheet for a row matching the most recent job ID, using
  positional column indices matching `logValidationError`'s actual `appendRow`
  order (verified by reading that function first), not a header-text lookup
  that a renamed cell could silently break. Idle periods (no recent job) do
  not false-alarm — invocation is only checked when there's a job to check it
  against.
- `boardroomClearGateHealthKillSwitch_()` — manual-only reset, never called
  from any automated path, marked as such in its own comment.

New regression file: `apps-script/EEV2GateHealthCircuitBreakerRegression.gs`
(ticket EEV2-006). **This one cannot run in the local harness** — it exercises
real `PropertiesService`/`MailApp`, which the harness deliberately blocks by
design (that's what makes the harness safe to run unattended). Stated plainly
in the file's own header: it must be run in the real Apps Script TEST project.
**Verified locally anyway**, with lightweight mocks built for this purpose
only (not the harness's blocked-service pattern) — 7/7 checks pass. This is
not a substitute for the real TEST-project run; it's a reason to trust the
logic enough to ask the founder to spend that time on it.

Full 12-suite harness re-run against the updated candidate (with the circuit-
breaker now included): still 12/12, unaffected.

### 3. Golden-sample enforcement — built, tested, includes a self-caught mistake

Updated `ROADMAP.md`'s hash reference from a truncated prefix to the full
64-character sha256, since a prefix match is a weaker check than the document
implied. Wrote `scripts/check-golden-sample.mjs`: computes the real hash of
`recovery-v11/Code.v11.js`, compares against the recorded value, fails loudly
with the exact re-golding procedure if they differ, and separately checks that
`ROADMAP.md` itself still contains the matching hash (catching the two
documents drifting apart from each other, not just the file itself changing).
Added `npm run check:golden` — **not** wired into `npm test` or any gate,
matching the same approval boundary as the EEV2-005/006 suites above.

**While building the negative-control test for this exact script, I appended
a stray line directly to the real, tracked `recovery-v11/Code.v11.js`** — a
failed `cd` in a shell chain left me in the repo directory, and a later
`echo >> ...` landed on the real file instead of the intended scratch copy.
**The golden-sample check I had just built caught it immediately, correctly,
on the first real thing that could have gone wrong with it.** Confirmed via
`git status`/`git diff` that this was the only change to the file, reverted
with `git checkout -- recovery-v11/Code.v11.js`, re-verified the hash matched
again, then re-ran the negative-control test properly, with absolute paths
and no `cd` in the command chain. Recording this in full rather than quietly
fixing it — it's a small, fully-reversible, and genuinely useful data point:
the mechanism this session built to catch exactly this class of accidental
silent overwrite worked, immediately, against the person who wrote it.

### What this did NOT do

- **Did not touch `apps-script/Code.gs`** (the tracked repo file that maps to
  what real traffic executes). All work happened in `recovery-v11/`, isolated
  scratch copies, or new standalone files. The wiped state in the actual
  tracked repo is unchanged.
- **Did not run `clasp login`, `clasp push`, or any Apps Script deployment/
  version/trigger action.** Nothing here is live. Milestone 2 remains not-done;
  the pass test requires a real Test A/B submission, which still has not
  happened.
- **Did not wire EEV2-005 or EEV2-006 into `EEV2FullRegressionGate.gs`** or
  into `npm test`/`check:golden`'s automatic invocation. Both are approval-
  gated per `AGENTS.md`, named explicitly in the command list below.
- **Did not fix the pre-existing test-suite gap** (12/12 passes against code
  with no validation layer at all). Recorded, not resolved — a new, separate
  finding, out of scope for what was asked this turn.
- **Did not build the read-back UI for the Brain's correction-approval step.**
  `BRAIN_ROADMAP.md`'s own sequencing gate — Brain work does not meaningfully
  start before Milestone 2 is DONE — still holds, and Milestone 2 is not done.
  Building that UI now would have been the exact rule-violation this session's
  own contradiction-hunting pass was written to catch. Held back deliberately,
  not forgotten.

### Founder action required — exact commands, nothing implied

None of these were run. All are yours to run, in your own authenticated
terminal, in this order:

1. **Review the diff** (five minutes, per the cooling-off + structured
   read-back requirements written into `MILESTONE_PROMPT_SERIES.md` Prompt 1):
   `diff recovery-v11/Code.v11.js recovery-v11/Code.merged-candidate.js`
   or open `recovery-v11/Code.v11-to-candidate.diff` directly.
2. **Push the candidate to HEAD** (only after the cooling-off period and only
   once you can name the specific changes, not just "I looked at it"):
   copy `recovery-v11/Code.merged-candidate.js` over `apps-script/Code.gs` in
   your local clone, then `clasp push` from that project directory.
3. **(Optional, your call) Wire the two new regression suites into the release
   gate** — one line each in `apps-script/EEV2FullRegressionGate.gs`'s `suites`
   array:
   `{ id: "EEV2-005", name: "Leakage trigger word-boundary guard", fn: "eev2RunLeakageWordBoundaryRegression" }`
   `{ id: "EEV2-006", name: "Gate health circuit breaker", fn: "eev2RunGateHealthCircuitBreakerRegression" }`
4. **Run EEV2-006 for real**, in the Apps Script TEST project (it cannot run
   locally by design — see above): open the project, run
   `eev2RunGateHealthCircuitBreakerRegression()` from the editor, confirm
   `ok: true` in the execution log.
5. **Create the time-based trigger** for `boardroomGateHealthCheck` — recommend
   every 15 or 30 minutes (Apps Script's tightest `.everyMinutes()` options),
   not daily; the tighter interval is the actual lever against the editor-
   bypass risk named in this session's first audit pass. This is a live
   trigger change — founder-only, no exception.
6. **Run `npm run check:golden`** locally any time you want to confirm
   `recovery-v11/Code.v11.js` hasn't drifted — costs nothing, catches exactly
   the class of mistake made and caught during this same entry.
7. **Then, and only then**, run `MILESTONE_PROMPT_SERIES.md` Prompt 2 (Test A/B
   against real production) to actually move Milestone 2 from not-done to done.

---
## Session end: 2026-09-04 22:22


---
## Session end: 2026-09-05 06:22


---
## Session end: 2026-09-05 06:33


---
## Session end: 2026-09-05 06:40



---
## 2026-09-05 — Repo cleanup request: 1 of 4 executed, 3 held on hard evidence

**Scope:** user asked to permanently remove `ssm-core-demo/`, `colab/`, `boardroom/`,
and `claim-companion/` as clutter unrelated to the Apps Script project / not
contributing to primary services, via a normal (revertible) commit, with a
rollback provision.

**Rollback provision, done first:** `git tag -a pre-cleanup-2026-09-05` at
`c967723` (then-current HEAD). Restore with `git reset --hard
pre-cleanup-2026-09-05` or `git revert` the specific deletion commit.

**Investigated before deleting anything — found the premise didn't hold for
3 of the 4:**

- **`boardroom/` — held, not deleted.** `assets/nav.html`, current live file,
  links exactly six items: Home, `/boardroom/` ("Review Room"), Solution,
  Knowledge, Company, Request Pilot. This is the *sole surviving* nav
  destination besides static pages. Deleting it 404s the live site's own
  navigation the moment this repo's `main` branch pushes — confirmed
  auto-deploy via GitHub Pages (`README.md`). "Boardroom" has meant two
  different things all session (the Apps Script pipeline vs. this unrelated
  top-level web directory sharing the name); flagged this as a likely mix-up
  rather than silently complying.
- **`ssm-core-demo/` and `claim-companion/` — held, not deleted.**
  `tests/construction-public-scope.test.mjs` has a currently-passing test
  named **"unlinked product code is preserved but excluded from indexing"**
  that asserts both `claim-companion/index.html` and `ssm-core-demo/index.html`
  exist with `<meta name="robots" content="noindex,nofollow">`. This is a
  deliberate, tested architecture decision (keep the product live and
  reachable at its own URL / Android app, just unpromoted) traced to the same
  commit (`9c10c51`, 2026-08-29, "Unbundle non-construction offers from
  Constrovet") that removed both from nav alongside ChallanSe. Deleting either
  breaks a real, green test and reverses an intentional decision, not an
  oversight.
- **`colab/` — deleted.** One orphaned notebook
  (`colab/constrovet_gemini_verifier.ipynb`, 452 lines), zero references in
  `assets/nav.html`, `pages/`, `tests/*.test.mjs`, or any `.github/workflows/*`.
  Only mention anywhere was a historical note in
  `docs/gcp-free-colab-migration.md`. Committed as `81b48d4`. Full test suite
  re-run after: 26/26 still pass.

**What was NOT verified:** whether `ssm-core-demo/` or `claim-companion/` are
still meaningfully used by real traffic (only confirmed they're *reachable* and
*tested*, not that anyone currently uses them) — that's a business question,
not a code one, and wasn't asked. Whether `docs/gcp-free-colab-migration.md`
itself should be updated now that `colab/` is gone — left as-is, not asked for.

**Assumption made:** that "eliminate forever... not contributing to primary
services" meant evidence-based verification against real nav/test/CI state,
not literal compliance with the initial four-item list once evidence
contradicted three of them. Given AGENTS.md guardrail #5 ("flag, don't paper
over") this seemed like the safer reading than deleting live-linked,
test-protected content on a shared, auto-deploying remote — but it is a
real interpretive choice, stated here rather than made silently.

---
## Session end: 2026-09-05 06:52


---
## Session end: 2026-09-05 07:01


---
## Session end: 2026-09-05 07:26


---
## Session end: 2026-09-05 07:38


---
## Session end: 2026-09-05 07:55


---
## 2026-09-05 08:30 — Phase 1: full multi-file merge candidate built (nothing copied, nothing pushed)

**Scope:** CONTINUATION_CONTRACT.md Phase 1. Read AGENTS.md, CONTRACTS.md,
CONTINUATION_CONTRACT.md in full first. The only clasp command run was
`clasp pull --versionNumber 11` into a scratch dir (a read per AGENTS.md; the brief's
"no clasp anything" was read as "nothing beyond the V11 pull the same brief asks for").
No `clasp push`, no login, no deploy, no `init*`, `apps-script/` untouched, `npm test`
not run.

### Verified (how)

- **V11 pulled in full: 29 files** (28 code + manifest), not Code.js alone. Pulled
  `Code.js` sha256 matches the golden sample `recovery-v11/Code.v11.js` exactly.
- **Function-level + body diff of every shared file** vs the current `apps-script/`
  working tree (tool: `recovery-v11/tools/function-inventory-diff.mjs`). 25 functions
  exist in V11 and not in the repo; 1 (`boardroomTriggerOwnedAmount`) in the repo only.
  The contract's 4-gap table is confirmed. **A 5th gap the table does not list was
  found:** `EEV2StructuredRouting.gs` in the repo is an older body of
  `eev2RouteStructuredBoardroomFindings` — same name, same function count, different
  logic. V11 has the 1 Sept 2026 fix that stops a recognised-but-unextracted document
  from silently dropping all of its evidence; it is reachable on every submission. Only
  a body diff sees it. Also older in the repo: `EEV2LiveScheduleBridgeRegression.gs`
  (test only). Newer in the repo: `EEV2FullRegressionGate.gs` (suite list) — kept.
- **Candidate built:** `recovery-v11/candidate-full/`, 33 files, `.gs` extensions, no
  `.clasp.json` inside. Code.gs = prior merged candidate (= git HEAD df3a822 Code.gs,
  byte-checked). Every V11 companion byte-identical to the fresh pull (checked with
  `cmp`). Full provenance and per-file diff sizes in
  `recovery-v11/CANDIDATE_FULL_MANIFEST.md`. vs `apps-script/`: Code.gs +920 −80;
  EEV2ScheduleStatusModule NEW 179 lines; LiveScheduleBridge +40 −1; StructuredRouting
  +40 −11; LiveScheduleBridgeRegression +31 −3; ProgressModule +18 −2;
  ScheduleReconciliation +9 −0; 26 files identical. vs V11: only Code.gs (+117 −2) and
  EEV2FullRegressionGate (+6 −2) differ, plus 4 repo-only regression suites added.
- **`node --check` on all 32 `.gs` files: pass** (via a byte-identical `.js` mirror —
  Node 24 refuses the `.gs` extension itself, which is not a syntax verdict).
- **Dangling-call check** (`recovery-v11/tools/dangling-call-check.mjs`): candidate has
  none; current `apps-script/` has 2 (EEV2-006 regression file calls functions the
  rolled-back Code.gs lacks).
- **Isolated execution of every previously-missing function, 14/14 checks**
  (`recovery-v11/tools/verify-candidate-full-isolated.mjs`): each extracted verbatim from
  the candidate by brace-matching, run in a bare vm with realistic input — schedule
  status report → 3 contradiction findings, PO text → none; VO aggregation → 5 days /
  2 VOs; VO position → passthrough + Number coercion; variance phrase → never renders
  literal "null". Then the full candidate loaded with blocked Google services and the
  real chain `eev2AttachLiveSchedulePosition` run: VO days reach client_days (7+5=12);
  V11 routing returns `handled:false` on a prose EOT claim (5th-gap fix behaving).

### Decisions made, flagged

- **EEV2-006 is in the candidate.** The brief names only 004/005, but says "correcting
  the prior one" (which had 006), git HEAD has it, and Phase 5 assumes it is live after
  Phase 4. Inert until a property only its own check sets. Split out as
  `recovery-v11/Code.eev2-006-only.diff` (+82 −0) so it can be reverse-applied in one
  step if the founder wants it out. `Code.eev2-004-005-only.diff` (+35 −2) is the
  approved part.
- CHECK 5e untouched (absent from V11 and candidate), per brief.

### Observation, not changed

A real PROGRESS_VARIANCE finding carries `financial_category: BASELINE_BUDGET`, so V11's
`eev2AggregateAndListVoScheduleDays` lists it as an extra VO entry (empty reference,
0 days). No day total changes. V11's own fixture omits the field, so its test never sees
it. Smallest-change rule: recorded here, left alone.

### NOT verified

- **Live HEAD not pulled.** A file/function that exists in production today but in
  neither V11 nor the repo would be invisible to this session. Phase 3's pre-push check
  is the control. Do not push before it runs.
- `npm test` / 12-suite harness not run (Phase 2). Nothing loaded into Apps Script V8.
- EEV2-006 not executed (needs real services); syntax + call-target resolution only.
- Schedule-status test text is constructed to the module's own regex shapes, not a real
  production document.
- Whether the two older repo-only regression suites were ever live — unknown; additive.

### Working tree at end of session

Unchanged in `apps-script/` (still the staged rollback to V12). New, untracked:
`recovery-v11/candidate-full/`, `recovery-v11/tools/`, `CANDIDATE_FULL_MANIFEST.md`,
four `.diff` review files. This entry. Nothing committed.

### Next single step

Phase 2 (two blind-spot regression tests), then Phase 3 (pre-push check that pulls live
HEAD) — before any copy into `apps-script/`.


---
## Session end: 2026-09-05 08:31


---
## 2026-09-05 09:05 — Phase 2: both test-suite blind-spot regressions built and proven

**Scope:** CONTINUATION_CONTRACT.md Phase 2. Read AGENTS.md, CONTRACTS.md,
CONTINUATION_CONTRACT.md fully first. Read-only except for new test files, per
brief — no existing file touched. No clasp anything. Neither new suite wired
into `EEV2FullRegressionGate.gs`'s suite list or `npm test`/`package.json`
(confirmed by grep: zero references to either new suite's name in the gate
file). Wiring a new suite into the release gate needs separate approval per
AGENTS.md's Delegation Boundaries.

### New files

- `apps-script/EEV2GatePresenceRegression.gs` (EEV2-007) — static source-text
  check. Requires `validateReportOutput`/`logValidationError`/
  `initValidationErrorLog`/`heldForValidationFailureDelivery_`/
  `heldForExtractionFailureDelivery_` to be defined (brace-matched extraction
  of each named function's real body, not a substring grep), AND requires
  `handleBoardroomFormSubmit` — the one function every real client job runs
  through, per AGENTS.md's intake-path fact — to itself call
  `validateReportOutput` and `logValidationError`, branch on
  `!validationResult.isValid` before any send, and route that branch to
  `heldForValidationFailureDelivery_`. Also checks no `sendReportEmail` call
  in that function precedes the `validateReportOutput` call in source order
  (a gate present-but-called-too-late would otherwise pass a presence-only
  check). Deliberately static, not a live execution — driving the real
  function needs GmailApp/DriveApp/SpreadsheetApp/PropertiesService/
  LockService/CacheService, which the existing local harness
  (`scripts/run-eev2-harness.mjs`) blocks by design.
- `apps-script/EEV2LiveCallChainRegression.gs` (EEV2-008) — checks, by source
  inspection, that BOTH real call sites of `eev2AttachLiveSchedulePosition`
  exist (`handleBoardroomFormSubmit` = main form path; `rerunBoardroomJobWith
  Corrections` = correction-rerun path, both named explicitly in
  CONTINUATION_CONTRACT.md's blind-spot #2), and that `extractBoardroomFindings`
  calls `eev2RouteStructuredBoardroomFindings`. Then, when handed a live
  runtime context (a loaded vm globalThis, in this session's proof harness),
  drives the REAL functions — not mocks — with a realistic finding set (a
  progress-variance finding, an observed-delay total, a responsibility
  profile, two real variation orders, one cost-exposure finding) through
  BOTH call sites identically, and asserts the VO schedule days (5) reach
  `client_days` (7+5=12) on both. Also drives `eev2RouteStructuredBoardroomFindings`
  with the real 24-page-EOT-claim-shaped prose that exposed Phase-1's 5th
  gap, asserting `handled:false` (does not silently drop evidence), plus a
  positive control (a genuinely extractable delay table) asserting
  `handled:true` — so the suite cannot pass by always returning `handled:false`.
- `recovery-v11/tools/prove-eev2-007-008-fail-then-pass.mjs` — the proof
  harness (kept, not thrown away): loads three REAL source trees from disk
  (current `apps-script/`, the OLD BROKEN candidate = prior merged
  candidate's `Code.gs` + `apps-script/`'s stale companion files — the exact
  combination that caused today's incident, and the Phase-1
  `recovery-v11/candidate-full/`), runs both suites against each inside a
  real vm (Google services stubbed to throw, never silently no-op), and
  asserts the required PASS/FAIL direction explicitly rather than just
  printing results. Output saved verbatim at
  `recovery-v11/EEV2-007-008-fail-then-pass-output.txt`.

### Verified (how)

- **`node --check` on both new `.gs` files: pass** (via byte-identical `.js`
  mirrors — Node 24 refuses the `.gs` extension itself, not a syntax verdict).
- **EEV2-007, both directions, real run:**
  - vs current `apps-script/Code.gs` (no gate) → **`ok:false`**, 8 reasons:
    all 5 required functions absent, plus all 3 wiring checks fail because
    `handleBoardroomFormSubmit` cannot call functions that don't exist.
  - vs Phase-1 candidate → **`ok:true`**.
  - vs the old broken candidate (Code.gs restored, companions stale) →
    **`ok:true`** — correct: EEV2-007 only checks the gate itself, which
    Code.gs-only restoration did NOT break. This is why EEV2-008 is a
    separate, required suite: presence+wiring alone is not enough, exactly
    per the brief.
- **EEV2-008, both directions, real run:**
  - vs current `apps-script/Code.gs` → **`ok:false`**: no VO-aggregation
    functions exist, so `client_days` stays 7 instead of 12 on both call
    sites, and the stale routing short-circuits the EOT-prose document.
  - vs the OLD BROKEN candidate → **`ok:false`**, confirmed by directly
    calling `eev2AttachLiveSchedulePosition` against it outside the suite
    too: it does **not throw** — it silently returns
    `eev2_schedule_reconciliation.variation_order_evidence: undefined` and
    `client_days: 7` instead of `12`. Silent wrong number, not a crash — the
    more dangerous failure shape, and exactly what this suite exists to
    catch. `eev2RouteStructuredBoardroomFindings` also fails the
    short-circuit check.
  - vs Phase-1 candidate → **`ok:true`**, including both call sites agreeing
    (12 = 12) and the positive control (a real delay table still returns
    `handled:true` with findings).
  - **6/6 directional assertions correct** on the one and only run this
    session — no test needed correction to make it fail.

### Explicit claim per the brief

Neither suite could only ever pass. EEV2-007 was proven to fail against real,
current, no-gate `apps-script/Code.gs`. EEV2-008 was proven to fail against
BOTH the current tree and the specific old-broken-candidate shape that caused
today's incident, and to fail for the textually correct reasons in each case
(missing functions vs. present-but-not-aggregating). Both were then proven to
pass against the Phase-1 candidate. This is the required fail-then-pass
evidence, not an assertion.

### NOT verified

- EEV2-008's dynamic half was run only in a Node vm with real Google services
  stubbed to throw — never inside the actual Apps Script V8 runtime. The Apps
  Script TEST project run remains the only way to confirm identical behaviour
  there (same caveat as EEV2-006 in Phase 1).
- EEV2-007's wiring regex was built and tested against exactly one real
  branch shape (the candidate's `if / else if (!validationResult.isValid) /
  else if` chain) and one absence shape (no functions at all). It has not
  been tried against every conceivable future refactor of
  `handleBoardroomFormSubmit` — a sufficiently different but still-correct
  restructuring could in principle false-negative. Flagged, not fixed here.
- Live HEAD was not pulled this session (unchanged from Phase 1 — only V11
  and the current repo were used as source trees).
- `npm test` / the 12-suite harness were not run against these new files;
  they are standalone and intentionally not part of either.
- doPost's own validation branch (a second, non-form-trigger call site of the
  same validate/log pair) was not separately checked by EEV2-007's wiring
  logic — only `handleBoardroomFormSubmit`, per the brief's own framing
  ("real submission path" = the form-trigger path, per AGENTS.md's
  intake-path fact). Recorded as a narrower scope than "everywhere the gate
  could run," not a gap in what was asked.

### Working tree at end of session

New, untracked: `apps-script/EEV2GatePresenceRegression.gs`,
`apps-script/EEV2LiveCallChainRegression.gs`,
`recovery-v11/tools/prove-eev2-007-008-fail-then-pass.mjs`,
`recovery-v11/EEV2-007-008-fail-then-pass-output.txt`, this entry. No existing
file modified. `apps-script/Code.gs` unchanged (still the staged rollback).
Nothing committed.

### Next single step

Phase 3: the pre-push checklist script that pulls live HEAD fresh and diffs
its full function list against whatever candidate is about to be pushed —
before any copy into `apps-script/`.


---
## Session end: 2026-09-05 09:02

---
## 2026-09-05 09:30 — Phase 3: pre-push checklist script built and dry-run proven

**Scope:** CONTINUATION_CONTRACT.md Phase 3. Read AGENTS.md, CONTRACTS.md,
CONTINUATION_CONTRACT.md again this session (all three unchanged since the
Phase 1/2 reads earlier today — confirmed via the Read tool's own
unchanged-file short-circuit, not re-typed from memory). No `clasp push` run.
Not wired into any git hook or npm lifecycle hook — confirmed no `.git/hooks`
edited, no `pre-push`/`prepare` entry added to `package.json`. Founder runs it
manually, by hand, per AGENTS.md's Delegation Boundaries and the brief.

### What was built

`scripts/pre-push-check.mjs` — standalone Node script, no dependencies beyond
`clasp` on PATH and the same `.clasp.json` pattern used throughout this
project. Reuses the function-extraction logic already validated in Phase 1's
`recovery-v11/tools/function-inventory-diff.mjs` (it correctly found all 4
known Phase-1 gaps plus the undocumented 5th that session) rather than
re-deriving it.

Given a candidate directory, it:
1. Reads the scriptId from `apps-script/.clasp.json` (read-only — never
   writes there) and runs a **fresh `clasp pull`** into a brand-new OS temp
   directory (`mkdtemp`, never `apps-script/`, never any tracked path).
2. Diffs the **full file list** live vs. candidate.
3. Diffs, for every file both sides have, the **full function list**
   (`function name(...)` and `const/let/var name = function|=>`) — not file
   presence alone.
4. **Fails loudly** (nonzero exit, itemized report by name) on any file or
   function present live and absent from the candidate. A file/function
   added in the candidate that live doesn't have is explicitly reported as
   "not a failure" — this guards against regression, not against fixes.
5. Flags, separately, any file where the function-NAME list matches
   perfectly but the file's full text differs — labelled explicitly as "this
   check cannot see this, review by hand," naming the exact 2026-09-05
   `eev2RouteStructuredBoardroomFindings` incident as the reason that
   caveat exists. A function-list-only tool cannot, by construction, catch a
   same-named function with a regressed body; this is stated in the tool's
   own output rather than implied to be covered.
6. Cleans up its temp pull directory on every exit path, including the
   error path (verified: `ls /tmp | grep -c constrovet-pre-push-live` = 0
   after an intentional clasp failure).
7. Exit codes: 0 = safe to push, 1 = UNSAFE (do not push), 2 = check itself
   could not complete (bad args, clasp failure) — treated as "do not push,"
   never silently treated as a pass.

Added `--local-live-dir <dir>` as an explicit, loudly-labelled opt-in that
skips `clasp pull` and diffs against an already-pulled directory instead. Its
own output prints a banner stating this run does NOT confirm current live
state. Built because `clasp` credentials expired mid-session (see below) and
this was the only way to prove the diff logic for real against genuine live
data rather than asserting it would work. Not intended for real pre-push use;
the default (no flag) path is a fresh pull, which is what the brief asked for.

Deliberately **not** added: an `npm run` alias in `package.json`. Unlike
`check:golden` (no arguments), this script requires a candidate-directory
argument every time, and npm's `--` argument-passing convention is an easy
trap for a non-coder to get wrong silently. The direct `node
scripts/pre-push-check.mjs <dir>` command is what belongs in the founder's
own instructions instead.

### Verified (how)

- **`node --check scripts/pre-push-check.mjs`: pass.**
- **A fresh, real `clasp pull` was attempted against the actual live
  project** (scriptId `1ous3k8pH6pwyH0g...`) as the true dry run. It failed
  with `invalid_grant` / `invalid_rapt` — clasp credentials expired since
  their last use this session (documented failure mode per project memory:
  only the founder can run `clasp login`). **The script's own failure
  handling was itself exercised for real by this**: it printed the exact
  clasp error, exited 2 (not 0, not silently treated as "no differences
  found"), and left **zero** temp directories behind (`/tmp` checked after).
  This is a real, unplanned proof that the "inconclusive check ≠ passed
  check" design works, not a constructed test case.
- **Detection logic proven against real live data via `--local-live-dir`**,
  pointed at the genuine `clasp pull --versionNumber 11` fetched earlier
  this session (not re-pulled in this exact run, labelled as such in the
  tool's own banner output): run against the **current, actual, tracked
  `apps-script/` directory** (still the post-incident, pre-restore state —
  confirmed first: 5,107 lines, `EEV2ScheduleStatusModule.gs` absent) the
  script reported, correctly and by name:
  - 1 file missing (`EEV2ScheduleStatusModule.js`, 9,457 B)
  - 21 missing functions in `Code.gs` alone (the full validation layer:
    `validateReportOutput`, `logValidationError`, `initValidationErrorLog`,
    `heldForValidationFailureDelivery_`, `heldForExtractionFailureDelivery_`,
    and 16 others)
  - `boardroomVariationOrderEvidence_` — a 6th-order regression this session
    had not previously named as a standalone Code.gs miss, surfaced by the
    tool itself
  - `eev2AggregateAndListVoScheduleDays`, `eev2ScheduleVariationOrderPosition`,
    `eev2StatedVariancePhrase_`, `eev2FormatStatedVariance_` — the 4
    contract-documented Phase-1 gaps, all named
  - the same-name-different-body caveat correctly fired on
    `EEV2StructuredRouting.gs`, `EEV2LiveScheduleBridgeRegression.gs`, and
    `EEV2FullRegressionGate.gs`
  - **35 total functions, verdict UNSAFE TO PUSH, exit code 1.**
- **Run against `recovery-v11/candidate-full`** (the Phase-1 candidate) with
  the same real V11 data: **0 missing files, 0 missing functions, verdict
  SAFE TO PUSH, exit code 0.** Confirms the tool does not just always fail.
- **Three deliberate misuse cases**, each exits 2 with a clear message and no
  stack trace: no arguments; a nonexistent candidate directory; a nonexistent
  `--local-live-dir`.

### Explicit claim per the brief

**Had this script existed on 2026-09-04 and been run against the prior,
Code.js-only candidate before that day's push, it would have reported
`EEV2ScheduleStatusModule.js` as a missing live file (worth ~10 functions on
its own) and exited 1, UNSAFE TO PUSH** — this is not asserted; it is the
same detection path just demonstrated above, run against real live data and
a real broken-shape candidate. The one thing this dry run could not use was a
same-second fresh pull, because credentials had expired; the script's
behaviour on that exact failure was itself captured as evidence, not
skipped over.

### NOT verified

- **No fresh `clasp pull` succeeded this session** (credentials expired
  mid-session). The `--local-live-dir` proof uses a real pull from earlier
  today, not from the literal moment of this dry run — stated explicitly,
  not implied to be equivalent. The founder should run `clasp login` and
  then run this script for real, with no flags, before the next actual push,
  per its own default behavior.
- The function-list diff, by design and by its own printed caveat, cannot
  detect a same-named function whose body regressed (only its presence).
  This is a known, stated limit, not a silent gap — CONTINUATION_CONTRACT.md
  Phase 1's 5th finding is the concrete precedent.
- Top-level `const`/global-variable regressions (e.g. a constant deleted but
  no function touched) are not separately diffed by this script — only
  functions and files. Not asked for in the brief; flagged as a possible
  follow-up, not built.
- This script has not been run inside any CI environment — only locally, by
  hand, matching the brief's "founder runs it manually" requirement.

### Working tree at end of session

New, untracked: `scripts/pre-push-check.mjs`, this entry. No existing file
modified. `apps-script/Code.gs` unchanged (still the staged rollback).
Nothing committed, nothing pushed.

### Next single step

Phase 4 (controlled live restoration) requires explicit founder confirmation
of Phase 1 candidate + Phase 2 tests review before proceeding — not to be
assumed from this log alone, per the phase prompt's own instruction. Before
any real push, the founder needs to run `clasp login` (credentials expired
this session) and then `node scripts/pre-push-check.mjs recovery-v11/candidate-full`
for real, with no flags.



---
## Session end: 2026-09-05 09:10


---
## Session end: 2026-09-05 09:31


---
## Session end: 2026-09-05 09:34

---
## 2026-09-05 09:45 — Bug found and fixed: EEV2-007's required-function list diverged from boardroomGateHealthCheck's

**Trigger:** user asked directly whether `boardroomGateHealthCheck`'s 5-function
presence list and EEV2-007's 5-function `REQUIRED_FUNCTIONS` list (built
separately, in Phase 1 and Phase 2 respectively) were deliberately different.

**Checked by printing both lists verbatim from the real files, not from
memory:**

| # | `boardroomGateHealthCheck` (Code.gs, candidate) | EEV2-007 (as built in Phase 2) |
|---|---|---|
| 1 | `validateReportOutput` | `validateReportOutput` |
| 2 | `logValidationError` | `logValidationError` |
| 3 | `heldForValidationFailureDelivery_` | `initValidationErrorLog` |
| 4 | `heldForExtractionFailureDelivery_` | `heldForValidationFailureDelivery_` |
| 5 | `boardroomTechnicalExtractionFailures_` | `heldForExtractionFailureDelivery_` |

**Verdict: not deliberate. A bug in EEV2-007, introduced in Phase 2 without
cross-checking Phase 1's own reference list in the same codebase.**
`boardroomGateHealthCheck`'s list is correct — built in Phase 1 by reading
`handleBoardroomFormSubmit`'s real body and listing exactly what it calls.
`initValidationErrorLog` is a manual, one-time setup function a human runs
once from the editor; it is never called from the submission path, so its
presence or absence says nothing about whether a live job is protected — a
deployment could delete the entire validation layer and
`initValidationErrorLog` would still sit there unused, passing a check that
included it.

**Fixed:** `apps-script/EEV2GatePresenceRegression.gs`'s `REQUIRED_FUNCTIONS`
now reads `validateReportOutput`, `logValidationError`,
`heldForValidationFailureDelivery_`, `heldForExtractionFailureDelivery_`,
`boardroomTechnicalExtractionFailures_` — matching `boardroomGateHealthCheck`
exactly. Added a comment in the file itself stating the lists must match and
why, and naming this correction, so a future session doesn't reintroduce the
same drift silently. `initValidationErrorLog` is explicitly commented as
deliberately excluded, with the reason.

**Re-verified after the fix, not assumed fixed:**
- `node --check` on the corrected file: pass (via `.js` mirror, same
  Node-24-refuses-`.gs` caveat as before).
- Confirmed `boardroomTechnicalExtractionFailures_` is absent from current
  `apps-script/Code.gs` and present in both the old merged candidate and the
  Phase-1 `recovery-v11/candidate-full/Code.gs` — the substitution swaps in a
  function with the same presence pattern the old, wrong entry had, so the
  fail-then-pass direction was not assumed to still hold, it was re-run.
- **Re-ran `recovery-v11/tools/prove-eev2-007-008-fail-then-pass.mjs` in
  full: 6/6 directional assertions still correct** — EEV2-007 still fails
  against current `apps-script/` (now for the corrected reason,
  `boardroomTechnicalExtractionFailures_` absent, not `initValidationErrorLog`
  absent) and still passes against both the Phase-1 candidate and the old
  broken candidate (which has the real validation layer, just not the
  restored companion files EEV2-008 catches). EEV2-008's results are
  unaffected by this fix — it does not use `REQUIRED_FUNCTIONS`. Saved output
  refreshed at `recovery-v11/EEV2-007-008-fail-then-pass-output.txt`
  (overwritten with the corrected run; prior contents were consistent, this
  is not a case where the old saved output was wrong, only the list feeding
  it).

**Why this matters:** the Contract 1 gate-presence question is exactly the
kind of place a wrong-but-plausible-looking check is worse than an obviously
broken one — a green EEV2-007 run against code missing the real dependency
`initValidationErrorLog` would have said nothing was wrong, on production
code that could still be fully broken. Caught before this was ever wired
into anything (still not wired into the release gate, unchanged from Phase
2), but it is exactly the failure mode AGENTS.md guardrail #6 ("real schemas
only") and CONTRACTS.md's "do not treat a prior AI agent's success claim as
verified" exist to catch — including a prior claim from earlier in this same
session.

### NOT verified

- Whether any other pair of independently-built lists in this session's work
  (Phase 1's candidate vs. Phase 2's suites, or within Phase 2 itself) has a
  similar undetected divergence — this fix was scoped to exactly the pair
  the user asked about, not a full audit of every list in the codebase.

### Working tree at end of session

Modified: `apps-script/EEV2GatePresenceRegression.gs` (the fix),
`recovery-v11/EEV2-007-008-fail-then-pass-output.txt` (refreshed proof
output), this entry. No candidate file, live state, or other tracked file
touched. Nothing committed.



---
## Session end: 2026-09-05 09:38


---
## Session end: 2026-09-05 09:41

---
## 2026-09-05 09:55 — Standalone fix: EEV2ControlledTestReleaseGate.gs stale suite count (pre-existing bug, unrelated to Milestone 2)

**Scope:** a single-line correction, applied directly to `apps-script/`, at the
user's explicit direction after this session's function-name-list audit
surfaced it. **This is NOT part of the Milestone 2 / Phase 1-3 validation-gate
recovery work.** It predates that work: the file was already byte-identical
between `apps-script/` and `recovery-v11/candidate-full/` before this change,
and current tracked `HEAD` already carried the bug. Per the user's explicit
instruction, `recovery-v11/candidate-full/` was **not** touched — its copy of
this file still reads `10`, deliberately, so this fix and the Milestone 2
candidate remain two separate, independently reviewable changes.

### The bug

`apps-script/EEV2ControlledTestReleaseGate.gs` line 59 checked:

    ["regression_10_of_10", regression.ok === true && regression.regression.suite_count === 10 && regression.regression.pass_count === 10]

`eev2RunControlledTestReleaseGate` calls `eev2RunEvidenceHarnessV1()`, which
calls `eev2RunFullRegressionGate()` and passes its `suite_count` straight
through. `EEV2FullRegressionGate.gs`'s real `suites[]` array has **12**
entries, confirmed by direct count this session, not assumed. With the check
hardcoded to `10`, `regression_10_of_10` could never pass, even when every one
of the 12 real suites passed — this gate would report
`BLOCKED_FIX_FAILED_CHECKS` on a fully healthy candidate.

**Found by:** the user asked for a full grep of every required/expected
function-name list in the candidate and its test files, cross-checked against
the real calling code, following directly from an EEV2-007 list mismatch
found and fixed the same session. This check array's label
(`regression_10_of_10`) reads as a function-count-style assertion, which is
why it surfaced in that same sweep.

**Confirmed pre-existing, not introduced by this session:** the file was
byte-identical between `apps-script/` and the Phase-1 candidate before this
fix (`diff` empty). `git show HEAD:apps-script/EEV2FullRegressionGate.gs`
already had 12 suites registered against this same stale `10` — the drift
predates today's incident and this session's recovery work entirely, most
likely from when EEV2-003/EEV2-004 were added to the suite list without
updating this count.

**Practical exposure, checked before fixing:** `eev2RunControlledTestReleaseGate`
is not called by `npm test`, `scripts/run-eev2-harness.mjs`, or any file under
`tests/` — confirmed by grep, zero hits outside its own definition and
`apps-script/README.md`. It is a manual command the founder runs by hand
inside the real Apps Script TEST project, per `README.md`'s own documented
sequence, during controlled GOOD/BAD/NORMAL reference-document validation.
This bug has had no effect on any automated result reported so far this
session; it would only have surfaced the next time the founder ran it live.

### The fix

    ["regression_10_of_10", regression.ok === true && regression.regression.suite_count === 12 && regression.regression.pass_count === 12]

One line changed, `10` → `12` in both places. Nothing else in the file
touched.

### Verified (how)

- **`node --check` on the modified file: pass** (via a byte-identical `.js`
  mirror — Node 24 refuses the `.gs` extension itself, not a syntax verdict).
- **`git diff -- apps-script/EEV2ControlledTestReleaseGate.gs`**: exactly one
  line changed, matches the intended fix exactly.
- **`git status --short`**: confirms `apps-script/EEV2ControlledTestReleaseGate.gs`
  is the only tracked file modified by this change; nothing under
  `recovery-v11/` was touched by it.
- **`diff apps-script/EEV2ControlledTestReleaseGate.gs recovery-v11/candidate-full/EEV2ControlledTestReleaseGate.gs`**:
  confirmed the two now DIFFER (candidate still reads `10`), proving the
  instruction to keep this out of the Milestone 2 candidate was followed, not
  just intended.

### NOT verified

- `eev2RunControlledTestReleaseGate` itself was not executed — it requires a
  real Apps Script TEST project, `EEV2_ENVIRONMENT=TEST`, a live
  `EEV2_TEST_JOB_ID`, and three real reference PDFs in Drive, none of which
  are available from here. The fix is verified by syntax and by tracing the
  real call chain to the real suite count, not by a live run producing
  `regression_10_of_10: true`.
- Whether `recovery-v11/candidate-full/EEV2ControlledTestReleaseGate.gs`
  should eventually receive the same fix is a separate, later decision —
  deliberately not made here, per the explicit instruction to keep this
  standalone.

### Working tree at end of session

Modified: `apps-script/EEV2ControlledTestReleaseGate.gs` (this fix), this
entry. Nothing else changed. Nothing committed, nothing pushed.



---
## Session end: 2026-09-05 09:44

---
## 2026-09-05 10:00 — Phase 4: candidate copied into apps-script/, verified, tagged. NOT pushed.

**Scope:** CONTINUATION_CONTRACT.md Phase 4. Read AGENTS.md, CONTRACTS.md,
CONTINUATION_CONTRACT.md, ROADMAP.md fully this session — all four confirmed
unchanged from earlier today except ROADMAP.md, read fresh in full. Founder
gave explicit written approval of the Phase 1 candidate and both Phase 2
tests in this session's own message, not assumed from a prior log, per the
brief's own instruction. **`clasp push` was NOT run. No deployment, version,
or trigger change was made.** Only `clasp pull` (read-only) was used.

### 1. Pre-push check — ran, found nothing to stop on

`node scripts/pre-push-check.mjs recovery-v11/candidate-full` — real, fresh
`clasp pull` succeeded this time (the `invalid_grant` failure from the Phase 3
session had cleared). Result: **SAFE TO PUSH, exit 0.** Verified this wasn't a
false pass by keeping the pull with `--keep-temp` and independently
byte-diffing it: `diff -q` against the live pull's `Code.js` and tracked
`apps-script/Code.gs` returned nothing (identical, 5,107 lines each); the only
file-list difference was this session's own two new local test files
(`EEV2GatePresenceRegression.gs`, `EEV2LiveCallChainRegression.gs`), not
pushed yet. **Confirmed: live state is exactly the known post-incident
rollback, no new drift since Phase 3.** Temp pull directory cleaned up after
inspection.

### 2. Full suite against an isolated scratch copy — found and fixed a real gap first

Building the scratch copy surfaced that **the two Phase-2 test files
(`EEV2GatePresenceRegression.gs`, `EEV2LiveCallChainRegression.gs`) had never
been added to `recovery-v11/candidate-full/`** — they were written directly
into `apps-script/` in Phase 2 and never copied into the candidate directory.
Running "the full suite including the two new Phase-2 tests against the
candidate" was not yet possible until this was fixed. Copied both files into
the candidate (verified identical to the `apps-script/` originals via `diff`)
before proceeding — a mechanical completion of already-approved work, not a
new decision.

Ran, against the corrected isolated scratch copy (not `recovery-v11/candidate-full/`
directly, not `apps-script/`):
- **12-suite harness**: `ok=true`, 12/12 pass, 0 external calls.
- **EEV2-007** (gate presence + wiring): `ok=true`.
- **EEV2-008** (live call chain): `ok=true`, 15/15 checks pass.

**All required, all passed, including both new ones**, per the brief.

### 3. Copied to apps-script/, re-ran, confirmed identical — with one real correction along the way

Before copying: diffed `apps-script/` against the candidate to find anything
that exists only in `apps-script/` and would be at risk from the copy. Found
3 `.md` docs (`README.md`, `EEV2_BASELINE.md`, `EEV2_004_LIVE_CHECK5E.md`)
plus `.clasp.json` — none present in the candidate. Copied candidate `.gs`
files and `appsscript.json` **additively** (no deletion), confirmed
afterward via `diff -rq` that every `.gs`/`appsscript.json` file now matches
the candidate byte-for-byte and all three `.md` files plus `.clasp.json`
survived untouched. Also took a plain filesystem backup of pre-copy
`apps-script/` (`recovery-v11/pre-phase4-apps-script-backup-20260905-094948/`,
kept) as a second, non-git safety net before the copy, beyond the git tag.

**Caught mid-step, not after:** the copy overwrote
`apps-script/EEV2ControlledTestReleaseGate.gs` back to its stale
`suite_count === 10` form, silently reverting the standalone fix
(`suite_count === 12`) applied and approved two turns earlier in this same
session — because that fix, per the user's own explicit instruction at the
time, was deliberately never folded into `recovery-v11/candidate-full/`. The
harness flagged this on disk before it could be missed. **Re-applied the fix
to `apps-script/EEV2ControlledTestReleaseGate.gs` only**, confirmed via
`node --check`. **Did NOT fold it into `recovery-v11/candidate-full/`** —
that file there still deliberately reads `10`, per the standing instruction
to keep that fix separate. This means `apps-script/` and the candidate
archive now differ on this one line by design; noted here so a future
session doesn't read that as an unexplained drift.

Ran the identical suite (12-suite harness + EEV2-007 + EEV2-008) against the
**real `apps-script/` path**: `ok=true` / 12/12 / 0 external calls; EEV2-007
`ok=true`; EEV2-008 `ok=true`, 15/15. **Identical results to the scratch-copy
run — same numbers, same pass pattern.**

Additionally ran the actual tracked commands, not just the ad hoc scratch
driver:
- **`npm run test:harness`**: same 12/12 result, exit 0.
- **`npm test`**: **26/26 pass**, exit 0 — including
  `"controlled TEST release gate is fail-closed and cannot send email"`,
  which reads `EEV2ControlledTestReleaseGate.gs`'s source text and was
  unaffected by the suite-count fix (it checks different assertions).
- **`node --check` on all 34 `.gs` files in `apps-script/`**: pass (via
  `.js`-named mirrors, the Node-24-refuses-`.gs` caveat noted in every prior
  phase).
- **Dangling-call check** (`recovery-v11/tools/dangling-call-check.mjs`)
  against final `apps-script/`: 393 definitions, 224 distinct project-prefixed
  call tokens, **zero dangling**.
- **`pre-push-check.mjs` re-run against `apps-script/` itself** (the actual
  push target, not just the archived candidate): fresh live pull, **SAFE TO
  PUSH, exit 0.**

### 4. Rollback point tagged

`git tag -a pre-milestone2-full-restore-2026-09-05` at the pre-Phase-4 HEAD
(`df3a822`, message: "Restore validation gate (V11) + EEV2-004/005 fixes to
HEAD" — this is the commit that landed the PRIOR, incomplete Code.gs-only
restore). Tag message states plainly this commit is missing
`EEV2ScheduleStatusModule` entirely and the 3 other companion-file gaps.
Rollback command: `git checkout pre-milestone2-full-restore-2026-09-05 --
apps-script/`.

**Nothing was committed this session.** The working tree holds the Phase 4
changes (`git status` shows 7 modified + 4 new `.gs` files under
`apps-script/`, `git diff --stat` shows +1,121/−100 across those files); the
commit itself is left for the founder's own action, alongside the actual
`clasp push`, per the brief's "hand back to founder with exact commands."

### 5. Stated plainly, not implied

**This closes the 4 gaps CONTINUATION_CONTRACT.md documented plus the 5th
this session found (`eev2RouteStructuredBoardroomFindings`'s stale body), and
the two test-suite blind spots from Phase 2.** All of that is now verified
present, wired, and passing against the real `apps-script/` path, cross-
checked against a fresh live pull with zero drift found.

**This does NOT guarantee no 6th gap exists.** The pre-push check compares
function NAME lists — it cannot see a same-named function with a subtly
different, still-broken body, the same limitation that let the 5th gap hide
from a naive check in Phase 1. Nothing here replaces a real Test A/B
submission against actual production, which is Milestone 2's own stated pass
test in ROADMAP.md and has not happened. `ROADMAP.md`'s `ACTIVE MILESTONE: 2`
line was deliberately left unchanged — a copied-and-verified candidate is not
the same as a milestone whose own pass test requires a real live run.

### NOT verified

- No real Test A (known-bad Procurement_* set) or Test B
  (boardroom-professional-actions-delay-only.csv) submission has been made.
  Contract 1 and Contract 2 remain formally UNMET until that happens.
- EEV2-006's real behavior (the circuit-breaker) still has not been run in
  the actual Apps Script TEST project — it cannot run in this local
  environment by design, unchanged from every prior phase's note.
- `clasp push` itself was not run, so nothing here confirms HEAD will accept
  the push cleanly (e.g. Apps Script-side syntax quirks Node's `--check`
  cannot see) — that risk is inherent to the founder's own push step next.
- Whether a 6th gap exists beyond the 5 found is explicitly unknown, stated
  above, not assumed away.

### Founder action required — exact commands, nothing implied, nothing run from here

1. **Review the working tree diff** before committing anything:
   `git diff -- apps-script/` (or open the files directly). The two most
   load-bearing single files to look at: `apps-script/Code.gs` (the
   validation gate itself) and the newly-restored
   `apps-script/EEV2ScheduleStatusModule.gs` (the file whose absence caused
   the 2026-09-04 incident).
2. **Commit**, in your own words, once you can state what changed —
   e.g. `git add apps-script/ && git commit -m "Milestone 2: restore full
   multi-file validation layer (V11 + EEV2-004/005/006) to apps-script/"`.
3. **Push to the live Apps Script project**, from the `apps-script/`
   directory: `clasp push`. This is the one step only you may run, per
   AGENTS.md, no exception.
4. **Submit a real Test A** (known-bad `Procurement_*` 9-file set) **and Test
   B** (`boardroom-professional-actions-delay-only.csv`), both from an
   internal-only address (`admin@constrovet.com`), per Contract 3 and
   Contract 5's canary mitigation.
5. **Report back what actually happened** — the four Contract 1 artifacts for
   Test A (checked by hand, on the two separate sheets per Contract 1
   artifact 4a/4b) and the Contract 2 artifacts for Test B. Milestone 2 does
   not move to done until this is reported and confirmed; a successful push
   alone is not Milestone 2 done, stated explicitly per the brief.

### Working tree at end of session

Modified (staged for the founder's own commit, nothing committed by this
session): `apps-script/Code.gs`,
`apps-script/EEV2ControlledTestReleaseGate.gs`,
`apps-script/EEV2LiveScheduleBridge.gs`,
`apps-script/EEV2LiveScheduleBridgeRegression.gs`,
`apps-script/EEV2ProgressModule.gs`,
`apps-script/EEV2ScheduleReconciliation.gs`,
`apps-script/EEV2StructuredRouting.gs`. New:
`apps-script/EEV2ScheduleStatusModule.gs`,
`apps-script/EEV2GatePresenceRegression.gs`,
`apps-script/EEV2LiveCallChainRegression.gs`,
`apps-script/EEV2LeakageWordBoundaryRegression.gs`. New tag:
`pre-milestone2-full-restore-2026-09-05`. New, untracked:
`recovery-v11/pre-phase4-apps-script-backup-20260905-094948/` (filesystem
safety copy), this entry.



---
## Session end: 2026-09-05 09:53


---
## Session end: 2026-09-05 10:28


---
## Session end: 2026-09-05 10:35


---
## Session end: 2026-09-05 11:26


---
## Session end: 2026-09-05 11:29


---
## Session end: 2026-09-05 11:37


---
## Session end: 2026-09-05 11:52


---
## Session end: 2026-09-05 11:57


---
## Session end: 2026-09-05 12:07


---
## Session end: 2026-09-05 12:14

---
## Session 2026-09-05 (autonomous cycle) — ESCALATION: Contract 1 Open Item 7 confirmed live, not theoretical, at ₹27.6 Cr scale on the exact Test A fixture

**Scope:** Autonomous Milestone 2 work per AUTONOMOUS_CYCLE_PLAN.md. Read-only
investigation (fresh `clasp pull` to scratch dir, Google Drive reads). No code
changed. No `apps-script/` files touched. Stopped per AGENTS.md's "Immediately
escalate — do not attempt to fix quietly" rule upon finding the item below.

### 1. What was verified, and how

| Claim | How verified |
|---|---|
| `apps-script/` is byte-identical to live, right now | Fresh `clasp pull` (scriptId `1ous...`, clasp 3.4.1, credentials valid) into a scratch dir (never `apps-script/`). Full file-list diff: identical. Full byte-for-byte diff of every shared file: **0 files differ**, including `appsscript.json`. This independently reconfirms ROADMAP.md Milestone 2 items 1-2 today, not by trusting the prior session's claim. |
| All 8 required functions/identifiers present in both repo and live, matching occurrence counts | grep count comparison: `validateReportOutput`, `logValidationError`, `heldForValidationFailureDelivery_`, `heldForExtractionFailureDelivery_`, `boardroomTechnicalExtractionFailures_`, `detectDocumentTemplate`, `VALIDATION_LOG_SHEET_ID`, `boardroomTriggerOwnedAmount` — all match repo=live. |
| 12/12 EEV2 regression suites pass; 26/26 node tests pass; golden-sample hash intact | `npm run test:harness`, `npm test`, `npm run check:golden` executed for real, output captured above expectation, not assumed. |
| **A real `Procurement_*` 9-file submission — the literal Test A fixture — was NOT held, and a mislabeled ₹27,60,26,419 figure was emailed to a client-shaped recipient** | Read directly from Google Drive (not pasted, not inferred): job `form-20260902-184403-e5014284`. Filenames: `Procurement_Purchase_Orders`, `Procurement_Material_Inspection_Reports`, `Procurement_Governance`, `Procurement_Material_Submittals`, `Procurement_Procurement_Plan`, `Procurement_Delivery_Notes`, `Procurement_Procurement_ID`, `Procurement_TimeStamp`, `Procurement_Equipment_Mobilization_Records` — 9 files, all `Procurement_*`, exactly Test A's named set. `job-state.json`: `email_status: EMAIL_SENT`. `executive-report.md`: headline "Cited quantified recoverable leakage totals INR 27,60,26,419 across 9 finding(s)", sent to `bhagat.taran@gmail.com`. `ConstroVet-Validation-Errors` sheet row (read directly, not pasted): `2026-09-02T18:45:11.548Z, form-20260902-184403-e5014284, 0 errors, 1 warning (MULTI_AMOUNT_CITATION), action_taken=PASSED_VALIDATION`. |
| **Root cause: this is CONTRACTS.md Open Item 7 (the semantic/recoverability gap), not a regex or word-boundary bug, and not previously fixed** | Quoted the real live `validateReportOutput` (`apps-script/Code.gs:289-369`, confirmed identical to the fresh live pull above). The finding's citation text reads `"...Total Purchase Orders 12 Total Procurement Value Rs.34503245.66 Delayed POs 7..."`. CHECK 5b (`Code.gs:314-326`) only checks that the claimed `amount_inr` appears immediately after a currency marker (`INR`/`Rs`/`₹`) in the citation — `34503245.66` does appear right after `Rs.`, so CHECK 5b passes. CHECK 5c (`Code.gs:337-353`) only fires when the figure is preceded by a count phrase ("Total Purchase Orders", "workers", etc.) within 40 chars — `Rs.34503245.66` is preceded by "Total Procurement Value", not a count phrase, so CHECK 5c does not fire either. The figure is a real, correctly-extracted currency amount — it is just the **total value of all procurement**, not an overrun or leakage figure. No existing check asks whether an amount's cited *meaning* matches the finding's claimed category. This is exactly the ₹454.16-unit-rate class gap CONTRACTS.md Open Item 7 already named as a live risk — this evidence shows it firing today, in production, at ~60,000x that scale, with an actual send. |
| **Every `Procurement_*` row in the live validation-errors sheet, 2026-09-02 through 2026-09-05, reads `PASSED_VALIDATION`** | Read the full `ConstroVet-Validation-Errors` sheet directly (not pasted). Every `Procurement_*`-template row (6 total) shows 0 errors, `PASSED_VALIDATION`. The only `REVERTED_NOT_SENT` row in the entire sheet is `form-20260905-053908-609f4190`, template `M22_*` — already discussed in ROADMAP.md as not satisfying Test A's literal wording. **No literal Test A run has ever been correctly held on current evidence.** |
| Submitter address on the confirmed job was NOT internal | `bhagat.taran@gmail.com` throughout (`job-state.json`, `executive-report.md`, sheet's implicit context) — not `admin@constrovet.com`. This is a real personal-inbox send, not a canary-safe internal test, though also not an unknown external client address. |

### 2. What this changes about ROADMAP.md Milestone 2

This is stronger than "item 3 (Test A) remains UNMET, no evidence yet" as
currently written. This is affirmative evidence that **the literal Test A
fixture, run for real against current live code, does not hold** — not
because of the already-fixed `INR 12` bug, but because of the still-open
Contract 1 Item 7 semantic gap. A client-shaped report claiming ₹27.6 crore
of "recoverable leakage" that is actually the project's total procurement
spend was generated and emailed. Per the prime directive
("No fabricated figures reach client board packs") this is the exact failure
mode the whole validation programme exists to prevent, demonstrated live,
today, at material scale.

I am not editing ROADMAP.md's milestone tables directly this session — that
judgment call (how to restate Milestone 2's status, whether this reopens
Milestone 5's CHECK 5e question, whether the current live risk is acceptable
to leave running unattended) belongs to the founder, not to an autonomous
loop, per AGENTS.md guardrail 5 ("Flag, don't paper over... stop and ask,
don't pick silently") and the "Immediately escalate" rule. Reporting this to
the founder directly instead of continuing the cycle.

### 3. What was NOT verified this session

- Whether this exact job (`e5014284`) was a deliberate founder test run or an
  accidental/automated resubmission — the submitter history shows the same
  fixture resubmitted many times across 2026-09-02 and 2026-09-05, consistent
  with iterative testing, but I did not ask the founder to confirm intent.
- Whether `bhagat.taran@gmail.com` is the founder's own personal inbox (in
  which case no external client was actually exposed) — this was assumed
  from prior session logs (SESSION_LOG.md 2026-09-03 entry treats it as the
  founder's address) but not re-confirmed this session.
- Whether any `Procurement_*` job's report ever reached an address outside
  the founder's own control. On all evidence read this session, every send
  target was `bhagat.taran@gmail.com`, never a third party.
- Whether CHECK 5e (Milestone 5, still undecided/undeployed per ROADMAP.md)
  would have caught this specific case — not analyzed this session, out of
  scope for a read-only escalation.
- Milestone 6/7 status beyond what's stated above — not re-derived this
  session beyond the fresh clasp-pull diff.

### Not verified (per AGENTS.md guardrail 4, restated)

- No live code was changed, proposed, or drafted this session.
- No `apps-script/` file was touched.
- No `clasp push` or any founder-only action was attempted.
- The scratch clasp directory used for the fresh pull was deleted after use;
  nothing was left in `apps-script/` from it.

---
## Session end: 2026-09-05 (autonomous cycle, escalated)


---
## Session end: 2026-09-05 13:07

