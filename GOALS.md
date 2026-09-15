# Constrovet — Goals Map (companion to Execution Prompt v6)

Paste this alongside the execution prompt at the start of a session ONLY as a fallback —
if `STATE.md` exists in the repo, read that first; it reflects real state and wins over
this document for "where are we now." This document is authoritative for "what does each
stage mean, and what must NOT happen yet" — read it before doing anything not explicitly
named in the current stage.

Every entry: GOAL (what success looks like) · DONE WHEN (mirrors the stage's PASS bar) ·
DO NOT YET (the actual drift guard — most drift looks like "helpfully" doing adjacent
work nobody authorized) · DEPENDS ON.

---

## TRACK A — Platform Hardening (sequential)

### S0 — Repo & wiki skeleton
GOAL: Folder structure exists for both repos; no content beyond stubs.
DONE WHEN: `docs/SESSION_LOG.md`, `docs/AGENTS.md`, `docs/DEFINITION_OF_DONE.md` exist;
`../llm-wiki-constrovet/` has its 7 folders locally, unpushed.
DO NOT YET: touch Code.gs, push anything to GitHub, write any crew script, touch Phase 2.
DEPENDS ON: nothing — this is the starting stage.

### S1 — Fix EEV2-005
GOAL: Validator reads the full citation span, not a 500-char truncation, verified against
all three clients' real data.
DONE WHEN: regression suite green (current count +1) across all three clients' fixtures;
diff ready for founder review.
DO NOT YET: `clasp push` (founder-only, always); touch PR #20 (S2); touch Phase 2 (S6);
build any crew script (S3); assume the fix is "live" just because tests pass locally.
DEPENDS ON: S0 (docs scaffolding exists to log this in).

### S2 — Merge PR #20
GOAL: EEV2-008 citation-truncation fix confirmed mergeable and verified, same rigor as S1.
DONE WHEN: regression suite green against current main (post-S1) across all three clients.
DO NOT YET: assume S1 and S2 can be pushed together without separate founder review of
each; skip re-testing against main just because the PR was "merge-ready" before.
DEPENDS ON: S1 must be live first — main has changed since PR #20 was opened.

### S3 — Platform safety scripts
GOAL: Evidence Scout, Safety Audit Scout, XAI Scout, Inconsistency Scout exist as real,
runnable scripts/commands — not prose descriptions.
DONE WHEN: all 4 exist, documented, each run once for real against real data from all
three clients where scope makes that meaningful.
DO NOT YET: treat these as "crews" that run autonomously or on a schedule — they are
tools a human or Claude Code invokes on demand at this stage; scheduling comes later if
ever. Do not start Track B research work here — that's a separate, parallel track, not
part of Track A's sequence.
DEPENDS ON: S1, S2 live (nothing to audit yet otherwise).

### S4 — First 3-week testing branch
GOAL: Prove the testing-branch pattern works, using real Phase 2 readiness work, with a
genuine daily log spanning real calendar time.
DONE WHEN: branch exists, wiki log file exists, and — only after ~21 real days — a
per-client yes/no readiness verdict with evidence.
DO NOT YET: compress the 21 days; merge this branch to main (that's gated by S5); claim
readiness before the real elapsed time has passed just because early days look clean.
DEPENDS ON: S3 (needs the safety scripts to produce daily log content).

### S5 — Four-stage safety gate
GOAL: Founder + Safety + Privacy/Legal + Founder-final all genuinely exercised, per client.
DONE WHEN: all three clients' Stage C (privacy/legal) questions are answered with real
evidence, not assumed; Prof. Taran has given an explicit MERGE or HOLD.
DO NOT YET: mark Stage C "N/A" — there is real client data in scope, it is never
skippable at this point in the project; proceed past a HOLD; answer any of the four
stages on the founder's behalf.
DEPENDS ON: S4's 21-day branch log as the evidence base.

### S6 — Phase 2 shadow canary
GOAL: 10% shadow traffic running for all three real clients, with a verified fast-disable
switch and a working daily check.
DONE WHEN: disable switch located AND test-fired successfully; `phase2-daily-check` built
and dry-run tested.
DO NOT YET: enable any shadow traffic before the disable switch is proven to work — this
order is not negotiable, verify-then-enable, never enable-then-verify.
DEPENDS ON: S5 = MERGE.

### S7 — Data & research crews
GOAL: Data Analytics, Test Data Generator, Public Dataset Scout, Research Brief — all
built using real 3-client data where applicable.
DONE WHEN: each produces one real output (not a template) from real data.
DO NOT YET: use these outputs in anything client-facing or prospect-facing — this stage
is purely internal tooling.
DEPENDS ON: S6 (need real Phase 2 job history to analyze; if none yet, use S1–S4's real
fixture data instead and say so explicitly).

### S8 — Budget & DoD crews
GOAL: Real spend tracked (or explicitly marked "not yet instrumented"); DoD checklist
audit-able against real evidence.
DONE WHEN: `budget-snapshot` and `dod-audit` both run once for real.
DO NOT YET: invent spend figures to fill gaps in tracking.
DEPENDS ON: nothing blocking — can run any time after S0.

---

## TRACK B — Revenue Research (parallel, starts alongside S0, never blocks or is blocked
by Track A)

### P1 — Compliance Hunter Scout (research-only)
GOAL: A real, growing, scored-later backlog of RERA/court/news compliance cases.
DONE WHEN: weekly dossier filed, every field traced to a real source URL.
DO NOT YET — this is the single most important boundary in this whole document: no
outreach, no contacting anyone, no scoring against the real case-study portfolio (that
needs S9 to exist first), no demo-building, no voice-agent work. This stage is
search-and-log ONLY. The entire reason P1 is allowed to run in parallel with Track A
(instead of waiting) is that it stays strictly internal — the moment it stops being
internal, it stops being safe to run ungated.
DEPENDS ON: nothing — starts Day 1.

---

## GATE — before Track C

GOAL: An honest, evidence-backed decision on whether to start prospect-facing work.
DONE WHEN: all five GATE_CHECK lines are "yes" with real evidence per client.
DO NOT YET: treat elapsed time alone as evidence; treat "one client clean" as sufficient
when the check requires all three; let Track B's backlog size substitute for Track A's
platform-readiness evidence — they are independent checks, both must pass.
DEPENDS ON: S1 through S8 complete; P1 has produced a real backlog.

---

## TRACK C — Conditional (only after GATE = yes)

### S9 — Seed case study portfolio
GOAL: Three real, honest case studies, one per client, each covering a different pain
archetype.
DONE WHEN: each client has explicitly confirmed permission to be referenced (even
anonymized) BEFORE any draft is written using their data.
DO NOT YET: draft using a client's data before their permission is confirmed — this
order is not negotiable; round up any figure beyond what the real data supports.
DEPENDS ON: GATE = yes.

### S10 — Score Track B's backlog
GOAL: Every P1 prospect scored 0–10 against fit with the real case-study portfolio.
DONE WHEN: scoring complete; only ≥7 prospects flagged to proceed.
DO NOT YET: contact any scored prospect — scoring is still internal.
DEPENDS ON: S9 (need real case studies to score fit against).

### S11 — First real outreach
GOAL: Up to 10 prospects contacted, each individually founder-approved before sending.
DONE WHEN: each send is logged with founder's explicit prior approval, one at a time.
DO NOT YET: batch-approve; send a second wave before reviewing the first wave's real
responses; build Demo Builder or Voice Assistant — those wait for real signal from this
stage first.
DEPENDS ON: S10 (only ≥7-scored prospects).

---

## Reminder — the actual failure mode this document guards against

Drift rarely looks like "doing nothing." It looks like a session that's ahead of schedule
starting the next stage's work "since we're here anyway," or building a capability that
seems obviously useful without checking whether its stage's dependencies are actually
met. Every DO NOT YET line above exists because it's a plausible-sounding next step that
is not yet authorized. When in doubt, stop and ask rather than proceed on inference.
