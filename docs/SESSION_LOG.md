# Constrovet Phase 2 — Track A/B/C Session Log

Append-only history for the Constrovet Phase 2 build (STATE.md / GOALS.md / execution
prompt v6, two-track, rollback-first, 3 real clients). This is separate from the
repo-root `SESSION_LOG.md`, which predates this protocol and continues to track other
work independently.

Each entry: date, stage, what changed, test result, what's still unverified.

---

## 2026-09-15 — Stage 0

Created Stage 0 skeleton: `docs/SESSION_LOG.md` (this file), `docs/AGENTS.md`,
`docs/DEFINITION_OF_DONE.md`, sibling repo `../llm-wiki-constrovet/` (local only, not
pushed) with its 7 folders, `STATE.md` and `GOALS.md` at repo root. No Code.gs touched,
nothing pushed to GitHub, no crew scripts written, Phase 2 untouched — per S0's DO NOT
YET boundary.

SessionStart hook search: no `.claude/settings.json` exists in this repo. The
git-log/git-status/clasp-status output that appears automatically at session start is
produced by a hook outside this repo (likely user-level Claude Code config), which is
not safely locatable or editable from within this working directory. Falling back to
manual read-STATE.md-first / write-STATE.md-last discipline per the Anti-drift protocol
fallback.

Test result: N/A (no code changed).

Still unverified: whether a user-level hook exists and could be wired to surface
STATE.md automatically — would need founder confirmation of where that hook actually
lives before attempting to edit it.

`STAGE_EXIT: S0 = PASS | skeleton created, no live/content work done, hook wiring deferred pending founder input on hook location`

---

## 2026-09-15 — Stage 1

Started S1 with the required fact-finding step: located `boardroomFinding()` and
`boardroomDisplaySpan()` in `apps-script/Code.gs`. Found the storage-time truncation
described in the execution prompt's S1 ground truth (as "EEV2-005") does NOT exist in
current `main` — it was already removed by commit 33b7a39/093cae7, "Fix boardroom
citation truncation before validation (EEV2-008)" (2026-09-08), which is the exact same
fix S1 asked for (full span passed to the validator, truncation moved to render-only via
`boardroomDisplaySpan()`), using the exact same real fixture (PO-5578-007 / AAC Blocks /
Rs.3,670.55 past char 500) the prompt names. Per Prof. Taran's instruction ("the latest
of EEV2-005 and EEV2-008 should be used"), treated this as one defect, already fixed
under the EEV2-008 commit.

Verified the fix is actually live, not just committed: ran `clasp pull` for real against
the production script (scriptId ending `...WhcbWWvbo`, via existing `.clasp.json` found
in `~/live-check-6/`) into a scratch directory. Diffed the pulled `Code.js` against the
repo's `Code.gs` — zero-byte diff. Diffed the pulled `EEV2CitationTruncationRegression.js`
against the repo's `.gs` counterpart — zero-byte diff. Full file-set parity: 43 files on
both sides, identical names. This means the repo and live Apps Script are currently in
sync (updates a prior working assumption that the repo could not be assumed to reflect
live state).

Ran `npm run test:harness`: 20/20 EEV2 regression suites pass (100%), 0 external calls,
`release_decision: READY_FOR_CONTROLLED_TEST_PROJECT_VALIDATION`. Ran `npm test`: 27/27
tests pass, 0 failures. Both outputs captured in full, not summarized.

What's still unverified: (1) the prompt's S1 fact-finding question — whether any
already-delivered client report actually hit the pre-fix truncation path — was not
answered for any of the three real clients; since the fix is already live this is now a
retrospective/audit question rather than a blocking one, but it remains open if Prof.
Taran wants it checked for client-communication purposes. (2) Whether a literal GitHub
PR #20 exists and is merged/closed — not checked this session; S2's PASS bar technically
asks for that specific verification even though the underlying code fix is confirmed
live by other means.

`STAGE_EXIT: S1 = PASS | fix (EEV2-005/EEV2-008, same defect) confirmed already live via real clasp pull + zero-byte diff; test:harness 20/20, npm test 27/27; client-report fact-finding and literal PR #20 status remain open, non-blocking`

---

## 2026-09-15 — Stage 1 follow-up: PR #20 status + client-exposure fact-finding

Closed both items left open at the end of the first S1 pass.

**PR #20:** `gh pr view 20` — confirmed `state: MERGED`, merged 2026-09-08 into `main`,
title "Fix boardroom citation truncation before validation (EEV2-008)". This directly
satisfies S2's PASS bar ("regression suite green against current main (post-S1)").
Also found PR #32 ("Merge EEV2-008/009 fix... onto current main," merged 2026-09-09) —
a cherry-pick reconciliation of the same fix onto a `main` that had moved on, needed
because the original PR #20 branch had gone stale. Both are part of the same landed
fix, already confirmed live via the earlier byte-identical `clasp pull` diff.

