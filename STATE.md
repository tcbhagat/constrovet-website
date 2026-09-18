# Constrovet — STATE.md

**This file is a snapshot, not a log.** `docs/SESSION_LOG.md` is the append-only history —
this file is "where are we RIGHT NOW," overwritten each session, not appended to.

## Rules for Claude Code

1. **Read this file FIRST, before anything else** — before re-reading the full execution
   prompt in detail, before proposing any action. If this file says Track A is at S4,
   in-progress, do not start S1 fresh and do not skip to S6.
2. **This file is authoritative over any human-pasted summary of "where we are,"** with
   one exception: if the human states a new real-world fact (a new client, a client
   withdrawing permission, a changed constraint), that is new information — update this
   file to reflect it, don't discard it because it contradicts the old snapshot.
3. **Update this file as the LAST action of every session** — not just an append to
   SESSION_LOG.md, an actual overwrite of the relevant fields below. A session that ends
   without updating this file has not actually finished its job.
4. **Placeholder values below (marked `[NOT YET RUN]`) are not evidence of anything.**
   Never treat a placeholder as if it were a real PASS. Populate fields only with real,
   verified results.
5. If this file does not exist in the repo yet, you are at or before Stage 0 — create it
   as part of Stage 0, using this template, with every field honestly `[NOT YET RUN]`.

---

## Snapshot metadata

