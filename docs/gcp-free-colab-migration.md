# GCP-Free Constrovet Workspace Apps Script Migration

Last updated: 2026-06-12

## Active Hosting And Execution

- Public website: GitHub Pages at `https://www.constrovet.com`.
- Live dashboard: `https://www.constrovet.com/app/`.
- First-pass execution: browser-side PDF/CSV analysis from the static dashboard.
- Storage: Google Workspace Drive owned by `admin@constrovet.com`.
- Optional deeper execution: Google Workspace Apps Script with approved Gemini
  access stored in Script Properties.
- Durable project memory: AgentMemory.
- GCP status: all visible Google Cloud projects have been moved to
  `DELETE_REQUESTED`; no active workflow depends on GCP.

No active workflow should require Cloud Run, Cloud SQL, GCS buckets, Firestore,
Cloud Armor, paid VMs, paid Colab Pro, paid vector databases, or non-Gemini
model APIs unless explicitly approved later. Workspace Apps Script is allowed
for the current free-tier Deep Analysis and email workflow.

## Drive Folder Standard

Use this structure:

```text
My Drive/Constrovet/projects/<project_id>/input/
My Drive/Constrovet/projects/<project_id>/outputs/
```

The public `/app/` dashboard lets users choose authorized PDFs and CSVs from
their local machine and run a deterministic browser-side analysis. **Analyse**
does not upload files. **Deep Analysis** and **Email me the report** submit an
explicit user request to the Workspace Apps Script processor, which stores
authorized files and outputs in Drive.

The legacy Colab notebooks remain reference material only. The active public
user flow must not require users to open or view notebook code.

Workspace Apps Script processor:

```text
apps-script/Code.gs
```

## Rollback References

Local rollback refs were created before this migration:

- `constrovet-website`: branch and tag `pre-gcp-free-migration-20260612`.
- `app4constrovet`: branch and tag `pre-gcp-free-migration-20260612`.

The legacy Cloud Run, app-domain, storage-bucket, and backend SaaS docs are
retained as rollback/reference material only. Do not use them as the active
deployment path.

## GCP Deletion Status

The GCP cleanup completed on 2026-06-12:

- `gcloud projects list --filter="lifecycleState:ACTIVE"` returned no active
  projects after cleanup.
- `https://www.constrovet.com`, `/demo`, and `/app/` passed HTTP checks from
  GitHub Pages after cleanup.
- Public entry pages did not link to `app.constrovet.com` or raw Cloud Run URLs.
- Google Workspace Drive folders remained visible after cleanup.
- AgentMemory records the deletion audit and rollback gotchas.

## Rejected For Now

Do not implement the service-account backend upload plan as the active workflow.
That plan depends on `DRIVE_SERVICE_ACCOUNT_JSON`, `googleapis`, upload API
routes, trigger endpoints, and hosted backend email automation. It would require
a running backend and operational credentials, which conflicts with the current
zero-GCP model. Workspace Apps Script email/report processing is the approved
free-tier exception.

The current `/app/` page is a static upload-and-analysis dashboard. Analyse does
not upload files or call Gemini. Deep Analysis and report email use Workspace
Apps Script after explicit user action.

## Budget Checklist

For each run, record:

- Runtime is static browser analysis or Workspace Apps Script free-tier quotas.
- Files are read from local browser selection or stored in Google Workspace Drive, not GCS.
- No GCP credentials or service account are required.
- Gemini usage is limited to evidence-backed extraction, verification, and
  report generation.
- Gemini verifier input is limited to dashboard findings, citations,
  calculations, action plans, honesty check, and audit metadata.
- Run date, project ID, input file count, and output folder path.
