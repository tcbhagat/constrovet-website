---
name: agent-system-architecture
description: System-level architecture for making Constrovet maximally legible, controllable, safe, economical, and progressively self-improving for software agents. Defines the tower of abstractions, control loops, authority boundaries, memory model, and design rules.
status: active-design
scope: Constrovet construction-evidence product and its engineering control plane
---

# Constrovet as an agent-native synthetic system

## Design intent

Constrovet should not be treated as “website + Apps Script + tests + documents.” It should be treated as a **closed-loop evidence-to-decision system** whose engineering environment is itself designed for an agent as a first-class operator.

The system has two coupled loops:

1. **Product loop:** project documents -> evidence extraction -> financial interpretation -> validation -> client decision support -> correction/feedback.
2. **Engineering loop:** observe system state -> diagnose -> modify -> test -> deploy under authority -> verify real behavior -> retain reusable learning.

The product loop produces trustworthy construction decisions. The engineering loop keeps the product loop trustworthy. Neither loop is complete without the other.

## The tower of linked abstractions

### L0 — Evidence substrate

**Question answered:** What actually happened?

Artifacts: client source documents, real Gemini extraction spans, job outputs, validation files, audit/validation-sheet rows, delivered/internal emails, checksums, CI raw results, and exact source files.

Rule: evidence is immutable input to reasoning. A summary of evidence is not evidence. Synthetic fixtures must be labelled synthetic; a transformed representation must never silently stand in for the real production representation.

### L1 — Runtime reality

**Question answered:** What code/config is actually capable of executing now?

Artifacts: `main`, live Apps Script HEAD, deployment publication state, trigger/intake path, GitHub Pages state, CI configuration, relevant Script Properties/configuration facts.

Canonical state owner: `PROJECT_MILESTONES.md` for the human-readable verified snapshot. Runtime facts must carry a verification method and date. `DEPLOYED` and `VERIFIED` are separate states.

### L2 — Contracts and invariants

**Question answered:** What must never be violated?

Artifacts: `CONTRACTS.md`, safety-critical portions of `AGENTS.md`, schema contracts, validation invariants, release gates.

Examples: no fabricated/mis-attributed figure reaches a client; a should-fail case produces the required hold artifacts; live-changing actions remain founder-controlled; current state cannot be declared from an agent summary alone.

This layer changes rarely. It should be smaller and more stable than plans.

### L3 — State machine and objectives

**Question answered:** Where are we, what blocks the next safe move, and what counts as completion?

Artifact: `PROJECT_MILESTONES.md`.

Every milestone is a state machine, not a prose task list. The canonical lifecycle is:

`PROPOSED -> BUILT -> MERGED -> DEPLOYED -> EXERCISED -> VERIFIED -> DONE`

A milestone may also be `BLOCKED`, `REOPENED`, or `ACCEPTED_OPEN`. Movement between states requires evidence appropriate to that transition. A commit proves `MERGED`; a checksum may prove `DEPLOYED`; a real Test A run may be required to prove `VERIFIED`.

### L4 — Agent control plane

**Question answered:** What may the agent do next, with which tool, at what blast radius?

Artifacts: `SYSTEM_INDEX.md`, `AGENTS.md`, `REPO_MAP.md`, `multi-tool-workflow.md`.

The control plane should make the safe action easier than the unsafe action. It does this through explicit scope selection, tool boundaries, progressive context loading, and a smallest-change rule.

Every action is classified by **change surface**:

| Class | Surface | Default agent posture |
|---|---|---|
| C0 | Read/search/diff/local deterministic checks | Autonomous |
| C1 | Docs, non-live scripts, non-production planning | Autonomous commit/PR within `AGENTS.md` boundaries |
| C2 | Website/static client surface | Review according to deployment impact; push to `main` is a production website deploy |
| C3 | `apps-script/` source or release-gate tests | Prepare/test; explicit founder approval before commit per `AGENTS.md` |
| C4 | Live Apps Script, deployments, triggers, credentials, live-sheet structure | Founder-only execution |

