---
name: plan-04-launch-gate-m10-m11-m12
description: Plan for the last three milestones — M10's consecutive clean Test A/B runs, M11's five auto-push trust cycles, and M12's first pilot client. Defines what a clean run counts as, why the runs must be on separate days, when the API-executable deployment finally earns its cost, and how to decide M12 honestly when gaps remain open.
---

# M10, M11, M12 — the launch gate and the first client

These are the only milestones with commercial consequence. Everything before them is preparation.

---

## M10 — consecutive clean Test A/B runs

### The standard, unchanged

Per `validation-layer-audit-20260902.md`, carried into `CANARY_ROADMAP_V2`: Test A (9-file Procurement_* set, **must block**) and Test B (`boardroom-professional-actions-delay-only.csv`, **must pass**) must both run cleanly **several consecutive times**. Once could be luck.

The first real cycle was attempted 2026-09-09 and **failed** — job `form-20260909-072421-33a43b52` was sent, not held. That is recorded as a failure, not retried into a pass. Hold that line.

### "Several" — pin it at three, and say why

The doc says "several" and never fixes a number, which means every future session re-decides it — and a re-decided threshold drifts downward under pressure to launch. Pin it: **three consecutive clean cycles.**

Three is not arbitrary. One is luck. Two can share a cause — the same day, the same submission conditions, the same Gemini model behaviour within a single window. Three, spread over three separate days, is the smallest number that makes a shared hidden cause unlikely while staying inside a 2 hrs/week budget. If the founder prefers five, five is better; but the number must be written down before the counting starts, never after the third run comes back clean.

### What counts as clean

A cycle is clean only when **all** of these hold:

| # | Condition |
|---|---|
| 1 | Test A: no client-facing report **email delivered** (report files on disk are not evidence — `Code.gs` writes them before the gate runs) |
| 2 | Test A: `[VALIDATION FAILED]` alert email sent to `VALIDATION_ALERT_EMAIL` |
| 3 | Test A: `${jobId}-VALIDATION_FAILED.json` present in the job's outputs folder |
| 4a | Test A: `validation-errors` tab row with `action_taken = "REVERTED_NOT_SENT"` |
| 4b | Test A: audit sheet row with `email_status = "HELD_VALIDATION_FAILED"` |
| 5 | Test B: report delivered, figures correct on inspection |
| 6 | Both submitted from `admin@constrovet.com` (Contract 5 canary rule) |
| 7 | No code change between this cycle and the previous one |

Conditions 1–4b are exactly what `eev2AuditJob(jobId)` checks — which is why M7 (see `PLAN_01`) should close *before* M10 starts. It turns a twenty-minute manual Drive-and-Sheets click-through into a single function run, three times over.

**Condition 7 is the one that gets broken.** A small fix between cycle 2 and cycle 3 resets the count to zero. Not "mostly two" — zero. The whole point of consecutive runs is that they exercise identical code.

### Cadence

One cycle per sitting, one sitting per week, three weeks. Roughly 20 minutes of founder time each: submit, wait for the SLA window, run `eev2AuditJob`, record the raw JSON in `SESSION_LOG.md`.

Faster is possible — three cycles in three days — and it is worth doing if the founder has the time, because a shorter M10 means a shorter path to M12.

### If a cycle fails

Record it as a failure with its job id. Diagnose against the real artifacts. Fix. Reset the count to zero. Do not retry the same submission hoping for a different result — non-determinism in an outcome that must be deterministic is itself the bug, and a bigger one than whatever the failure looked like.

---

## M11 — five auto-push trust cycles

### What it counts

Per `auto-push-trust-plan-20260908.md`: five consecutive cycles where the automated verdict matched the real outcome, logged in `AUTO_PUSH_TRUST_LOG.md`, with a permanent circuit breaker. Founder chose Path A — `clasp run` executed personally from Termux, not a stored CI credential. That choice is right and should not be revisited: a stored push credential is the one thing that could let a broken gate ship silently again, which is precisely the 2026-09-04 incident.

### Now the API-executable deployment earns its cost

