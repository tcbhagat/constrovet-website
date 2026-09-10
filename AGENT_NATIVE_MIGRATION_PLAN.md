---
name: agent-native-migration-plan
description: Implementation plan for evolving the engineering environment into an agent-intuitive, agent-ergonomic, and agent-accretive control plane without adding paid infrastructure or changing the live Apps Script product path prematurely.
status: active-plan
scope: engineering control plane
state_authority: false
---

# Agent-native migration plan

## Objective

Make the repository itself an effective **agent-computer interface**: a capable agent with no private memory should be able to recover the correct product scope, current state, safety constraints, next objective, proof requirements, and allowed actions with minimal context and zero paid infrastructure.

This plan does not change the Constrovet client pipeline by itself. Production milestones remain governed by `PROJECT_MILESTONES.md` and `CONTRACTS.md`.

## Design constraints

- Open-source / existing subscriptions first; no new paid runtime for the engineering control plane.
- No new database merely to store agent memory while git can represent the required durable state.
- No duplicate current-state document.
- No autonomous live Apps Script writes or deployment actions.
- No “self-improvement” from unverified agent summaries.
- Prefer deterministic scripts and executable checks over longer prompts.
- Keep startup context compact; historical detail is retrieved on demand.

## Phase A0 — Authority and context architecture

**State: IMPLEMENTED IN THIS BRANCH, pending review/merge.**

Deliverables:

- `SYSTEM_INDEX.md` — one bootstrap entry point and authority map.
- `AGENT_SYSTEM_ARCHITECTURE.md` — system model and abstraction tower.
- `AGENT_EXPERIENCE.md` — governed experiential memory.
- Existing agent/navigation docs reconciled so Drive plans and old roadmaps cannot silently outrank canonical repo state.

Acceptance criteria:

- A fresh agent can identify the canonical owner for permissions, DoD, current state, topology, cross-tool workflow, history, and experiential memory without reading `SESSION_LOG.md`.
- No new file duplicates current milestone values.
- Historical plans cannot override `PROJECT_MILESTONES.md` merely because they contain stronger imperative language.

## Phase A1 — Deterministic context compiler

**State: PLANNED. No release-gate integration in A1.**

Build a small zero-dependency script, proposed name `scripts/agent-context.mjs`, that prints a compact session packet from canonical sources. It should not summarize with an LLM. It should deterministically extract:

- current git branch/SHA and working-tree status;
- relevant product topology pointer from `REPO_MAP.md`;
- deployed-vs-main block and milestone headings/states from `PROJECT_MILESTONES.md`;
- open `UNKNOWN`, `BLOCKED`, `REOPENED`, and `ACCEPTED_OPEN` markers;
- links to the authority owners from `SYSTEM_INDEX.md`;
- a warning when the canonical files have uncommitted changes or expected files are absent.

It must never infer live health from missing credentials. If live Apps Script status cannot be checked, print `NOT AVAILABLE`.

Acceptance criteria: output is deterministic, under a deliberately small size budget, and matches manual inspection of the canonical docs on at least three repository states/fixtures.

Why not build it in A0: the authority model must stabilize first; otherwise automation would compile contradictions faster.

## Phase A2 — Documentation authority lint

**State: PLANNED.**

Build `scripts/check-doc-authority.mjs` as an advisory check first. It should detect high-risk context drift such as:

- a non-authoritative file claiming `ACTIVE MILESTONE`, `current production state`, or equivalent without a `historical/proposal` marker;
- a file named as superseded that still declares itself current;
- duplicated deploy hashes outside `PROJECT_MILESTONES.md` unless explicitly marked as historical evidence;
- Drive plan language presented as canonical state;
- missing frontmatter status on known planning documents.

Do **not** add this to CI/release gates without separate approval if that would create a new release-gate condition under `AGENTS.md`.

Acceptance criteria: it flags the currently known stale-roadmap patterns and has zero false positives on canonical state owners.

## Phase A3 — Milestone work packets

**State: PLANNED.**

For each active milestone, create a small temporary work packet only when work begins. Proposed path: `work/MXX.md`.

A packet contains exactly:

- milestone and acceptance criterion copied by reference, not redefined;
- hypothesis under test;
- required real artifacts/fixtures;
- change-surface class C0–C4;
- cheapest verification path;
- rollback/recovery note if live-bound;
- verified/unverified split;
- links to relevant experience cards.

