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

---

## 2026-09-15 — clasp run Execution API permission: investigated, partially fixed, not fully resolved

Prof. Taran completed the queued `clasp push` (confirmed via fresh clasp pull:
EEV2InconsistencyScan.js and EEV2XaiExplain.js both live, byte-identical to repo,
46/46 files match). Re-tested `safety-gate-check` — Execution API permission still
blocked, identical error to before.

Investigated the actual root cause rather than just re-reporting the known
limitation, since Prof. Taran asked me to resolve it directly:

1. Found `apps-script/appsscript.json` had no `executionApi` block at all (only a
   `webapp` block) — this is required for the Execution API to authorize function
   calls at all, separate from any web app deployment. Added
   `"executionApi": {"access": "MYSELF"}`. Both test suites still green after the
   edit (27/27, 20/20). This was a repo file I could edit directly, but pushing it
   live is still founder-only per the execution prompt's ground truth — printed a
   FOUNDER ACTION REQUIRED with the exact diff and push command.
2. Prof. Taran pushed it and separately created a dedicated API-executable
   deployment in the Apps Script editor (confirmed via `clasp deployments`:
   `AKfycbxuz7bMHIpcx5X7FfknJE5o_aH3k61DsE6gImPmz08o8l0p4ZRc6mREv3yljoJUEbE3Kw`,
   "api-executable-constrovet", 8 deployments total now). `clasp run` still failed
   identically — confirmed `clasp run` has no flag to target a specific deployment
   ID (checked `clasp run --help`), so it always goes through HEAD/whatever the
   Execution API resolves to, not a deployment clasp lets you pick.
3. Mid-investigation, `clasp` auth itself expired (`invalid_grant`/`invalid_rapt`) —
   Prof. Taran ran `clasp login` again to fix this (separate, now-resolved issue).
4. Found `clasp apis` was independently failing ("GCP project ID is not set") even
   after auth was restored. Traced this to `apps-script/.clasp.json` never having a
   `projectId` field — clasp reads this from the local config file, not by live
   Google lookup. Asked Prof. Taran to confirm the actual GCP linkage via the Apps
   Script editor's Project Settings + GCP Console: confirmed the script IS linked
   to a real Standard GCP project ("Gemini Project", project number 957629876968,
   project ID `gen-lang-client-0767570182`), with the Apps Script API enabled
   there (both shown via real screenshots, not assumed). Added
   `"projectId": "gen-lang-client-0767570182"` to `.clasp.json`. This FIXED
   `clasp apis` (now correctly lists Drive as enabled plus the full available-API
   list) — confirming this was a real, distinct bug, not a dead end.
5. Re-tested `safety-gate-check` after the `projectId` fix: `clasp run` STILL fails
   with the identical "Unable to run script function" error, despite `clasp apis`
   now working. This means `clasp apis` and `clasp run` authorize through different
   paths — fixing the project-ID lookup was necessary for one but not sufficient
   for the other.

Remaining hypothesis (not tested): the cached OAuth token in `~/.clasprc.json` may
have been granted before today's GCP-link/API-executable-deployment changes and
may carry an incomplete scope set specifically for the Apps Script Execution API
(separate from whatever scope `clasp apis` needs). A forced `clasp logout &&
clasp login` to get a fresh consent grant was the next concrete step, but Prof.
Taran explicitly deferred it ("stop here, use manual fallback") rather than spend
further session time on it.

**Net result:** two real, confirmed bugs fixed this session (missing
`executionApi` manifest block; missing `.clasp.json` `projectId`) — both are
genuine improvements now committed to the repo, even though `clasp run` itself
remains blocked. Proceeding to Stage 4 using the Apps Script editor's manual
fallback (`eev2AuditJobDiagnosticRun()`, or pasting direct function calls) for any
daily-log entries that need `safety-gate-check`/`inconsistency-scan`/`xai-explain`
output, until this is revisited.

`STAGE_EXIT: clasp-run-investigation = PARTIAL | executionApi manifest block and .clasp.json projectId both fixed and confirmed working individually; clasp run itself still blocked; OAuth re-consent (clasp logout/login) is the next untested hypothesis, explicitly deferred by founder`

---

## 2026-09-18 — Live-vs-repo drift audit; S1/S2 reopened; governance moved to main

**What changed.** This session opened on `main`, where `STATE.md` and `GOALS.md` did not
exist — they had only ever been committed to the unpushed branch
`test/phase2-readiness-20260915`. Rather than create a fresh Stage 0 skeleton (which would
have destroyed three sessions of real work), the files were located in git history and
read from that branch.

