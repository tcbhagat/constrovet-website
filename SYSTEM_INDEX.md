---
name: system-index
description: Canonical bootstrap for any human or software agent entering this repository. Defines which file owns which kind of truth, the minimum context-loading order, epistemic states, and the low-cost execution ladder. Read this before any other planning document.
status: canonical
scope: repository-wide
---

# Constrovet system index

This file is the **entry point**, not a second source of truth. It deliberately contains almost no changing project state. Its job is to tell an agent where each kind of truth lives, in what order to load context, and what not to trust by default.

## Prime system objective

For the Constrovet construction-evidence product: **no fabricated, mis-attributed, or unverified figure may reach a client-facing report.** Cost, speed, autonomy, and feature breadth are subordinate to that constraint.

## One owner per fact domain

| Fact domain | Canonical owner | Rule |
|---|---|---|
| Agent permissions, delegation boundaries, operating behavior | `AGENTS.md` | If another document conflicts, `AGENTS.md` wins for agent behavior. |
| Definition of done, launch contract, hard stops | `CONTRACTS.md` | Formal safety contract. Wording changes require separate founder approval per `AGENTS.md`. |
| Current milestone state, deployed-vs-main status, blockers | `PROJECT_MILESTONES.md` | **Only** document allowed to assert current project state authoritatively. |
| Repository/product topology and deploy surfaces | `REPO_MAP.md` | Use before assuming a path belongs to Constrovet. |
| Cross-tool execution boundaries | `multi-tool-workflow.md` | Owns tool roles and handoff protocol, not product state. |
| Deep system architecture and agent-native design | `AGENT_SYSTEM_ARCHITECTURE.md` | Architecture rationale and future control-plane design. |
| Durable lessons from verified incidents | `AGENT_EXPERIENCE.md` | Compact governed experience; never a substitute for current-state verification. |
| Historical evidence trail | `SESSION_LOG.md` | Append-only history. Never read wholesale for routine work and never use as current state when `PROJECT_MILESTONES.md` differs. |
| Old roadmaps, phase prompts, proposals, recovery plans | Their own files | Historical or proposal material unless explicitly re-adopted by a current canonical owner. |
| Drive `PLAN_*` documents | Drive | Proposals/work packets until a decision or state change is adopted into the canonical repo documents above. |

**Source-of-truth firewall:** a document outside its owned fact domain may link to a canonical fact, but should not maintain a competing copy of that fact. When duplicate state is found, treat the duplicate as stale until reconciled.

## Minimum context-loading algorithm

1. Confirm repository freshness (`git fetch`/`git pull` or equivalent) and inspect the session-start context when available.
2. Read this file, then `REPO_MAP.md` to select the correct product/surface.
3. Read the top deployed-vs-main block and the relevant milestone section of `PROJECT_MILESTONES.md`; do **not** load the whole project history unless needed.
4. Read only the relevant contract(s) in `CONTRACTS.md` and the applicable delegation rule in `AGENTS.md`.
5. Read target source, tests, and real artifacts that can prove or falsify the task hypothesis.
6. Retrieve historical docs or `SESSION_LOG.md` only when a contradiction, incident, or design rationale actually requires them.
7. Act at the smallest safe change surface, verify with the closest deterministic evidence, and update the canonical owner if and only if its fact domain changed.

This is a **progressive disclosure** model: start with the smallest high-authority context and expand only when uncertainty requires it.

## Epistemic vocabulary

Use these words literally. Do not collapse them into “done.”

- `UNKNOWN` — not established by a current artifact.
- `PROPOSED` — design or decision exists; no implementation claim.
- `BUILT` — implementation exists somewhere; not necessarily merged.
- `MERGED` — present on the target git branch; says nothing about live state.
- `DEPLOYED` — live bytes/config match the intended artifact; says nothing about behavior.
- `EXERCISED` — real execution occurred on the intended path.
- `VERIFIED` — acceptance criterion was independently checked against the required real artifact(s).
- `DONE` — the milestone's written acceptance criteria are all `VERIFIED`.
- `ACCEPTED_OPEN` — risk is explicitly known, bounded, disclosed, and not a blocker by decision.
- `HISTORICAL` — preserved for evidence/rationale; must not direct current execution.

A checksum can establish `DEPLOYED`; it cannot by itself establish `VERIFIED` behavior.

## Agent action grammar

Every substantive task should be expressible as:

`OBSERVE -> ORIENT -> HYPOTHESIZE -> TEST -> CHANGE -> VERIFY -> ACCRETE`

- **OBSERVE:** obtain current repo/runtime/artifact facts.
- **ORIENT:** select product, authority domain, active milestone, and blast radius.
- **HYPOTHESIZE:** state the smallest falsifiable explanation or desired invariant.
- **TEST:** attempt to falsify before changing code where practical.
- **CHANGE:** make the smallest change that closes the demonstrated mechanism.
- **VERIFY:** use independent evidence appropriate to the milestone, not the agent's own summary.
- **ACCRETE:** preserve only reusable knowledge: test, invariant, decision, or experience card. Do not dump raw reasoning into permanent context.

## Resource-cost ladder

Choose the lowest rung that can answer the question reliably:

1. Deterministic local/repo operations: exact file read, grep/search, diff, syntax check, unit/regression test.
2. Existing real fixtures and stored outputs.
3. Connected Drive/Sheets/Gmail evidence only when the acceptance criterion requires a live artifact.
4. External web/research only for genuinely external or time-varying facts.
5. Expensive model/API execution only when deterministic evidence cannot resolve the question or when the product flow itself requires it.

Never spend a paid inference call to answer something a checksum, grep, fixture replay, or local test can establish.

## Context-budget rules

`SESSION_LOG.md` is an evidence archive, not startup context. Old phase prompts are not startup context. Claim Companion files are not Constrovet context unless the task names Claim Companion. `recovery-v11/` is historical evidence, not active source. Load the smallest dependency cone around the current task and expand outward only on failed assumptions or explicit cross-cutting impact.

## Permanent accretion rule

Every verified incident or correction must leave behind at least one durable improvement in one of four forms: **a regression test, a contract/invariant, a canonical decision, or an experience card.** Prefer a regression test when executable. Promote a lesson into `AGENTS.md` only when it is broadly recurring and behavior-changing; otherwise keep it in `AGENT_EXPERIENCE.md` so the bootstrap stays small.

## Current state

Do not copy current milestone values here. Read `PROJECT_MILESTONES.md`. This deliberate non-duplication prevents this index from becoming stale.