# Master Prompt — Constrovet Production Recovery & Safe Autonomous Development

Read AGENTS.md and CONTRACTS.md in full before anything below. If either
file conflicts with an instruction here, AGENTS.md wins — this prompt
operationalizes it, it doesn't override it.

**Standing rule for this entire engagement:** you may investigate, test,
and write autonomously. You may NEVER run `clasp push`, deploy a new
Apps Script version, or run anything requiring interactive OAuth
(`clasp login`) yourself. Those require the founder's own terminal and
browser session. When you reach one, stop and hand back the exact
command for the founder to run, then wait.

---

## PHASE 0 — Resolve the intake-path ambiguity (blocking, do this first)

Nothing else in this prompt can be trusted until this is answered. Right
now it is genuinely unknown whether real client form submissions reach
this project via (a) an installable trigger on the bound script, which
always runs current saved HEAD code regardless of any deployment version
label, or (b) a Web App URL tied to a specific deployment (`boardroom`,
`constrovet-work-processor`, or another), which runs whatever version
that deployment is pinned to.

1. Open Triggers (clock icon) in the Apps Script editor yourself — report
   every trigger, its function, and its event type.
2. Check the actual Google Form's own settings for where it sends
   submissions (a bound script uses triggers; a standalone form posting
   to a URL uses a Web App link — these are different Google-side
   configurations).
3. State, in one sentence with evidence, which mechanism real client
   traffic uses today. If you cannot determine this with certainty, say
   so explicitly — do not guess and proceed.

Do not touch Phase 1 until this is answered in writing.

---

## PHASE 1 — Full verified inventory: what works, what's broken, right now

Using ONLY the mechanism confirmed in Phase 0 (not repo, not an old pull,
not a deployment version that isn't in the real traffic path):

1. Pull the actual code that real submissions currently execute. If this
   requires the Apps Script API (`projects.getContent`) with a specific
   version number rather than plain `clasp pull` (which only returns
   HEAD), say so and request the founder run the specific command.
2. Produce a table: function name | present in real live path? | tested
   this session? | result. Cover at minimum: `validateReportOutput`,
   `logValidationError`, `boardroomTriggerOwnedAmount`,
   `boardroomFirstAmount`/`boardroomLastAmount`, `handleBoardroomFormSubmit`,
   `doPost`, `sendReportEmail`.
3. Explicitly separate "confirmed working," "confirmed broken," and
   "unknown — could not verify" — no item may be assumed into the first
   two categories.
4. Cross-check against the last confirmed-good state, Version 11
   (2 Sept 2026, 21:34), and today's incident (Version 12 wiped the
   validation layer). State plainly whether Version 11's protections are
   present in whatever is running today.

---

## PHASE 2 — Recovery plan (proposal only — founder executes any live change)

Do not restore or redeploy anything yourself. Produce a written plan
covering:

1. How to retrieve Version 11's actual file content (Apps Script has no
   one-click "restore to HEAD" for versions the way Docs does — this
   likely needs `projects.getContent` with `versionNumber: 11` via the
   Apps Script API, or manual inspection in the editor's version diff
   view). Give the founder the exact steps or API call.
2. A clean merge plan: Version 11's validation layer + the EEV2-004
   `boardroomTriggerOwnedAmount` fix, without re-introducing whatever
   caused today's overwrite.
3. The `boardroomLeakageRe` word-boundary fix (the `ld`/`late` false-
   ownership hole) as a required part of this same recovery, not a
   follow-up — it directly weakens the fix being restored.
4. Confirm CHECK 5e's status explicitly before including or excluding it
   — do not assume either way; state what you verified.
5. A rollback plan for the recovery itself, before the founder deploys it.

Hand this plan back for approval. Do not proceed to any live change
without an explicit go-ahead in writing.

---

## PHASE 3 — Build a real staging environment before further live testing

