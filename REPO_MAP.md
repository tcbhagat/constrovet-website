---
name: repo-map
description: What actually lives in this repository, which product owns each deploy surface, and which documents are canonical versus historical. Read after SYSTEM_INDEX.md and before assuming a search hit belongs to Constrovet.
status: canonical
scope: repository-wide topology
state_authority: false
---

# Repo map — three products, one repository

This repo contains **three distinct products**, not one. A change to any of them touches different CI, a different backend, and a different deploy path. The overlap in naming has caused real confusion more than once.

For agent bootstrap and authority rules, read `SYSTEM_INDEX.md` first. This file owns **topology**, not current milestone state.

## 1. Constrovet — the construction evidence product

The primary product.

| | |
|---|---|
| Marketing site | repo root (`index.html`, `demo.html`, `blog/`, `pages/`, `boardroom/`) |
| App UI | `app/index.html` — single-file browser dashboard |
| Backend | `apps-script/` — `Code.gs` plus EEV2 modules and regression suites |
| Hosting | GitHub Pages, custom domain via `CNAME` (`www.constrovet.com`). **Deploy = push to `main`.** |
| Backend deploy | **Manual, founder-only `clasp push`.** Nothing in Constrovet CI deploys it. |
| CI | `.github/workflows/eev2-harness-ci.yml` (path-filtered to the evidence harness surface) |
| Bootstrap | `SYSTEM_INDEX.md` |
| Current state | `PROJECT_MILESTONES.md` — sole current-state authority |
| Definition of done | `CONTRACTS.md` |
| Agent behavior | `AGENTS.md` |
| Cross-tool protocol | `multi-tool-workflow.md` |
| Agent architecture | `AGENT_SYSTEM_ARCHITECTURE.md` |
| Durable experience | `AGENT_EXPERIENCE.md` |

**Web app posture:** `appsscript.json` declares `access: ANYONE_ANONYMOUS` + `executeAs: USER_DEPLOYING`; anonymous callers therefore execute through the deploying account's authority. EEV2-014 introduced global daily caps as mitigation. **Do not copy deployment/publication status here**; read M13 and the deployed-vs-main block in `PROJECT_MILESTONES.md` for current verified state.

## 2. Claim Companion — separate product

Materially more productized than Constrovet and **independent of the construction evidence pipeline**.

| | |
|---|---|
| Frontend | `claim-companion/` — PWA files |
| Backend | `claim-companion/apps-script/Code.gs` — its own Apps Script project |
| Android | `android/claim-companion/` — Gradle project |
| CI | Claim Companion-specific workflows under `.github/workflows/` |
| Deploy | Its Apps Script workflow is separate from Constrovet's manual backend deploy path |

Do not use Claim Companion code, tests, Apps Script configuration, privacy/legal pages, or deployment workflows as evidence about Constrovet unless the task explicitly compares the products.

## 3. ssm-core-demo — retired

Marked retired in its own configuration and not part of the Constrovet construction evidence product. Its presence in repo search results is not evidence that it is active. Any deletion/cleanup decision remains separate from current Constrovet launch state.

## Search traps and non-authoritative surfaces

- **`Dockerfile`, `nginx.conf`** — legacy Cloud Run rollback references. They are not the active hosting architecture.
- **`recovery-v11/`** — historical recovery artifacts. They may contain real function names and therefore match searches, but they are not the active Apps Script source. Confirm active behavior against `apps-script/` plus live evidence when required.
- **Claim Companion paths** — separate product; lexical overlap does not create architectural relevance.
- **Duplicated SEO landing pages** — duplicated content does not imply duplicated authority. Confirm the served route before editing.
- **`SESSION_LOG.md`** — large historical evidence archive. It should be queried by date/incident/identifier, not read as startup context and not used to override current milestones.

## Document authority map

Imperative wording inside an old file does **not** make it authoritative. Use these classifications:

| Document | Classification | May assert current Constrovet state? | Intended use |
|---|---|---:|---|
| `SYSTEM_INDEX.md` | CANONICAL bootstrap | No | Find the owner of each fact domain and load minimal context |
| `AGENTS.md` | CANONICAL behavior | No | Permissions, delegation, operating rules |
| `CONTRACTS.md` | CANONICAL contract | Contract facts only | Definition of done, hard stops, launch requirements |
| `PROJECT_MILESTONES.md` | CANONICAL state | **Yes** | Current deployment/milestone state and blockers |
| `REPO_MAP.md` | CANONICAL topology | No | Product/path/deploy ownership |
| `multi-tool-workflow.md` | CANONICAL workflow | No | Cross-tool handoffs and surface boundaries |
| `AGENT_SYSTEM_ARCHITECTURE.md` | ACTIVE DESIGN | No | Agent-native system model |
| `AGENT_NATIVE_MIGRATION_PLAN.md` | ACTIVE PLAN | No | Engineering-control-plane improvements |
| `AGENT_EXPERIENCE.md` | CANONICAL MEMORY | No | Reusable verified incident mechanisms |
| `BRAIN_ROADMAP.md` | GATED DESIGN | No | Future product knowledge/self-learning layer; revalidate against current milestones before implementation |
| `ROADMAP.md` | HISTORICAL | No | Earlier milestone rationale; superseded for current state by `PROJECT_MILESTONES.md` |
| `CONTINUATION_CONTRACT.md` | HISTORICAL | No | 2026-09-05 handoff/phase history; its production-state statements are stale |
| `AUTONOMOUS_CYCLE_PLAN.md` | HISTORICAL | No | Earlier seven-milestone autonomous-cycle model |
| `MILESTONE_PROMPT_SERIES.md` | HISTORICAL/REFERENCE | No | Earlier phase prompts; use only when a current milestone explicitly points to one |
| `CANARY_ROADMAP_V2_*.md` | HISTORICAL/REFERENCE | No | Earlier canary planning; current requirements live in canonical milestone/contract owners |
| `STAGING_PROPOSAL.md` | PROPOSAL/REFERENCE | No | Staging design candidate, not evidence that staging exists |
| `CLAUDE_CODE_MASTER_PROMPT.md` | SUPERSEDED/HISTORICAL | No | Recovery history only; it already declares itself superseded |
| Drive `PLAN_*` docs | PROPOSAL/WORK PACKET | No | Planning input until adopted into a canonical repo owner |

If a historical file says “follow this,” “active milestone,” or “current production state,” treat that language as describing the time the file was written unless `PROJECT_MILESTONES.md` explicitly re-adopts it.

## What to read for a Constrovet task

Default dependency cone:

`SYSTEM_INDEX.md -> REPO_MAP.md -> relevant PROJECT_MILESTONES.md state -> relevant CONTRACTS/AGENTS rule -> target source/tests/artifact`

Only then expand to `AGENT_EXPERIENCE.md`, `SESSION_LOG.md`, recovery artifacts, Drive plans, or old roadmaps when the active question requires historical mechanism/rationale.

This ordering is a correctness control and a context-cost control: it prevents a large repository from becoming a large prompt by default.