If a task spans classes, the highest class governs the whole task unless `AGENTS.md` explicitly says otherwise.

### L5 — Verification fabric

**Question answered:** How do we know the change means what we think it means?

Verification is a graph of independent signals, not one green badge. Safety-critical conclusions should ideally have at least two independent edges, for example source inspection + regression replay, or checksum + real end-to-end artifact.

Design rules:

- Verify the nearest deterministic property first.
- Verify the production-shaped representation, not an easier proxy.
- Make independent checks report independently; one failure must not mask unrelated checks.
- Preserve negative controls: a fix must demonstrate it does not block a legitimate case.
- Name explicitly what a test does **not** prove.

### L6 — Governed experience and accretion

**Question answered:** What should the next agent know so it does not rediscover or repeat this failure?

Artifact: `AGENT_EXPERIENCE.md` plus executable regression tests.

The system should accumulate **compressed operational knowledge**, not transcripts. Each reusable experience contains: trigger, verified evidence, shared mechanism, rule, scope, verification hook, and supersession status. This is experiential memory without model fine-tuning.

Promotion rule:

- One-off detail -> `SESSION_LOG.md`.
- Reusable incident mechanism -> `AGENT_EXPERIENCE.md`.
- Executable behavior -> regression test/check.
- Cross-project permanent behavior rule -> `AGENTS.md`.
- Formal safety/launch requirement -> `CONTRACTS.md` with founder approval.

This prevents `AGENTS.md` from becoming an ever-growing prompt dump while still making the system agent-accretive.

### L7 — Product learning layer

**Question answered:** How can client corrections improve future decisions without corrupting truth?

Artifact/design track: `BRAIN_ROADMAP.md` and future approved implementation.

Only validated, provenance-bound findings may enter durable product knowledge. Client corrections may propose deltas; they do not become trusted facts merely because they were submitted. Human-reviewed or otherwise contract-governed acceptance remains load-bearing until a future decision explicitly changes that policy.

### L8 — Business strategy and value

**Question answered:** Why does the system exist and what outcome should it optimize?

Constrovet's engineering system should optimize for high-trust construction financial decision support, not software sophistication. Any new infrastructure must earn its operational cost by improving one or more of: evidence integrity, decision accuracy, verification speed, client trust, or founder leverage.

## Agent-native control loop

The canonical loop is:

`OBSERVE -> ORIENT -> HYPOTHESIZE -> FALSIFY -> CHANGE -> VERIFY -> ACCRETE`

**Observe:** refresh the repository and read the smallest canonical state slice.

**Orient:** select product, milestone, contract, change class, and required evidence.

**Hypothesize:** express the defect or desired behavior as one falsifiable mechanism.

**Falsify:** try to disprove the hypothesis using the cheapest real artifact/test before editing.

**Change:** make the smallest coherent change; avoid opportunistic refactoring.

**Verify:** prove the exact acceptance property and its negative control using independent evidence.

**Accrete:** leave behind a regression, decision, invariant, or experience card so future work starts at a higher level.

## Context architecture

### The agent should never start by reading everything

Large context is not the same as good context. A 178k-character session log, several superseded roadmaps, and three products in one repo create a high probability of **context collision**: a correct statement from an old time or different product is retrieved at the wrong moment.

The solution is dependency-aware progressive disclosure:

1. `SYSTEM_INDEX.md` — authority map and loading algorithm.
2. `REPO_MAP.md` — choose product/surface.
3. `PROJECT_MILESTONES.md` — current state slice.
4. Relevant `CONTRACTS.md`/`AGENTS.md` section.
5. Target code/tests/real artifact.
6. Historical rationale only if a contradiction or mechanism requires it.

This creates a narrow “working set” while preserving the full repository as long-term memory.

## Authority and supersession design

A coherent agent system cannot have six documents each claiming to be current. Use **one owner per fact domain** and explicit status metadata.

Every planning/design document should eventually carry at least:

```yaml
status: canonical | active-design | proposal | historical | superseded
scope: <product/surface>
superseded_by: <file or null>
state_authority: false
```

