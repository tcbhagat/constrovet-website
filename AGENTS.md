# AGENTS.md — Start Here

**If you are an AI agent working in this repository, read this file completely before doing anything else. Then read `system.manifest.json`. That is your full orientation. Everything else is loaded on demand.**

Human contributors: read `README.md` instead. It is shorter and points here when needed.

---

## 1. What this system is

Constrovet is a **static, zero-budget evidence system** for construction cost, delay, ESG and financier-risk review in India.

It has exactly three moving parts:

| Part | What it is | Where it runs |
| --- | --- | --- |
| **Public site** | Marketing, trust, and discovery surface | GitHub Pages, `www.constrovet.com` |
| **Browser Analyse** | First-pass PDF/CSV review, no server, no cost | The visitor's browser, at `/app/` |
| **Workspace processor** | Optional deeper review and report email | Google Apps Script owned by the Workspace admin |

There is no backend. There is no database. There is no paid infrastructure. **This is a design constraint, not an accident.** See Rule H3.

The system's core promise is **evidence-bound output**: every finding cites a source file, a location, and a quoted span. AI may summarise or critique cited findings. AI may never invent a finding. See `docs/CONTRACTS.md`.

---

## 2. Current state

**As of 2026-09-01.**

- Production is live and static on GitHub Pages from `main`.
- The Evidence Harness v1 passes 10/10 deterministic suites locally with zero external calls.
- The EEV2 Apps Script baseline is **locally stable, not production-approved**. Production deployment is blocked pending human review.
- Four products live in this repo. Only **Constrovet construction** is public. Claim Companion, ChallanSe, and SSM Core are **preserved but unlinked** — source retained for rollback, routes marked `noindex,nofollow`, never linked from construction surfaces.
- Known gaps are tracked as data in `system.manifest.json` under `known_gaps`, not in anyone's memory. Read them before proposing work.

---

## 3. The map

Five layers. Each layer talks only to the one below it, through a named artifact. Work at one layer at a time.

```
L0  PURPOSE      AGENTS.md (this file), README.md
                 Why the system exists, what state it is in, what is forbidden.
        │
L1  TRUTH        system.manifest.json
                 The single source of truth for routes, services, statuses,
                 denylists, and known gaps. Nothing else restates these facts.
        │
L2  CONTRACTS    docs/CONTRACTS.md
                 The evidence classification rules and output schema.
                 This is the domain core. Changing it changes the product.
        │
L3  COMPONENTS   index.html, pages/, blog/, app/, boardroom/, assets/,
                 apps-script/, claim-companion/, ssm-core-demo/
                 Implementations. They must conform to L1 and L2.
        │
L4  VERIFICATION scripts/verify.mjs, tests/, .github/workflows/
                 Turns L1 and L2 from prose into enforced facts.
```

**The rule that makes this work:** if a fact appears in more than one layer, the lower layer is wrong. Delete it and reference L1 instead.

---

## 4. The loop

Every task in this repository follows the same five steps. Do not skip step 1 or step 4.

1. **Orient.** Read `system.manifest.json`. Check `known_gaps` for anything already logged about your task.
2. **Locate.** Use the "Where truth lives" table below to find the one file that owns the fact you are changing.
3. **Change.** Edit that one file. If you find yourself editing the same fact in two files, stop — you have found a source-of-truth violation. Fix that first.
4. **Verify.** Run:
   ```bash
   npm run verify   # manifest vs reality: routes, sitemap, canonicals, denylist, safety
   npm test         # deterministic behaviour tests
   npm run check    # Claim Companion static + wording + secret checks
   ```
   All three must pass. `npm run verify` prints a machine-readable JSON summary as its last line.
5. **Record.** Append one entry to `docs/DECISIONS.md` if you made a choice a future agent could reasonably reverse. Update `known_gaps` in the manifest if you found or closed a gap.

Step 5 is what makes the system accretive. A session that fixes a bug and leaves no trace has taught the system nothing.

---

## 5. Hard rules

These are fail-closed. If a change would break one, stop and ask for human approval. Do not reason your way around them.

