# AUTONOMOUS_CYCLE_PLAN.md — Constrovet, Full Cycle to Production-Ready

Read alongside AGENTS.md (authority), CONTRACTS.md (definition of done),
ROADMAP.md (milestones), CONTINUATION_CONTRACT.md (phase prompts). This
document does not replace any of them — it's the operating plan that ties
them into one continuous, mostly-autonomous cycle.

---

## What "production ready" means — no other definition counts

**All 7 ROADMAP.md milestones marked DONE, each with real evidence, not a
green test run standing in for it.** Confirmed with the founder directly —
this is the bar, not a feeling of "probably fine."

Claude Code must not declare production-ready on its own judgment. It
reports "all 7 milestones DONE, evidence attached" and stops. The founder
makes the actual call.

---

## Autonomy mode — confirmed with the founder

**Single long session, many cycles, then report and stop.** The founder
opens Claude Code, gives one instruction (below), and it works
autonomously through as many dev/test/fix/verify cycles as needed in that
sitting — not a background daemon, not a cron job, not something running
unattended between sessions. This was chosen deliberately over scheduled/
unattended runs, given the founder's own oversight capacity.

---

## Google Drive access — one-time setup, reusing what already exists

Do not set up a new Google Cloud project, service account, or separate
OAuth credential for this. Claude Code can reuse the same Google Drive
connection already authorized on the founder's claude.ai account.

**Setup, once:**
1. In Claude Code, run `/mcp`.
2. Look for "Google Drive" in the list. If it shows "Needs authentication,"
   follow the prompt to authorize it — this uses the same account
   connection already active elsewhere, not a new grant.
3. Confirm it can list/read the test-data folder before relying on it for
   anything.

**Read-only in practice, even if the connector technically allows more.**
Claude Code may search and read from Drive (test fixtures, real job
outputs, the validation/audit sheets) at any time, autonomously. Claude
Code must NEVER create, edit, move, or delete anything in Drive or in the
live Google Sheets without explicit founder approval first — this mirrors
the existing "only the founder alters live sheet structure" rule and
extends the same caution to Drive writes generally.

---

## Sync rule — refined, effective immediately

- **Any commit touching only files outside `apps-script/`:** Claude Code
  commits AND pushes to GitHub autonomously. No approval needed, no
  separate step.
- **Any commit touching one or more files under `apps-script/`:** still
  requires explicit founder approval before the commit is created — this
  boundary does not move.
- **Once an `apps-script/`-touching commit is approved and created,
  pushing it to GitHub is autonomous too** — GitHub hosts code, it does
  not touch the live Apps Script project. Only `clasp push` does that, and
  `clasp push` remains founder-only, always, no exception.
- Net effect: local and remote git stay in sync without founder
  intervention, in every case except the moment an `apps-script/` change
  is first proposed — which still gets a human look, as it should.

---

## What Claude Code does in one autonomous cycle

Given the single instruction below, repeat this loop until every milestone
is DONE, a live-founder-only action is the next required step, or
something genuinely ambiguous forces a stop:

1. Read AGENTS.md, CONTRACTS.md, ROADMAP.md, CONTINUATION_CONTRACT.md
   fresh (session-start context hook already surfaces git/Apps Script
   drift automatically — use it, don't skip it).
2. Identify the active milestone and its exact pass test.
3. Work that milestone: build, test in isolation first, verify fail-then-
   pass where applicable, cross-check against real Drive/Sheets data
   where the milestone requires it (e.g. real Test A/B submissions).
4. Log findings to SESSION_LOG.md as you go, not just at the end.
5. Commit and push anything outside `apps-script/` immediately, per the
   sync rule above.
6. If the milestone's pass test requires an `apps-script/` change: prepare
   the diff, run every relevant test, and STOP — present it for approval,
   do not proceed past this point in the same cycle.
7. If the milestone's pass test requires a founder-only live action
   (`clasp push`, a deployment/trigger change, a real Test A/B
   submission): STOP — hand back the exact command or action needed, do
   not attempt to simulate around it.
8. Once a milestone is genuinely DONE (per its own written pass test, not
   a paraphrase of it), update ROADMAP.md's status for that milestone with
   the evidence, move to the next one, and continue the loop.
9. When all 7 are DONE: write one final summary — every milestone, its
   evidence, what remains as ongoing operational practice (Contract 5's
   weekly canary, the gate-health monitor) versus what was a one-time
   build. Report this to the founder. Stop.

---

## What's shared and authorized — stated once, not assumed per-session

- **Google Drive:** read-only in practice (see above), via the existing
  claude.ai account connector, covering the test-data folder and real job
  output folders as needed for verification.
- **GitHub:** full read/write, commit and push, for everything except the
  approval checkpoint on `apps-script/`-touching commits.
- **Local filesystem/repo:** full read/write within the project directory,
  per AGENTS.md's existing autonomous tier.
- **Apps Script live project:** read-only via `clasp pull` at any time.
  `clasp login` and `clasp push` are founder-only, always.
- **Email:** any test submission must use an internal-only address
  (`admin@constrovet.com`), per Contract 5 — never a real or
  real-looking client address, ever, for any test.
- **Not shared/authorized, and not to be assumed:** any credential,
  service account, or access method not listed above. If a task seems to
  need something not on this list, stop and ask — do not provision new
  access on your own judgment.

---

## The one instruction to start the cycle

```
Read AGENTS.md, CONTRACTS.md, ROADMAP.md, CONTINUATION_CONTRACT.md, and
AUTONOMOUS_CYCLE_PLAN.md in full. Confirm the Google Drive connector is
authenticated (/mcp) before relying on it.

Work through ROADMAP.md's milestones in order, autonomously, per
AUTONOMOUS_CYCLE_PLAN.md's cycle description. Commit and push everything
outside apps-script/ as you go, no need to check in with me for those.
Stop and present anything touching apps-script/ for my approval before
committing it. Stop and hand back exact commands for anything founder-only
(clasp push, deployments, triggers, real Test A/B submissions).

Do not declare production-ready yourself. Report when all 7 milestones are
DONE with evidence, or when you hit a wall that needs my judgment, not
just my execution.
```