- **Last updated:** 2026-09-18 (drift audit → reconciliation push → live-verified; S1/S2 PASS)
- **Updated by session ending at commit:** see `git log -1 main`; governance files
  (this file, GOALS.md, docs/*) moved onto `main` this session — previously they existed
  only on the unpushed branch `test/phase2-readiness-20260915`, which is why three
  sessions in a row could not read them. Wiki repo pushed to
  `tcbhagat/-llm-wiki-constrovet` branch `stage0-operations-wiki`.
- **Prompt version in use:** v6 (two-track, rollback-first, 3 real clients)

## Track A — current position

- **Current stage:** S1 = **PASS (live-verified 2026-09-18)**, S2 = **PASS (live-verified
  2026-09-18)**, S3 = PASS, S4 = **IN PROGRESS, day 4 of ~21** (started 2026-09-15,
  branch `test/phase2-readiness-20260915`, pushed to origin; wiki log updated 2026-09-18
  and pushed to `stage0-operations-wiki`). Days 2 and 3 recorded as unlogged, deliberately
  not back-filled. Readiness verdict NOT YET and not due — the clock cannot be compressed.
- **Status:** in-progress — the 11-day drift is closed, the deploy chain is verified end to
  end (repo → push → **version 23** → the `/upload` deployment), the exposed
  `GEMINI_API_KEY` has been rotated and proven working by a real DEEP_ANALYSIS job, and
  **EEV2-018 is fixed in both the server and browser layers and verified blocking on live
  traffic** (job `cv-20260918044018-hf5eq5`). The prime-directive stop condition is lifted.
  Remaining items are non-blocking: three reporting defects found by that test run
  (`form_intake` unset on the `/upload` path, the processed/no-signal counter mismatch, and
  the misdirected OCR guidance), plus the `value || DEFAULT` zero-handling bug and the
  failed-call-still-charges-budget behaviour.
- **Reconciliation result (2026-09-18):** founder ran `clasp push` + `clasp create-version`
  from `main`. Verified independently, not from labels: `scripts/session-context.sh` now
  reports **"IN SYNC -- live matches this working tree (43 files + manifest)"**, and a
  `clasp pull --versionNumber 21` confirms version 21 genuinely contains the fix
  (`boardroomDisplaySpan` 8×, `MAX_FILES = 10`, 43 files). Production baseline captured
  first at `~/constrovet-live-baseline-20260918.tar.gz` (121,530 bytes, verified
  byte-identical to the audit pull) — that is the rollback artifact.
- **Evidence (pre-push audit, now remediated — kept because it is what made the case):**
  live `clasp pull` on 2026-09-18 into a scratch dir proved live HEAD was
  **byte-identical to repo commit `6078bb1` (2026-09-07 18:49)** — 11 days stale.
  Specifically: live `Code.js` lines 2400 and 2484 still carried the storage-time
  `.slice(0, 500)` truncation (the EEV2-005/008 defect); `boardroomDisplaySpan` (the fix)
  appears 0× live vs 8× on `main`; 7 files present on `main` are absent live
  (`EEV2AuditJob`, `EEV2CitationTruncationRegression`, `EEV2GlobalBudgetGateRegression`,
  `EEV2GlobalDailyLimitFormPathRegression`, `EEV2MustBlockGateRegression`,
  `EEV2RowBoundaryRegression`, `EEV2SendGateChokePointRegression`). Repo-side tests
  remain green on `main`: `npm test` 27/27, `npm run test:harness` passing.
  `gh pr view 20` = MERGED. All of the above was corrected by the same-day push.
- **Why the 2026-09-15 PASS was wrong (keep this — it is the reusable lesson):** that entry
  claimed "live Code.js is byte-identical to repo Code.gs; live has the fix; 43/43 files
  match." All three were false when checked on 2026-09-18. Root cause below (versions
  created without a preceding push) means a version *label* was read as evidence of a
  *push*. **A label is never evidence of a deploy. Pull it back and diff it.**
- **Per-client status where a stage requires it:**
  - Client 1/2/3: unchanged and still the key mitigating fact — **no job has ever been
    run for any of the three clients**, so the live defect has reached no client report.
    Prime directive intact. This is what makes the drift urgent-but-not-an-incident.
- **Open FOUNDER_ACTION_REQUIRED items awaiting Prof. Taran (raised 2026-09-18):**
  - ~~1. Execute the live Apps Script reconciliation push~~ **DONE 2026-09-18.** Baseline
    captured first, push and version 21 both verified by pulling back and diffing.
  - ~~Confirm which version real `/upload` traffic runs~~ **DONE 2026-09-18** — editor's
    Manage deployments panel shows the deployment at Version 21. Chain verified end to end.
  - ~~Rotate `GEMINI_API_KEY`~~ **DONE 2026-09-18** — rotated, Script Property updated, and
    proven working by job `cv-20260917214914-9jo4kb` completing a real DEEP_ANALYSIS run.
  - ~~Fix the three `/upload` reporting defects~~ **DONE 2026-09-18** (`13d4d89`):
    `report.form_intake` now set on the doPost path (was "Files received: unknown" on every
    report); `documents_processed_count` / `documents_with_no_signal` now carried through
    `buildEvidencePayload` (both read 0 even when a document was scanned and named in the
    same email); and the OCR guidance rewritten to ask for a text-searchable PDF or a CSV
    instead of telling clients to enable a server-side Drive service they cannot reach.
  - ~~Fix the `value || DEFAULT` zero-handling bug~~ **DONE 2026-09-18** (`13d4d89`):
    `geminiRelevanceDailyLimit()` and `geminiMaxClassifierBytes()` now use
    `eev2ReadLimitProperty_`, so a property set to 0 is honoured as a deliberate hard stop.
  - **Still open, deliberately NOT changed — failed Gemini calls still consume daily
    budget.** `runGeminiVerifier()` calls `enforceGeminiVerifierBudget()` before
    `UrlFetchApp.fetch` and throws on HTTP >= 400, so an invalid key or a Gemini outage
    fails the job *and* charges one of the 20 daily calls. The ordering is **deliberate and
    documented in the code**: DEEP_ANALYSIS can reach the paid path more than once per
    submission, so charging before the call is what actually bounds spend. Reversing it
    trades a spend guarantee for a resilience gain — a founder decision, not a cleanup.
    Raise it only if a real outage makes it bite.
  - ~~2. Push the local wiki repo~~ **DONE 2026-09-18.** Founder added the remote and
    pushed to `tcbhagat/-llm-wiki-constrovet` branch `stage0-operations-wiki` (deliberately
    not `main`, which holds `sync-wiki.yml`-generated content with unrelated history).
    Verified on GitHub: all three commits (`98fec2a`, `ef8ba6d`, `181425e`) and all three
    files (`OPERATIONS/CHARTER.md`, `SAFETY_CHECKLIST/DEFINITION_OF_DONE.md`,
    `TESTING_BRANCHES/branch-phase2-readiness-20260915.md`) present; generated `main`
    untouched. No Phase 2 artifact is single-disk any more.

## Track B — current position

- **P1 (Compliance Hunter) last run date:** [NOT YET RUN]
- **Cadence health (on schedule / behind):** [NOT YET RUN]
- **Backlog size (real, scored-later prospects logged):** [NOT YET RUN]
- **Confirm: zero outreach has occurred (must always read yes until S11 is reached):** yes

## GATE status

- **All five GATE_CHECK lines currently:** [NOT YET RUN — list each as yes/no with evidence]
- **Overall:** NOT READY

## Track C — current position (only relevant once GATE = yes)

- **Current stage:** not started
- **Case studies completed (of 3):** 0
- **Prospects scored ≥7 and awaiting outreach approval:** 0
- **Outreach sent so far (of first wave of 10):** 0

## Known open items (carry forward until resolved)

- **DEFERRED by founder decision 2026-09-18 — the `oauthScopes` / `executionApi` manifest
  change stays OFF `main` until S4's canary window closes (~2026-10-06).** Revisit then; do
  not re-open it mid-branch. The analysis below is done — reuse it, don't redo it.

  **Why deferred:** `/upload` is deployed `executeAs: USER_DEPLOYING` with
  `access: ANYONE_ANONYMOUS`. Changing the declared scope set commonly invalidates the
  deploying user's authorization until re-consented, which would take down the live intake
  path. The payoff is developer convenience (`clasp run`, so the S3 tools run from CLI
  instead of the Apps Script editor); the downside lands on the product's primary path
  while it is under daily S4 observation. Bad trade this month, reasonable trade later.

  **The branch's proposed scope list is wrong — do not deploy it as-is.** It was never
  derived from current code. Audited 2026-09-18 against real usage:
  - Correct as declared: `drive` (DriveApp ×12 + advanced `Drive.Files`),
    `spreadsheets` (SpreadsheetApp ×6), `script.external_request` (UrlFetchApp ×3),
    `script.send_mail` (MailApp.sendEmail ×14).
  - **Over-broad:** `https://mail.google.com/` is full Gmail and a Google **restricted**
    scope — this is what produced the "This app is blocked" screen on 2026-09-15.
  - **Missing entirely:** `script.scriptapp` (ScriptApp.newTrigger/deleteTrigger/
    getProjectTriggers ×7), `forms` (FormApp.openById ×2), `documents`
    (DocumentApp.openById ×1), `userinfo.email` (Session.getActiveUser().getEmail() ×2).

  **What Gmail is actually for:** `GmailApp.search` appears only in `EEV2AuditJob.gs`, for
  4-artifact audit artifacts 1 and 2 (searching the deploying account's own Sent mail).
  Artifact 1 already falls back to the audit sheet. **Artifact 2 is Gmail-only and returns
  `held: false` on failure** — i.e. a false "no VALIDATION FAILED alert was sent", which
  reads as a safety failure rather than degrading cleanly. Dropping Gmail therefore costs
  real audit fidelity, not just a nice-to-have.

  **Trap for whoever picks this up:** the single `GmailApp.sendEmail` at `Code.gs:183` looks
  like an easy swap to `MailApp.sendEmail` (its two sibling call sites at `:724` and `:1881`
  already use MailApp for the same alert). **Do not swap it blind.** `EEV2AuditJob.gs`'s own
  comment asserts the alert lands in Sent mail, which is how artifact 2 finds it — and
  MailApp and GmailApp differ in whether they write to Sent. Verify empirically with a real
  test alert before changing it, or artifact 2 breaks silently.

- **RESOLVED 2026-09-18 — `/upload` deployment at Version 24, all fixes verified live.**
  `clasp redeploy ... -V 24` returned `Redeployed ... @24` and `clasp deployments` confirms
  `@24 - Report defects fixed`. Contents verified by pulling version 24 back and grepping,
  not from the label: `API_POST_PAYLOAD` (form_intake on the doPost path) ×1, the rewritten
  OCR guidance ×1, `eev2ReadLimitProperty_(GEMINI_...)` ×3, `boardroomHasForeignCurrency` ×3.
  Live HEAD reports IN SYNC (44 files + manifest). Site serves `?v=20260918c` with
  `documents_processed_count` carried through `buildEvidencePayload` ×2.

- **GOTCHA, resolved 2026-09-18 — `Read-only deployments may not be modified` does NOT mean
  the deployment is read-only.** It is what `clasp redeploy` returns when `-V` is not a
  valid version number. It appeared twice this session, both times from pasting the literal
  placeholder `NN` instead of a real number, and the first occurrence cost a full
  investigation cycle because the message was read as a permissions problem. With a real
  number the same command succeeds immediately. **Always substitute the number before
  pasting, and read this error as "bad -V argument", not "cannot deploy".**

- **CORRECTION 2026-09-18 — S1/S2's "live-verified PASS" covered only half the pipeline.**
  `assets/js/dashboard-analyzer.js` held `quoted_span: span.slice(0, 500)` in its
  `finding()` helper — **the EEV2-005/008 defect itself, still live on the client** — for
  ten days after `Code.gs` was fixed on 2026-09-08. `/upload` posts
  `browser_report.findings` straight to the server, so the validator was checking claimed
  figures against text the browser had already cut. The 2026-09-18 verification (live
  `Code.js` byte-identical to repo, `boardroomDisplaySpan` present 8×) was true and still
  is — it was simply **scoped to the server**. Fixed in `c6097a0`.
  **Why it survived:** the regression gate loads only `.gs` files, so the browser analyzer
  had *no test coverage of any kind*. That is the same reason EEV2-018 shipped.
  **How to apply:** "verified live" now means server **and** client. When a fix touches an
  extraction or validation rule, check whether `dashboard-analyzer.js` holds a duplicate of
  the same logic — several rules exist in both copies and can drift independently.

- **RESOLVED 2026-09-18 — EEV2-018 CLOSED AND VERIFIED ON LIVE TRAFFIC. Stop condition
  lifted.** Job `cv-20260918044018-hf5eq5` resubmitted the original USD CSV against the
  redeployed Apps Script. Result: **all 12 findings blocked**, each with
  `FOREIGN_CURRENCY_LABELLED_INR: Finding N claims INR <x> but its own citation shows a
  non-INR currency`, the report **NOT sent to the client**, and the alert delivered to the
  admin address with a Drive debug file and job folder link. Fail-closed, exactly as
  designed. No INR-labelled dollar figure can now reach a report.

  **Both layers are deployed and independently verified:**
  - Apps Script: `/upload` deployment re-pointed to **Version 23** (`clasp redeploy`).
    CHECK 5f live — proven by the block above, not by a label.
  - Static site: Pages deploy succeeded; `https://www.constrovet.com/assets/js/dashboard-analyzer.js`
    now serves `hasForeignCurrency` (2 occurrences) with `slice(0, 500)` gone (0
    occurrences), and `/upload` references `?v=20260918b`.

  **Defence in depth demonstrated for real.** The browser still emitted the 12 findings in
  that job because the founder's open tab held the pre-fix JS — a cache-bust cannot help a
  page already loaded (Pages completed 04:37Z, job ran 04:40Z). Layer 1 had not reached the
  client; **layer 2 caught it anyway.** This is the concrete argument for keeping the guard
  in both copies rather than trusting either alone.

  **Remaining confirmation (cosmetic, not a blocker):** after a hard refresh of `/upload`,
  the same CSV should produce an Evidence Intake Exception with **zero findings** instead of
  a validation failure — i.e. refused at source rather than blocked at the gate. Both
  outcomes are safe; the first is the better client experience.

- ~~**P0 EEV2-018 — FIX WRITTEN, NOT YET SERVING. Two deploys are required, not one.**~~
  *(resolved above; retained for the reasoning trail)*
  1. **Apps Script (`clasp`) — OUTSTANDING.** Versions 22 and 23 both contain the fix, but
     `clasp deployments` shows the `/upload` deployment still pinned at **`@21`**. The
     `clasp redeploy` step has not succeeded. Until it does, real traffic runs Version 21
     and CHECK 5f does not exist for it. This is why job `cv-20260918042638-dwpb7h`
     (2026-09-18T04:27Z) reproduced the violation byte for byte *after* the push:
     **the push landed; the deployment never moved.** Second occurrence of this trap in
     one day — `clasp push` updates HEAD only, see
     [[constrovet-webapp-pinned-deployment]].
     Command: `clasp redeploy AKfycbwKAbhU2WNR7BSNQS9XMMqhlvYMBb-QwKckfkiAiNIdf4pPD-dBBACO42lE5omKH4E9kQ -V 23 -d "EEV2-018 currency guard"`
     then confirm `clasp deployments | grep AKfycbwKAbhU` reads `@23`.
  2. **Static site (GitHub Pages) — automatic.** The browser fix ships with the push to
     `main` via `pages-build-deployment` to www.constrovet.com. Cache-bust bumped to
     `?v=20260918b` on `/upload` and `/app`, without which browsers keep the old file
     (the trap fixed in `716dc67`).

  **Proof the repo code is correct** (run against the exact shipped finding shape):
  as the browser sends it → blocked by `UNVERIFIED_AMOUNT` + `NO_VERIFIED_EVIDENCE`;
  with `evidence_quality` populated → blocked by `FOREIGN_CURRENCY_LABELLED_INR`.
  Browser-side: the real 12-row USD CSV now yields **0 findings** (was 12 / "INR 5,400");
  its INR twin still yields **12 totalling 5,400**. `npm test` 32/32, harness 21/21.

  **Acceptance test, after the redeploy:** resubmit the original USD CSV. Expect **no**
  report to `admin@constrovet.com`, and a `[VALIDATION FAILED]` alert to
  **`bhagat.taran@gmail.com`** (that is where `VALIDATION_ALERT_EMAIL` points) naming
  `FOREIGN_CURRENCY_LABELLED_INR`.

- **P0 — EEV2-018: PRIME DIRECTIVE VIOLATION, SHIPPED. Found 2026-09-18.**
  **STOP CONDITION: no client job may be run until this is fixed.**
  Job `cv-20260917223525-2z8936` delivered an "Executive Action Plan" headlining
  **"Cited quantified recoverable leakage totals INR 5,400 across 12 finding(s)"** from a
  source CSV denominated entirely in **US dollars**. The report's own Citations section
  prints the proof: `"Budget: $45,000.00 | Actual: $46,000.00"` rendered as
  `"overrun of INR 1,000"`. Every one of the 12 findings is a USD figure relabelled INR.
  The arithmetic is correct ($5,400 total); **the currency is fabricated.** The charter
  forbids exactly this: "no fabricated **or mislabeled** financial figure may ship."

  **Root cause chain (verified, `Code.gs`):**
  1. `boardroomParseAmount()` falls through to `/-?\d+(?:\.\d+)?/`, which matches digits
     in any string and **discards the currency symbol entirely** — `"$45,000.00"` → `45000`.
     No currency is captured, stored, or compared.
  2. `boardroomCsvBudgetActualFinding()` (`:2405-2415`) then **hardcodes the label**:
     `` `CSV row shows Actual - Budget overrun of INR ${formatInr(actual - budget)}.` ``
  3. `formatInr()` applies `toLocaleString("en-IN")` — Indian digit grouping — to whatever
     number it is handed, regardless of origin.
  4. The value is stored in the `amount_inr` field, so every downstream total, Board
     Decision, and action item inherits the false denomination.

  **Why the validator did not catch it:** the currency guard (`hasCurrencyContext`, matching
  `\bINR\b|\bRs\b\.?|₹`) protects the **narrative/cited-amount** path. These 12 findings
  are `STRUCTURED_CITED_EVIDENCE`, computed arithmetically from parsed columns, which
  bypasses the citation-text check. The report itself shows the gap: "Cited findings 12"
  alongside **"Cited amount findings: 0"**. The structured path has **no currency guard at
  all**. Any non-INR CSV — USD, EUR, GBP — is silently relabelled INR.

  **Client exposure: none.** Sent to `admin@constrovet.com` (founder's own address) during
  controlled testing; no client job has ever run. Prime directive is intact *in the field*,
  but the capability to violate it is live in production right now.

  **Also wrong in the same report (report-integrity defects, lower severity):**
  - Headline says "across 12 finding(s)"; Board Decision says "across **2** finding(s)".
  - Headline exposure INR 5,400; "Top 3 Decisions" says "**INR 1,000** cited exposure"
    (the largest single row presented as the total exposure).
  - "Cited findings 12" vs "Cited amount findings: 0" — contradictory on the same page.
  - "No-signal docs" and "Critical / high" render blank or 0 with no basis shown.

  **Minimum fix:** capture the currency symbol in `boardroomParseAmount()`, refuse to emit
  an INR-labelled finding when the source token is not INR/Rs/₹, and extend the validator's
  currency guard to cover `STRUCTURED_CITED_EVIDENCE`. A regression fixture with a USD CSV
  must assert the report is blocked, not relabelled.

- **RESOLVED 2026-09-18 — end-to-end live test submission PASSED on Version 21.**
  Job `cv-20260917214914-9jo4kb`, mode DEEP_ANALYSIS, generated 2026-09-17T21:49:37Z
  (03:19 IST 18 Sept), delivered by email. Three things this proves at once:
  1. **The rotated `GEMINI_API_KEY` works.** `runGeminiVerifier()` is called
     unconditionally for DEEP_ANALYSIS (`Code.gs:148`) and `throw`s on any HTTP >= 400.
     The job completed and emailed a normal report rather than hitting doPost's catch, so
     the Gemini call succeeded. The out-of-band `curl` check was abandoned after repeated
     `HTTP 000` results (paste never reached `read -s`); this supersedes it with better
     evidence, since it exercises the *stored* property rather than a re-pasted value.
  2. **Version 21 executes correctly in production** — the reconciled code ran a real job
     start to finish.
  3. **The prime directive held.** The run produced an "Evidence Intake Exception" with
     zero cited findings and **zero fabricated figures** — it correctly refused to invent
     numbers when it had no cited evidence, and said so plainly. This is the safety
     behaviour working as designed on live traffic, not a failure.

- **OPEN, client-facing defect, found 2026-09-18 — `/upload` reports always show
  "Files received: unknown / Files accepted: unknown".** `report.form_intake` is populated
  only inside `handleBoardroomFormSubmit()` (`Code.gs:901`, the Google Form path). The
  `/upload` doPost path never sets it, so `renderIntakeKpisEmailHtml()` (`:6073-6076`) falls
  through to the `"unknown"` literal for both counters — on every Deep Analysis email from
  the product's primary intake path. The count *is* known: `payload.files.length` is written
  to job state at `Code.gs:137`. A client-facing report that cannot state how many files it
  received undermines trust in every other number on the page. Low effort, high value.

- **OPEN, counter inconsistency, found 2026-09-18.** The same run reported
  `Documents processed: 0` **and** `No-signal documents: 0`, while the Missing Evidence
  Request named `M01_BoQ.pdf: no cost, schedule, or ESG signal found by deterministic
  browser scan`. A document was scanned and found to have no signal, so one of those two
  counters should be non-zero. Reconcile before any client sees this pairing.

- **OPEN, misleading client guidance, found 2026-09-18.** The exception email advises
  "Confirm PDF OCR readiness: enable Apps Script Advanced Drive service OCR". For `/upload`,
  extraction is **client-side pdf.js** (`assets/js/dashboard-analyzer.js:40-42, 219-228`),
  which has no OCR. So the advice names an admin action the client cannot take, on a path
  where it may not help. `.pdf` and `.csv` are both accepted (`upload/index.html:91`), and
  pdf.js reads only PDFs that already have a text layer — a scanned BoQ yields nothing.
  Rewrite this guidance for the `/upload` path: ask for a searchable PDF or a CSV.

- **RESOLVED 2026-09-18 — `/upload` confirmed serving Version 21.** The Apps Script editor's
  Manage deployments panel shows deployment
  `AKfycbwKAbhU2WNR7BSNQS9XMMqhlvYMB…` configured as **"Version 21 on 18 Sept 2026, 02:16"**
  with description "Reconcile live with main: EEV2-008…", and its Web app URL is the same
  `/exec` endpoint hardcoded in `assets/js/constrovet-app-config.js`. That is the editor's
  own configuration record, not a CLI label. The prior @19/@20 deployments are archived.
  The full chain is now verified end to end: repo → push → version 21 → the deployment real
  upload traffic hits. **The EEV2-005/008 truncation fix is genuinely serving production.**

- **CORRECTION 2026-09-18 — an earlier warning in this session was wrong.** It claimed
  `DEFAULT_GEMINI_DAILY_CALL_LIMIT = 10` could exhaust mid-job and fail a document-heavy
  client job. Checked against the code: `geminiRelevanceDailyLimit()` is consulted only by
  the **image relevance classifier** (`Code.gs:4747`), it **degrades gracefully**
  (returns `QUOTA_SKIPPED`, does not fail the job), and `ENABLE_GEMINI_RELEVANCE_GATE` is
  `false`, so it is inert today. The verifier budget that actually matters,
  `GEMINI_VERIFIER_DAILY_LIMIT`, **is** set (20), as is `GLOBAL_DAILY_JOB_LIMIT` (20).
  Setting `GEMINI_DAILY_CALL_LIMIT` is optional, not a precondition for client work.

- **OPEN, latent — `value || DEFAULT` defeats a deliberate zero.** `geminiRelevanceDailyLimit()`
  (`Code.gs:4841-4842`) and `geminiMaxClassifierBytes()` (`:4846-4847`) both do
  `Number(prop || DEFAULT)` then `value || DEFAULT`, so a property deliberately set to `0`
  silently becomes the default. This directly contradicts `eev2ResolveLimitValue_`, whose
  own comment states "0 is honoured as a real value (a deliberate hard stop / maintenance
  mode)". Two limit-readers with opposite semantics. Harmless while the relevance gate is
  off — but it is exactly the trap that bites during an incident, when someone sets a limit
  to 0 to stop everything and it does not stop.

- **RESOLVED 2026-09-18 — `GEMINI_API_KEY` rotated.** Founder rotated the key and updated
  the Script Property after it appeared legibly in a screenshot shared into a Claude Code
  session. Pending: an independent `curl` check that the new key + `GEMINI_MODEL` pair
  returns HTTP 200, done outside the pipeline so a bad key cannot burn verifier budget
  (see the budget item below). Original entry follows.

- **OPEN, design, 2026-09-18 — a failed Gemini call still consumes daily budget.**
  `runGeminiVerifier()` calls `enforceGeminiVerifierBudget()` *before* `UrlFetchApp.fetch`
  (`Code.gs`, "the paid call" comment), then `throw`s on any HTTP >= 400. So an invalid key,
  a wrong `GEMINI_MODEL`, or a Gemini outage does two things at once: it fails the whole
  DEEP_ANALYSIS job rather than degrading, and it still charges one of the 20 daily
  verifier calls. Roughly 20 failed attempts would exhaust a day's budget without a single
  successful analysis. The budget-before-call ordering is deliberate and correct for
  bounding *spend* (the comment explains why: DEEP_ANALYSIS can reach the path more than
  once per submission), so this is not a bug to reverse casually — but consider not charging
  budget for calls that never reached Gemini, or distinguishing a transport failure from a
  billable one. Relevant every time the key or model changes.

- ~~**OPEN, security, 2026-09-18 — `GEMINI_API_KEY` was exposed in a screenshot**~~ shared into
  a Claude Code session while reviewing Script Properties. The value is legible in the
  image. Rotate the key in Google AI Studio / GCP and update the Script Property. Treat as
  routine hygiene rather than a breach, but do not skip it.

- ~~**OPEN, low severity, 2026-09-18 — which version does real `/upload` traffic execute?**~~
  *(resolved above; original text retained for the reasoning trail)*
  `clasp deployments` shows the `/upload` deployment
  (`AKfycbwKAbhU2WNR7BSNQS9XMMqhlvYMBb-QwKckfkiAiNIdf4pPD-dBBACO42lE5omKH4E9kQ`, hardcoded
  in `assets/js/constrovet-app-config.js`) at **@21**, which is the reconciled version.
  **But this is a label, and this project has just been burned by trusting labels.** The
  founder's `clasp redeploy` command actually **errored** ("Read-only deployments may not
  be modified" — `-V NN` was pasted with the literal placeholder), so whatever moved that
  deployment to @21, it was not that command. Treat @21 as probable, not proven.
  **How to prove it:** the Apps Script editor's Executions panel shows the deployment/
  version column for each real execution. Run one controlled test submission through
  `/upload` and confirm the row reads Version 21. A `GET` on the `/exec` URL cannot settle
  this — `doGet` returns identical output on v20 and v21 (confirmed HTTP 200, healthy).
  Note also: this deployment has advanced on its own before (@17 → @20 → @21 across
  sessions), so "pinned" may be the wrong mental model for it — worth establishing.

- **RESOLVED 2026-09-18 — the 11-day drift is closed.** Retained because the failure mode
  is the important part. Original finding: live HEAD equalled
  repo commit `6078bb1` (2026-09-07). Every PR merged since then has never reached
  production: #23, #32 (the EEV2-008 citation-truncation fix), #34, #36, #38, #39, #40,
  #41, #44, plus all 2026-09-17 work.
  **Mechanism (verified, not inferred):** Apps Script *versions* were created without a
  preceding `clasp push`. Pulling version 20 explicitly — labelled "validation alert
  recipient fix", dated 2026-09-17 — returns content byte-identical to stale HEAD
  (`MAX_FILES = 3`, no `boardroomDisplaySpan`, no doPost Drive-logging). Same for v17
  "Raise upload file cap 3->10". **The version labels describe changes the versions do
  not contain.** A version label is therefore not evidence of a deploy, and must never
  again be treated as one.
  **Consequence for rollback:** the documented rollback procedure ("`git revert` + full
  43-file `clasp push` from main") is currently **unsafe to fire blind** — live is at
  09-07, so a full push from `main` is not a rollback but an 11-day roll-forward of
  change that has never executed in production. Do not run it as a reflex under pressure.

- **RESOLVED 2026-09-18 — `clasp run` was never a Google OAuth policy problem.** The live
  manifest contains **no `executionApi` block and no `oauthScopes` array**; both edits
  exist only in the repo (branch, and now `main` after this session's reconciliation).
  The 2026-09-15 six-step investigation below chased a consent-screen/restricted-scope
  hypothesis that cannot have been the cause, because the manifest it depended on was
  never live. Step 1's "added, pushed, confirmed live" was not true of live state.
  The three config fixes themselves remain real and correct — they simply have not been
  deployed. **CORRECTION 2026-09-18: `clasp run` did NOT start working after the
  reconciliation push, and the earlier expectation here was wrong.** The push came from
  `main`, whose `appsscript.json` contains neither `executionApi` nor `oauthScopes` — those
  edits exist only on branch `test/phase2-readiness-20260915`. Re-confirmed today:
  `clasp run eev2RunEvidenceHarnessV1` still returns "Unable to run script function", and
  the live manifest greps 0 for both keys. This is not a mystery and not a bug: deploying
  the manifest would change the app's declared authorization surface, and it was
  deliberately excluded from the code push so that any failure stayed unambiguous.
  **To unblock `clasp run`, that manifest change has to be brought to `main` and deployed as
  its own separate, deliberate decision** — never bundled with a code push. Until then the
  Apps Script editor fallback stands, and no further time should go into Google OAuth
  policy, which was never the cause.

- SUPERSEDED 2026-09-18 by the two items above, retained for the investigation trail —
  original 2026-09-15 entry: `clasp run` Execution API permission ("Unable to run
  script function..."), blocking `safety-gate-check`/`inconsistency-scan`/
  `xai-explain` from producing live results (they correctly detect and report this
  rather than fail silently — the manual Apps Script editor fallback documented in
  each tool's own doc works and was already used). Full investigation trail, in
  order — each step was a real, confirmed fix for its own narrower problem, but none
  fully resolved `clasp run`:
  1. `apps-script/appsscript.json` had no `executionApi` block — added
     `{"access": "MYSELF"}`, pushed, confirmed live. Did not fix it alone.
  2. Founder created a dedicated API-executable deployment
     (`AKfycbxuz7bMHIpcx5X7FfknJE5o_aH3k61DsE6gImPmz08o8l0p4ZRc6mREv3yljoJUEbE3Kw`).
     `clasp run` has no flag to target a specific deployment ID (checked
     `clasp run --help`) — did not fix it alone.
  3. `clasp apis` was separately failing ("GCP project ID is not set") because
     `apps-script/.clasp.json` had no `projectId` field (clasp reads this from the
     local file, not live). Founder confirmed the real GCP linkage (project "Gemini
     Project", ID `gen-lang-client-0767570182`) via editor + GCP Console
     screenshots. Added `"projectId"` to `.clasp.json` — this genuinely fixed
     `clasp apis`, confirming it was a real, separate bug. Did not fix `clasp run`.
  4. Root-caused via clasp's own source (`login.js`/`run-function.js`, installed at
     `~/.npm-global` → `.../@google/clasp/build/src/`): the `NOT_AUTHORIZED` error
     code (HTTP 403, distinct from the `NOT_FOUND` "deploy as API executable"
     message) meant a real Google-side authorization rejection, not a
     deployment/config problem. Traced `clasp login --use-project-scopes` to read
     `oauthScopes` from `appsscript.json` — which had never declared this field, so
     `--use-project-scopes` silently fell back to clasp's own generic default
     scopes every time, identical to a plain login (explains why the earlier
     re-login made no difference). Derived the real scope list from every Apps
     Script service actually used in the codebase (grepped `DriveApp`, `GmailApp`,
     `MailApp`, `SpreadsheetApp`, `UrlFetchApp` — not guessed) and added an
     `oauthScopes` array to the manifest. Flagged to founder before pushing: this
     changes the live app's *declared* authorization surface, not just
     dev-tooling — a real, more consequential change than the earlier two.
     Founder pushed it; `clasp login --use-project-scopes` then correctly showed
     "Authorizing with the following scopes:" (confirming the fix worked as far as
     it goes) but hit Google's "This app is blocked" sensitive-scope warning.
  5. Founder checked the OAuth consent screen (GCP Console → APIs & Services →
     OAuth consent screen / Google Auth Platform): Publishing status "Testing",
     `admin@constrovet.com` already a test user (ruling out the simple fix), "Data
     access" tab empty (confirming the consent screen itself never had these
     scopes declared — a real, separate gap from the manifest). Founder switched
     User type from External to Internal (should bypass Testing/verification
     restrictions entirely for `constrovet.com` Workspace accounts) and retried —
     still blocked with the identical "This app is blocked" message.
  6. STOPPED HERE by explicit founder decision rather than continue guessing
     through Google's OAuth policy internals. Real remaining hypotheses, none
     tested: (a) the Internal change may not have fully propagated yet (retry
     later), (b) `https://mail.google.com/` (full Gmail access) may be classified
     by Google as a "restricted" scope requiring a formal security assessment
     even for Internal Workspace apps in some configurations — narrowing to
     `gmail.readonly` (GmailApp.search only reads Sent mail for artifacts 1/2; no
     GmailApp send calls found in the codebase) would avoid this specific scope
     and is the most promising next thing to try, untested.
  **Net result:** three real, confirmed, committed bugs fixed this session
  (missing `executionApi` block, missing `.clasp.json` projectId, missing
  `oauthScopes` declaration) — all genuine improvements, all still in the repo,
  even though `clasp run` remains blocked. The manual Apps Script editor fallback
  is confirmed working and is the standing path until this is revisited.

- RESOLVED 2026-09-15: "3 real clients live" vs. "zero jobs run for them" tension.
  Prof. Taran confirmed: the three clients' documents are presently staged in the
  admin Drive account intentionally, for upload/submission later — not yet processed
  by design, not a gap or inconsistency. Onboarding (client relationship, real) and
  job processing (pipeline execution against their data) are simply two different,
  independently-tracked milestones; the first has happened, the second hasn't yet.

- RESOLVED 2026-09-15: EEV2-005 (per the execution prompt's ground truth) and EEV2-008
  (per Stage 2's "PR #20, already merge-ready") are the same defect and the same fix —
  storage-time truncation of `quoted_span` to 500 chars inside `boardroomFinding()`,
  removed in commit 33b7a39/093cae7 (2026-09-08), replaced with render-only
  `boardroomDisplaySpan()`. Confirmed via real `clasp pull` this session: live
  `Code.js` is byte-identical to repo `Code.gs`; live has the fix; 43/43 files match
  repo by name; `EEV2CitationTruncationRegression.gs` also byte-identical live vs repo.
  The prompt's execution-prompt.md appears to have duplicated one real bug under two
  IDs (S1 target = S2 target). No separate EEV2-005 defect was found.
- RESOLVED 2026-09-15: PR #20 confirmed via `gh pr view 20` — state MERGED, 2026-09-08,
  into main. S2's PASS bar is satisfied.
- RESOLVED 2026-09-15 (superseded by direct Drive audit below): initial pass checked
  SESSION_LOG.md's own EMAIL_SENT incidents (both went to founder's personal inbox, not
  a client) — see prior note in git history. That check covered internal test traffic
  only and was not itself proof about the three real clients, since it never confirmed
  where their real job history lives.
- RESOLVED 2026-09-15, FINAL: Prof. Taran provided the three real clients' Drive
  folders directly (Taran_paradise, Tower_of_prosperity, national_Highway project
  folders, all under admin@constrovet.com). Audited: (1) all three folders — source
  documents only (Procurement/Governance/Progress/BOQ/etc. staging subfolders), zero
  generated report outputs (no job-state.json/final-report.json/executive-report.md
  anywhere in them); (2) the authoritative `ConstroVet-Validation-Errors` sheet
  (spreadsheet 1htvKzTTPma9c4n2UjgzN28Eq9sPDJFjJ5qwoTU3n98U) — every job ever processed,
  2026-09-02 through 2026-09-15, all rows. Every row's source_document_template is an
  internal test/milestone label (Procurement_*, boardroom_*, M07_*/M10_*/M11_*/M22_*,
  cv-eev2-014-cap-check-*, etc.) — zero rows reference any of the three client project
  names or folders. Prof. Taran confirmed: **no report has ever been generated for any
  of the three real clients** — their source documents are staged but no job has run
  against them yet. Conclusion: the citation-truncation exposure question is moot for
  all three clients — there is no report, pre- or post-fix, to have been affected.
  Zero client exposure, confirmed by direct evidence, not by inference.

