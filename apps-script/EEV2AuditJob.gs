// EEV2AuditJob.gs — Contract 1 four-artifact audit, by hand, per real job_id.
//
// CONTRACTS.md Contract 1 requires all four of the following to be true for
// a should-fail submission, "confirmed by hand, not inferred from one green
// test run":
//   1. No client-facing report is EMAILED (their presence on disk is NOT
//      evidence of failure -- Code.gs writes every report artifact BEFORE
//      the validation gate runs; only the absence of a delivered client
//      email is the real signal).
//   2. A [VALIDATION FAILED] alert email is sent to VALIDATION_ALERT_EMAIL.
//   3. A `${jobId}-VALIDATION_FAILED.json` file exists in that job's
//      outputs folder.
//   4. A sheet row is written recording the hold -- on TWO SEPARATE
//      sheets (CONTRACTS.md's "4a" and "4b" split):
//        4a. VALIDATION_LOG_SHEET_ID, tab "validation-errors":
//            action_taken = "REVERTED_NOT_SENT"
//        4b. the audit spreadsheet (getAuditSheet()):
//            email_status = "HELD_VALIDATION_FAILED"
//
// eev2AuditJob(jobId) checks all four against a real job_id and returns one
// JSON result -- it does not create, modify, or delete anything (read-only:
// it does NOT call prepareJobFolders(), which would silently create empty
// folders for a typo'd or nonexistent job_id and mask that as "everything
// missing"). Run it by hand after a real Test A / Test B submission, per
// Contract 3's standing regression habit -- this function does not replace
// that habit, it is the tool that makes "confirmed by hand" fast and
// consistent instead of a fresh ad-hoc Drive/Sheets click-through each time.
//
// Usage from clasp (requires the script to be deployed as an API
// executable -- Deploy > Manage deployments -- separately from any Web App
// deployment; clasp run cannot invoke a function that is only deployed as
// a Web App):
//   clasp run eev2AuditJob -p '["form-20260902-135120-81f4fd27"]'
//
// CORRECTED 2026-09-11: the line below previously said "select eev2AuditJob
// in the function dropdown, Run" -- that does not work, because the editor's
// Run button cannot pass a jobId argument, so it throws
// "eev2AuditJob(jobId) requires a non-empty job_id" every time (confirmed by
// hand, 2026-09-11). To run this from the editor UI, select
// eev2AuditJobDiagnosticRun below instead -- it takes no arguments.

