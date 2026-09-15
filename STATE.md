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

- **Last updated:** 2026-09-15 (Stage 0 execution)
- **Updated by session ending at commit:** [NOT YET RUN — Stage 0 files not yet committed]
- **Prompt version in use:** v6 (two-track, rollback-first, 3 real clients)

## Track A — current position

- **Current stage:** S0 (in progress — skeleton created this session, not yet committed/exited)
- **Status:** in-progress
- **Evidence (link to SESSION_LOG.md entry or commit):** docs/SESSION_LOG.md, "2026-09-15 — Stage 0" entry
- **Per-client status where a stage requires it:**
  - Client 1: [NOT YET RUN]
  - Client 2: [NOT YET RUN]
  - Client 3: [NOT YET RUN]
- **Open FOUNDER_ACTION_REQUIRED items awaiting Prof. Taran:** none yet raised this build

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

- EEV2-005 (citation truncation, `boardroomFinding()` at Code.gs ~2400/~2484) — confirmed
  open as of 2026-09-08 per the execution prompt's ground truth. Not yet fact-checked
  against all three clients' real job history this build — that fact-finding step is the
  first action of Stage 1, not yet started.
- PR #20 (EEV2-008) — described as "already merge-ready" in the execution prompt; not
  yet re-verified against current `main` this build (Stage 2, not started).

## Rollback readiness (updated whenever a stage that touches live/shadow systems runs)

- **Live code rollback path confirmed working (Stage 1/2 procedure):** not yet exercised
- **Phase 2 fast-disable switch located AND test-fired:** not yet located
- **Any rollback actually exercised this project (date, reason, outcome):** none yet

## Next single action

Finish Stage 0: write GOALS.md (this session), report SessionStart-hook search result to
Prof. Taran (done — no in-repo `.claude/settings.json` found; hook that surfaces
git/clasp status at session start lives outside this repo and was not located/edited),
commit the Stage 0 skeleton, print `STAGE_EXIT: S0 = ...`, then wait for Prof. Taran's
go-ahead before starting Stage 1 (EEV2-005 fact-finding).

---

## How to keep this file honest

Do not let this file become aspirational. If a stage is genuinely stuck, say
`FOUNDER_ACTION_REQUIRED` and name the blocker — do not mark a stage `in-progress` for
weeks with no real change. If you're not sure what the true current state is, that
uncertainty is itself the thing to write down here ("STATE UNCLEAR: last session's
commit doesn't match what this file claims — reconcile before proceeding") rather than
guessing and overwriting silently.
