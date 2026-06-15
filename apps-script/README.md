# Constrovet Workspace Apps Script Processor

This script is the free-tier Workspace processor for `https://www.constrovet.com/app/`.
It receives explicit user requests for Deep Analysis or report email, stores files
and outputs in Drive, calls Gemini only for Deep Analysis, and sends the report
with `MailApp`.

It also includes a separate zero-cost Virtual Boardroom Google Form intake
automation. The form trigger copies accepted upload files from the Forms response
folder into a controlled project folder, runs deterministic evidence extraction
where possible, writes report artifacts, sends email, and appends an audit row.

## Deploy

1. Open `script.google.com` as `admin@constrovet.com`.
2. Create a new Apps Script project named `Constrovet Workspace Processor`.
3. Paste `Code.gs` into the project.
4. In **Project Settings > Script properties**, add:
   - `GEMINI_API_KEY`: your approved Gemini API key.
   - `GEMINI_MODEL`: optional, default `gemini-2.5-pro`.
   - `BOARDROOM_FORM_ID`: Google Form ID for the Virtual Boardroom intake form.
   - `BOARDROOM_RESPONSE_FOLDER_ID`: optional Drive folder ID for the form file
     responses.
   - `BOARDROOM_NOTIFY_EMAIL`: optional fallback recipient, default
     `admin@constrovet.com`.
   - `BOARDROOM_CC_ADMIN`: optional, default `false`. Set to `true` to CC
     `BOARDROOM_NOTIFY_EMAIL` when a user receives a Boardroom report.
   - `ENABLE_BOARDROOM_DEEP_ANALYSIS`: optional, default `false`.
   - `BOARDROOM_RESULT_BASE_URL`: optional Apps Script `/exec` web app URL.
     If omitted, the script uses the deployed web app URL when available.
5. Deploy as **Web app**:
   - Execute as: `Me`.
   - Who has access: `Anyone`.
6. Copy the `/exec` web app URL into
   `assets/js/constrovet-app-config.js` as `appsScriptEndpoint`.

## PDF OCR Setup

PDF text extraction needs the Apps Script Advanced Google Service **Drive API**.
Use one of these zero-cost setup paths:

- Apps Script editor: open **Services**, add **Drive API**, then save.
- If using the manifest editor, paste `apps-script/appsscript.json` into
  `appsscript.json`. It declares Advanced Drive service v2 as `Drive`.

Without this service, PDF reports still generate and email, but they will state
`TEXT_EXTRACTION_UNAVAILABLE_ADVANCED_DRIVE_SERVICE_DISABLED` and ask the user
to submit CSV evidence or enable Drive API OCR.

## Form Intake Automation

After pasting `Code.gs` and setting `BOARDROOM_FORM_ID`, run
`installBoardroomFormTrigger()` once from the Apps Script editor and approve the
requested Workspace permissions. This creates an installable `onFormSubmit`
trigger for the Google Form.

Do not create this trigger manually from the **Add Trigger** dialog. In a
standalone Apps Script project, the manual dialog may only show time/calendar
sources. The installer function deletes accidental `installBoardroomFormTrigger`
timer triggers and any old `onFormSubmit` trigger, then creates the correct
`onFormSubmit` / `From form` / `On form submit` trigger programmatically.

The trigger:

- Creates `My Drive/Constrovet/projects/form-<timestamp>-<shortid>/input/` and
  `/outputs/`.
- Copies accepted PDF/CSV uploads into the project input folder.
- When `BOARDROOM_RESPONSE_FOLDER_ID` is set, rejects files outside that direct
  response folder.
- Quarantines private-looking filenames such as medical, certificate, personal,
  bank, plot, land, passport, Aadhaar, or PAN documents.
- Reads CSV files directly.
- Attempts PDF OCR only when the Apps Script project has the Advanced Drive
  service enabled. Without it, PDFs are copied and listed as
  `TEXT_EXTRACTION_UNAVAILABLE` missing evidence.
- Writes `browser-report.json`, `final-report.json`, and
  `executive-report.md`, then emails a professional executive action plan,
  Markdown report attachment, and private result link to the submitter email.
- Records email delivery metadata in both `final-report.json` and the audit
  sheet, including recipient, optional CC, subject, `EMAIL_SENT` or
  `EMAIL_FAILED`, and the exact MailApp error when sending fails.

## Email Delivery Debugging

If a report folder and output files exist but the recipient cannot find the
email, check the audit spreadsheet first. New rows include:

```text
email_to | email_cc | email_subject | email_status | email_error
```

Use Gmail search with the exact job ID, for example:

```text
in:anywhere "form-20260615-053115-0ce84462"
```

If the audit row says `EMAIL_SENT`, Apps Script accepted the `MailApp` send and
the next checks are Spam, All Mail, Promotions, and any Workspace/domain mail
filtering. If the audit row says `EMAIL_FAILED`, the `email_error` column is the
source of truth for the failure.

To resend an existing Boardroom report without another form submission, call:

```javascript
resendBoardroomReport("form-20260615-053115-0ce84462", "bhagat.taran@gmail.com")
```

Because the Apps Script editor Run dropdown cannot pass arguments, the
UI-friendly path is to set these temporary Script Properties:

```text
BOARDROOM_RESEND_JOB_ID=form-20260615-053115-0ce84462
BOARDROOM_RESEND_EMAIL=bhagat.taran@gmail.com
```

Then select and run:

```text
resendConfiguredBoardroomReport
```

The resend helper loads the existing `final-report.json`, reuses the saved
Markdown report when present, sends the same private result link, updates
`email_delivery` in the final report, and appends a `MANUAL_RESEND` audit row.

## Private Result Display

The web app `doGet` endpoint keeps the existing health response when opened
without parameters. Tokenized report links use:

```text
https://script.google.com/macros/s/<deployment-id>/exec?job_id=form-<timestamp>-<shortid>&key=<access_key>
```

The form automation creates a per-job `result_access_key`, stores it in the
final report metadata and audit row, and sends the private link by email. The
viewer reads the saved Drive report and renders executive summary, grouped
findings, citations, 7/30/90 actions, honesty check, and generated report links.

Add `&format=json` to the same private URL to return sanitized JSON for testing.
Invalid keys and missing jobs return a clear 403/404 response body. Apps Script
HTML web apps do not reliably expose custom HTTP status codes, so tests should
verify the displayed status text or JSON `status` value.

Do not publish a public report index. Do not share raw Drive upload folders as
the user-facing result location.

## Budget Guardrails

- No GCP project, Cloud Run, Cloud SQL, GCS, Firestore, or service account.
- Uses Workspace Drive, Apps Script, MailApp, UrlFetchApp, and approved Gemini.
- Treat as controlled pilot volume because Apps Script and MailApp quotas apply.
- Deep Analysis accepts up to 3 PDF/CSV files, 10 MB each during the
  controlled pilot.
- Form intake deterministic reports accept up to 10 PDF/CSV files, 10 MB each.
- Per-email daily request limit defaults to 5.

## Data Layout

```text
My Drive/Constrovet/projects/<job_id>/input/
My Drive/Constrovet/projects/<job_id>/outputs/
```

The audit spreadsheet is created automatically and its ID is stored as
`AUDIT_SPREADSHEET_ID` in Script Properties.