## Rollback readiness (updated whenever a stage that touches live/shadow systems runs)

- **Live code rollback path confirmed working (Stage 1/2 procedure):** not exercised, and
  as of 2026-09-18 **known to be mis-specified** — see the P0 item above. It assumes live
  tracks `main`; live is 11 days behind. The procedure must be rewritten to establish the
  live baseline by `clasp pull` first, before any push is planned.
- **Phase 2 fast-disable switch located AND test-fired:** not yet located
- **Any rollback actually exercised this project (date, reason, outcome):** none yet
- **Drift detection: FIXED 2026-09-18** (commit `73ec664`). `scripts/session-context.sh`
  previously ran `clasp status`, which lists only local files queued for push and never
  compares live *content* — that is why 11 days of drift went unnoticed. It now pulls live
  into an mktemp dir (deleted on exit) and diffs every `.gs` against its live `.js` plus
  the manifest. Verified run: 34 identical, 2 differing (`Code`, `EEV2FullRegressionGate`),
  7 in repo but not live; ~4.7s; still exits 0 always so it can never block a session.
  An auth failure now prints "drift is UNKNOWN, not zero" instead of implying sync.
  **Every session from now on opens with this line — if it says DRIFT DETECTED, resolve
  that before trusting any stage's PASS.**

## Next single action

