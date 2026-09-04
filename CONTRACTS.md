# CONTRACTS.md — Definition of Done

This is the formal spec any agent or contributor must satisfy before saying "the validation gate works" or "this is ready for real clients." Written from proof (the 2026-09-02 audit; corrected 2026-09-03 against a real clasp pull of the live Apps Script project — see SESSION_LOG.md).

## Ground-truth warning (read before trusting anything below)

As of 2026-09-03, the **live** Apps Script project (Code.js, 5,876 lines) is 808 lines ahead of the **repo's** apps-script/Code.gs (5,068 lines) — 21 functions, including the entire validation layer (`validateReportOutput`, `logValidationError`, `initValidationErrorLog`, `heldForValidationFailureDelivery_`, and 17 others) exist ONLY live and are invisible to anyone reading the repo. Any agent reasoning from the repo alone will reach wrong conclusions about whether a gate exists. Until the repo is synced (see Open Item 6), verify against a fresh clasp pull, not against git.

## Contract 1 — The gate must produce four artifacts on a should-fail case

For a submission that should be blocked (e.g. the known-bad 9-file Procurement_* set), ALL FOUR must be true. Confirmed by hand, not inferred from one green test run:

1. **No client-facing report is EMAILED.**
   **CORRECTED 2026-09-03:** the original wording ("no report is *generated* or emailed") is not satisfiable and must not be checked literally. Live Code.js writes every report artifact *before* the gate runs — browser-report.json at :628, executive-report.md at :629, final-report.json at :634, optional-gemini-review-pack.md at :649, the deep-review artifact at :651, and `finalFile.setContent()` at :652 — while the gate begins at :654. On a correct hold **all of those files will exist in the outputs folder.** Their presence is NOT evidence of a gate failure. Only the absence of a delivered email is. (This corrected an inference made earlier in the 2026-09-03 session, which had read the presence of final-report.json as proof the gate did not fire; the load-bearing evidence for the 2026-09-02 incident is the delivered email plus the PASSED_VALIDATION row, not that file.)

2. **A `[VALIDATION FAILED]` alert email is sent** to bhagat.taran@gmail.com.

3. **A `<job_id>-VALIDATION_FAILED.json` file exists** in that job's outputs folder.

4. **A sheet row is written** to ConstroVet-Validation-Errors recording the hold.
   **CORRECTED 2026-09-03, confirmed against live Code.js:** the literal string `HELD_NOT_SENT` does not exist in the live project as pulled on 2026-09-03, and has never existed in any repo commit (`git log --all -S` → 0 hits on every branch). **The live project's own version history was NOT examined**, so "never existed live" is not a claim this document can make. On present evidence this reads as a documentation error rather than a code defect. The real strings are:
   - Code.js:435 — `action_taken: "PASSED_VALIDATION"` on pass, `"REVERTED_NOT_SENT"` on fail.
   - Code.js:1585 — `email_status: "HELD_VALIDATION_FAILED"` on fail.

   **Artifact 4, corrected wording — CHECK TWO SEPARATE SHEETS.** The earlier
   wording asked for one row carrying both strings. That is unsatisfiable by
   construction: they are written by different functions to different
   spreadsheets. Split the check:

   - **4a — the validation sheet.** `logValidationError` (Code.js:421-439) appends to `VALIDATION_LOG_SHEET_ID`, tab `validation-errors`. Its row has exactly nine columns and **no `email_status` column**: `timestamp, job_id, error_count, error_list, warning_count, warning_list, action_taken, reverted_to_version, source_document_template`. Check here for **`action_taken=REVERTED_NOT_SENT`**.
   - **4b — the audit sheet.** `email_status` belongs to the `emailDelivery` object (Code.js:1585) and reaches the audit spreadsheet via `appendBoardroomAuditRow` (`AUDIT_SPREADSHEET_ID`) — a different file. Check here for **`email_status=HELD_VALIDATION_FAILED`**.

   Looking for `email_status` on the validation-errors sheet will always fail
   and produce a false "gate broken" verdict on a correctly-working system.

   **Footnote — `reverted_to_version` carries no information.** Code.js:436 appends the hardcoded string `"7"` on every row, pass or fail. It is not a version number and nothing reverts to it. The `7` in the 2026-09-02 row is that constant, not a signal. Do not interpret it.

**Status as of 2026-09-03: the gate is present and correctly wired BY CODE INSPECTION AND ISOLATED REPLAY — not by the standard this contract demands.** Code.js:657-671 is a real three-way branch (extraction failure → held; validation failure → VALIDATION_FAILED.json written, REVERTED_NOT_SENT/HELD_VALIDATION_FAILED logged, admin alerted; else → send) preceding every send path.