Only `PROJECT_MILESTONES.md` may be `state_authority: true` for Constrovet project state. Old docs may preserve rationale but must not issue current execution commands that conflict with canonical state.

## Cost architecture

The agent should route work by uncertainty, not by prestige of tool/model.

**Tier 0 — deterministic:** file reads, exact search, diff, parsing, checksum, syntax check, unit tests. Default.

**Tier 1 — repository evidence:** regression fixtures, local replays, CI artifacts, git history.

**Tier 2 — connected operational evidence:** Drive/Sheets/Gmail, only when a contract requires real-world confirmation.

**Tier 3 — external research:** web/papers/docs for architecture, APIs, standards, law, or other external facts.

**Tier 4 — paid inference/live product path:** only when the target behavior itself requires the model or cheaper evidence cannot answer the question.

A future automation may implement this as a task router; the policy should exist before the automation.

## Failure containment

The engineering system should be biased toward **fail-visible** behavior:

- A missing credential says `NOT AVAILABLE`, not “healthy.”
- An unverified live state says `UNKNOWN`, not “probably current.”
- A skipped test is reported as skipped, not hidden behind another failure.
- A blocked report remains internally inspectable with validation artifacts.
- A stale planning document is labelled historical, not silently left authoritative.

When a safety-critical control fails, the preferred response is halt/hold + diagnostic artifact, not degraded silent continuation.

## Accretive knowledge without prompt bloat

The most valuable permanent memory is **mechanistic**. Store “newline-normalized fixtures caused a row-boundary guard to pass tests while failing on real Gemini text,” not ten pages of the session that discovered it.

Each future incident should answer:

- What trigger should cause retrieval of this experience?
- What evidence proved it?
- What mechanism generalized across instances?
- What smallest rule/test prevents recurrence?
- When is the lesson no longer applicable?

That makes memory searchable, scoped, falsifiable, and garbage-collectable.

## Research alignment

This design intentionally follows several findings from agent research rather than inventing a bespoke vocabulary for every problem:

- **SWE-agent / Agent-Computer Interfaces (2024):** agent performance depends strongly on interfaces designed for agent navigation and action, not only on model capability. Constrovet therefore treats repository/document structure as part of the agent interface.
- **Context Engineering for AI Agents in Open-Source Software (2025):** version-controlled project context files are becoming a practical coordination mechanism, but structure and consistency vary widely. Constrovet addresses this with an explicit authority map and progressive disclosure.
- **MemGovern (2026):** raw historical experience becomes more useful when transformed into governed, retrievable experience records. `AGENT_EXPERIENCE.md` uses this principle at repository scale.
- **Remember Your Trace / MemDocAgent (2026):** dependency-aware traversal plus shared repository memory reduces inconsistency in long-horizon repository understanding. `SYSTEM_INDEX.md` and the layer tower provide that traversal order.
- **Self-Improving AI Coding Agents Through Accumulated Behavioral Rules (2026):** accepted review feedback can be turned into persistent behavioral rules and self-review checks without model-weight updates. Constrovet uses a governed promotion path from incident -> experience -> executable check -> agent rule.
- **Self-Evolving Coding Agents survey (2026):** executable feedback and coding trajectories are valuable drivers of self-evolution but raise reliability, safety, maintenance, cost, and overfitting risks. Constrovet therefore allows accretion only from verified evidence and keeps live-changing authority bounded.

Research references are design inputs, not evidence that Constrovet itself satisfies these properties.

## Target end-state

A new capable agent should be able to enter the repo with no private memory and, within a very small context budget, answer accurately:

- What product am I touching?
- What is current versus historical?
- What is the next blocked objective?
- What invariant must not break?
- What evidence would prove success?
- What am I allowed to change?
- What is the cheapest tool path?
- What past incident is structurally similar?
- What permanent knowledge should this work leave behind?

If the repository makes those answers obvious, the system is agent-ergonomic. If each verified cycle makes the next cycle easier and safer, it is agent-accretive. If all layers point to one another without duplicating ownership, it is systemically coherent.