# Constrovet Workspace Apps Script Processor

This script is the free-tier Workspace processor for `https://www.constrovet.com/app/`.
It receives explicit user requests for Deep Analysis or report email, stores files
and outputs in Drive, calls Gemini only for Deep Analysis, and sends the report
with `MailApp`.

## Deploy

1. Open `script.google.com` as `admin@constrovet.com`.
2. Create a new Apps Script project named `Constrovet Workspace Processor`.
3. Paste `Code.gs` into the project.
4. In **Project Settings > Script properties**, add:
   - `GEMINI_API_KEY`: your approved Gemini API key.
   - `GEMINI_MODEL`: optional, default `gemini-2.5-pro`.
5. Deploy as **Web app**:
   - Execute as: `Me`.
   - Who has access: `Anyone`.
6. Copy the `/exec` web app URL into
   `assets/js/constrovet-app-config.js` as `appsScriptEndpoint`.

## Budget Guardrails

- No GCP project, Cloud Run, Cloud SQL, GCS, Firestore, or service account.
- Uses Workspace Drive, Apps Script, MailApp, UrlFetchApp, and approved Gemini.
- Treat as controlled pilot volume because Apps Script and MailApp quotas apply.
- Deep Analysis accepts up to 10 PDF/CSV files, 10 MB each.
- Per-email daily request limit defaults to 5.

## Data Layout

```text
My Drive/Constrovet/projects/<job_id>/input/
My Drive/Constrovet/projects/<job_id>/outputs/
```

The audit spreadsheet is created automatically and its ID is stored as
`AUDIT_SPREADSHEET_ID` in Script Properties.
