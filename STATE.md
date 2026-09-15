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

- **Last updated:** 2026-09-15 (Stage 1 fact-finding + verification)
- **Updated by session ending at commit:** 23b0114 (Stage 0), wiki repo 98fec2a (local, unpushed)
- **Prompt version in use:** v6 (two-track, rollback-first, 3 real clients)

## Track A — current position

- **Current stage:** S1 = PASS, S2 = PASS, S3 = PASS, S4 = IN PROGRESS (day 1 of ~21,
  started 2026-09-15, branch `test/phase2-readiness-20260915`)
- **Status:** in-progress
- **Evidence (link to SESSION_LOG.md entry or commit):** docs/SESSION_LOG.md, "2026-09-15 — Stage 1" entry; live-vs-repo diff (zero bytes) on Code.gs/Code.js and EEV2CitationTruncationRegression; `npm run test:harness` (20/20) and `npm test` (27/27) both green; `gh pr view 20` = MERGED; root SESSION_LOG.md fabricated-figure-send audit found zero client exposure (both incidents went to founder's own confirmed-personal inbox)
- **Per-client status where a stage requires it:**
  - Client 1/2/3: no direct per-client fixture re-test run this session (S1's code fix was already live/tested); exposure check was a document-record audit, not a fresh per-client Drive pull — see Known open items for the caveat
- **Open FOUNDER_ACTION_REQUIRED items awaiting Prof. Taran:** none currently open

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

- OPEN, real progress made 2026-09-15: `clasp run` Execution API permission
  ("Unable to run script function. Please make sure you have permission to run the
  script function."), blocking `safety-gate-check`/`inconsistency-scan`/`xai-explain`
  from producing live results (they correctly detect and report this rather than
  fail silently). Investigated and fixed, in order: (1) `apps-script/appsscript.json`
  was missing an `executionApi` block entirely — added `{"access": "MYSELF"}`, pushed
  live by Prof. Taran, confirmed live via clasp pull. Did not fix it alone. (2)
  Founder created a dedicated API-executable deployment
  (`AKfycbxuz7bMHIpcx5X7FfknJE5o_aH3k61DsE6gImPmz08o8l0p4ZRc6mREv3yljoJUEbE3Kw`,
  "api-executable-constrovet") — confirmed via `clasp deployments`. Did not fix it
  alone; `clasp run` has no flag to target a specific deployment ID, so it wasn't
  clear this was even reachable via clasp. (3) `clasp apis` was separately failing
  with "GCP project ID is not set" — root cause found: `apps-script/.clasp.json` had
  no `projectId` field (clasp reads it from this file, not by live lookup). Founder
  confirmed via Apps Script editor + GCP Console that the script IS linked to a real
  Standard GCP project ("Gemini Project", project number 957629876968, project ID
  `gen-lang-client-0767570182`, Apps Script API enabled there). Added
  `"projectId": "gen-lang-client-0767570182"` to `.clasp.json` — this FIXED
  `clasp apis` (now lists enabled APIs correctly). `clasp run` STILL fails
  identically after all three fixes. Remaining hypothesis, NOT yet tested: the
  cached OAuth token (`~/.clasprc.json`, re-logged-in once already this session,
  `invalid_rapt` resolved) may predate the API-executable deployment/GCP link and
  carry an incomplete scope grant for the Execution API specifically (distinct from
  the scopes `clasp apis` needs) — a forced `clasp logout && clasp login` was
  proposed but explicitly deferred by Prof. Taran ("stop here, use manual fallback").
  Next session: either resume this investigation (logout/login first) or continue
  treating it as a standing limitation with the documented manual-editor workaround.

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

- **Live code rollback path confirmed working (Stage 1/2 procedure):** not yet exercised
- **Phase 2 fast-disable switch located AND test-fired:** not yet located
- **Any rollback actually exercised this project (date, reason, outcome):** none yet

## Next single action

S4 is now genuinely in progress: branch `test/phase2-readiness-20260915` created,
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
