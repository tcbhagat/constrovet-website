# Constrovet Workspace Apps Script Processor

This script is the free-tier Workspace processor for `https://www.constrovet.com/app/`.
It receives explicit user requests for Deep Analysis or report email, stores files
and outputs in Drive, calls Gemini only when explicitly enabled, and sends the
report with `MailApp`.

It also includes a separate zero-cost Virtual Boardroom Google Form intake
automation. The form trigger copies accepted upload files from the Forms response
folder into a controlled project folder, runs deterministic evidence extraction
where possible, writes report artifacts, sends email, and appends an audit row.

## Deploy

1. Open `script.google.com` as `admin@constrovet.com`.
2. Create a new Apps Script project named `Constrovet Workspace Processor`.
3. Paste `Code.gs` into the project.
4. In **Project Settings > Script properties**, add:
   - `GEMINI_API_KEY`: optional approved Gemini API key. Keep unset unless API
     free-tier use has been explicitly approved.
   - `GEMINI_MODEL`: optional. Deep Analysis defaults to `gemini-2.5-pro`;
     relevance classification defaults to `gemini-2.5-flash` when enabled.
   - `GEMINI_RELEVANCE_MODEL`: optional, default `gemini-2.5-flash`. This is
     used only by the bounded relevance classifier.
   - `ENABLE_GEMINI_RELEVANCE_GATE`: optional, default `false`. Set to `true`
     only after confirming free-tier API quota.
   - `GEMINI_DAILY_CALL_LIMIT`: optional, default `10`, for relevance
     classification calls.
   - `GEMINI_MAX_FILE_BYTES_FOR_CLASSIFIER`: optional, default `2097152`.
   - `BOARDROOM_FORM_ID`: Google Form ID for the Virtual Boardroom intake form.
   - `BOARDROOM_CORRECTION_FORM_ID`: optional Google Form ID for corrected
     evidence submissions. The form must capture the original Constrovet job ID
     and upload files.
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

- Requires a valid user email before sending the executive report. The script
  first uses the Google Form respondent email; if that is unavailable, it looks
  for a form question titled like `Email`, `User Email`, `E-mail`, or `Mail`.
  If neither source contains a valid address, report files are still created but
  email status is recorded as `EMAIL_NOT_SENT_MISSING_USER_EMAIL`.
- Creates `My Drive/Constrovet/projects/form-<timestamp>-<shortid>/input/`,
  `/outputs/`, `/missing_evidence/`, `/corrections/`, `/memory/`, and
  `/archive/`.
- Writes job state files using the formal loop states:
  `INTAKE_RECEIVED`, `EXTRACTION_COMPLETE`, `VERIFICATION_COMPLETE`,
  `ACTION_REPORT_SENT`, `MISSING_EVIDENCE_OPEN`, `CORRECTION_RECEIVED`,
  `RERUN_COMPLETE`, and `ARCHIVED`.
- Copies accepted PDF/CSV/image uploads into the project input folder. Images
  are classification inputs only and cannot create quantified findings without
  extracted cited evidence.
- When `BOARDROOM_RESPONSE_FOLDER_ID` is set, rejects files outside that direct
  response folder.
- Quarantines private-looking filenames such as medical, certificate, personal,
  bank, plot, land, passport, Aadhaar, or PAN documents.
- Reads CSV files directly.
- Attempts PDF OCR only when the Apps Script project has the Advanced Drive
  service enabled. Without it, PDFs are copied and listed as
  `TEXT_EXTRACTION_UNAVAILABLE` missing evidence.
- Writes `browser-report.json`, `final-report.json`, and
  `executive-report.md`, then emails a self-contained HTML/text report to the
  submitter email. User emails do not include Markdown attachments or visible
  private Apps Script report links.
  Automatic form-triggered emails always use the report from the current upload
  session folder. They do not look up or email the latest unrelated folder.
- Writes `<job_id>-optional-gemini-review-pack.md` into the same `outputs/`
  folder. This is a no-budget, manual Gemini Pro web review pack containing the
  optimized prompt and evidence-only payload. It is not sent to Gemini
  automatically and does not replace the deterministic report emailed to the
  user.