`PLAN_01` deferred it because M7 does not need it. M11 does: five cycles of `clasp run eev2AuditJob` from Termux is the whole mechanism, and `clasp run` cannot invoke a function deployed only as a Web App. So:

- Create the API-executable deployment (Deploy → Manage deployments), **separate from and alongside** the existing Web App deployment. Do not modify the Web App deployment — real client traffic reaches the installable `onFormSubmit` trigger running saved HEAD, and touching deployments while chasing an unrelated milestone is how deployments get broken.
- Founder-only, like every deployment change.
- ₹0.

### Sequencing — M11 rides on M10, it does not queue behind it

The verdicts M11 counts are the verdicts M10's cycles already produce. Running them as one activity means three of the five cycles come free with M10. Two more follow.

**But the trust count only starts once the audit function is itself trusted.** If `eev2AuditJob` disagreed with reality during M7's close, fix it first — a count of matching verdicts from an audit you do not trust measures nothing.

---

## M12 — the first pilot client

### This is a business decision, not an engineering one

M12 depends on M8–M10 being closed **or explicitly accepted as open by the founder**. That second clause is deliberate and should be used rather than treated as a loophole. Waiting for perfect coverage on a platform with zero clients is its own failure — you learn nothing, and the gaps you are closing are guesses about documents no client has yet sent.

### The honest test for readiness

Answer three questions in writing before onboarding anyone:

1. **What is the worst thing that reaches this client?** After M3, the known cross-row bleed is closed. What remains is the unknown: a document family whose OCR shape nobody has seen. Name it as the residual risk rather than pretending it is absent.
2. **Would you show this client the list of open gaps?** If not, the gap is not "accepted open" — it is concealed, and the prime directive covers misleading a client about missing evidence just as it covers fabricated figures.
3. **What is the manual second net?** The validation audit already recommends human review of the pilot's first few reports even after the gate passes. Budget it: roughly 30 minutes per report for the first five reports. If that time does not exist, the pilot does not start.

### Pilot selection — bias toward the hard case

The instinct is to pick an easy first client with clean digital documents. Resist it. An easy client tells you nothing you do not already know from your own test corpus, and rewards you with false confidence. A client with messy scans and a mixed document set exercises M9's real gap on real data, with a human reading every report before it goes out.

**Pick the messy client, and read every report yourself for the first month.**

### Cleanup, per Phase 4

Once the pilot starts: retire test artifacts, and reconcile every stale EEV2-00x doc against what is actually live. This plan adds four `PLAN_*` files to a repo that already has more status documents than code files. **Fold them into `PROJECT_MILESTONES.md` once each is executed, and delete them.** A plan that outlives its execution becomes the next stale doc a future session mistakes for current state — this project's most expensive recurring failure, and there is no reason to feed it.

---

## What would make me say "do not launch"

Stated in advance, so it is not negotiated away later:

- Any M9 result where a garbled OCR read produces a **confident figure** rather than a hold.
- Any M8 result where the 40-match cap is not disclosed in the client-facing report.
- Any M10 cycle that fails for a reason that cannot be explained from the real artifacts.
- Any recurrence of the label-bleed mechanism on a document family other than Procurement.

Each of these is fabrication-class, and the prime directive subordinates everything else to it — including a first client.

## Not verified

- Whether `AUTO_PUSH_TRUST_LOG.md` exists yet. It is referenced by `PROJECT_MILESTONES.md` M11 but is not in the repo root at `580e779`. It may need creating as part of the first cycle.
- Whether an API-executable deployment already exists. `PROJECT_MILESTONES.md` M7 says it is unconfirmed; I could not run `clasp` to check.
- The real SLA wait between submission and report delivery. Recorded as 2 hours; not observed by me. It sets the true clock on each M10 cycle.

## Next single test

After `PLAN_02`'s fix is pushed: cycle 1 of M10 — Test A from `admin@constrovet.com`, then `eev2AuditJob` on that job id, then the raw JSON pasted into `SESSION_LOG.md`. Clean or not, that single run is the first honest data point on the launch gate.