The packet is not a second project-state database. When the milestone closes, archive or delete it after durable knowledge has been promoted to the appropriate owner.

Acceptance criteria: an agent can resume a stopped milestone from the packet without rereading unrelated historical plans.

## Phase A4 — Experience governance automation

**State: PLANNED.**

Add a lightweight validator for `AGENT_EXPERIENCE.md` cards. Each card must have trigger, verified evidence, mechanism, rule, verification hook, scope, and status. Duplicate mechanisms should be merged rather than appended forever.

Candidate promotion flow:

`incident/session evidence -> experience card -> executable regression/check -> AGENTS/CONTRACTS promotion only if warranted`

Acceptance criteria: at least three future verified incidents/corrections can be captured without increasing startup prompt size, and an agent can retrieve the relevant card by trigger/mechanism.

## Phase A5 — Dependency-aware repository map

**State: PLANNED after launch-critical work.**

Generate a deterministic map of the active Constrovet call/dependency surface rather than relying on lexical search alone. Start narrow:

- public/browser entrypoints;
- Apps Script intake entrypoints;
- validation/send gates;
- EEV2 module calls;
- test suites covering each critical path;
- deploy surface mapping.

The map should point to source, not reproduce source. It should be regenerated, not hand-maintained.

Acceptance criteria: given a critical function, an agent can identify upstream callers, downstream safety gates, and covering tests without searching unrelated Claim Companion or recovery files.

## Phase A6 — Verification graph and evidence registry

**State: PLANNED after M10/M13 launch blockers are closed.**

Represent important acceptance claims as a small structured registry, preferably version-controlled JSON/YAML generated from real artifacts rather than a new hosted database. Example claim types:

- code parity verified by checksum;
- regression verified by raw suite result;
- endpoint cap exercised by real refused request;
- Test A hold verified by the required four artifacts;
- Test B pass verified by delivery + audit row.

Every record should include `claim`, `evidence_type`, `artifact_reference`, `verified_at`, `verifier`, and `scope`. Do not store secrets or client-sensitive content in git.

Acceptance criteria: a milestone can point to evidence records instead of embedding repeated narrative proof in multiple docs.

## Phase A7 — Cost-aware task router

**State: FUTURE.**

Once enough tasks are represented consistently, add a policy layer that selects the cheapest reliable tool path from the cost ladder in `SYSTEM_INDEX.md`. Start as rules, not ML:

- exact repository question -> search/read/diff;
- behavior regression -> local test/fixture replay;
- live artifact acceptance -> connected Drive/Sheets/Gmail;
- changing external fact -> web;
- ambiguous architecture -> high-reasoning model;
- client Deep Analysis -> existing paid inference path only when explicitly requested.

Measure value by avoided paid calls and reduced rework, not by number of autonomous actions.

## Phase A8 — Product learning integration

**State: GATED FUTURE.**

Only after the launch-critical validation path is proven and the `BRAIN_ROADMAP.md` design is revalidated against current architecture should client feedback begin feeding a durable knowledge layer.

The engineering experience system and the client knowledge system remain separate trust domains. Engineering cards can learn from verified incidents. Client/project facts require evidence/validation and the product's approved correction governance.

## Priority relative to production milestones

A0 is worth doing now because it reduces agent error immediately without touching the live product. A1–A4 are low-cost engineering multipliers but must not delay M13 real cap exercise or the Contract 4/M10 clean-cycle launch gate. A5–A8 are post-blocker improvements unless a current incident demonstrates they are required sooner.

## Success metrics

Track outcomes that matter:

| Metric | Desired direction |
|---|---|
| Startup context required before correct action | Down |
| Contradictory current-state claims | Toward zero |
| Repeated incident mechanisms | Toward zero after codification |
| Paid inference used for deterministic engineering questions | Toward zero |
| Time from new session to correctly identified active blocker | Down |
| Milestone reopenings caused by wrong evidence class | Toward zero |
| Safety-critical checks independently observable | Toward 100% |
| Durable lessons represented as executable checks | Up |

Do not optimize “agent autonomy percentage.” Optimize **correct founder leverage per unit of attention and compute**.