function eev2AuditJob(jobId) {
  const id = String(jobId || "").trim();
  if (!id) {
    throw new Error("eev2AuditJob(jobId) requires a non-empty job_id, e.g. eev2AuditJob(\"form-20260902-135120-81f4fd27\")");
  }

  const result = {
    ticket: "CONTRACT-1-AUDIT",
    job_id: id,
    audited_at: new Date().toISOString(),
    job_folder_found: false,
    job_folder_url: "",
    artifacts: {
      artifact_1_no_client_email_sent: eev2AuditArtifact1_(id),
      artifact_2_validation_failed_alert_sent: eev2AuditArtifact2_(id),
      artifact_3_validation_failed_json_exists: eev2AuditArtifact3_(id),
      artifact_4a_validation_errors_sheet_row: eev2AuditArtifact4a_(id),
      artifact_4b_audit_sheet_row: eev2AuditArtifact4b_(id)
    }
  };

  const jobFolder = eev2FindJobFolderReadOnly_(id);
  result.job_folder_found = Boolean(jobFolder);
  result.job_folder_url = jobFolder ? jobFolder.getUrl() : "";
  // Artifacts 3 needs the real outputs folder, not a freshly-created one --
  // re-run it now that we have (or don't have) the real folder, replacing
  // the "folder not found" placeholder from the first pass above.
  result.artifacts.artifact_3_validation_failed_json_exists = eev2AuditArtifact3_(id, jobFolder);

  const allFour = [
    result.artifacts.artifact_1_no_client_email_sent.held,
    result.artifacts.artifact_2_validation_failed_alert_sent.held,
    result.artifacts.artifact_3_validation_failed_json_exists.held,
    result.artifacts.artifact_4a_validation_errors_sheet_row.held,
    result.artifacts.artifact_4b_audit_sheet_row.held
  ];
  result.all_four_artifacts_confirmed = allFour.every((v) => v === true);
  result.contract_1_verdict = result.all_four_artifacts_confirmed
    ? "GATE_HELD -- all four Contract 1 artifacts confirmed for this job_id."
    : "NOT_CONFIRMED -- at least one Contract 1 artifact is missing or could not be verified for this job_id. See artifacts.*.detail below. This does NOT by itself mean the gate failed to fire -- it may also mean this job_id was a should-pass case (Contract 2), in which case artifact_1 being false (a client report WAS sent) is the correct, expected outcome. Read the per-artifact detail before drawing a conclusion.";

  console.log("CONTRACT-1-AUDIT " + id);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

// TEMPORARY DIAGNOSTIC — delete once M7's clasp run / editor-run blocker is
// resolved. eev2AuditJob(jobId) requires an argument, which the Apps Script
// editor's "Run" button cannot supply. This wrapper exists solely so the
// founder can run the real Contract-1 audit from the editor UI, bypassing
// the still-unresolved `clasp run` Execution API permission error
// ("Unable to run script function. Please make sure you have permission to
// run the script function.", 2026-09-11 -- ruled out so far: OAuth
// consent-screen test users, API-executable deployment access level set to
// "Anyone"). Job ID reused from the 2026-09-09 verification attempt
// (SESSION_LOG.md), whose expected answer is already independently known by
// hand: validation-errors sheet, action_taken=REVERTED_NOT_SENT.
function eev2AuditJobDiagnosticRun() {
  return eev2AuditJob("form-20260905-053908-609f4190");
}

// Read-only: unlike prepareJobFolders(), never creates a folder. Returns
// null if the job folder genuinely does not exist, so a typo'd job_id
// reads as "not found" instead of silently fabricating an empty tree.
function eev2FindJobFolderReadOnly_(jobId) {
  const rootIter = DriveApp.getRootFolder().getFoldersByName(CONSTROVET_ROOT_FOLDER);
  if (!rootIter.hasNext()) return null;
  const root = rootIter.next();
  const projectsIter = root.getFoldersByName(CONSTROVET_PROJECTS_FOLDER);
  if (!projectsIter.hasNext()) return null;
  const projects = projectsIter.next();
  const jobIter = projects.getFoldersByName(jobId);
  if (!jobIter.hasNext()) return null;
  return jobIter.next();
}

function eev2FindOutputsFolderReadOnly_(jobFolder) {
  if (!jobFolder) return null;
  const outputsIter = jobFolder.getFoldersByName("outputs");
  if (!outputsIter.hasNext()) return null;
  return outputsIter.next();
}

// Artifact 1: no client-facing report was EMAILED for this job. There is
// no single authoritative "was the client emailed" flag, so this checks
// two independent sources and requires them to agree:
//   (a) the audit sheet row for this job_id (email_status column) --
//       HELD_VALIDATION_FAILED or absent means not sent; any other
//       non-empty status means it likely WAS sent.
//   (b) GmailApp.search() over the deploying account's own Sent mail for
//       a message referencing this job_id that is NOT the internal
//       [VALIDATION FAILED] alert itself.
// held=true means "confirmed no client email was sent". If either source
// suggests a send happened, held=false with the reason in detail.
function eev2AuditArtifact1_(jobId) {
  const detail = { audit_sheet_email_status: null, gmail_sent_matches: [] };
  try {
    const auditRow = eev2FindLatestAuditRowForJob_(jobId);
    detail.audit_sheet_email_status = auditRow ? (auditRow.email_status || "") : null;
    if (auditRow && auditRow.email_status && auditRow.email_status !== "HELD_VALIDATION_FAILED") {
      return { held: false, detail: `audit sheet row for ${jobId} has email_status="${auditRow.email_status}" (not HELD_VALIDATION_FAILED and not empty) -- a client email may have been sent.`, evidence: detail };
    }
  } catch (err) {
    detail.audit_sheet_error = String(err && err.message ? err.message : err);
  }

  try {
    const threads = GmailApp.search(`in:sent "${jobId}" -subject:"[VALIDATION FAILED]"`, 0, 10);
    detail.gmail_sent_matches = threads.map((t) => ({ subject: t.getFirstMessageSubject(), last_message_date: t.getLastMessageDate().toISOString() }));
    if (threads.length > 0) {
      return { held: false, detail: `found ${threads.length} Sent-mail thread(s) referencing ${jobId} that are not the internal validation-failed alert -- a client email may have been sent.`, evidence: detail };
    }
  } catch (err) {
    detail.gmail_search_error = String(err && err.message ? err.message : err);
  }

  return { held: true, detail: "no non-alert Sent-mail thread and no non-held audit-sheet email_status found for this job_id.", evidence: detail };
}

// Artifact 2: a [VALIDATION FAILED] alert was sent to VALIDATION_ALERT_EMAIL
// for this job_id. Checked via GmailApp.search over the deploying
// account's own Sent mail -- this only works because heldForValidation-
// FailureDelivery_ and doPost's inline validation-failure branch both send
// via MailApp/GmailApp AS the deploying account, so the alert lands in that
// same account's Sent folder.
function eev2AuditArtifact2_(jobId) {
  const detail = {};
  try {
    const threads = GmailApp.search(`in:sent to:${VALIDATION_ALERT_EMAIL} subject:"VALIDATION FAILED" "${jobId}"`, 0, 5);
    detail.gmail_sent_matches = threads.map((t) => ({ subject: t.getFirstMessageSubject(), last_message_date: t.getLastMessageDate().toISOString() }));
    return threads.length > 0
      ? { held: true, detail: `found ${threads.length} [VALIDATION FAILED] alert thread(s) to ${VALIDATION_ALERT_EMAIL} referencing ${jobId}.`, evidence: detail }
      : { held: false, detail: `no [VALIDATION FAILED] alert thread to ${VALIDATION_ALERT_EMAIL} referencing ${jobId} found in Sent mail.`, evidence: detail };
  } catch (err) {
    detail.gmail_search_error = String(err && err.message ? err.message : err);
    return { held: false, detail: `GmailApp.search failed: ${detail.gmail_search_error}`, evidence: detail };
  }
}

// Artifact 3: `${jobId}-VALIDATION_FAILED.json` exists in the job's real
// outputs folder. Pass jobFolder in on the second call from eev2AuditJob
// (found via the read-only lookup); without it, only reports "folder not
// found" rather than creating one.
function eev2AuditArtifact3_(jobId, jobFolder) {
  const fileName = `${jobId}-VALIDATION_FAILED.json`;
  if (jobFolder === undefined) {
    return { held: false, detail: "not yet checked -- awaiting job folder lookup.", evidence: {} };
  }
  const outputs = eev2FindOutputsFolderReadOnly_(jobFolder);
  if (!outputs) {
    return { held: false, detail: `job folder or its outputs subfolder was not found for ${jobId} -- cannot confirm ${fileName}.`, evidence: {} };
  }
  const files = outputs.getFilesByName(fileName);
  if (files.hasNext()) {
    const file = files.next();
    return { held: true, detail: `${fileName} found in outputs folder.`, evidence: { file_url: file.getUrl(), last_updated: file.getLastUpdated().toISOString() } };
  }
  return { held: false, detail: `${fileName} not found in outputs folder.`, evidence: { outputs_folder_url: outputs.getUrl() } };
}

// Artifact 4a: VALIDATION_LOG_SHEET_ID / "validation-errors" tab has a row
// for this job_id with action_taken = "REVERTED_NOT_SENT". Checks the most
// recent matching row (a job resubmitted after a correction could have
// more than one).
function eev2AuditArtifact4a_(jobId) {
  try {
    const sheet = SpreadsheetApp.openById(VALIDATION_LOG_SHEET_ID).getSheetByName("validation-errors");
    if (!sheet) return { held: false, detail: "validation-errors tab not found on VALIDATION_LOG_SHEET_ID.", evidence: {} };
    const data = sheet.getDataRange().getValues();
    // Columns per logValidationError(): timestamp, job_id, error_count,
    // error_list, warning_count, warning_list, action_taken,
    // reverted_to_version, source_document_template.
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][1]) === jobId) {
        const actionTaken = String(data[i][6] || "");
        return actionTaken === "REVERTED_NOT_SENT"
          ? { held: true, detail: `row found for ${jobId} with action_taken=REVERTED_NOT_SENT.`, evidence: { row_index: i + 1, timestamp: data[i][0], error_count: data[i][2] } }
          : { held: false, detail: `most recent row for ${jobId} has action_taken="${actionTaken}" (expected REVERTED_NOT_SENT).`, evidence: { row_index: i + 1, timestamp: data[i][0] } };
      }
    }
    return { held: false, detail: `no row found for ${jobId} on the validation-errors sheet.`, evidence: {} };
  } catch (err) {
    return { held: false, detail: `sheet read failed: ${String(err && err.message ? err.message : err)}`, evidence: {} };
  }
}