Evidence: the live `validateReportOutput` (Code.js:219-386) was extracted verbatim from a `clasp pull` and replayed under node against the **real production artifact** — `form-20260902-135120-81f4fd27-browser-report.json`, downloaded from Drive (fileId `15i1EnGJzXWRZt3HTavO9sVaGHH_z8XcH`, 59,609 bytes, byte-count verified), all 9 real findings, no reconstruction. Result: **`isValid=false`, 16 errors, 1 warning** (8 × `UNVERIFIED_AMOUNT` + 8 × `COUNT_READ_AS_AMOUNT`). At Code.js:662 that holds the report.

**But no live end-to-end run has been performed.** This contract's own preamble requires "confirmed by hand, not inferred from one green test run" — an isolated validator replay is not that. **Contract 1 remains UNMET pending a real Test A submission.** The gate not having fired on 2026-09-02 is explained (not yet fully verified — see Open Item 4) as the run predating this validation layer or an earlier weaker version of it — not as a gate that exists but fails to fire. If any one of the four artifacts is missing on a fresh test run regardless, the gate has NOT passed for that run.

## Contract 2 — The gate must not block a should-pass case

For a normal valid submission (e.g. boardroom-professional-actions-delay-only.csv):
- Report generates and sends normally.
- Sheet row is written with `action_taken=PASSED_VALIDATION`.
- Missing sheet row = the layer did not execute for that run, even if the report itself looks correct. A correct report with no logging is a logging-path failure, not a pass.

## Contract 3 — Standing regression habit

After ANY change to the intake/validation pipeline, before trusting it again:
- Re-run Test A (known-bad Procurement_* 9-file set) and Test B (boardroom-professional-actions-delay-only.csv).
- Confirm all four Contract 1 artifacts and the Contract 2 artifacts by hand.
- This is a checklist every time, not a one-time proof.

## Contract 4 — Launch gate

Do not onboard real clients until Test A has passed cleanly on multiple consecutive fresh runs (not once). A manual human review step on the first real client cohort's reports is recommended even after the gate passes.

## Contract 5 — Ongoing canary (post-launch)

Once live, periodically (weekly suggested) resubmit the known-bad Procurement_* set as a synthetic check. A gate that passed once can silently break again after an unrelated code change.

**MANDATORY mitigation — the canary must never be able to deliver to a client.** Per Known Gaps there is no staging copy: the canary runs against the same Apps Script as production. So in exactly the week the gate *is* silently broken — the week the canary exists to detect — an unmitigated canary becomes the mechanism that delivers a fabricated board pack. The safety check would cause the incident it was built to catch.

Therefore: **pin the canary submission's respondent/submitter address to an internal mailbox** (e.g. `admin@constrovet.com`) before every run, and confirm the address on the submission before submitting. A broken gate then produces an internal email, not a client-facing one. The same reasoning applies to Contract 3's Test B, which is a should-*pass* case and will therefore deliver a real report on every run — Test B must also be submitted from an internal address.

## Diagnostic items — RESOLVED 2026-09-03 (see SESSION_LOG.md for full evidence trail)

1. **RESOLVED — job `form-20260902-135120-81f4fd27` timing.** The INR 12 email predates the EEV2-003 regex fix (commit 603e9ce, applied ~3h57m after the send). It is NOT a failure of the validation-blocking branch reproducing today — replaying the real live `validateReportOutput` against this job's real findings now correctly returns `isValid=false`.

2. **RESOLVED — EEV2-003 live status.** Confirmed present in live Code.js at lines 2186 and 2196 (`\bINR\b` / `\bRs\.?` word-boundary fix).

3. **RESOLVED — string mismatch.** On present evidence a documentation error, not a code defect. See Contract 1 artifact #4 above for the corrected real strings and the two-sheet split. `HELD_NOT_SENT` is absent from the live project as pulled 2026-09-03 and from every repo commit; the live project's own version history was not examined, so this document does not claim it never existed live.

## Open diagnostic items (resolve before declaring Contract 1 fully closed)

4. **Why did the 2026-09-02 job pass instead of holding?** Working theory, NOT yet independently verified: an earlier/weaker `validateReportOutput` ran at the time of send (13:52:50), and the checks that would catch this specific pattern (CHECK 5b/5c, per code comments at Code.js:281) were added afterward. No version history of the live Apps Script project has been examined to confirm this timeline.

