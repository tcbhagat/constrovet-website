# Constrovet Operations and Maintenance Manual

Last updated: 2026-07-08

This manual covers the public Constrovet website and its zero-budget operating model. It is safe for the public repository: do not add credentials, private Drive links, raw client data, local machine paths, or personal operational email addresses.

## Operating Principles

- Keep `www.constrovet.com` as a static GitHub Pages site unless a release approver explicitly approves a different hosting path.
- Use browser-side analysis and Google Workspace automation before considering paid infrastructure.
- Keep deterministic, cited extraction as the source of truth. AI may summarize, critique, or draft executive actions only from cited findings.
- Do not publish client documents, private reports, raw OCR output, internal local paths, tunnel URLs, credentials, or evidence packs in this repository.
- Treat zero-budget as a control: no paid database, paid monitoring, Cloud Run revival, public tunnel, or hosted agent runtime without explicit approval.

## System Overview

| Area | Current role | Operating note |
| --- | --- | --- |
| `https://www.constrovet.com/` | Public website and trust surface | Static GitHub Pages deployment from `main`. |
| `/app/` | Browser Analyse launcher | Runs first-pass review in the browser. Do not require uploads for this path. |
| `/boardroom/` | Boardroom intake | Routes qualified analysis requests into the Workspace automation path. |
| `/ssm-core-demo/` | SSM beta/demo surface | Public shell and synthetic demo flow only; private services stay local or approval-gated. |
| `/sitemap.xml` | Search discovery | Must list only intended public routes. |
| `/robots.txt` | Crawler policy | Must not reveal private systems or internal paths. |
| `/llms.txt` | AI crawler context | Must describe public-safe capabilities only. |
| Workspace Apps Script | Optional async processing | Receives approved requests, writes Workspace outputs, and sends mail through Workspace quotas. |
| Workspace Drive | Evidence output storage | Store private outputs outside the repository. |
| MailApp/Gmail | Report delivery | Use role-based ownership and Workspace quotas. |

## Service Status

| Status | Service | Rule |
| --- | --- | --- |
| Active | GitHub Pages static website | Main public production path. |
| Active | Browser-side Analyse | Keep public-safe and explain limitations clearly. |
| Active | Boardroom intake | Validate form availability and evidence discipline. |
| Active | Workspace Apps Script, Drive, and MailApp | Use only configured Workspace properties and role-owned storage. |
| Active | Public SEO files | Keep sitemap, robots, and `llms.txt` aligned with live routes. |
| Optional / approval-gated | Gemini or Workspace AI review | Only for approved evidence-bound review; deterministic citations remain authoritative. |
| Optional / approval-gated | SSM private demo sessions | Use synthetic data and approved demo windows only. |
| Optional / approval-gated | Branded app subdomains or public APIs | Do not activate from documentation alone. |
| Retired / disabled | Cloud Run, GCP paid backend, GCS, Cloud SQL, Firestore, paid monitoring | Do not revive without explicit release approval. |
| Retired / disabled | Public tunnels and hosted autonomous agents | Do not use for client sharing or production operations. |

## Roles

| Role | Responsibility |
| --- | --- |
| Site Owner | Owns public content, trust claims, and final go/no-go decisions. |
| Repo Maintainer | Reviews changes, keeps static routes working, and manages rollback. |
| Workspace Admin | Maintains Apps Script, Drive folders, MailApp quotas, and Workspace permissions. |
| Evidence Reviewer | Confirms citations, calculations, categories, and honesty checks before reports are used. |
| Local Systems Operator | Runs private Mission Control, SSM, and local AI tooling outside the public repository. |
| Release Approver | Approves public launches, tunnels, cloud services, paid services, and client sharing. |

## Routine Operations

### Daily Checks

- Confirm the public site responds:

  ```bash
  curl -I -L https://www.constrovet.com/
  curl -I -L https://www.constrovet.com/app/
  curl -I -L https://www.constrovet.com/boardroom/
  curl -I -L https://www.constrovet.com/ssm-core-demo/
  ```

- Open the Browser Analyse path and run a synthetic or public-safe sample only.
- Confirm Boardroom intake is visible and does not expose private links.
- Review any active Apps Script executions and MailApp failures through Workspace tools.
- Check that no public page claims unsupported automation, paid infrastructure, or live client integrations.
- Confirm no budget-risk activity has been introduced: paid cloud services, public tunnels, paid databases, or paid monitoring.

### Weekly Checks

- Verify public discovery files:

  ```bash
  curl -I -L https://www.constrovet.com/sitemap.xml
  curl -I -L https://www.constrovet.com/robots.txt
  curl -I -L https://www.constrovet.com/llms.txt
  ```

- Review the latest GitHub Pages deployment result.
- Run a public route smoke test for `/`, `/app/`, `/boardroom/`, and `/ssm-core-demo/`.
- Run one Boardroom test with synthetic files and confirm the output remains evidence-bound.
- Review Workspace quotas for Apps Script, Drive, and MailApp.
- Scan changed files for accidental secrets, private URLs, local paths, raw evidence, or client data.

