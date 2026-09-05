# CONTINUATION_CONTRACT.md — Constrovet, Fable 5.1 Era

Supersedes nothing — AGENTS.md and CONTRACTS.md remain canonical. This
document is the handoff point: ground truth as of 2026-09-05, plus phased,
token-optimized prompts for Claude Fable 5.1 in Claude Code. Paste one
phase prompt per session. Do not skip phases. Do not paste two phases in
one message.

**Model note:** set `"model": "fable"` in `.claude/settings.json`, or
`/model fable` per-session, before running these. Fable 5.1 is Mythos-
tier — suited to the longer, ambiguous, multi-file work these phases need.

---

## GROUND TRUTH — read once, carry forward, do not re-derive

**Founder budget:** ~2 hrs/week. Non-coder. Every session must end in a
plain-language handoff, not a code dump.

**Prime directive:** no fabricated/mislabeled figure ever reaches a client.

**Current production state:** stable, crash-free. Rolled back to
pre-incident code (`pre-gate-restore-2026-09-05` tag). **No validation
gate is live.** Every submission today ships unvalidated but does not crash.

**What broke it once already, exactly:** a "recovery" built from a
single-file (`Code.js`-only) pull of Version 11 was pushed via
`clasp push`, which syncs the ENTIRE local `apps-script/` directory
against live. A companion file that existed live but was never captured
locally (`EEV2ScheduleStatusModule.js`) got silently deleted from
production, crashing every real submission with a `ReferenceError`.
Rolled back same day. No client-facing send occurred during the outage —
confirmed via Gmail + Drive, two independent sources.

**Full, now-complete gap inventory** (found via real call-graph tracing,
not file-existence checks — file-existence checks already proved
insufficient once):

| Missing function | File | Reachability |
|---|---|---|
| `eev2ScheduleStatusContradictionFindings_` | `EEV2ScheduleStatusModule.js` (whole file) | every submission — caused the incident |
| `eev2AggregateAndListVoScheduleDays` | `EEV2LiveScheduleBridge.gs` | every submission — would be next incident |
| `eev2ScheduleVariationOrderPosition` | `EEV2ScheduleReconciliation.gs` | every submission — would be incident after that |
| `eev2StatedVariancePhrase_` / `eev2FormatStatedVariance_` | `EEV2ProgressModule.gs` | conditional — `PROGRESS_REPORT` docs only |

Checked exhaustively across all 28 shared files between V11 and repo —
this table is complete, not partial.

**Fixes built, tested, NOT live:**
- EEV2-003 (Rs/INR word boundary) — **live already**, confirmed.
- EEV2-004 (`boardroomTriggerOwnedAmount`, trigger-ownership) — in
  candidate only.
- EEV2-005 (`\blate\b` fix; `\bld\b` was already correct in V11, do not
  re-fix it) — in candidate only.
- EEV2-006 (gate health circuit breaker, kill-switch inside
  `sendReportEmail`) — built, 7/7 local mock checks, **cannot run
  locally by design** (needs real `PropertiesService`/`MailApp`) — must
  run in the Apps Script TEST project.
- CHECK 5e — confirmed absent from both V11 and current live. Not
  decided. Not built into the candidate.

**Two proven test-suite blind spots — must be closed before trusting
green numbers again:**
1. The 12-suite harness returns "ready" whether or not the validation
   gate exists at all — it has never once checked for the gate's
   presence, only for the behavior of individual functions.
2. It does not exercise `eev2AttachLiveSchedulePosition` (called on
   EVERY submission) or `eev2RouteStructuredBoardroomFindings` (called on
   `PROGRESS_REPORT` docs) end-to-end — this is exactly how all 4 gaps
   above went undetected through 26/26 and 12/12 passes.

**Known, deliberately unresolved, low-priority:** an 808/809 line-count
discrepancy across old session notes — cosmetic, never worth chasing.

