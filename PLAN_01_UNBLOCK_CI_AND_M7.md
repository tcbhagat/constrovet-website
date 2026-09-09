---
name: plan-01-unblock-ci-and-m7
description: Week-1 unblocking work — clear the 7 fixture-provenance violations that make main red and stop every apps-script PR from going green, close M7 via the Apps Script editor rather than a new API-executable deployment, and add CI status to the session-start printout so a red main is never invisible again. Verified against 580e779 on 2026-09-09.
---

# Item A + B — clear red CI, close M7

Do both in one sitting. Neither touches production behaviour; A touches a test fixture and a doc, B runs a read-only function.

---

## A1 — The red-CI blocker (do this first)

### The evidence

```
$ npm run check:fixtures
FIXTURE PROVENANCE CHECK FAILED: 7 unjustified Drive-extraction-shaped
fixture(s) found across 19 file(s).
  apps-script/EEV2CitationTruncationRegression.gs:65   (×7 occurrences, one long line)
$ echo $?
1
```

All 7 are the same string literal: the `po5578007Span` fixture. It contains seven literal `\n\n` sequences — the Drive `read_file_content` tell. This is the *exact* fixture `fixture-provenance-pattern-20260909.md` was written about.

`eev2-harness-ci.yml` runs `npm run check:fixtures` as its **first** step, on `pull_request` and on `push` to `main`, path-filtered to `apps-script/**`. So today, any PR touching Apps Script fails before the 16-suite regression runs at all.

### Why it happened

PR #34 added the gate and the doc. It did not fix the offending fixture. The gate was correct; the cleanup was skipped. That is all.

### The fix — pick one, they are not equivalent

**Option A1-a (recommended): replace the fixture with the real span.**
`EEV2_011_ROW_BOUNDARY_PROPOSAL_20260909.md` already records the real Gemini `quoted_span` from job `form-20260909-072421-33a43b52`, verbatim, in a fenced block. It has no newlines. Swap `po5578007Span` to that string, and add the provenance comment the pattern doc mandates:

```js
// source: form-20260909-072421-33a43b52, final-report.json quoted_span
// (real Gemini extraction, no newlines -- NOT Drive read_file_content)
const po5578007Span = "PRJ-2026-5578 All Purchase Orders PO_Number ...";
```

This clears CI **and** converts the suite's weakest fixture into its strongest one. It is also the fixture EEV2-012 needs anyway (see `PLAN_02`), so this work is not thrown away.

Expect two existing assertions in that file to need their expected values re-checked against the new string — `span.length > 500` and `indexOf("Rs.3,670.55") > 500`. Both still hold on the real span (length 1619, figure at index 929), so they should pass unchanged. Verify, don't assume.

**Option A1-b (do not use as the primary fix): add `// KNOWN-SYNTHETIC:`.**
This silences the gate while leaving the misleading fixture in place — the precise thing that caused the shipped-but-broken EEV2-009 fix. Use it only for a fixture that is *deliberately* synthetic and documented as such. This one is not; it claims to be real.

### Verify

```bash
npm run check:fixtures      # must exit 0
npm run test:harness        # must stay 16/16, ok: true
node --test tests/check-fixture-provenance.test.mjs
```

### One flaw in the checker itself, worth a two-line fix while you are here

It reports one violation **per occurrence**, so a single bad fixture with seven `\n\n` reads as "7 violations across 19 files". That over-states the problem and makes the output hard to act on. De-duplicating by `file:line` would report "1 fixture, 7 occurrences". Cosmetic, not urgent — but it costs two lines and this project has already paid for misread status output.

### Approval boundary

`EEV2CitationTruncationRegression.gs` is under `apps-script/`. Per `AGENTS.md`, **any** commit touching `apps-script/` needs explicit written founder approval before it lands, even a test-only change. The doc and script edits are autonomous-tier; the fixture edit is not. Keep them in one PR, ask once.

---

## A2 — Make a red `main` impossible to miss

`scripts/session-context.sh` prints git drift and Apps Script drift at session start. It deliberately excludes GitHub PR/issue status — a sound decision, that data is noisy. **CI status is different**: it is one boolean, and its being wrong is exactly the class of incident this project keeps paying for.

Add one line printing whether the latest CI run on `main` concluded successfully. If `gh` is unavailable or unauthenticated, the line must say so plainly — the same failure discipline the script already uses for expired `clasp` credentials. **An absent line must never read as "green".**

`scripts/` is outside `apps-script/`, so this is autonomous-tier and can be committed without a separate approval.

---

## A3 — Correct `PROJECT_MILESTONES.md`

Two edits, both factual corrections, both outside `apps-script/`:

1. **M7's state line.** Change "BUILT, NOT MERGED, NOT LIVE-TESTED" to reflect that `EEV2AuditJob.gs` is on `main` (`fd2a06f`). Only the live-run half is outstanding.
2. **Add a CI-health line** to the drift-flag section, so a session reading only this doc learns that `main`'s CI state is a thing to check.

---

## B — Close M7 in fifteen minutes, with no new deployment

### The recorded blocker is bigger than the real one

`PROJECT_MILESTONES.md` blocks M7 on "confirming the Apps Script project has an API-executable deployment". That is true only for the `clasp run` path. `EEV2AuditJob.gs`'s own header says so, verbatim:

> Usage from the Apps Script editor: select `eev2AuditJob` in the function dropdown, Run, then View > Logs (or View > Executions) for the JSON.

The editor path needs no deployment, no new credential, and no `clasp`. It is founder-only either way (it reads live Drive and Sheets), so nothing about the delegation boundary changes.

### Steps

1. Open the Apps Script project as `admin@constrovet.com`.
2. Select `eev2AuditJob` in the function dropdown. Run it with a **past, already-decided** job id — one whose outcome you already know by hand. `form-20260909-072421-33a43b52` (the Test A that wrongly sent) is the ideal first input: you know it was sent, so the audit's four checks have a known correct answer.
3. Read the JSON in Executions.
4. Compare each of the four Contract 1 checks against what you know actually happened.

### Acceptance

M7 is DONE when the returned verdict matches manual inspection on a real job id. Record the raw JSON output in `SESSION_LOG.md` — the milestone doc's own rule requires the actual output, not a restated claim.

### If it fails

An audit function that disagrees with reality on a job whose outcome you already know is a *good* failure — it found itself before it was trusted. Fix `EEV2AuditJob.gs`, re-run, and treat M11 as not started until the audit is trustworthy, because M11 counts cycles where "the automated verdict matched the real outcome". An untrustworthy audit makes that count meaningless.

### Deferred, not dropped

The API-executable deployment is still worth creating eventually, because `clasp run` from Termux is what makes M11's five cycles cheap. But it is **not** on M7's critical path and should not hold M7 open. Revisit it inside `PLAN_04`.

---

## Not verified

- Whether the two length assertions in `EEV2CitationTruncationRegression.gs` pass unchanged against the real span. Predicted yes (1619 chars, figure at 929) — confirm by running, don't take the prediction.
- Whether the repo's GitHub Actions runs actually went red on the last `main` push. I inferred it from the workflow file plus a local exit code 1. Confirm on the Actions tab; it takes ten seconds and closes the inference.
- Whether `gh` is available in the founder's session environment for the A2 line.

## Next single test

`npm run check:fixtures` returning exit 0 on a branch. That one command is the whole of item A1.