**Client exposure fact-finding:** read the root-level `SESSION_LOG.md` (251KB, the
project's pre-existing real history) for every real `email_status: EMAIL_SENT` incident
involving a fabricated/mislabeled figure. Found two:
- Job `form-20260902-184403-e5014284` (2026-09-02): ₹27,60,26,419 mislabeled leakage,
  `action_taken=PASSED_VALIDATION`, sent to `bhagat.taran@gmail.com`.
- Job `form-20260909-072421-33a43b52` (2026-09-09): ₹3,670.55 mislabeled leakage
  (AAC Blocks unit rate, PO-5578-007), sent to `bhagat.taran@gmail.com`. This happened
  AFTER the EEV2-008 truncation fix had already landed — root cause was a sibling
  defect, EEV2-009 (cross-row/OCR label bleed), uncovered while stress-testing the
  truncation fix against real Gemini OCR output that had no newlines between table
  rows. EEV2-009 was fixed 2026-09-09 by EEV2-012 (PR #36, "OCR column-join veto").

Both incidents' recipient, `bhagat.taran@gmail.com`, was explicitly confirmed by the
founder in the 2026-09-06 session log entry to be his own personal inbox, not a client
address ("no external/client exposure in the 2026-09-05 escalation"). No `EMAIL_SENT`
event to any other recipient appears anywhere in the root SESSION_LOG.md.

**Conclusion:** no evidence that any of the three real clients received a report
affected by EEV2-005/EEV2-008 (citation truncation) or its sibling EEV2-009 (label
bleed). This is a document-record audit of the existing session log, not a fresh,
independent per-client Drive pull — if Prof. Taran needs a stronger guarantee (e.g.
before making any statement to a client), that would require directly pulling each of
the three clients' real job history from Drive and checking for the specific failure
signature, rather than relying on what was already logged.

`STAGE_EXIT: S2 = PASS | PR #20 confirmed MERGED via gh pr view; fix already verified live in S1`
`Client-exposure fact-finding = COMPLETE (document-record audit) | zero client exposure found; both real fabricated-figure sends went to founder's own confirmed-personal inbox, not a client`

---

## 2026-09-15 — Stage 1 fact-finding, final pass: direct three-client Drive audit

The document-record audit above was based on the root SESSION_LOG.md alone, which
turned out to predate confirmation of real client onboarding and could not speak to
client-specific exposure. Prof. Taran provided direct Drive links to the three real
clients' project folders and confirmed "3 real clients ARE live now" (correcting
PROJECT_MILESTONES.md/CONTRACTS.md, which as of 2026-09-11 stated onboarding had not
started — treated as a genuinely new real-world fact per STATE.md's own rule, not
discarded because it conflicted with the stale docs).

Audited directly, for real, this session:
- All three client Drive folders (`Taran_paradise_PROJ_*`, `Tower_of_prosperity_*`,
  `national_Highway_PROJ_*`, all under `admin@constrovet.com`): source-document
  staging folders only (Procurement/Governance/Progress/BOQ/Changes/etc. subfolders).
  Zero generated report outputs (no `job-state.json`, `final-report.json`,
  `executive-report.md`) found in any of them.
- The authoritative `ConstroVet-Validation-Errors` Google Sheet
  (`1htvKzTTPma9c4n2UjgzN28Eq9sPDJFjJ5qwoTU3n98U`) — every job the live pipeline has
  ever logged, 2026-09-02T13:52 through 2026-09-15T06:16, read in full (not paginated
  or sampled). Every row's `source_document_template` is an internal test/milestone
  label (`Procurement_*`, `boardroom_*`, `M07_*`/`M10_*`/`M11_*`/`M22_*`,
  `cv-eev2-014-cap-check-*`, `UNKNOWN`, `OTHER`, etc.). Zero rows reference any of the
  three real clients' project names.

Prof. Taran confirmed directly: no report has ever been generated for any of the three
real clients — their source documents are staged in Drive but no job has run against
them yet.

**Final conclusion:** the citation-truncation exposure question is moot for all three
real clients. There is no report — pre-fix or post-fix — to have been affected. Zero
client exposure to EEV2-005/EEV2-008 (or its sibling EEV2-009), confirmed by direct
evidence (Drive folder audit + full validation-errors sheet read), not by inference
from internal test-traffic logs.

**Flagged, not silently resolved:** there's an apparent tension between "3 real
clients ARE live now" and "zero jobs run for any of them" — most likely both are true
(clients onboarded/staged, pipeline not yet exercised against their real data) but
this exact reading was not word-for-word confirmed with Prof. Taran. Recorded as an
open item in STATE.md rather than asserted as settled.

`Client-exposure fact-finding = COMPLETE, FINAL (direct 3-client Drive + validation-errors-sheet audit) | zero client exposure — no report has ever been generated for any of the three real clients`

---

## 2026-09-15 — Stage 3: Platform Safety Crews built

Built all 4 tools GOALS.md's S3 requires, checking what this Claude Code
environment actually supports before building (found: `.claude/skills/` exists
but empty; the established pattern in this repo is `npm run <name>` backed by
real `.mjs` files in `scripts/`, matching `pre-push-check.mjs`'s conventions
— followed that rather than guessing at a different mechanism).

**Credential constraint surfaced and resolved with founder input:**
`safety-gate-check` and `inconsistency-scan` both need to read the live
validation-errors sheet / Drive job folders. There is no Node-side Google API
credential anywhere in this repo — only `clasp` (Apps Script-side,
founder-run) and an agent's own Drive MCP connector access (session-only).
Asked Prof. Taran; chose "wrap `clasp run`" (free, fast, reuses the already
tested `eev2AuditJob` as-is) over standing up new Node-side credentials.

**Built:**
1. `scripts/safety-gate-check.mjs` — wraps the real, live `eev2AuditJob`
   (`apps-script/EEV2AuditJob.gs`, already live and tested) via `clasp run`.
   Real test run against `form-20260905-053908-609f4190` correctly detected
   `clasp run`'s Execution API permission failure (documented broken since
   2026-09-11) and reported `FOUNDER_ACTION_REQUIRED` with real fallback
   steps, rather than crashing. Took two debugging passes to get right: (a)
   `clasp`'s own path-traversal guard rejects being invoked with `-P
   <path>` from outside the config's directory when `rootDir` is `""` — fixed
   by running with `cwd` set to the config directory instead; (b) `clasp run`
   was observed to exit 0 while printing its permission failure to stderr
   only, which `execFileSync`'s stdout-only return value on success silently
   discarded — fixed by switching to `spawnSync`, which always returns both
   streams regardless of exit code.
2. `apps-script/EEV2InconsistencyScan.gs` (`eev2InconsistencyScan()`) + `scripts/inconsistency-scan.mjs`
   — new function (not previously built), read-only scan across every logged
   job in the validation-errors sheet for 4 recurring-anomaly categories, all
   built from warning/error codes the live pipeline already emits (nothing
   invented). Syntax-checked. Real test run correctly reported
   `FOUNDER_ACTION_REQUIRED` (function written but not yet pushed live).
   Separately validated the scan LOGIC ITSELF by dry-running it in plain
   Node against a real 17-row subset of the actual validation-errors sheet
   (already read via Drive this session) — it correctly surfaced the two
   real, independently-known recurring anomalies (INR 3,670.55 across 6
   jobs, the EEV2-009 pattern; INR 454.16 across 3 jobs), confirming the
   logic is correct ahead of the founder push that will make it live.
3. `apps-script/EEV2XaiExplain.gs` (`eev2XaiExplain(jobId, findingIndex)`) + `scripts/xai-explain.mjs`
   — new function, renders a "why this figure" markdown for one finding
   using only fields already on it (no new inference, no second analysis
   pass). Syntax-checked. Real test run against
   `form-20260902-135120-81f4fd27` finding 0 correctly reported
   `FOUNDER_ACTION_REQUIRED` (not yet pushed live).
4. `docs/bug-scout.md` — not a script (root-causing a real anomaly is a
   reasoning task, chosen over the alternative of a Node script calling an
   external LLM API, which would need a new credential/cost decision and
   duplicate reasoning Claude Code already does natively — founder chose the
   template approach). A structured investigation procedure. Dry-run
   performed per S3's bar, against a real, already-fixed historical bug
   (job `form-20260909-072421-33a43b52`'s EEV2-009 label-bleed incident):
   following the procedure from raw evidence (the real validation-errors
   sheet row, the real no-newline citation text) independently arrived at
   the same root cause already recorded in the real PR that fixed it
   (`4201e86`/PR #36) — confirms the procedure is sound.

Added `docs/safety-gate-check.md`, `docs/inconsistency-scan.md`,
`docs/xai-explain.md` (per S3's "doc in docs/ explaining when to invoke it
and what it outputs" requirement), and filled in `docs/AGENTS.md`'s stub
with a real tool roster table.

Added `npm run safety-gate-check`, `npm run inconsistency-scan`,
`npm run xai-explain` to `package.json`.

Full regression suites re-run after all changes: `npm run test:harness`
20/20 pass, `npm test` 27/27 pass — no regression from the new files.

**Two founder actions now queued** (both needed before 3 of the 4 tools can
produce a real result instead of `FOUNDER_ACTION_REQUIRED`):
1. Fix/restore `clasp run`'s Execution API permission (broken since at
   least 2026-09-11), or explicitly accept the documented manual-editor
   fallback as the standing workaround.
2. `clasp push` (full 32+2-file — now 45 files with the two new .gs files)
   so `eev2InconsistencyScan` and `eev2XaiExplain` exist live.
   `eev2AuditJob` (used by `safety-gate-check`) is already live from an
   earlier session, so `safety-gate-check` is blocked ONLY on item 1, not
   item 2.

`STAGE_EXIT: S3 = PASS | all 4 tools exist, documented, each run at least once with real output; 2 founder actions queued (Execution API permission, clasp push for the 2 new .gs files) before 3 of the 4 can produce a live result instead of FOUNDER_ACTION_REQUIRED`
