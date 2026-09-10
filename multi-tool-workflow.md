---
name: multi-tool-workflow
description: Protocol for working across planning agents, coding agents, ChatGPT/GitHub, Termux, and desktop terminals without losing thread or causing sync conflicts. Owns cross-tool handoffs only; current project state lives in PROJECT_MILESTONES.md.
status: canonical
scope: repository-wide tool coordination
state_authority: false
---

# Multi-tool workflow — one system, multiple interfaces

## The one rule everything else follows

Read `SYSTEM_INDEX.md` first. **No tool owns private project truth.** Durable truth must live in the canonical repository owner for its fact domain.

The authority split is:

- `AGENTS.md` — agent permissions and operating behavior.
- `CONTRACTS.md` — definition of done, launch contracts, hard stops.
- `PROJECT_MILESTONES.md` — current project/deployment state and blockers.
- `REPO_MAP.md` — product/surface topology.
- this file — cross-tool roles and handoffs.
- `SESSION_LOG.md` — historical evidence, not current state.
- Drive `PLAN_*` docs — proposals/work packets until their decisions or state changes are explicitly adopted into a canonical repo owner.

This replaces the older rule that treated `main + PROJECT_MILESTONES.md + Drive PLAN_*` as co-equal “sources of truth.” A plan may be excellent and still be only a proposal. A stale plan must never silently outrank a later verified milestone state.

## Capability is observed, not assumed

Different agent products change capabilities over time. Do not encode “tool X can never do Y” unless the restriction is a project governance rule rather than a product limitation.

The permanent boundary is **surface-based**:

| Surface/action | Default role |
|---|---|
| Read/search/diff/test local or repository artifacts | Any capable agent, autonomous within `AGENTS.md` |
| Planning/design docs | Any capable planning/coding agent; durable decisions go to the canonical repo owner |
| Non-`apps-script/` repo docs/scripts | May be committed through an available Git/GitHub-capable agent under `AGENTS.md` |
| `apps-script/` changes | Agent may inspect, build, and test; approval boundary in `AGENTS.md` governs commit |
| `clasp pull` / read-only live inspection | Allowed when capability/credentials exist, per `AGENTS.md` |
| `clasp push`, deploy/version/trigger changes, `init*`, live sheet structure | Founder-only, regardless of which terminal/device can technically execute them |

### Typical interfaces

**Claude Code / coding agent:** primary implementation environment for multi-file code work, tests, branches, commits, and PRs.

**ChatGPT with connected GitHub:** useful for repository-wide review, architecture/governance work, documentation changes, PR inspection, and other actions actually exposed by the connected GitHub surface. Do not infer live Apps Script access merely from GitHub access.

**Planning/Cowork-style agent:** useful for broad analysis and proposal documents. Its output is not current project state until adopted into the relevant canonical repo document.

**Termux/mobile terminal:** founder-controlled live Apps Script actions (`clasp push`, `clasp run` when required by the project's tool boundary) and git work while away from the desktop.

**Desktop terminal/VS Code:** local deterministic tests, inspection, and coding. Presence of authenticated `clasp` does not move founder-only actions out of the founder-only tier.

## Starting any session

1. Refresh the repository view before reasoning from it (`git fetch`/`git pull` or connector-equivalent current `main`).
2. Read `SYSTEM_INDEX.md`; then use `REPO_MAP.md` to select the correct product/surface.
3. Read the deployed-vs-main block plus the relevant milestone section in `PROJECT_MILESTONES.md`.
4. Run/read the session-context snapshot when available. A missing/expired credential means `NOT AVAILABLE`, never “healthy.”
5. Read only the relevant contract/agent rule and target code/artifacts. Do not bulk-load `SESSION_LOG.md` or old phase plans.
6. Check `main` CI when the work depends on CI or will touch a gated surface. Distinguish failed, skipped, and never-run checks.
7. Check Drive `PLAN_*` only if the active milestone references one or a newer proposal may materially affect the task. Treat it as a proposal until adopted.

## Ending any session

1. Push/commit allowed work or state exactly what remains local and why.
2. If current milestone/deployment state changed, update `PROJECT_MILESTONES.md` in the same reviewed change that establishes the evidence whenever practical.
3. Record only a concise chronological evidence note in `SESSION_LOG.md`; do not use the log as a second status database.
4. If a reusable failure mechanism was verified, add/update an `AGENT_EXPERIENCE.md` card or, preferably, an executable regression/check.
5. State: what changed, what was verified, what was not verified, and the next single blocking action.

## Terminal-specific hygiene

Use one dedicated, consistently named production clone per device. Do not deploy from throwaway clones or stray `.clasp.json` files.

Before any founder-run `clasp push`: refresh git, run the pre-push checks required by current governance, confirm the intended `apps-script/` tree and checksum/function inventory, then push only from the known production clone.

After any `clasp push`: perform a fresh read into a throwaway location and compare the complete live deploy surface against the intended repo state. A successful command exit is not deployment verification; a checksum match is deployment verification but still not behavioral verification.

## When two tools might collide

Parallelism is safe only when the work units are independent and their write surfaces do not overlap.

Do not run two agents simultaneously on the same milestone/change surface unless one is explicitly read-only and both share the same fresh base state. The synchronization point is the durable artifact: branch/PR, canonical repo document, or founder-reviewed command result — not a private conversation summary.

When one agent produces a Drive plan and another implements code, the plan must be referenced by identifier/date and reconciled against current `PROJECT_MILESTONES.md` before implementation. If they conflict, current canonical state wins and the plan must be revised or explicitly re-adopted.

## Cross-tool handoff packet

A handoff should be small and sufficient, not a transcript. Include:

- product/surface;
- milestone + exact acceptance criterion pointer;
- current branch/SHA when relevant;
- verified facts and artifact references;
- unresolved hypothesis/blocker;
- change-surface class and authority boundary;
- next single action/test.

The receiving agent must still re-check cheap volatile facts (repo freshness, branch, current milestone state) rather than trusting the packet blindly.

## What this file deliberately does not own

It does not own current live hashes, active milestone numbers, launch readiness, product contracts, or agent permissions. Those facts live in their canonical owners listed in `SYSTEM_INDEX.md`. Keeping this file narrow is a structural defense against cross-tool state drift.