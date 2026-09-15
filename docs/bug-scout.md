# bug-scout

Stage 3 Platform Safety Crew. Given a real anomaly description (a wrong or
mislabeled figure, a hold that shouldn't have happened, a report that shouldn't
have sent), traces it through the real pipeline and proposes a root cause and
regression test — grounded in real files, never speculation.

This is not a script: root-causing a real anomaly is a reasoning task, not a
deterministic query (unlike safety-gate-check, inconsistency-scan, and
xai-explain, which are thin wrappers around a fixed live function). bug-scout
is a checklist for how Claude Code should investigate a real anomaly report
when asked, so the process is consistent and grounded every time rather than
ad hoc.

## When to invoke

Ask Claude Code to "run bug-scout on <anomaly description>, job `<job_id>` (if
known)". Use it whenever a real job's output looks wrong — a figure that
doesn't match its source document, a report that sent when it should have
held (or vice versa), a finding attributed to the wrong row/citation.

## What it produces

A short written report (not a file by default — printed in the response
unless asked to be saved) with:
1. **Anomaly, restated** — the specific wrong behavior, in one sentence.
2. **Real evidence gathered** — the actual job's `final-report.json` /
   `browser-report.json` / validation-errors sheet row, and the actual source
   document from Drive, quoted directly (never reconstructed or paraphrased
   from memory of a similar past case).
3. **Trace through Code.gs** — the specific function(s) and line numbers
   responsible for producing the wrong output, with the exact current code
   quoted (not assumed from a past session — re-read the file).
4. **Root cause** — stated as a specific mechanism ("X does Y when input has
   shape Z"), not a vague category ("extraction issue").
5. **Proposed regression test** — using the REAL fixture text pulled in step
   2, not a synthetic reconstruction (per the project's own
   fixture-provenance rule — see `scripts/check-fixture-provenance.mjs` and
   PR #34's gate). State explicitly whether a real fixture was available or
   whether one still needs to be sourced.
6. **What this does NOT establish** — bug-scout proposes a root cause and a
   test; it never claims a fix is verified. That's a separate step (write the
   fix, run the real regression suite, get founder diff review — same
   discipline as every other stage in this build).

## Procedure Claude Code follows

1. **Restate the anomaly.** If a job_id is given, treat it as authoritative;
   if not, ask for one or for whatever identifying detail exists (job time,
   client, figure in question) rather than guessing which job it was.
2. **Pull real evidence, not memory.** Read the job's real
   `final-report.json`/`browser-report.json` (via Drive, or via
   `safety-gate-check.mjs`/`xai-explain.mjs` if the anomaly concerns a
   validation-gate or single-finding question) and the real
   validation-errors sheet row for that job_id. Quote them directly.
3. **Pull the real source document** referenced by the finding's citation
   (file name from the citation), not a same-named fixture already in the
   repo — a repo fixture may be stale or a reconstruction; the live incident
   needs the real document.
4. **Trace, don't assume.** Grep the CURRENT `apps-script/Code.gs` (and any
   relevant `EEV2*.gs` file) for the function(s) that would have produced
   this output. Read the actual current lines — never cite a past session's
   line numbers without re-reading, since the file has moved before (see
   `docs/DEFINITION_OF_DONE.md` and every EEV2 fix in git history that
   shifted line numbers).
5. **State the mechanism.** What specific condition in the real input
   triggers the real code path that produces the wrong output. If this
   can't be pinned down from the evidence gathered, say so plainly rather
   than guessing — an unresolved bug-scout pass is a valid, honest outcome.
6. **Propose the regression test**, using the real fixture text already
   pulled in step 3. Check whether an existing `EEV2*Regression.gs` file
   already covers a similar shape before proposing a new one.
7. **Do not fix the code as part of this pass** unless explicitly asked to
   go further — bug-scout's job is diagnosis, not remediation, so its output
   can be reviewed on its own before any code changes are proposed.

## Dry-run record (Stage 3, 2026-09-15)

Run against a real, already-fixed bug from project history, per S3's PASS
bar ("dry-run it against a recently-fixed bug from any of the three clients'
history").

**Anomaly:** job `form-20260909-072421-33a43b52`'s real report cited
`amount_inr: 3670.55` as `LEAKAGE_AND_OVERRUN`, sent for real
(`email_status: EMAIL_SENT`), when it should have been recognized as an AAC
Blocks unit rate, not a leakage figure.

**Real evidence (from `SESSION_LOG.md`, 2026-09-09 entry, and the real
validation-errors sheet read directly this session):** row for this job_id
shows `action_taken=PASSED_VALIDATION`, `warning_list` containing
`MULTI_AMOUNT_CITATION: Finding 5 cites INR 3670.55 from a passage
containing 24 separate currency figures`. The real citation text (already
pulled into the repo as the EEV2-008/009 fixture) is one continuous string
with no newlines: `"...Supplier-GDelayed PO-5578-007AAC Blocks335 Cu.M
Rs.3,670.55..."`.

**Trace through Code.gs (current, re-read this session):**
`boardroomTriggerOwnedAmount()`'s `BOARDROOM_LABEL_WINDOW` (40 raw
characters) picked up the previous table row's trailing word "Delayed" as
if it were this row's owning label, because the real Gemini OCR extraction
for this document has no row-separating newlines.

**Root cause:** the label-window check operates on raw character distance
with no row-boundary awareness; when a document's OCR extraction
concatenates table rows without whitespace/newlines, a trigger word from an
adjacent row falls inside the window and gets misattributed.

**Regression test:** already exists and is live —
`EEV2RowBoundaryRegression.gs`, part of the EEV2-012 fix (commit `4201e86`,
PR #36, merged 2026-09-09), using this exact real fixture text.

**What this dry-run establishes:** the bug-scout procedure above, followed
against a real historical incident, reproduces the same root cause already
recorded in the real PR that fixed it (independently arrived at from the raw
evidence, not copied from the PR description) — confirming the procedure is
sound. **What it does not establish:** bug-scout was not used to find this
bug originally; this is a retrospective dry-run for validation only, per
S3's own instruction.