- Writes `<job_id>-deep-review.json` into the same `outputs/` folder. This is
  a deterministic manual Deep Review Lab artifact derived only from
  `final-report.json`, cited findings, verifier output, honesty checks,
  actionability labels, and audit metadata. It does not use Colab, Ollama,
  DuckDuckGo/web search, Oracle/FastAPI deployment, or raw source documents.
- Runs a deterministic Workspace verifier before executive actions are used.
  The verifier checks required citations, allowed financial categories,
  `Actual - Budget` math, baseline/leakage separation, ESG separation, and
  removes unsupported findings from the action plan.
- Writes a structured missing-evidence queue to `/missing_evidence/` as JSON
  and CSV. Queue items include job ID, required evidence type, status, owner
  email when available, created date, resolved date, and the missing item.
- Writes durable job memory to `/memory/` with correction history, verifier
  results, recurring extraction issues, and open missing-evidence items.
- Records email delivery metadata in both `final-report.json` and the audit
  sheet, including `email_source_mode`, source job/folder/report URLs,
  submitter email source, recipient, optional CC, subject, `EMAIL_SENT`,
  `EMAIL_FAILED`, or `EMAIL_NOT_SENT_MISSING_USER_EMAIL`, and the exact MailApp
  error when sending fails.
- Separates successful cited reports from evidence intake failures:
  - `EXECUTIVE_ACTION_PLAN`: cited findings exist and the email includes board
    decisions, KPI tiles, evidence quality, recoverability, citations, and
    7/30/90 actions.
  - `EVIDENCE_INTAKE_EXCEPTION`: no cited findings exist and the email avoids
    recovery claims, shows received/accepted/rejected file counts, per-document
    extraction outcomes, required upload fields, and intake remediation steps.
  - `IRRELEVANT_DATA_FILE`: uploaded content is unrelated to construction
    project progress evidence; no analysis or 7/30/90 action plan is generated.
  - `UNSUPPORTED_FILE_TYPE`: file type cannot be processed; no analysis or
    7/30/90 action plan is generated.
  - `CONSTRUCTION_CONTEXT_ONLY`: construction context exists, but no quantified
    project progress/cost/schedule/ESG evidence was extracted; no executive
    recovery action plan is generated.

## Email Delivery Debugging

If a report folder and output files exist but the recipient cannot find the
email, check the audit spreadsheet first. New rows include:

```text
email_source_mode | source_job_id | source_job_folder_url | source_final_report_url | submitter_email_source | email_to | email_cc | email_subject | email_status | email_error | report_quality_status | input_classification_status | input_relevance_reason | gemini_relevance_status | gemini_calls_used_today | analysis_generated
```

For normal Google Form submissions, `email_source_mode` must be
`CURRENT_UPLOAD_SESSION`. Manual resends for a specific job use
`MANUAL_EXACT_JOB_RESEND`.

`submitter_email_source` is `FORM_RESPONDENT_EMAIL`, `FORM_EMAIL_FIELD`,
`MANUAL_RESEND`, or `MISSING`. If it is `MISSING`, enable **Collect email
addresses** in the Google Form settings or add a required short-answer field
named `Email`.

The audit row also includes:

```text
report_quality_status | input_classification_status | input_relevance_reason | gemini_relevance_status | gemini_calls_used_today | analysis_generated | result_url_health
```

`ENABLE_GEMINI_RELEVANCE_GATE` is optional and off by default. When enabled, it
uses the Gemini API only for bounded image relevance classification, with
`GEMINI_DAILY_CALL_LIMIT` and `GEMINI_MAX_FILE_BYTES_FOR_CLASSIFIER` as hard
guards. If quota/API/parsing fails, the deterministic classifier is used and the
audit row records `FAILED`, `QUOTA_SKIPPED`, or `NOT_RUN`.

## Optional Gemini Pro Web Review

The automatic pipeline does not need Gemini API or extra budget. For manual
admin QA, open the current upload session's `outputs/` folder and use:

```text
<job_id>-optional-gemini-review-pack.md
```

Upload or paste that Markdown file into Gemini Pro web. It contains:

- The strict Constrovet verifier prompt.
- Job and source folder metadata.
- Cited findings, quoted spans, calculations, action plan, document outcomes,
  and honesty check.
- A guardrail stating that raw documents are not included.