Known gap, stated in production-status.md from day one and never closed:
there is no staging copy of this Apps Script project. Propose (don't
build without approval) the minimum viable version: a second Apps Script
project or a second deployment on this project, wired to a test-only
form/sheet, so Contract 3's "re-run Test A and Test B after any change"
stops meaning "test directly against the system serving real clients."

---

## PHASE 4 — Delegation boundaries (formalize what's already been learned)

Write this into AGENTS.md as a permanent addition, don't just follow it
ad hoc:

- **You may do autonomously, no check-in needed:** reading code, writing
  tests, running suites locally/in a container, producing diffs, writing
  to SESSION_LOG.md, flagging ambiguity.
- **You may propose but must wait for explicit approval:** any change to
  a file that will be pushed live, any new regression suite becoming
  part of the release gate, any wording change to CONTRACTS.md.
- **Only the founder may execute, ever:** `clasp login`, `clasp push`,
  Apps Script deployment/version changes, anything touching the live
  Validation-Errors or Audit sheets' structure, running any `init*`
  function.
- **Immediately escalate, don't attempt to fix quietly:** any discovery
  that live code doesn't match what a prior session believed was live
  (today's incident is the reason this line exists).

---

## PHASE 5 — Milestone roadmap (write once, then follow it — don't re-derive it each session)

Write a `ROADMAP.md` with:
- **Goal** (one sentence): a client-facing report can never leave this
  system with a fabricated or mis-attributed figure.
- **Milestones**, each with a subgoal and a pass/fail test, in this order:
  1. Intake path resolved with certainty (Phase 0).
  2. Live validation layer restored and confirmed via a real Test A/Test B
     run (not a Node replay) — Contract 1 actually passes, not
     "unmet pending a test."
  3. `ld`/`late` word-boundary fix live, with its own regression fixture.
  4. Staging environment exists; Contract 3's regression habit runs
     against it, not production.
  5. CHECK 5e status decided deliberately (deploy or explicitly defer)
     with a written reason either way.
  6. Repo and live reconciled and kept in sync going forward — define
     *how* (e.g. `clasp push` is the only path live code changes,
     eliminating manual paste-and-deploy entirely).
- Each session, state which milestone is active, and do not skip ahead
  even if a later one looks easy — sequence matters here specifically
  because skipping the order is what caused today's incident (deploying
  before Phase 0/1 verification existed).

---

## Recurring failure patterns — read this list before every session, don't repeat these

1. Deploying before diffing against a freshly-confirmed live state
   (caused both the ₹27.6 crore incident and today's full gate wipe).
2. Treating the repo as a stand-in for live code without confirming sync
   status first (caused multiple false "the gate doesn't exist"
   conclusions across this project's history).
3. Conflating a deployment version label with what real traffic actually
   executes (the open Phase 0 question — triggers ignore deployment
   versions entirely).
4. Assuming pasted code is genuinely "live" without independent
   confirmation (Assumption D, falsified once already).
5. Fixing one keyword/regex-proximity defect and introducing a new one
   in the same mechanism (leakage regex → ownership regex, same
   word-boundary class of bug, twice).
6. Treating a session's own summary as durable memory — it isn't;
   restate critical constraints (this prompt, AGENTS.md) at the start of
   every new session rather than assuming continuity.

## What this prompt still cannot guarantee — state honestly, don't paper over

- It cannot force the founder to run a command promptly; every phase
  above has a real wait-state for human action, and production stays
  exposed during that wait.
- It cannot detect a future silent gate failure between sessions — no
  automated monitor exists yet that checks "is the validation layer
  present and being invoked" on a schedule. Propose this as a fast-follow
  once Phase 2 is stable: a small scheduled function that self-checks the
  gate's presence and alerts if it vanishes again, so the next wipe is
  caught in minutes, not discovered days later during an unrelated
  diagnostic.
- It cannot substitute for the founder's own review of any live-bound
  diff — Claude Code proposing a correct plan is not the same as the
  founder having read it before it goes live, which is precisely the
  step that was skipped today.
