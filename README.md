# Constrovet Website Repository

This repository hosts the **Constrovet construction-evidence product** plus separate Claim Companion and retired/demo material. It is not a single-product codebase.

**Software agents and contributors:** start with [`SYSTEM_INDEX.md`](SYSTEM_INDEX.md), then [`REPO_MAP.md`](REPO_MAP.md). Do not infer current project state from this README; [`PROJECT_MILESTONES.md`](PROJECT_MILESTONES.md) is the sole current-state authority.

For operating procedures, route checks, incident runbooks, and zero-budget controls, see [`OPERATIONS_MAINTENANCE.md`](OPERATIONS_MAINTENANCE.md).

---

## Constrovet active architecture

| Surface | Active implementation |
|---|---|
| Public website | Static HTML/CSS/JS served by GitHub Pages at `www.constrovet.com` |
| App launcher | `app/index.html` |
| Browser analysis | Client-side PDF/CSV analysis in the static dashboard |
| Deep Analysis backend | `apps-script/` using Google Workspace Apps Script |
| Storage / async artifacts | Google Workspace Drive and Apps Script-owned artifacts |
| Optional AI verification | Gemini through the approved Apps Script path after explicit Deep Analysis action |
| Backend deployment | Manual founder-only `clasp push`, governed by `AGENTS.md` |
| Current deployment/readiness state | `PROJECT_MILESTONES.md` |

GCP/Cloud Run is not the active production architecture. Legacy `Dockerfile`/`nginx.conf` material remains only as historical/rollback reference. Do not re-enable paid GCP hosting or add Cloud Run, Cloud SQL, Firestore, GCS, or service-account upload to the active workflow without an explicit architectural decision and rollback plan.

---

## Repository orientation

Important active paths for Constrovet:

```text
index.html, demo.html, blog/, pages/, assets/   public website
app/index.html                                  browser dashboard
apps-script/                                    Workspace Apps Script processor + EEV2 modules/tests
.github/workflows/eev2-harness-ci.yml           Constrovet evidence-harness CI
scripts/                                        deterministic engineering checks/helpers
SYSTEM_INDEX.md                                 agent bootstrap + authority map
PROJECT_MILESTONES.md                           current state/deployment/blockers
CONTRACTS.md                                    definition of done + hard stops
AGENTS.md                                       agent operating/delegation contract
REPO_MAP.md                                     product/path topology
multi-tool-workflow.md                          cross-tool handoff protocol
AGENT_SYSTEM_ARCHITECTURE.md                    agent-native system design
AGENT_EXPERIENCE.md                             governed reusable incident memory
AGENT_NATIVE_MIGRATION_PLAN.md                  staged engineering-control-plane plan
SESSION_LOG.md                                  historical evidence archive
```

Separate or non-active surfaces are described in `REPO_MAP.md`. In particular, do not use Claim Companion code, `recovery-v11/`, or legacy infrastructure files as evidence about the active Constrovet path unless the task explicitly requires them.

---

## Production behavior

The browser dashboard produces risk scoring, executive actions, recoverable-exposure analysis, control-failure notes, missing-evidence blockers, 7/30/90 actions, citations/rationale, and optional Workspace report submission.

**Analyse** is intended to remain browser-side and no-cost. **Deep Analysis** submits an evidence-bound payload to the Workspace Apps Script processor after explicit user action and uses the approved Gemini key from Script Properties where the live path requires it.

The product's prime safety objective and launch conditions are not defined here. Read `CONTRACTS.md` and `PROJECT_MILESTONES.md`.

---

## GitHub Pages deployment

The public website deployment target is:

| Setting | Value |
|---|---|
| GitHub repo | `tcbhagat/constrovet-website` |
| Branch | `main` |
| GitHub Pages source | `main` branch, `/` |
| Production domain | `www.constrovet.com` |
| App launcher | `https://www.constrovet.com/app/` |

A push to `main` that changes served static files is therefore a **production website change** even though it does not deploy the Apps Script backend.

Typical route verification:

```bash
curl -I -L https://www.constrovet.com
curl -I -L https://www.constrovet.com/demo
curl -I -L https://www.constrovet.com/app/
curl -I -L https://www.constrovet.com/llms.txt
curl -I -L https://www.constrovet.com/sitemap.xml
curl -I -L https://www.constrovet.com/robots.txt
```

Expected route status must be checked against the current task; do not treat an old README statement as a live verification result.

---

## Local deterministic checks

Available npm scripts are defined in `package.json`. For Constrovet evidence work, use the relevant local checks before any paid/live execution. Current examples include the EEV2 harness, fixture-provenance checks, golden-sample checks, and Node tests.

Do not interpret a test-suite pass more broadly than what the suite actually exercises. `SYSTEM_INDEX.md` defines the lifecycle distinction between `MERGED`, `DEPLOYED`, `EXERCISED`, `VERIFIED`, and `DONE`.