- **H1 — Evidence.** No finding without a citation. No inferred amounts, dates, causes, risks, or actions. Missing evidence goes in `honesty_check`. Full rules in `docs/CONTRACTS.md`.
- **H2 — Public safety.** Never commit credentials, private Drive links, tunnel URLs, raw client data, raw OCR output, evidence packs, personal email addresses, or **local machine paths**. This repository is public.
- **H3 — Zero budget.** No paid cloud service, database, monitoring, Cloud Run revival, public tunnel, or hosted agent runtime. Adding one is a release-blocking event, not a technical decision.
- **H4 — Product separation.** Claim Companion, ChallanSe, CA Beta, and SSM Core must never appear in construction discovery surfaces (home, nav, footer, contact, sitemap). Enforced by `verify.mjs` and `tests/construction-public-scope.test.mjs`.
- **H5 — Claim honesty.** No testimonials, accuracy percentages, client names, or capital-audited claims without source evidence in hand. Prefer describing verifiable capability over asserting outcomes.
- **H6 — Production gate.** EEV2 Apps Script does not go to production without human approval of the TEST-project harness run plus GOOD/BAD/NORMAL smoke tests.
- **H7 — Rollback.** Roll back with `git revert`. Never rewrite public history during an incident.

---

## 6. Where truth lives

One fact, one home. If you need to know something, this table tells you the only file that is authoritative.

| Fact | Authoritative file | Everything else |
| --- | --- | --- |
| Public routes, files, canonicals, index status | `system.manifest.json` → `routes` | `sitemap.xml` is generated/checked against it |
| Which services are active, gated, or retired | `system.manifest.json` → `services` | Runbooks reference, never restate |
| Forbidden cross-product terms | `system.manifest.json` → `denylist` | Tests and scripts read this list |
| Deploy target, branch, domain | `system.manifest.json` → `deploy` | README links to it |
| Known unfinished work | `system.manifest.json` → `known_gaps` | Not issues, not memory |
| Evidence classification and output schema | `docs/CONTRACTS.md` | Apps Script implements it |
| Why a past choice was made | `docs/DECISIONS.md` | Append-only |
| How to recover from a failure | `OPERATIONS_MAINTENANCE.md` | Runbooks only |
| Navigation links | `assets/nav.html` | Edit once, applies everywhere |
| Footer | `assets/footer.html` | Edit once |
| Colours, type, spacing | `assets/css/style.css` → `:root {}` | Edit once |

---

## 7. Task recipes

The eight jobs that account for nearly all work here.

**Edit page copy.** Find the route in the manifest → edit `route.file` → `npm run verify`.

**Add a public page.** Create the HTML → add a `routes` entry with a unique `topic` → add to `sitemap.xml` → `npm run verify`. A duplicate `topic` will fail the run; that is intentional and prevents keyword cannibalisation.

**Retire a page.** Set `index: false` and `sitemap: false` in the manifest → add `<meta name="robots" content="noindex,nofollow">` to the file → remove the sitemap entry → `npm run verify`. Do not delete source during an incident.

**Change a claim on the site.** Check H5. If evidence is not in hand, rewrite as capability, not outcome.

**Change evidence behaviour.** Edit `docs/CONTRACTS.md` first, then the Apps Script module, then the regression suite. Never the reverse — the contract is the specification.

**Deploy.** Commit to `main`, push, wait for Pages, then run `bash scripts/verify-production-deploy.sh`. If it fails, `git revert` and push.

**Handle an incident.** Go straight to `OPERATIONS_MAINTENANCE.md` runbooks. Then log the incident in `docs/DECISIONS.md`.

**Add a new check.** Every bug you fix should become a check in `scripts/verify.mjs` or `tests/`. A bug with no check will come back.

---

## 8. What will trip you up

Honest warnings, so you do not waste a session discovering these.

- **Two page families exist for the same topics.** Root-level clean URLs (`/construction-cost-leakage-audit`) and `/pages/*.html` versions cover overlapping ground and both self-canonicalise. Do not "just edit one" — check the manifest `topic` field first. Tracked as gap `GAP-001`.
- **`app/index.html` and `boardroom/index.html` are separate surfaces** with different rules. `/app/` must work without an upload. `/boardroom/` routes into the Workspace path.
- **`apps-script/` and `claim-companion/apps-script/` are two different Apps Script projects.** They are not interchangeable. Deployment targeting is configured locally and verified before any `clasp push`.
- **The `docs/` folder contains historical SEO audits and change logs.** They are records, not instructions. Do not treat a past audit as a current task list.
- **CI is path-filtered.** Editing a file outside the workflow `paths:` lists will not run the gates. `npm run verify` locally is not optional.
