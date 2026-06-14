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
- No public CTA points to Cloud Run, `run.app`, `app.constrovet.com`, GCS, or a
  paid backend.
