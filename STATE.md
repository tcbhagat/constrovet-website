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

- **Current stage:** S1 = PASS, S2 = PASS (both confirmed this session; S3 next)
- **Status:** PASS
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
- RESOLVED 2026-09-15: checked whether any of the three real clients' already-delivered
  reports hit the truncation bug (or its sibling, EEV2-009/cross-row label bleed,
  uncovered while testing the truncation fix). Read every `EMAIL_SENT` incident logged
  in SESSION_LOG.md (root). Found two real fabricated-figure sends: job
  form-20260902-184403-e5014284 (₹27,60,26,419, 2026-09-02) and job
  form-20260909-072421-33a43b52 (₹3,670.55, 2026-09-09, the EEV2-009 sibling bug, not
  the truncation bug itself — that one was already fixed by then). BOTH went to
  `bhagat.taran@gmail.com`, which the founder explicitly confirmed (2026-09-06 session)
  is his own personal inbox, not a client address. No `EMAIL_SENT` event to any other
  recipient was found in the log. Conclusion: no evidence any of the three real clients
  received a report affected by EEV2-005/008 or EEV2-009. This is based on SESSION_LOG.md
  as the record of what was checked at the time — it was not re-derived from a fresh,
  independent per-client Drive audit this session (that would be a heavier verification
  pass if Prof. Taran wants belt-and-suspenders confirmation before any client-facing
  claim is made about this).

## Rollback readiness (updated whenever a stage that touches live/shadow systems runs)

- **Live code rollback path confirmed working (Stage 1/2 procedure):** not yet exercised
- **Phase 2 fast-disable switch located AND test-fired:** not yet located
- **Any rollback actually exercised this project (date, reason, outcome):** none yet

## Next single action

S1 and S2 are both now genuinely PASS with real evidence (live-parity diff, PR #20
merged, no client exposure found in the session log). Confirm with Prof. Taran that S2
can be formally closed on this evidence, then proceed to S3 (Platform Safety Crews:
bug-scout, safety-gate-check, xai-explain, inconsistency-scan).

---

## How to keep this file honest

Do not let this file become aspirational. If a stage is genuinely stuck, say
`FOUNDER_ACTION_REQUIRED` and name the blocker — do not mark a stage `in-progress` for
weeks with no real change. If you're not sure what the true current state is, that
uncertainty is itself the thing to write down here ("STATE UNCLEAR: last session's
commit doesn't match what this file claims — reconcile before proceeding") rather than
guessing and overwriting silently.