### Monthly Checks

- Review public copy for accuracy, unsupported claims, stale CTAs, and retired infrastructure references.
- Test rollback using a small documentation-only change in a non-urgent window.
- Review Workspace permissions and remove stale editor access.
- Confirm SEO metadata and public discovery files reflect the actual route set.
- Revalidate the incident runbooks below with a synthetic failure where practical.

## Deployment Procedure

1. Make changes in the repository.
2. Scan for unsafe public content before committing.
3. Commit to `main` with a clear message.
4. Push to GitHub.
5. Wait for GitHub Pages deployment to finish.
6. Verify the public routes listed in this manual.
7. If the deployment is bad, revert the commit and push the revert.

Use `git revert` for rollback. Do not rewrite public history during an incident unless the release approver explicitly approves it.

## Evidence and AI Rules

- Every executive finding must cite the source file, page or sheet, and quoted span.
- If Budget and Actual are both available, calculate `Actual - Budget`.
- If Actual is greater than Budget, create a separate `LEAKAGE_AND_OVERRUN` finding.
- Standard contract value, cumulative work done, planned spend, BOQ value, and advance recovery are `BASELINE_BUDGET`, not leakage.
- Penalties, wastage, rework, delay cost, idle resources, delayed PO impact, excess consumption, and calculated overruns are `LEAKAGE_AND_OVERRUN`.
- Carbon, waste diversion, energy, water, fuel, diesel, electricity, and emission metrics are `ESG_METRIC`.
- If evidence is missing, record it in `honesty_check`. Do not infer missing amounts, dates, causes, risks, or actions.

## Incident Runbooks

### Public Site Down

1. Check GitHub Pages deployment status.
2. Verify domain and DNS status from the registrar or GitHub Pages settings.
3. Test the root route and a direct asset route.
4. If the latest deploy caused the issue, revert the last public-site commit and push the revert.
5. Record the failed route, time, commit, and recovery action.

### Broken `/app/` Route

1. Confirm the route returns a successful HTTP status.
2. Open browser developer tools and check for missing static assets.
3. Verify app configuration still points only to approved public or Workspace paths.
4. Disable or revert the broken feature if analysis cannot run with a public-safe sample.

### Broken Boardroom Intake

1. Confirm the public route loads.
2. Confirm the form or intake CTA does not expose private operational details.
3. Check Workspace Apps Script deployment status and recent executions.
4. Run a synthetic submission if the intake is expected to be live.
5. If Workspace processing is down, keep the public intake clear about review timing and avoid unsupported automation claims.

### Apps Script Execution Failure

1. Check Apps Script executions and quota errors.
2. Confirm required Script Properties are present without exposing their values.
3. Retry with a synthetic or public-safe input.
4. If the failure involves external AI review, keep deterministic extraction available and mark AI review unavailable.

### Drive or OCR Failure

1. Confirm Workspace Drive folders are available to the role owner.
2. Check storage quota and file permissions.
3. Re-run using a synthetic file.
4. If OCR output is missing, record it as missing evidence. Do not invent extracted content.

### MailApp Delivery Failure

1. Check Apps Script execution logs and MailApp quota.
2. Confirm the recipient path is role-approved.
3. Re-send only after confirming the report contains no private links or unsupported claims.
4. If delivery remains blocked, preserve the generated report in Workspace and notify through the approved manual channel.

### Accidental Public Data Exposure

1. Stop further deployment.
2. Remove the exposed content from the repository and public files.
3. Revoke or rotate any exposed credential through its owning system.
4. Revert or purge generated public artifacts where possible.
5. Review GitHub history exposure and decide whether additional repository remediation is required.
6. Document what was exposed, when it was removed, and what access was rotated.

### Bad Deploy Rollback

1. Identify the last known-good commit.
2. Use `git revert` against the bad commit.
3. Push the revert to `main`.
4. Wait for GitHub Pages deployment.
5. Verify `/`, `/app/`, `/boardroom/`, `/ssm-core-demo/`, `/sitemap.xml`, `/robots.txt`, and `/llms.txt`.

### Budget-Risk Detection

1. If any paid service, public tunnel, paid database, hosted agent, or cloud backend appears in a change, stop the release.
2. Move the item to approval-gated status in documentation.
3. Require release approver sign-off before enabling it.
4. Prefer the static site, Workspace automation, and local Mission Control path.

### SSM Demo Not Ready

1. Confirm the public SSM demo route loads.
2. Keep all demo data synthetic.
3. If private SSM services are offline, mark the demo as public-shell only.
4. Do not expose local service URLs, tunnels, or private test artifacts on the public site.

## Public Safety Scan

Before pushing public documentation or app changes, scan for common unsafe strings:

```bash
rg -n "credential|private link|local path|client data|tunnel|paid backend" .
```

Review matches manually. Generic policy text is acceptable; actual credentials, private links, and raw client data are not.
