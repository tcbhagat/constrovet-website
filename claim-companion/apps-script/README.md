# Claim Companion Workspace processor

This is an isolated Google Apps Script backend for Claim Companion. It uses the Workspace account that deploys it for restricted Drive storage, Google Docs PDF generation, Sheets audit records and MailApp delivery.

It deliberately does not call Gemini API or any unpaid AI service with patient data.

## One-time setup

1. Create a standalone Apps Script project while signed in as `admin@constrovet.com`.
2. Copy `Code.gs` and `appsscript.json`, or deploy with clasp after configuring `.clasp.json`.
3. Run `setupClaimCompanion()` once and authorize the requested Workspace scopes.
4. Deploy as a Web app: execute as `admin@constrovet.com`; access: anyone.
5. Put the `/exec` URL in `claim-companion/config.js` as `apiUrl`.
6. Submit a synthetic end-to-end test before accepting public users.

## Operational controls

- Two completed reports per verified email per day.
- Five registration emails per address per day.
- Exactly three files, 8 MB each, 20 MB combined.
- Patient gets the PDF immediately after verified submission.
- Hospital gets only a verification message first; the PDF follows only after verification.
- Source files and PDFs are scheduled for deletion 30 days after delivery.
- Minimal audit rows are retained for up to 12 months and should be purged under the approved retention policy.

Do not reuse the construction-analysis Apps Script deployment. Keep this processor and its Drive folder isolated.
