# GCP-Free Constrovet Colab Migration

Last updated: 2026-06-12

## Active Hosting And Execution

- Public website: GitHub Pages at `https://www.constrovet.com`.
- Live dashboard: `https://www.constrovet.com/app/`.
- First-pass execution: browser-side PDF/CSV analysis from the static dashboard.
- Storage: Google Workspace Drive owned by `admin@constrovet.com`.
- Optional deeper execution: Google Colab free runtime with approved Gemini
  access.
- Durable project memory: AgentMemory.
- GCP status: all visible Google Cloud projects have been moved to
  `DELETE_REQUESTED`; no active workflow depends on GCP.

No active workflow should require Cloud Run, Cloud SQL, GCS buckets, Firestore,
Cloud Armor, paid VMs, paid Colab Pro, paid vector databases, or non-Gemini
model APIs unless explicitly approved later.

## Drive Folder Standard

Use this structure:

```text
My Drive/Constrovet/projects/<project_id>/input/
My Drive/Constrovet/projects/<project_id>/outputs/
```

The public `/app/` dashboard lets users choose authorized PDFs and CSVs from
their local machine and run a deterministic browser-side analysis. Files are not
uploaded to a server. Save downloaded JSON and Markdown outputs in `outputs/`
when durable records are needed.

For optional Colab runs, put authorized project PDFs and CSVs in `input/`. The
Colab notebook writes strict JSON, Markdown reports, and audit trail files to
`outputs/`.

For high-ROI executive review, run the static browser dashboard first and save
the downloaded `executive_synthesis.json` into `outputs/`. Then open the
optional verifier notebook, which sends only cited findings, quoted spans,
calculations, action plans, honesty check, and audit metadata to Gemini.

Notebook URL template:

```text
https://colab.research.google.com/github/tcbhagat/ConstroVet4mobile/blob/main/colab/constrovet_colab_demo.ipynb?project_id=<project_id>
```

Verifier-only notebook URL:

```text
https://colab.research.google.com/github/tcbhagat/ConstroVet4mobile/blob/main/colab/constrovet_gemini_verifier.ipynb
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
- Google Workspace Drive and Colab folders remained visible after cleanup.
- AgentMemory records the deletion audit and rollback gotchas.

## Rejected For Now

Do not implement the service-account backend upload plan as the active workflow.
That plan depends on `DRIVE_SERVICE_ACCOUNT_JSON`, `googleapis`, upload API
routes, trigger endpoints, and backend email automation. It would require a
running backend and operational credentials, which conflicts with the current
zero-GCP model.

The current `/app/` page is a static upload-and-analysis dashboard. It does not
upload files to Drive or call Gemini from the browser. Users store source files
and downloaded outputs in Workspace Drive manually.

## Budget Checklist

For each run, record:

- Runtime is static browser analysis or Google Colab free.
- Files are read from local browser selection or Google Workspace Drive, not GCS.
- No GCP credentials or service account are required.
- Gemini usage is limited to evidence-backed extraction, verification, and
  report generation.
- Gemini verifier input is limited to dashboard JSON findings and citations, not
  raw project documents.
- Run date, project ID, input file count, and output folder path.
