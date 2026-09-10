---
name: brain-roadmap
description: Gated design for Constrovet's future product knowledge and learning layer. Separates client/project truth from engineering-agent experience, starts with existing Google Workspace infrastructure, and defines evidence/provenance rules plus migration triggers for a future graph/database layer.
status: gated-design
scope: Constrovet product knowledge and client/project learning
state_authority: false
---

# BRAIN ROADMAP — governed evidence memory and product learning

## Status and gate

**DESIGN ONLY. Nothing in this document is evidence that a knowledge layer is deployed.**

Current production/launch state lives only in `PROJECT_MILESTONES.md`. Before implementing any part of this roadmap, re-read the active launch blockers there and the relevant `CONTRACTS.md` requirements. This design must not delay the current endpoint-security real exercise or the Contract 4 clean-cycle launch gate unless new evidence proves the knowledge layer is itself required to close them.

## Purpose

Build a durable product memory that lets Constrovet become better at interpreting a project's evidence over time **without ever promoting an unverified extraction, model guess, or client correction into trusted fact merely because it was observed**.

The layer should eventually answer questions such as:

- What evidence has this organization supplied over time?
- Which findings were accepted, rejected, corrected, or superseded?
- What did the system believe at a past point in time, and why?
- Which source passage and validation version support a current assertion?
- What recurring correction patterns suggest an extraction/validation improvement?
- Which proposed improvement has been proven offline but not yet authorized for client-facing use?

This is a **governed evidence memory**, not a vector-store dumping ground.

## Trust-domain separation — non-negotiable

Constrovet now has two distinct memory systems with different trust rules:

### A. Engineering-agent experience

Owner: `AGENT_EXPERIENCE.md` + executable tests/checks in git.

Contains reusable engineering mechanisms such as “production-shaped OCR fixtures outrank transformed Drive renderings.” It may be derived from verified incidents and code-review feedback. It contains **no client-sensitive project truth**.

### B. Client/project knowledge

Owner: this roadmap's future implementation in Google Workspace first, then an approved database/graph layer if justified.

Contains tenant-scoped document evidence, validated assertions, correction proposals, approvals, and supersession history. It must not be stored in public git.

**Never merge these trust domains.** An engineering lesson can change how code is tested; it cannot become a client fact. A client correction can propose a product-learning change; it cannot directly rewrite `AGENTS.md`, production prompts, or validation logic.

## Knowledge lifecycle

Every durable item must have an explicit epistemic state. Recommended lifecycle:

`OBSERVED -> EXTRACTED -> VALIDATED/REJECTED -> ASSERTED -> CORRECTED/SUPERSEDED`

With a separate improvement lifecycle:

`PATTERN_OBSERVED -> IMPROVEMENT_PROPOSED -> OFFLINE_EVALUATED -> APPROVED -> RELEASED -> MONITORED`

These two lifecycles must not be conflated.

### OBSERVED

A source document or user/client submission exists. Store identity/provenance, not an interpretation.

### EXTRACTED

The model/parser produced a candidate field/finding. This is **not truth**. Preserve model/version and source-span provenance so the extraction can be reproduced or challenged.

### VALIDATED

The current validation layer accepts the evidence relationship required for the assertion. This means “passed the defined validation,” not “ontologically true forever.”

### REJECTED

The candidate failed validation or a policy gate. Preserve enough audit metadata to explain rejection without allowing the rejected candidate to contaminate later trusted retrieval.

### ASSERTED

A validated finding is eligible for client/project retrieval under its recorded scope and confidence. Assertions must retain their evidence and validator provenance.

### CORRECTED / SUPERSEDED

New evidence or reviewed correction changes the accepted assertion. Do not overwrite history. Close/supersede the earlier assertion and link the replacement.

## Minimum viable architecture — use what already exists

### Recommendation: Google Workspace evidence ledger first

For the pilot stage, the lowest-risk architecture is **Google Drive + a controlled append-oriented Google Sheet (or Sheets set) + Apps Script access functions**, because these are already part of the approved operating stack and require no new hosted service, database administration, credential estate, or paid infrastructure.

This is deliberately not a claim that Sheets is the permanent database. It is a reversible learning substrate for discovering the real schema and query patterns before choosing a heavier platform.

### Separation of storage roles

**Drive** holds source documents and large immutable artifacts under the existing project/job organization.

**Evidence Ledger** holds compact structured records and references/hashes—not copied PDFs or giant quoted spans when a stable artifact reference suffices.

**Apps Script** is the only initial write path so validation state, tenant scope, and audit metadata can be enforced consistently.

**Agent/retrieval interfaces** remain read-oriented until an explicit product-learning action is approved.

## Canonical evidence-ledger record