**Repo cleanup, closed:** `colab/` deleted (orphaned, safe). `boardroom/`,
`ssm-core-demo/`, `claim-companion/` held — live nav link and passing
tests respectively protect them. Do not revisit unless the founder
explicitly names one with new evidence.

**Residual open decisions, not yet made — Phase 6 territory:**
- Whether a real-but-wrongly-labeled figure (e.g. a unit rate near a
  leakage trigger word) should be blocked by policy, not just by regex —
  a product decision, not a code task.
- Contract 5's canary must submit from an internal-only address, never
  one resembling a real client — confirm this is actually wired in,
  don't assume it from the written mitigation alone.

**Delegation boundaries (from AGENTS.md, restated because this is the
rule that was nearly violated):** reads, tests, diffs, scratch-copy work
= autonomous. Anything touching a file that will go live, any new suite
joining the release gate = propose, wait for approval. `clasp login`,
`clasp push`, deployment/version/trigger changes, `init*` functions,
live sheet-structure changes = **founder executes, always, no exception.**

---

## PHASE 1 — Complete multi-file recovery candidate

```
Read AGENTS.md, CONTRACTS.md, CONTINUATION_CONTRACT.md fully. Read-only.
No clasp anything.

Build a NEW merge candidate correcting the prior one. Prior candidate only
restored Code.gs; 4 functions across 3 companion files remain missing
(table in CONTINUATION_CONTRACT.md Ground Truth). Pull V11 in FULL —
every file, not Code.js alone — via clasp, versionNumber 11, into a fresh
scratch dir. Diff every shared file's function list (not just presence)
against current apps-script/. Confirm the 4 known gaps, and check for any
5th you haven't been told about — do not trust the "28 files, complete"
claim without re-deriving it yourself this session.

Restore all 4 functions plus the already-approved EEV2-004/EEV2-005 fixes
into one candidate. Do not touch CHECK 5e — undecided, out of scope here.

Verify: node --check on every touched file. Extract and directly execute
the 4 previously-missing functions in isolation — confirm each callable
with realistic input, not just "defined."

Do NOT copy into apps-script/ yet. Do NOT run npm test yet — that's Phase 2.
Report: candidate location, exact diff size per file, confirmation all 4
functions are present and independently callable, and anything unverified.
```

---

## PHASE 2 — Close both test-suite blind spots

```
Read AGENTS.md, CONTRACTS.md, CONTINUATION_CONTRACT.md. Read-only except
for new test files. No clasp anything.

Two new regression tests, both required before Phase 3:

1. Gate-presence assertion. A suite that FAILS if
   validateReportOutput/logValidationError/initValidationErrorLog/etc are
   absent OR present-but-never-invoked in a real submission path — not
   just "function is defined somewhere." Must fail against current
   apps-script/Code.gs (no gate) and pass against the Phase 1 candidate.
   Prove both directions — a test that only ever passes proves nothing.

2. End-to-end call test for eev2AttachLiveSchedulePosition (both call
   sites: main form path and correction-rerun path) and
   eev2RouteStructuredBoardroomFindings, using realistic finding data, not
   mocks that bypass the real call chain. Must have caught all 4 Phase-1
   gaps had it existed before today's incident — verify this claim by
   running it against the OLD, broken candidate first and confirming it
   fails there, then against the Phase 1 candidate and confirming it passes.

Wire neither into the release gate yet — new suites joining the gate need
separate approval per AGENTS.md. Just build and prove them.

Report: both tests' fail-then-pass evidence, explicitly. If either test
cannot be made to fail against known-broken code, say so — a test that
can't fail is not a real test.
```

---

## PHASE 3 — Safe-push protocol (process fix, not code fix)

