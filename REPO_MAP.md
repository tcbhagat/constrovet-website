---
name: repo-map
description: What actually lives in this repository. Three separate products share one repo, which has repeatedly caused confusion about which CI workflow, which Apps Script backend, and which deploy path applies to a given change. Read this before assuming a file belongs to Constrovet.
---

# Repo map — three products, one repository

This repo contains **three distinct products**, not one. A change to any of them
touches different CI, a different backend, and a different deploy path. The
overlap in naming has caused real confusion more than once.

## 1. Constrovet — the construction evidence product

The primary product.

| | |
|---|---|
| Marketing site | repo root (`index.html`, `demo.html`, `blog/`, `pages/`, `boardroom/`) |
| App UI | `app/index.html` — single-file browser dashboard |
| Backend | `apps-script/` — one ~6.2k-line `Code.gs` plus ~40 `EEV2*.gs` modules and regression suites |
| Hosting | GitHub Pages, custom domain via `CNAME` (`www.constrovet.com`). **Deploy = push to `main`.** |
| Backend deploy | **Manual, founder-only `clasp push` from Termux.** Nothing in CI deploys it. |
| CI | `.github/workflows/eev2-harness-ci.yml` (path-filtered to `apps-script/**` + harness scripts) |
| Governance | `PROJECT_MILESTONES.md` (single source of truth), `CONTRACTS.md`, `AGENTS.md`, `multi-tool-workflow.md` |

**Web app posture:** `appsscript.json` declares `access: ANYONE_ANONYMOUS` +
`executeAs: USER_DEPLOYING` — anonymous callers execute with the deploying
account's Drive + Gmail authority. EEV2-014's global daily caps are the
mitigation. See M13 in `PROJECT_MILESTONES.md`.

## 2. Claim Companion — a separate product

Materially more "productized" than Constrovet (privacy policy, terms,
data-deletion page, Play Store release pipeline), and **entirely independent** of
it.

| | |
|---|---|
| Frontend | `claim-companion/` — full PWA (`manifest.webmanifest`, `service-worker.js`, `api.js`, `app.js`, `calculator.js`, `extractor.js`, `config.js`) |
| Backend | `claim-companion/apps-script/Code.gs` — **its own Apps Script project**, unrelated to Constrovet's |
| Android | `android/claim-companion/` — Gradle project targeting a Play Store release |
| CI | **three** of the repo's five workflows: `claim-companion-ci.yml`, `claim-companion-apps-script.yml`, `claim-companion-android-release.yml` |
| Deploy | `claim-companion-apps-script.yml` is the **only real automated deploy in the repo** — `workflow_dispatch` only, environment-gated, uses the `CLASPRC_JSON` secret |

`verify-production-deploy.sh` asserts the two products are not cross-linked
publicly.

## 3. ssm-core-demo — retired

Marked `retired: true` in its own config with an empty `apiBaseUrl`. Dead code,
still served by Pages. Deleting it is a pending founder decision (see
`PROJECT_MILESTONES.md`), not a blocker.

## Things that look like they matter but don't

- **`Dockerfile`, `nginx.conf`** — legacy Cloud Run rollback references. GCP is
  fully retired (`DELETE_REQUESTED`). `README.md` says explicitly: do not
  re-enable GCP hosting.
- **`recovery-v11/Code.v12-current-HEAD.js`** — a stale ~4,000-line historical
  copy of the Constrovet processor. It will match greps for real function names
  and mislead you. Always confirm against `apps-script/Code.gs`.
- **`daily-issue-fix-pr.yml`** — a daily cron that requires `ANTHROPIC_API_KEY`,
  which is not set as a repo secret. It fails loudly rather than silently
  no-opping.
- **Duplicated SEO landing pages** — four exist at both the repo root and under
  `pages/`. Worth reconciling before launch; not yet done.

## Docs that predate the current source of truth

`PROJECT_MILESTONES.md` (2026-09-08) is the declared single source of truth.
`ROADMAP.md`, `MILESTONE_PROMPT_SERIES.md`, `CONTINUATION_CONTRACT.md`,
`BRAIN_ROADMAP.md`, `AUTONOMOUS_CYCLE_PLAN.md`, `CANARY_ROADMAP_V2_*.md`,
`STAGING_PROPOSAL.md` and several others predate it and are likely stale in
places. Treat them as history unless corroborated.