Do not implement this schema blindly; validate every field against the actual live job/report/correction shapes first. The intended conceptual fields are:

| Concept | Purpose |
|---|---|
| `record_id` | Immutable unique ledger record identifier |
| `tenant_id` / organization scope | Prevent cross-client retrieval |
| `job_id` | Link to the intake/execution job |
| `document_id` / stable artifact reference | Link to source evidence |
| `document_hash` | Detect exact source identity/version where practical |
| `finding_id` | Link to the finding/assertion |
| `assertion_type` / financial category | Typed meaning of the claim |
| `value` + `unit/currency` | Structured asserted value when applicable |
| `source_locator` | Page/row/span/file location sufficient to find the evidence |
| `source_span_hash` and/or bounded span | Integrity/provenance without unnecessary duplication |
| `evidence_quality` | Existing product evidence classification |
| `extraction_model/version` | Provenance for candidate generation |
| `validator_version` / gate version | Provenance for acceptance/rejection |
| `epistemic_state` | OBSERVED / EXTRACTED / VALIDATED / REJECTED / ASSERTED / SUPERSEDED |
| `valid_from` / `valid_to` | When the fact/assertion is understood to apply in the project world, where meaningful |
| `recorded_at` | When Constrovet learned/recorded it |
| `supersedes_record_id` | Immutable correction chain |
| `feedback_or_correction_id` | Link to the correction event |
| `approval_state` / reviewer metadata | Required where product governance calls for human approval |

The split between `valid_*` and `recorded_at` is intentionally bitemporal in spirit: **when something applied in the project** and **when Constrovet came to know/believe it** are different questions.

## Write boundary

### Initial automatic writes allowed

The system may automatically append:

- source-observation records;
- extraction candidates clearly marked `EXTRACTED`/untrusted;
- validator outcomes and provenance;
- validated/asserted records only after the existing validation contract says that particular class is safe to promote.

The knowledge layer must never make the product gate less strict. A failure to write product memory must not cause a report that would otherwise be held to send.

### Corrections and learned changes

Client feedback is evidence **about a possible correction**, not self-authenticating truth.

A correction flow should:

1. Receive the correction through the existing correction mechanism or approved successor.
2. Preserve the previous assertion unchanged.
3. Re-run extraction/validation against the corrected/new evidence where applicable.
4. Produce a structured delta: old assertion, proposed new assertion, evidence change, confidence/validation change, and affected downstream outputs.
5. Require the configured approval/read-back control for any delta that changes what future clients/users may see.
6. Append the accepted replacement and link it with `supersedes_record_id`; rejected proposals remain audit records but do not become retrievable trusted assertions.

## Product self-improvement loop

“Self-improving” means **autonomously noticing and proposing**, not silently changing client-visible behavior.

The allowed loop is:

`VERIFIED CORRECTIONS -> PATTERN DETECTION -> CHANGE PROPOSAL -> OFFLINE REPLAY -> NEGATIVE CONTROLS -> HUMAN/CONTRACT APPROVAL -> VERSIONED RELEASE -> MONITORING`

Examples of proposals:

- a recurring extraction-normalization fix;
- a new semantic guard for unit-rate-vs-recoverable-cost confusion;
- a confidence-calibration change;
- a document-template parser refinement;
- a new retrieval/ontology relation.

Every proposal must be evaluated against historical real artifacts plus legitimate negative controls before release. A model's introspective claim that the proposal is better is not evaluation.

## Retrieval rules

Future retrieval should be **provenance-first and tenant-scoped**:

1. Select tenant/org explicitly.
2. Prefer current `ASSERTED` records whose evidence and validator provenance are intact.
3. Preserve the ability to inspect superseded history.
4. Do not mix rejected/unreviewed correction candidates into trusted retrieval.
5. Return source references with the assertion.
6. When knowledge conflicts, surface the conflict/state rather than forcing a synthetic consensus.

Raw semantic similarity is a candidate-retrieval mechanism, not a truth function.

## Utopia / Postgres evaluation — deferred, not rejected

Utopia is directionally aligned with this design: its current project describes a bitemporal graph, provenance-bearing facts, review/conflict handling, undoable entity merges, and an append-only decision ledger. Those are valuable concepts for a mature Constrovet knowledge layer.

However, as of the design review on 2026-09-10, Utopia remains **v0.1**, requires its own Rust/Postgres/pgvector runtime, its database migrations are forward-only with no rollback, and agent-memory-over-MCP is still listed on its roadmap. Introducing it now would add a second operational platform before the pilot has demonstrated the query/ontology load that requires one.

Therefore:

**Decision for the current design: DEFER Utopia adoption. Do not provision it for the pilot knowledge layer.**