```
Read AGENTS.md, CONTRACTS.md, CONTINUATION_CONTRACT.md.

Today's incident happened because clasp push syncs the full local
directory against live, and local never had full parity. Write a
pre-push checklist script, scripts/pre-push-check.mjs: fresh clasp pull
of live into a throwaway dir, diff its full file list AND per-file
function list against the candidate about to be pushed, fail loudly on
ANY function present live and absent in candidate (not just missing
files). This is the one gate standing between a future recovery attempt
and a repeat of today.

Do not run clasp push. Do not integrate this into any automatic hook —
founder runs it manually, on demand, before every future push, per
AGENTS.md's own boundary.

Report: script location, and a dry run of it against the current
(post-incident, pre-restore) live state, proving it would have caught
today's gap had it existed.
```

---

## PHASE 4 — Controlled live restoration (completes Milestone 2)

```
Read AGENTS.md, CONTRACTS.md, CONTINUATION_CONTRACT.md, ROADMAP.md.
Founder has reviewed and approved the Phase 1 candidate plus both Phase 2
tests. Proceed only if founder confirms this explicitly in this session —
do not assume approval from a prior session's log.

1. Run scripts/pre-push-check.mjs from Phase 3. Stop and report if it
   finds anything.
2. Run full suite including the two new Phase-2 tests against the
   candidate in a scratch copy. All must pass, including the new ones.
3. Copy candidate to apps-script/, re-run suite against the real path,
   confirm identical results — same discipline as the last restoration.
4. Tag rollback point. Do NOT run clasp push — hand back to founder with
   exact commands.
5. State plainly: this closes the known gaps found so far. It does not
   guarantee no 5th gap exists — say this explicitly, don't imply certainty
   you don't have.

Founder pushes personally. After push: founder submits a real Test A
(known-bad set) and Test B (should-pass set) per Contract 3 — report only
after founder confirms these ran and shares results. Do not treat a
successful push alone as Milestone 2 done.
```

---

## PHASE 5 — Circuit breaker go-live

```
Read AGENTS.md, CONTRACTS.md, CONTINUATION_CONTRACT.md. Prerequisite:
Phase 4 complete, gate confirmed live via real Test A/B.

Hand founder exact steps only, do not execute any:
1. Open Apps Script TEST project, run
   eev2RunGateHealthCircuitBreakerRegression() directly in the editor —
   this cannot run locally, by design.
2. Confirm ok:true in the execution log.
3. Create a time-based trigger for boardroomGateHealthCheck, 15-30 min
   interval — founder-only, live trigger change.
4. Simulate a gate failure (founder's call how) and confirm the kill
   switch inside sendReportEmail actually halts sends, not just logs.

Report nothing as done until founder pastes back real TEST-project output.
Do not infer success from the local mock's 7/7 pass alone — that was
already stated as insufficient proof.
```

---

## PHASE 6 — Residual decisions and staging

```
Read AGENTS.md, CONTRACTS.md, CONTINUATION_CONTRACT.md, STAGING_PROPOSAL.md.

Two tracks, both proposals only:

1. Confirm whether Contract 5's canary submitter is actually pinned to an
   internal-only address in the current scheduling mechanism — check the
   real config, don't assume from the written mitigation. Report the gap
   if unconfirmed.
2. Draft the staging environment from STAGING_PROPOSAL.md Option A (a
   separate Apps Script project) — propose concrete setup steps, do not
   provision anything without approval.

Separately, surface the open policy question — a real, correctly-
extracted figure near a trigger word but not actually cost-related (the
₹454.16 unit-rate class) — as a decision for the founder, with the
tradeoffs of blocking it vs. allowing it with a warning. This is not
yours to decide.

No code changes in this phase. Documentation and proposals only.
```

---

## Rules that apply to every phase, restated because they nearly failed once

- Never trust a file-existence check alone — check function-level
  presence and reachability.
- Never assume the prior session's "complete" claim without one cheap
  re-check this session.
- Never treat 12/12 or 26/26 as proof the right things were tested —
  name what the passing suite actually covers.
- Stop and report at any live/expected mismatch. Do not investigate
  further autonomously past that point.
- End every session with: what you verified, what you didn't, what's
  next — in plain language, per AGENTS.md.