**Superseded 2026-09-18.** S4's daily-log cadence is no longer the next action, because
S4's evidence base is invalid while live runs 09-07 code: a "Phase 2 readiness" verdict
cannot be built on daily checks of a production system that does not contain the fixes
being assessed. S4's ~21-day clock still must not be compressed, but it should be treated
as paused pending the live reconciliation, and the pause recorded honestly in the wiki
branch log (which also has an unlogged gap for 2026-09-16 and 2026-09-17 — do **not**
back-fill those; record them as unlogged).

**DONE 2026-09-18.** The push landed and was verified independently: live is IN SYNC with
`main` (43 files + manifest), and version 21 was pulled back and confirmed to contain the
fix. S1/S2 are live-verified PASS.

**The one concrete next action:** run a single controlled test submission through `/upload`
and confirm the Apps Script Executions panel shows it ran **Version 21**. That is the last
unproven link in the chain — everything upstream of it is now verified. Once it reads 21,
S4 can resume its daily log (recording 2026-09-16/17 as unlogged, never back-filled).

Also queue, before the first real client job: set `GEMINI_DAILY_CALL_LIMIT` in Script
Properties deliberately. It now defaults to 10 calls/day project-wide — a cap that did not
exist in live before this push, and one a single document-heavy client job could exhaust.

