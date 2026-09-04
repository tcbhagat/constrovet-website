# Staging environment — proposal (NOT BUILT, awaiting approval)

**Status: proposal only. Nothing here has been created. Founder approves and executes.**

## Why this is now blocking rather than nice-to-have

`CONTRACTS.md` Known Gaps has said "no staging copy of the Apps Script — testing
happens against the same script as production" since day one. Two consequences
have now actually fired:

1. Contract 3 says "re-run Test A and Test B after ANY change." Against production,
   Test B is a *should-pass* case, so every run delivers a real report from the
   live system. Contract 5's canary has the sharper version of this: in the exact
   week the gate is broken, the canary is the thing that delivers the fabricated
   board pack.
2. The 2026-09-04 wipe was only survivable because no submission happened to
   arrive in the ~22 hours production ran without a gate. That was luck.

## The constraint that shapes the design

Established 2026-09-04: real traffic runs on the **installable `onFormSubmit`
trigger**, which executes current saved HEAD. Deployment versions are irrelevant
to real traffic. This rules out the cheapest idea — "use a second deployment as
staging" — because a second deployment of the *same* script still shares one HEAD
and one trigger. **Staging must be a separate script project.**

## Minimum viable staging (Option A — recommended)

A second, standalone Apps Script project, wired to test-only Google resources.

| Component | Production | Staging |
|---|---|---|
| Apps Script project | `1ous3k8p…Vbo` | new, separate scriptId |
| Intake Google Form | existing | new test-only form |
| `onFormSubmit` trigger | on prod script | on staging script |
| Validation-Errors sheet | `1htvKzTT…98U` | new sheet, same 9 columns |
| Audit spreadsheet | `AUDIT_SPREADSHEET_ID` prop | new sheet |
| Drive root folder | `Constrovet/projects` | `Constrovet-STAGING/projects` |
| `BOARDROOM_NOTIFY_EMAIL` | `admin@constrovet.com` | `admin@constrovet.com` |
| Submitter address used in tests | — | internal mailbox only |

Setup, once:
1. Create the project; add the Advanced Drive service (v2) per `apps-script/README.md`.
2. `clasp clone <new-scriptId>` into a `staging/` working dir, `clasp push` the
   candidate code there. Staging is the one place `clasp push` is routine.
3. Set Script Properties to the staging sheet/folder IDs. Set
   `ENABLE_BOARDROOM_DEEP_ANALYSIS=false` and leave Gemini flags off so staging
   costs nothing.
4. Run `initValidationErrorLog()` **once, on the staging sheet only.** This is the
   single sanctioned use of an `init*` function, and it must never be pointed at
   the production sheet ID.
5. Install the trigger with `installBoardroomFormTrigger()` against the test form.

Cost: zero — Workspace quota only. Effort: roughly one sitting.

## Option B (rejected, recorded so it is not re-proposed)

"Second deployment of the production script, switched by a script property."
Rejected: one HEAD, one trigger, one Drive root. A staging run would execute the
same code real clients hit, and a mistake in the property switch writes test data
into production sheets. It provides isolation in name only.

## What staging changes in the contracts

- **Contract 3** re-runs move to staging. Production runs only for a final
  pre-launch confirmation, still from an internal address.
- **Contract 5's canary stays on production** — its whole purpose is detecting a
  production regression — and keeps the mandatory internal-mailbox pinning.
- **Contract 4** gains a precondition: Test A passes on staging before it is run
  against production at all.

## What this does NOT solve — state honestly

- Staging drifts. A stale staging project gives false confidence, which is the
  same failure class as the repo/live drift that caused this whole incident.
  Mitigation: staging is only meaningful if `clasp push` is the *only* way code
  reaches either project — see ROADMAP.md milestone 6.
- It does not detect a *production* gate disappearing between sessions. That needs
  the scheduled self-check proposed in ROADMAP.md milestone 7.
- Apps Script quota behaviour under real load stays unverified either way.
