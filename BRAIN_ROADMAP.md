# BRAIN_ROADMAP.md — Knowledge graph + self-learning layer for Constrovet

**STATUS: DESIGN ONLY.** Nothing in this document is deployed, provisioned, or 
spending money. See `ROADMAP.md` for the sequencing gate — the validation layer 
must be restored to production (Milestone 2) before any self-learning layer 
design is finalized.

---

## Goal

A self-hosted knowledge layer that:
1. Models the whole Constrovet evidence pipeline (documents → findings → 
   citations → financial impacts) AND per-client/organization decision history,
2. Updates incrementally as clients upload new project documents,
3. Improves through a human-reviewed feedback loop driven by client corrections,
4. **CONSTRAINT:** Never lets unvalidated or fabricated figures become a "fact" 
   the system later trusts.

The third point distinguishes this from a passive archive — the system learns 
from corrections. The fourth point is non-negotiable: this layer must sit 
*downstream* of the validation gate, using only validated findings as its source 
of truth. Learning from raw extraction (before validation) would embed the same 
risk that today's incident (fabricated `INR 12` figures reaching a client report) 
was meant to eliminate.

**Precise definition of "self-improving" (settled 2026-09-04, resolves a real
contradiction — do not re-open this without updating both sides deliberately).**
"Self-improving" and "human-reviewed" were both stated as requirements in the
same conversation; they only coexist under one specific reading, and this
document adopts it as binding: **the system may autonomously *propose* an
improvement — a KG delta, an extraction refinement, a confidence adjustment —
without asking permission to notice something. It may never autonomously
*apply* a delta that changes what a client sees.** Autonomy lives entirely on
the proposing side of that line. Nothing downstream of "propose" runs without
the human-review step in Subgoal 3. If a future design needs autonomous
*application* of learned changes, that is a new decision requiring its own
explicit approval — it is not covered by anything in this document as written.

---

## Subgoal 1: Model the whole app + per-client/org graph

**What gets modeled?**
- **Core entities:** documents (PDFs, CSVs), extraction-layer findings 
  (`financial_category`, `amount`, `evidence_quality`, `confidence`), 
  citations (matched text spans + source location), jobs (form submissions), 
  clients/organizations (top-level, multi-tenant).
- **Decision history per client/org:** validated findings accepted as "true" in 
  their context, corrections submitted by the client (via the existing 
  `BOARDROOM_CORRECTION_FORM_ID` loop), audit trail of human approvals for 
  changes to the graph.

**Design question — isolation model (open, needs a decision):**

The system can be structured two ways:

**Option A: One Utopia instance, tenant-scoped subgraphs**
- Single Rust binary + PostgreSQL instance shared across all tenants.
- Access control enforces tenant boundaries at query time (org-scoped GraphQL 
  queries).
- **Pros:** lower operational overhead, one database to backup/monitor, easier 
  to keep schema consistent across clients.
- **Cons:** a query-time access control bug would leak one client's data to 
  another; the shared Postgres instance is a blast radius for any one tenant's 
  bad data (though the validation gate should prevent this).

**Option B: Isolated instances per client/org**
- Separate Rust binary + PostgreSQL per tenant.
- Complete data isolation by construction (no access control needed).
- **Pros:** zero cross-tenant leak risk; failed Postgres on one tenant doesn't 
  affect others.
- **Cons:** 3–5× operational complexity (more running processes, more backups, 
  more monitoring), schema changes require pushes to N instances, higher 
  infrastructure cost.

**Working assumption for now:** Option A, because this is an MVP and the single 
largest risk is "the system never gets built" — operational simplicity wins 
over premature isolation. If/when one client's data volume or privacy 
requirements justify isolation, the schema is portable (Utopia's bitemporal 
model means the graph is immutable-append and thus easier to migrate).

---

## Subgoal 2: Incremental updates on document upload

**Design principle — non-negotiable:**

The knowledge graph update hook fires **AFTER** `validateReportOutput` returns 
`isValid`, and the KG receives **only** validated findings — never raw 
extraction output.

This is the critical constraint. Today's incident (2026-09-04) involved a 
validation layer that was silently removed from production; a self-learning 
layer built before that gate was restored would have the exact same 
vulnerability: wrong data in → permanently stored as "true" → future clients 
inherit a corrupted model.

**Workflow:**
1. Client uploads project document(s).
2. Extraction layer produces findings (EEV2-003 + EEV2-004 fixes applied, word 
   boundaries correct).
3. Validation layer (Milestones 2–7) runs; if `isValid=false`, the report is 
   held and no KG update happens.
4. If `isValid=true`, the report sends AND a downstream KG-update function is 
   called, receiving only the validated findings.
5. The KG update appends to the client's subgraph (e.g., "finding X in document 
   Y, citation span Z, `financial_category=LEAKAGE_AND_OVERRUN`, client 
   organization=OrgID") with full audit trail (timestamp, job_id, validation 
   checkpoint timestamp).

**Critical:** a later discovery that this job's findings were wrong does NOT 
delete or retroactively hide the KG entries — see Subgoal 3 (corrections 
proposal + human review + KG delta) for how updates happen. The immutability 
is the point: "this was believed true at time T" is itself a fact worth keeping.

---