5. **RESOLVED 2026-09-03 — all 9 findings tested against the real artifact.** The earlier limitation (only 5 findings reconstructable from the delivered email) no longer applies: `form-20260902-135120-81f4fd27-browser-report.json` was downloaded from Drive and the live validator replayed against its actual `findings[]` array. This also removed an inference — the replay had assumed `financial_category=LEAKAGE_AND_OVERRUN` and `evidence_quality=CITED_AMOUNT` from the email's summary block; the real artifact confirms both for all 9 (that mattered, because `STRUCTURED_ACTUAL_BUDGET` findings are exempt from CHECK 5b at Code.js:294-298). Per-finding result:
   - **8 of 9 CAUGHT** — every `INR 12` finding trips two errors each (`UNVERIFIED_AMOUNT` + `COUNT_READ_AS_AMOUNT`).
   - **1 of 9 NOT CAUGHT** — finding [3], `INR 454.16` from `Procurement_Purchase_Orders`, produces **zero errors**; only a `MULTI_AMOUNT_CITATION` warning, which does not affect `isValid`. See Open Item 7 — this is no longer a hypothetical.

6. **New — repo sync.** The repo is 808 lines / 21 functions behind the live project (full inventory in SESSION_LOG.md, Addendum 2). Until reconciled, treat git-based reasoning about this pipeline as unreliable. This blocks AGENTS.md guardrail #4 (file disambiguation) from being satisfiable by default — a fresh clasp pull is required before any code-reading session, not a repo checkout.

7. **Carried from 2026-09-02 audit — semantic risk. NO LONGER HYPOTHETICAL; the gate does not cover it.** The regex fix corrects which digit gets treated as currency, and the validator catches figures that are not currency at all. Neither addresses whether a *correctly extracted* rupee figure should be called "recoverable leakage."

   **Demonstrated 2026-09-03 against real data:** finding [3] of the real job artifact claims `INR 454.16` as LEAKAGE_AND_OVERRUN. `Rs.454.16` genuinely appears in the source — it is the **unit rate for cement, per MT**, from a purchase-order table. The live validator passes it with zero errors, because every check it has asks *"is this figure really a currency amount in the cited text?"* and none asks *"does this figure mean what the finding says it means?"* Had that submission produced only this finding, `isValid` would have been **true** and a board pack claiming a unit rate as recoverable leakage would have been delivered.

   This is a gap in the gate's design, not a bug in its implementation. It needs a product decision — no regex or additional string check closes it.

## Known gaps — open on purpose, not silently fixed

- No .xlsx / .xer spreadsheet support (rejected, not mishandled).
- No staging copy of the Apps Script — testing happens against the same script as production.
- Apps Script quota behavior under real load is unverified.
- No defined fallback if the Gemini AI call itself fails.
- No access control on the intake form.
- No data-retention policy defined.
- Evidence-matching caps at 40 passages; untested at larger scale than one real 98-match document.
- OCR quality on real scanned/image PDFs is unproven.
- Dollar-aggregation math for a genuine large cost overrun is unproven against real non-zero numbers (every real document tested to date produced ₹0 quantified leakage).

## Reporting standard for any agent closing out a milestone

State explicitly:
1. What was verified (how — real repo run, real document, real test suite pass/fail counts).
2. What was NOT verified this session.
3. Any assumption made, with its pros and cons, if a fact was genuinely unavailable.

## Guardrails (non-negotiable, every response)

1. **No assumption.** If a fact isn't in the repo, the Apps Script, or a file provided, say `UNKNOWN — need X` and stop. Do not fill gaps with plausible-sounding defaults.
2. **No invention.** Never invent file paths, function/field names, schemas, or test data. If unsure a name is real, say so and ask, or grep/view the actual file first.
3. **Quote before you cut.** Before changing any line, quote the real current line(s) verbatim from the file you just viewed.
4. **Report what you didn't verify.** Every response that touches code or facts ends with an explicit "Not verified" list — even if short.
5. **Flag, don't paper over.** Duplicate files, conflicting live states, ambiguous scope → stop and ask, don't pick silently.
6. **Real schemas only.** Validate field names/structures against actual production JSON/data, never assumed shapes.

## Hard stops

- Do not deploy or merge — that decision is the founder's alone.
- Do not re-run `initValidationErrorLog()`-style one-time setup functions without explicit confirmation they haven't already run.
- Do not treat a prior AI agent's success claim as verified; re-check against the real artifact.
