---
name: m15-decision-memo-20260910
description: Decision memo for M15 (EEV2-017 proposed) - which sendReportEmail callers bypass validateReportOutput, and the two fix options for founder approval. No apps-script/ write has been made; this is proposal only.
status: proposal
scope: apps-script/Code.gs, sendReportEmail gate coverage
---

# M15 decision memo — gate coverage on report-sending paths

## What was traced (code read only, nothing executed)

`sendReportEmail()` is defined once at `apps-script/Code.gs:5116` and called
from exactly 4 sites:

| # | Call site | Enclosing function | Reached from | `validateReportOutput` runs first? |
|---|---|---|---|---|
| 1 | `Code.gs:209` | `doPost(e)` | Anonymous public endpoint (web app POST) | **Yes** — confirmed in-function |
| 2 | `Code.gs:913` | `handleBoardroomFormSubmit(e)` | `onFormSubmit` trigger (installed live, confirmed via Triggers UI 2026-09-10) | **Yes** — `Code.gs:895`, labelled `// <-- NEW` in the source, confirmed in-function |
| 3 | `Code.gs:1111` | `rerunBoardroomJobWithCorrections(jobId, correctionFiles, recipientEmail)` | `handleBoardroomCorrectionFormSubmit(e)` (`Code.gs:990`) <- `onCorrectionFormSubmit(e)` (`Code.gs:696`) | **No** — no call to `validateReportOutput` found anywhere in `rerunBoardroomJobWithCorrections` (`Code.gs:1018-1111`) |
| 4 | `Code.gs:5340` | `resendBoardroomReport(jobId, recipientEmail)` | Manual invocation only (no trigger, no public endpoint route found) | **No** — reloads `final-report.json` from Drive and emails it directly |

**Reachability of the two ungated paths, confirmed 2026-09-10:**
- Path 3 (`onCorrectionFormSubmit`) requires an installed form trigger. **The
  Apps Script Triggers UI shows only `onFormSubmit` installed — no
  `onCorrectionFormSubmit` row.** So this path is real code but **not
  currently reachable** by any live trigger.
- Path 4 (`resendBoardroomReport`) has no trigger and no public endpoint
  route in `doPost`'s dispatch (checked: not found in the `doPost` action
  switch). It is reachable **only by a founder manually running the
  function** — same as `resendLatestBoardroomReportSmallThenFull`, which
  wraps it.

Neither ungated path has been exercised with a real call this session — this
is a static trace, consistent with `AGENTS.md`'s read-only-first workflow.

## The decision: two structural fix options

### Option A — one gate inside `sendReportEmail` itself

Move (or duplicate) the `validateReportOutput` call inside `sendReportEmail`
at `Code.gs:5116`, so every current and future caller is covered by
construction, not by each caller remembering to check first.

**Pros:**
- Single choke point — cannot be bypassed by a new caller added later without
  deliberately working around the gate.
- Closes both known gaps (paths 3 and 4) and any future path in one change.
- Matches the L2 "Contracts and invariants" framing on the docs branch: a
  release gate should have one enforcement point, not N call-site copies.

**Cons:**
- `sendReportEmail` does not currently receive the `browserReport` object
  `validateReportOutput` needs as its second argument (see call 1/2 above:
  `validateReportOutput(report, browserReport)`). Every one of the 4 call
  sites would need to be checked/updated to pass it in, or `sendReportEmail`
  would need to reload it from Drive itself (extra Drive read on every send).
  This is real, not cosmetic, plumbing work — every signature call changes.
  Higher-touch on line count than Option B, higher regression-test surface
  (every existing send path, not just the 2 currently-ungated ones).
- If `sendReportEmail` is ever called for a non-report email in the future,
  the gate would need a bypass flag — a chance to reintroduce exactly the
  kind of caller-remembers-to-check gap this option is meant to eliminate.

### Option B — gate each caller individually

Add `validateReportOutput` calls to the two currently-ungated functions
(`rerunBoardroomJobWithCorrections` at `Code.gs:1018` and
`resendBoardroomReport` at `Code.gs:5325`), matching the pattern already
present at call sites 1 and 2.

**Pros:**
- Smaller diff — 2 functions touched, not `sendReportEmail`'s signature and
  all 4 callers.
- Each caller already has (or can cheaply obtain) the `browserReport` it
  needs, since both reload `final-report.json`/related artifacts from Drive
  already — the plumbing this option needs is closer to what's already there.
- Lower regression-test surface: only the 2 newly-gated paths need new
  regression coverage; the 2 already-gated paths (1, 2) are untouched and
  provably unaffected.

**Cons:**
- Does not close the general mechanism — a future 5th caller of
  `sendReportEmail` could still ship ungated unless someone remembers to add
  the check. This is the same caller-must-remember shape that produced the
  gap being fixed now.
- Leaves `sendReportEmail` itself an easy function to call unsafely from
  anywhere in the file, including future code.

## Recommendation

Option A is the correct end state — a single choke point that cannot be
forgotten — and matches the design principle already written into this
repo's own `AGENTS.md`/`CONTRACTS.md` philosophy (one owner per invariant,
not N copies). Option B is real and closes today's two known gaps
faster and with less regression surface, but reproduces the exact
"caller must remember" pattern that created this gap, so a future 5th
caller could reopen it silently.

**No code has been written for either option.** This memo exists so the
founder's approval is informed, per the "named approver + written rationale"
pattern for changes to a security-relevant validation path. Once a choice is
made, the assistant will:
1. Quote the exact current lines of the chosen function(s) verbatim.
2. Write the regression fixture as a real held job that currently reaches an
   ungated path (proves the bug fails before, passes after) — needs a real
   fixture; if none is reachable, this stops with `UNKNOWN — need fixture`
   rather than reconstructing one.
3. Register the new suite in `eev2RunFullRegressionGate`, bump the harness
   count in `tests/eev2-evidence-harness.test.mjs`.
4. Run the full suite, zero regressions, mutation-check the new guard (break
   it, confirm the test catches the break).
5. Stop at PR — no `clasp push`, no deploy; that stays founder-only.

## Urgency, restated plainly

Neither path is live-reachable today (path 3 has no installed trigger; path 4
is founder-manual-only). This is a real defect to close, not an active
incident. It should not jump ahead of already-approved, in-flight work
(EEV2-016 is merged; M13/M10 launch-gate work continues) unless the founder
decides otherwise — but it should not be deferred indefinitely either, since
installing the correction-form trigger at any future point would make path 3
live with zero additional code change.

## Founder decision needed

- [ ] Option A (single gate in `sendReportEmail`)
- [ ] Option B (gate each caller individually)
- [ ] Neither / different approach — specify
- [ ] Defer — no action until [condition]

Written approval on one of the above is required before any `apps-script/`
write, per `AGENTS.md`'s "You may propose but must wait for explicit written
approval" tier.