## Subgoal 3: Self-learning loop from client feedback

**Reuse, don't reinvent:** The codebase already has a correction mechanism — 
`BOARDROOM_CORRECTION_FORM_ID` (documented in `apps-script/README.md`'s 
"Correction Rerun Loop" section). Clients can submit corrected evidence, prior 
outputs are archived, and extraction reruns. This is the natural existing hook 
for "feedback."

**Design — extend, don't replace:**

1. Client submits a correction via the existing form.
2. Extraction reruns, validation gates it.
3. If the corrected version produces *different* validated findings, a **KG delta 
   is proposed** (e.g., "previous finding X is now superseded by finding Y" or 
   "finding X confidence drops from HIGH to LOW").
4. A human (the founder or a designated approver) reviews the delta and 
   approves/rejects it — **structured read-back required, not a single click.**
   Added 2026-09-04, six-lens audit: a plain approve/reject button degrades to
   rubber-stamping under volume — this is a documented failure mode of
   single-reviewer gates generally, not speculation about this one. The UI must
   force the approver to affirmatively state *what* changed (e.g., select or
   type the specific field/value being altered) before the approve action is
   even available. This makes "I clicked approve without reading it" and "I
   approved this specific change" observably different events, the way ATC
   read-back protocol converts "they probably heard me" into a falsifiable
   confirmation.
5. **Only after approval** does the delta get applied to the KG — both the new 
   facts and a record of the change (what was proposed, who approved, when,
   and the read-back text from step 4).

**Why the human approval step is load-bearing:**
- Automatic acceptance of "client feedback" as truth would recreate the gate-
  wipe risk: a single feedback submission could corrupt the shared model for 
  all future clients using that organization's data.
- Feedback is valuable for iterating the extraction logic, but is not 
  independently verified — a client might misremember a figure or misinterpret 
  the original document.
- A one-click approval is cheap but not a real gate once volume rises — see the
  read-back requirement above. The gate's value is in what it forces the
  approver to actually look at, not in the existence of a click.

---

## Subgoal 4: Utopia evaluation

**Open question — technical feasibility:**

Apps Script has no native PostgreSQL driver. Integration with Utopia can only 
happen via HTTP calls to the Utopia API from `UrlFetchApp`. 

**Before committing to Utopia, verify:**
1. Does Utopia expose an HTTP/REST API that Apps Script can call (not just a 
   GraphQL endpoint, which would require different parsing)?
2. Is the API documented and stable?
3. What authentication does it use (bearer token, API key, OAuth)?
4. What are the latency expectations for Apps Script context (Utopia is a 
   Rust binary; Apps Script has a 6-minute execution timeout)?

**Decision needed — recommendation, not a default:**

Based on the above, recommend one of:
- **Adopt Utopia** if the API is clean and the latency/auth model fits Apps 
  Script's constraints.
- **Lighter alternative** (e.g., a minimal custom knowledge schema in Sheets 
  or Firestore) if Utopia's API is too heavyweight or not designed for 
  transient clients.
- **Minimal custom schema** (append-only log in Sheets, SQL queries on the 
  side) if even a lighter alternative is overkill for the MVP.

State the pros/cons of each, not just the "obviously best" option. A minimal 
schema is slower to query later, but is faster to ship and doesn't require a 
new system to operate.

---

## Sequencing — do not skip this

**CRITICAL:** Brain design work does not meaningfully start before:
1. **ROADMAP.md Milestone 2 is DONE** — the validation gate is restored to 
   production and confirmed by real Test A/B runs.
2. **Ideally, Milestone 4 is also DONE** — staging exists, so any self-learning 
   logic can be tested against test data before touching production.

Starting this design while the validation layer is still broken (as of 2026-09-04 
morning) would be building a knowledge system on top of a pipeline known to 
pass fabricated data — exactly backward. The gate is the gate; the brain goes 
downstream of it, not alongside it.

---

## Deliverable for this track

**One design prompt (Prompt B0)** in a future `BRAIN_PROMPT_SERIES.md` (or 
equivalent) that:
- Reads this roadmap in full.
- Produces a written design document addressing all four subgoals above, with 
  the isolation model and Utopia evaluation as open questions and candidates 
  for decision.
- Cites Utopia's actual API documentation (requires a web fetch to github.com/
  deeplethe/utopia and its README/API docs).
- **Constraint:** produces documentation, not code or provisioned infrastructure 
  (mirrors the "design only" status throughout).

**Model for Prompt B0: Opus 5** — architecture decisions here directly determine 
whether a future self-learning feature can violate the prime directive (by 
learning from unvalidated data). Same stakes as Prompt 1 in the validation-gate 
series, for the same reason.

---

## What this does NOT resolve

- Nothing is paid for, built, or deployed by this roadmap.
- The Utopia feasibility check is a read-only API review, not a prototype.
- No decision on Options A/B (tenant isolation) is made here; the design doc 
  will present both and flag it as a founder decision.
- No decision on recommending Utopia vs. a lighter alternative is made; that 
  comes from the Utopia evaluation in Subgoal 4.
- The actual feedback review UI (Subgoal 3, step 4) is scoped out entirely — 
  that's a future phase once the design is approved.

This is the thinking layer, not the building layer.