// Artifact 4b: the audit spreadsheet (getAuditSheet()) has a row for this
// job_id with email_status = "HELD_VALIDATION_FAILED".
function eev2AuditArtifact4b_(jobId) {
  try {
    const row = eev2FindLatestAuditRowForJob_(jobId);
    if (!row) return { held: false, detail: `no row found for ${jobId} on the audit sheet.`, evidence: {} };
    return row.email_status === "HELD_VALIDATION_FAILED"
      ? { held: true, detail: `row found for ${jobId} with email_status=HELD_VALIDATION_FAILED.`, evidence: { row_index: row.row_index, timestamp: row.timestamp } }
      : { held: false, detail: `most recent row for ${jobId} has email_status="${row.email_status}" (expected HELD_VALIDATION_FAILED).`, evidence: { row_index: row.row_index, timestamp: row.timestamp } };
  } catch (err) {
    return { held: false, detail: `sheet read failed: ${String(err && err.message ? err.message : err)}`, evidence: {} };
  }
}

// Shared lookup for artifacts 1 and 4b -- both read the same audit sheet
// row. header-text lookup (not positional), so it stays correct even if
// ensureAuditHeader()'s column order changes.
function eev2FindLatestAuditRowForJob_(jobId) {
  const sheet = getAuditSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  const header = data[0].map((h) => String(h || "").trim());
  const jobIdCol = header.indexOf("job_id");
  const timestampCol = header.indexOf("timestamp");
  const emailStatusCol = header.indexOf("email_status");
  if (jobIdCol < 0) return null;
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][jobIdCol]) === jobId) {
      return {
        row_index: i + 1,
        timestamp: timestampCol >= 0 ? data[i][timestampCol] : null,
        email_status: emailStatusCol >= 0 ? String(data[i][emailStatusCol] || "") : ""
      };
    }
  }
  return null;
}