**The finding.** A real `clasp pull` into a scratch directory proves live Apps Script HEAD
is byte-identical to repo commit `6078bb1` (2026-09-07 18:49) — 11 days stale. Live
`Code.js` lines 2400 and 2484 still carry the storage-time `.slice(0, 500)` truncation, the
EEV2-005/008 defect; `boardroomDisplaySpan` (the fix) appears 0× live vs 8× on `main`.
Seven files on `main` are absent live, including `EEV2CitationTruncationRegression` — the
regression guarding that exact bug — and `EEV2AuditJob`. Every PR merged since 2026-09-07
(#23, #32, #34, #36, #38, #39, #40, #41, #44, and all 09-17 work) is undeployed.

**Mechanism, verified not inferred.** Versions were created without a preceding `clasp
push`. Pulling version 20 explicitly — labelled "validation alert recipient fix",
2026-09-17 — returns content byte-identical to stale HEAD (`MAX_FILES = 3`, no
`boardroomDisplaySpan`). Same for v17 "Raise upload file cap 3->10". Version labels
describe changes the versions do not contain. A version label is not evidence of a deploy.

**Knock-on.** The `clasp run` OAuth investigation is retired: the live manifest contains no
`executionApi` and no `oauthScopes`, so the consent-screen/restricted-scope hypothesis
cannot have been the cause — the manifest it depended on was never live. The three config
fixes remain real and correct; they are simply undeployed.

**Verified this session.** Live HEAD == `6078bb1` (exact diff against 40 historical commits,
one match). `npm test` 27/27 and `npm run test:harness` green on `main`. Evidence Harness CI
green. `test/phase2-readiness-20260915` pushed to origin. Governance files moved to `main`
(`b0d727a`). Session-context hook rewritten to diff live against repo, run for real: 34
identical, 2 differing, 7 repo-only, ~4.7s, exit 0, mktemp dir cleaned up (`73ec664`).
Zero client exposure re-confirmed: no job has ever run for any of the three clients, so the
live defect has reached no client report. Prime directive intact.

**Not verified / still open.** The live push itself has not happened — FOUNDER ACTION. The
pinned deployment ID for `/upload` has not been identified this session. S4's daily log has
an unlogged gap for 2026-09-16 and 2026-09-17, deliberately **not** back-filled. The local
wiki repo still has no remote and three unpushed commits — the sandbox blocked adding a
remote, so this is handed to the founder. `sync-wiki.yml` will still fail when next
triggered: it uses `secrets.GITHUB_TOKEN` for a cross-repo checkout, which cannot work.

**Assumption stated plainly.** That live traffic runs HEAD or a deployment built from it —
since HEAD and every pulled version are identical, the drift conclusion holds either way,
but which deployment serves `/upload` still needs confirming before the push.

`STAGE_EXIT: S1 = FOUNDER_ACTION_REQUIRED | fix is correct in repo and tested, but is not live; live is 11 days stale at 6078bb1`
`STAGE_EXIT: S2 = FOUNDER_ACTION_REQUIRED | PR #20 merged in repo, but the merged code has never been deployed`
`STAGE_EXIT: S4 = PAUSED | readiness evidence cannot be built while live lacks the fixes being assessed; 21-day clock not compressed, gap days recorded as unlogged`

---

## 2026-09-18 (cont.) — Reconciliation push executed and independently verified

**What happened.** Founder captured the production baseline
(`~/constrovet-live-baseline-20260918.tar.gz`, 121,530 bytes — verified byte-identical to
this session's audit pull, so it is a true pre-push snapshot), then ran `clasp push` and
`clasp create-version` from `main`, producing version 21.

**Verified, not assumed.** `scripts/session-context.sh` now reports **"IN SYNC -- live
matches this working tree (43 files + manifest)"**. A `clasp pull --versionNumber 21`
confirms version 21 genuinely contains the fix: `boardroomDisplaySpan` 8×, `MAX_FILES = 10`,
43 files. The EEV2-005/008 storage-time truncation is gone from live. S1 and S2 are
live-verified PASS. The 11-day drift is closed.

**Diff reviewed before the push, not after.** 492 changed lines in `Code.gs`; 15 functions
added; **zero functions removed** — purely additive plus the truncation fix. The manifest
was byte-identical to live, so the push carried no OAuth-surface change. The `executionApi`
/ `oauthScopes` manifest edits were deliberately excluded and remain on the test branch:
bundling an authorization-surface change with a code reconciliation would have made any
failure ambiguous. `clasp run` therefore stays blocked, by choice.

**Gate defaults checked before the push.** The three new enforcement gates all fail safe:
`eev2IsEmailAllowed_` returns true when its property is unset, and `eev2ResolveLimitValue_`
falls back to conservative defaults rather than "unlimited". No Script Properties needed to
be set first, so there was no lockout risk.

**Hook false positive found and fixed (`ea16b08`).** Immediately after the push the drift
check still reported DRIFT on `appsscript.json` — a trailing-newline-only difference, since
Apps Script stores files without a final newline. Normalized both sides before comparing.
A detector that reports drift every session trains people to ignore it, which is the exact
failure the section exists to prevent.

**Not verified / still open.** Which version real `/upload` traffic executes.
`clasp deployments` shows the deployment at @21, but the founder's `clasp redeploy` command
**errored** ("Read-only deployments may not be modified"; `-V NN` was pasted with the
literal placeholder), so something other than that command moved it. Per this session's own
lesson, a label is not proof. A `GET` on the `/exec` URL cannot settle it either — `doGet`
returns identical output on v20 and v21 (confirmed HTTP 200, healthy). The Executions panel
after one controlled test submission is the only thing that will.

**Config item queued.** `DEFAULT_GEMINI_DAILY_CALL_LIMIT = 10` is now live — a project-wide
daily cap that did not previously exist. Set `GEMINI_DAILY_CALL_LIMIT` deliberately before
the first real client job rather than discovering it as a mid-job failure.

`STAGE_EXIT: S1 = PASS | fix verified live by pulling version 21 back and diffing; live IN SYNC with main`
`STAGE_EXIT: S2 = PASS | PR #20's merged code is now genuinely deployed and verified, not label-asserted`
`STAGE_EXIT: S4 = RESUMABLE | blocker removed; resume daily log once /upload version is confirmed via Executions panel`