### Live push plan (FOUNDER ACTION — do not improvise under pressure)

Claude Code cannot run any of this; there is no OAuth credential available to it, ever.

1. Establish the baseline first: `clasp pull` into a *scratch* directory (never over the
   repo) and keep it — that is the only real record of what production contained before
   the push, and the only thing a genuine rollback can restore.
2. Push **all** files together, never a partial/single-file push (a prior incident where a
   `Code.js`-only pull deleted a companion file crashed all submissions).
3. Create a new version **after** the push, and confirm by pulling that version back and
   diffing it against `main` — this is the step whose absence caused the P0 above.
4. Re-point the pinned deployment. `clasp push` alone updates HEAD only; real `/upload`
   traffic runs a pinned deployment and will not move without `clasp deploy -i <id>`.
5. Verify per client only after the above: the three clients still have zero jobs, so
   verification here means a controlled test submission, not client traffic.

_Previous entry, superseded:_ S4 is now genuinely in progress: branch `test/phase2-readiness-20260915` created,
`../llm-wiki-constrovet/TESTING_BRANCHES/branch-phase2-readiness-20260915.md`
created with day 1's real log entry (committed locally in the wiki repo, not
pushed — same as the rest of that repo). Per GOALS.md, this branch's ~21-day clock
cannot be compressed — the next single action is: at the start of the next real
working session, read the existing branch log before adding to it, and append that
day's real entry. Do not claim readiness before the real elapsed time has passed.

---

## How to keep this file honest

Do not let this file become aspirational. If a stage is genuinely stuck, say
`FOUNDER_ACTION_REQUIRED` and name the blocker — do not mark a stage `in-progress` for
weeks with no real change. If you're not sure what the true current state is, that
uncertainty is itself the thing to write down here ("STATE UNCLEAR: last session's
commit doesn't match what this file claims — reconcile before proceeding") rather than
guessing and overwriting silently.