Use Gemini's output only as an admin review aid unless it is manually copied
back into the Apps Script report flow. If the review pack has no cited findings,
Gemini should return the matching no-claim status: `EVIDENCE_INTAKE_EXCEPTION`,
`IRRELEVANT_DATA_FILE`, `UNSUPPORTED_FILE_TYPE`, or
`CONSTRUCTION_CONTEXT_ONLY`, not a recovery action plan.

`result_url_health` should be `SCRIPT_URL_PRESENT`. If it is
`MISSING_RESULT_BASE_URL` or `INVALID_RESULT_BASE_URL`, set
`BOARDROOM_RESULT_BASE_URL` to the Apps Script `/exec` web app URL, not a Google
Drive file or folder URL.

Use Gmail search with the exact job ID, for example:

```text
in:anywhere "form-20260615-053115-0ce84462"
```

If the audit row says `EMAIL_SENT`, Apps Script accepted the `MailApp` send and
the next checks are Spam, All Mail, Promotions, and any Workspace/domain mail
filtering. If the audit row says `EMAIL_FAILED`, the `email_error` column is the
source of truth for the failure.

For an audit-first diagnosis, set:

```text
BOARDROOM_RESEND_JOB_ID=form-20260702-093301-c696d401
```

Then run:

```text
diagnoseConfiguredBoardroomEmailDelivery
```

The helper reads the latest audit row for the job and returns `email_to`,
`email_subject`, `email_status`, `email_error`, the exact Gmail search query,
and the next action. You can also call
`diagnoseBoardroomEmailDelivery("form-20260702-093301-c696d401")` directly.

If the endpoint, resend job, or resend recipient may be misconfigured, run this
no-argument setup helper from the Apps Script editor instead:

```text
configureConstrovetBoardroomRuntimeSettings
```

It sets `BOARDROOM_RESULT_BASE_URL` to the current `boardroom` web app URL, sets
`BOARDROOM_RESEND_JOB_ID=form-20260702-093301-c696d401`, keeps
`BOARDROOM_RESEND_EMAIL=bhagat.taran@gmail.com`, and immediately returns the
audit-first diagnosis.

To isolate mailbox filtering, set:

```text
BOARDROOM_RESEND_EMAIL=bhagat.taran@gmail.com
```

Then run:

```text
sendBoardroomEmailSmokeTest
```

This sends a minimal plain-text email and appends an `EMAIL_SMOKE_TEST` audit
row. If this arrives but the report email does not, filtering is likely related
to HTML content or sender/domain rules.

For a two-step delivery check, also set:

```text
BOARDROOM_RESEND_JOB_ID=form-<timestamp>-<shortid>
```

Then run:

```text
resendConfiguredBoardroomReportSmallThenFull
```

This sends a small plain-text check first, then sends the HTML/text report email
using the same exact job folder. The report email does not attach the Markdown
file or display the private Apps Script report link; those artifacts remain in
the Drive output folder and audit metadata.

## Correction Rerun Loop

To let users submit missing or corrected evidence for an existing job:

1. Create a separate Google Form with:
   - a required short-answer field for the original Constrovet job ID
   - a file-upload field for corrected evidence
   - collected respondent email or a required email field
2. Set `BOARDROOM_CORRECTION_FORM_ID` in Script Properties.
3. Run `installBoardroomCorrectionFormTrigger()` once from the Apps Script
   editor and approve permissions.

When corrected evidence arrives, the script:

- validates the original job ID,
- copies correction files into the job `/corrections/` folder,
- archives the current canonical outputs into `/archive/outputs-<timestamp>/`,
- reruns extraction and deterministic verification against original input plus
  correction files,
- increments `correction_count` and `rerun_count`,
- writes timestamped rerun outputs plus refreshed canonical report files, and
- emails the submitter when an email is available.

Canonical result links continue to load `<job_id>-final-report.json`; archived
and timestamped rerun files preserve the evidence trail.

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

The resend helper loads the existing `final-report.json`, rebuilds the same
self-contained HTML/text email without attachments or visible private links,
updates `email_delivery` in the final report, and appends a `MANUAL_RESEND`
audit row.

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
My Drive/Constrovet/projects/<job_id>/missing_evidence/
My Drive/Constrovet/projects/<job_id>/corrections/
My Drive/Constrovet/projects/<job_id>/memory/
My Drive/Constrovet/projects/<job_id>/archive/
```

The audit spreadsheet is created automatically and its ID is stored as
`AUDIT_SPREADSHEET_ID` in Script Properties.
