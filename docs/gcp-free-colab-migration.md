# GCP-Free Constrovet Colab Migration

Last updated: 2026-06-12

## Active Hosting And Execution

- Public website: GitHub Pages at `https://www.constrovet.com`.
- Live dashboard launcher: `https://www.constrovet.com/app/`.
- Storage: Google Workspace Drive owned by `admin@constrovet.com`.
- Execution: Google Colab free runtime with approved Gemini access.
- Durable project memory: AgentMemory.

No active workflow should require Cloud Run, Cloud SQL, GCS buckets, Firestore,
Cloud Armor, paid VMs, paid Colab Pro, paid vector databases, or non-Gemini
model APIs unless explicitly approved later.

## Drive Folder Standard

Use this structure:

```text
My Drive/Constrovet/projects/<project_id>/input/
My Drive/Constrovet/projects/<project_id>/outputs/
```

Put authorized project PDFs and CSVs in `input/`. The Colab notebook writes
strict JSON, Markdown reports, and audit trail files to `outputs/`.

## Rollback References

Local rollback refs were created before this migration:

- `constrovet-website`: branch and tag `pre-gcp-free-migration-20260612`.
- `app4constrovet`: branch and tag `pre-gcp-free-migration-20260612`.

The legacy Cloud Run and app-domain docs are retained as rollback/reference
material only. Do not use them as the active deployment path.

## GCP Deletion Gate

Do not delete any GCP project until all of these are true:

- Required Cloud SQL/GCS/export data has been captured or explicitly waived.
- Project/resource manifests have been captured if the account is accessible.
- `https://www.constrovet.com`, `/demo`, `/app/`, `/llms.txt`, `/sitemap.xml`,
  and `/robots.txt` pass HTTP checks from GitHub Pages.
- Public pages do not link to `app.constrovet.com` or raw Cloud Run URLs.
- At least one Drive-backed Colab run has produced valid strict JSON and
  Markdown outputs.
- AgentMemory has the migration decision and rollback gotchas saved.

## Budget Checklist

For each run, record:

- Runtime is Google Colab free.
- Files are read from Google Workspace Drive, not GCS.
- No GCP credentials or service account are required.
- Gemini usage is limited to evidence-backed extraction, verification, and
  report generation.
- Run date, project ID, input file count, and output folder path.