This is a cost/risk sequencing decision, not a judgment that Utopia is unsuitable long-term.

## Migration triggers — evidence, not arbitrary scale numbers

Re-evaluate Postgres/Utopia (and alternatives) when one or more **measured** conditions appear:

- Sheets/Apps Script query latency or quota behavior materially interferes with client workflows.
- Cross-document temporal/graph queries become difficult or error-prone in a ledger model.
- Tenant-isolation requirements exceed what the approved Workspace design can defensibly enforce.
- Ontology/rule reasoning becomes a product requirement rather than a research interest.
- Correction/supersession chains become operationally hard to inspect/audit.
- Retrieval quality needs hybrid full-text/vector/graph search that cannot be achieved responsibly in the minimal stack.
- A regulated/client requirement calls for database-grade backup/restore, access controls, or audit capabilities beyond the current Workspace implementation.

At that point run a comparative spike against **real Constrovet evidence/query workloads**, not a feature checklist.

Candidates may include Utopia, a minimal Postgres schema, or another open-source temporal/knowledge layer. The simplest candidate that passes the real workload and governance tests wins.

## Migration contract

The Workspace ledger should be designed so migration is mechanical:

- immutable IDs;
- explicit tenant scope;
- append/supersede rather than destructive overwrite;
- typed states;
- stable artifact references/hashes;
- timestamps separated into project-valid and system-recorded time where meaningful;
- no business logic hidden only in spreadsheet formulas.

A future database migration should transform these records, not reinterpret historical meaning.

## Privacy and security constraints

- Do not place client/project evidence or identifiable client data in public git or `AGENT_EXPERIENCE.md`.
- Store the minimum quoted text needed for provenance; prefer source references/hashes where they remain practically retrievable.
- Tenant scope must be part of every read/write contract, not an optional UI filter.
- Knowledge write failures must fail visibly and must never bypass existing report validation.
- New external knowledge infrastructure requires an explicit threat/privacy/backup review before any client data is copied into it.

## Relationship to `AGENT_SYSTEM_ARCHITECTURE.md`

The engineering control plane and product brain use the same high-level principles—provenance, explicit states, append/supersede, progressive retrieval, governed accretion—but they are intentionally different implementations.

Engineering memory is cheap, public-safe, version-controlled knowledge about **how to engineer Constrovet**.

Product memory is access-controlled, tenant-scoped knowledge about **what Constrovet has learned from project evidence**.

A coherent system uses analogous abstractions without collapsing trust boundaries.

## Implementation sequence

### B0 — Schema discovery, read-only

Inspect real current job/report/correction artifacts and inventory the actual fields/IDs already available. Produce a mapping from existing shapes to the conceptual ledger above. No writes, no new infrastructure.

### B1 — Ledger contract and adversarial review

Define exact schema, tenant boundary, allowed state transitions, idempotency key, correction/supersession semantics, and failure behavior. Test the design against known incidents (fabricated amount, unit-rate semantic risk, transformed OCR fixture, held report) on paper/fixtures.

### B2 — Minimal Workspace prototype

In a **non-production/test context**, append records for a small set of real historical jobs. Prove idempotency, tenant filter, supersession chain, and provenance retrieval. No client-visible behavior change.

### B3 — Read-only retrieval

Expose controlled retrieval to analysis tooling/agents. Retrieval must show assertion state + provenance and must not modify reports automatically.

### B4 — Correction-delta workflow

Connect the existing correction process to structured proposed deltas. Human/contract-governed approval precedes promotion into current asserted knowledge.

### B5 — Offline improvement proposals

Mine verified correction history for recurring mechanisms and generate proposed extraction/validation improvements. Evaluate by replay before any production code change.

### B6 — Database/graph re-evaluation

Only after measured migration triggers appear, benchmark the minimal ledger against Utopia/minimal Postgres/other viable open-source options using actual queries, data volume, governance requirements, backup/recovery, and operating cost.

## Acceptance standard for the brain track

Do not call the product “self-learning” merely because it stores history or performs retrieval. The track earns that description only when a verified correction can:

1. leave an immutable evidence/correction trail;
2. produce a structured improvement proposal;
3. be evaluated against historical real evidence and negative controls;
4. pass the required approval/release boundary;
5. measurably improve future handling without increasing fabricated/mis-attributed client output.

Until then, call it **governed evidence memory**.

## Current recommended next action

**Do not build B0 yet if it would compete with the current launch blockers.** Close the active endpoint-security exercise and Contract 4 launch-gate work defined in `PROJECT_MILESTONES.md` first. When the production path is ready for pilot use, B0 is the first brain task: schema discovery from real artifacts, with zero new infrastructure.