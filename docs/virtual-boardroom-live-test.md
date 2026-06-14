# Virtual Boardroom Controlled Pilot Live Test

Use this test only with synthetic files or authorized project files. The bundled
fixtures in `assets/test-data/` are synthetic and safe for repeatable live
checks.

## Synthetic Files

- `boardroom-budget-actual-synthetic.csv`
- `boardroom-progress-synthetic.csv`
- `boardroom-project-note-synthetic.csv`
- `boardroom-incomplete-evidence-synthetic.csv`

## Boardroom Intake Check

1. Open `https://www.constrovet.com/boardroom/` on desktop and mobile.
2. Confirm the shared Constrovet nav, mobile drawer, and footer render.
3. Open `Open Secure Upload Form`.
4. Expect Google sign-in for controlled file upload.
5. Upload the synthetic files only.
6. Confirm the form response or Drive destination receives the files.
7. If `installBoardroomFormTrigger()` has been installed, confirm a new
   `My Drive/Constrovet/projects/form-*` folder is created with `input/` and
   `outputs/`.
8. Confirm `browser-report.json`, `final-report.json`, and
   `executive-report.md` exist in `outputs/`.
9. Confirm the audit spreadsheet has a row for the `form-*` job and report
   email delivery succeeds.
10. Open the emailed private result link and confirm the analysed result page
    renders executive summary, grouped findings, citations, 7/30/90 actions,
    honesty check, and generated report links.
11. Add `&format=json` to the private result link and confirm sanitized JSON is
    returned without exposing raw uploaded document contents.
12. Replace the access key with an invalid value and confirm the response shows
    a 403 error body or JSON `status: 403`.
13. Replace `job_id` with a missing form job and confirm the response shows a
    404 error body or JSON `status: 404`.

Record page load time, form open time, upload submit time, Drive availability,
and report/email delivery time when that delivery path is enabled.

## App Analyse Check

1. Open `https://www.constrovet.com/app/`.
2. Select the same synthetic CSV files.
3. Run `Analyse`.
4. Confirm findings cite source file rows or note missing evidence.
5. Confirm Deep Analysis and email remain disabled while
   `appsScriptEndpoint` is empty.
6. Confirm Analyse does not upload files or call Gemini.

## Pass Criteria

- `/boardroom/` and `/app/` return HTTP 200 and render cleanly on desktop and
  mobile.
- `/boardroom/` copy describes GitHub Pages, browser Analyse, Workspace intake,
  and Apps Script/Gemini only after activation.
- Deep Analysis public limits are consistent: 3 files, 10 MB each during the
  controlled pilot.
- Form-trigger deterministic reports process up to 10 PDF/CSV files, 10 MB each;
  optional Deep Analysis remains limited to 3 files.
- Private result links work only with the emailed access key, and no public
  report index or raw Drive upload folder is exposed as the result surface.
- No public CTA points to Cloud Run, `run.app`, `app.constrovet.com`, GCS, or a
  paid backend.
