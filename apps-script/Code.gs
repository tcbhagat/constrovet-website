const CONSTROVET_ROOT_FOLDER = "Constrovet";
const CONSTROVET_PROJECTS_FOLDER = "projects";
const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
// EEV2-004: characters of text before a currency marker that count as that
// figure's label region. Matches the 40-char preceding window live CHECK 5c
// (COUNT_PHRASES) already uses, so both layers agree on what "immediately
// preceded by" means.
const BOARDROOM_LABEL_WINDOW = 40;
const BOARDROOM_MAX_FILES = 10;
const BOARDROOM_DEEP_ANALYSIS_MAX_FILES = 3;
const DAILY_EMAIL_LIMIT = 5;
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_BOARDROOM_NOTIFY_EMAIL = "admin@constrovet.com";
const BOARDROOM_ADMIN_CC_PROPERTY = "BOARDROOM_CC_ADMIN";
const BOARDROOM_LAST_JOB_PROPERTY = "BOARDROOM_LAST_JOB_ID";
// ROADMAP.md Milestone 7 circuit-breaker (2026-09-04, six-lens audit). A second,
// independent load path that does not depend on anyone reading an alert email:
// when boardroomGateHealthCheck() finds the validation layer missing or
// unexercised, it sets this property to "FAILED", and sendReportEmail refuses
// to send while it is set -- regardless of which of its 5 call sites is used.
// Cleared only by boardroomClearGateHealthKillSwitch_(), run manually by a
// human after the underlying problem is confirmed fixed. Never auto-clears.
const GATE_HEALTH_PROPERTY = "GATE_HEALTH";
const BOARDROOM_LIVE_ENDPOINT = "https://script.google.com/macros/s/AKfycbwKAbhU2WNR7BSNQS9XMMqhlvYMBb-QwKckfkiAiNIdf4pPD-dBBACO42lE5omKH4E9kQ/exec";
const REPORT_EXECUTIVE_ACTION_PLAN = "EXECUTIVE_ACTION_PLAN";
const REPORT_EVIDENCE_INTAKE_EXCEPTION = "EVIDENCE_INTAKE_EXCEPTION";
const REPORT_IRRELEVANT_DATA_FILE = "IRRELEVANT_DATA_FILE";
const REPORT_UNSUPPORTED_FILE_TYPE = "UNSUPPORTED_FILE_TYPE";
const REPORT_CONSTRUCTION_CONTEXT_ONLY = "CONSTRUCTION_CONTEXT_ONLY";
const JOB_STATE_INTAKE_RECEIVED = "INTAKE_RECEIVED";
const JOB_STATE_EXTRACTION_COMPLETE = "EXTRACTION_COMPLETE";
const JOB_STATE_VERIFICATION_COMPLETE = "VERIFICATION_COMPLETE";
const JOB_STATE_ACTION_REPORT_SENT = "ACTION_REPORT_SENT";
const JOB_STATE_MISSING_EVIDENCE_OPEN = "MISSING_EVIDENCE_OPEN";
const JOB_STATE_CORRECTION_RECEIVED = "CORRECTION_RECEIVED";
const JOB_STATE_RERUN_COMPLETE = "RERUN_COMPLETE";
const JOB_STATE_ARCHIVED = "ARCHIVED";
const HUMAN_REVIEW_PENDING = "PENDING";
const ACTION_RECOVERABLE = "RECOVERABLE_ACTION";
const ACTION_EVIDENCE_FOLLOWUP = "EVIDENCE_FOLLOWUP";
const ACTION_MONITORING_CONTEXT = "MONITORING_CONTEXT";
const DEEP_REVIEW_STATUS_READY = "READY_FOR_HUMAN_REVIEW";
const DEEP_REVIEW_STATUS_NEEDS_EVIDENCE = "NEEDS_EVIDENCE_BEFORE_EXECUTIVE_USE";
const DEEP_REVIEW_STATUS_BLOCKED = "BLOCKED_UNSUPPORTED_OR_NO_CITED_FINDINGS";
const GEMINI_RELEVANCE_GATE_PROPERTY = "ENABLE_GEMINI_RELEVANCE_GATE";
const GEMINI_RELEVANCE_MODEL_PROPERTY = "GEMINI_RELEVANCE_MODEL";
const GEMINI_DAILY_CALL_LIMIT_PROPERTY = "GEMINI_DAILY_CALL_LIMIT";
const GEMINI_MAX_FILE_BYTES_FOR_CLASSIFIER_PROPERTY = "GEMINI_MAX_FILE_BYTES_FOR_CLASSIFIER";
const DEFAULT_GEMINI_DAILY_CALL_LIMIT = 10;
const DEFAULT_GEMINI_MAX_FILE_BYTES_FOR_CLASSIFIER = 2 * 1024 * 1024;
const DEFAULT_GEMINI_RELEVANCE_MODEL = "gemini-2.5-flash";

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    if (params.job_id || params.key) return serveBoardroomResult(params);
    return jsonResponse({
      ok: true,
      service: "Constrovet Workspace Apps Script processor",
      message: "Use POST from https://www.constrovet.com/app/ or a tokenized Boardroom result link."
    });
  } catch (error) {
    return jsonResponse({ ok: false, status: 500, error: error && error.message ? error.message : String(error) });
  }
}


/* ============================================================
   CONFIG
   ============================================================ */

// Your ConstroVet-Validation-Errors spreadsheet.
// If you ever move or recreate that sheet, change this one line.
const VALIDATION_LOG_SHEET_ID = "1htvKzTTPma9c4n2UjgzN28Eq9sPDJFjJ5qwoTU3n98U";

// Where validation-failure alerts go for the FORM-TRIGGER path
// (handleBoardroomFormSubmit). Session.getActiveUser().getEmail() often
// returns "" inside a trigger, so this is set explicitly rather than relying
// on the active user, matching the doPost path's use of GmailApp with the
// deploying user's own address.
const VALIDATION_ALERT_EMAIL = "bhagat.taran@gmail.com";

/* ============================================================
   CORRECTED doPost — validation inserted ONCE, right after
   buildReport(), before any file writes or email send.
   Replace your entire doPost function with this.
   ============================================================ */

function doPost(e) {
  try {
    const payload = parseRequest(e);
    validatePayload(payload);
    enforceRateLimit(payload.email);
    rememberLatestBoardroomJob(payload.job_id);

    const folders = prepareJobFolders(payload.job_id);
    writeJobState(folders, newJobState(payload.job_id, JOB_STATE_INTAKE_RECEIVED, {
      mode: payload.mode,
      email: payload.email,
      received_file_count: (payload.files || []).length
    }));
    const savedFiles = payload.mode === "DEEP_ANALYSIS" ? saveUploadedFiles(payload.files, folders.input) : [];
    const browserReport = payload.browser_report;
    applyDeterministicVerification(browserReport, true);
    writeJobState(folders, newJobState(payload.job_id, JOB_STATE_VERIFICATION_COMPLETE, {
      mode: payload.mode,
      email: payload.email,
      finding_count: (browserReport.findings || []).length,
      deterministic_verification_status: ((browserReport.deterministic_verifier_result || {}).verification_status || "UNKNOWN")
    }));
    const verifierResult = payload.mode === "DEEP_ANALYSIS" ? runGeminiVerifier(browserReport) : fallbackVerifier(browserReport);
    const report = buildReport(payload, browserReport, verifierResult, savedFiles);

    // *** VALIDATION LAYER (PHASE 1) — runs ONCE, right after buildReport() ***
    const validationResult = validateReportOutput(report, browserReport);
    if (!validationResult.isValid) {
      logValidationError(payload.job_id, validationResult, browserReport);

      const failedFile = folders.outputs.createFile(
        `${payload.job_id}-VALIDATION_FAILED.json`,
        JSON.stringify({ report: report, browser_report: browserReport, validation: validationResult }, null, 2),
        MimeType.PLAIN_TEXT
      );

      GmailApp.sendEmail(
        Session.getActiveUser().getEmail(),
        `[VALIDATION FAILED] Constrovet Job ${payload.job_id}`,
        `Report for job ${payload.job_id} FAILED validation and was NOT sent to the client.\n\n` +
        `Errors:\n${validationResult.errors.join("\n")}\n\n` +
        `Warnings:\n${validationResult.warnings.join("\n")}\n\n` +
        `Debug file: ${failedFile.getUrl()}\n` +
        `Job folder: ${folders.job.getUrl()}`
      );

      writeJobState(folders, newJobState(payload.job_id, "VALIDATION_FAILED", {
        mode: payload.mode,
        email: payload.email,
        error_count: validationResult.errors.length
      }));

      return jsonResponse({
        ok: false,
        job_id: payload.job_id,
        error: `Validation failed: ${validationResult.errors[0]}`,
        validation_errors: validationResult.errors,
        validation_warnings: validationResult.warnings,
        message: "Report failed quality checks. Not sent to client. Admin notified."
      });
    }
    // *** END VALIDATION LAYER ***

    const accessKey = makeResultAccessKey();
    report.result_access_key = accessKey;
    report.result_url = buildResultUrl(payload.job_id, accessKey);
    report.result_url_health = resultUrlHealth(report.result_url);
    const browserFile = folders.outputs.createFile(`${payload.job_id}-browser-report.json`, JSON.stringify(browserReport, null, 2), MimeType.PLAIN_TEXT);
    const markdownFile = folders.outputs.createFile(`${payload.job_id}-executive-report.md`, report.markdown, MimeType.PLAIN_TEXT);
    report.generated_files = {
      browser_report_url: browserFile.getUrl(),
      executive_report_url: markdownFile.getUrl()
    };
    const finalFile = folders.outputs.createFile(`${payload.job_id}-final-report.json`, JSON.stringify(report, null, 2), MimeType.PLAIN_TEXT);
    report.generated_files.final_report_url = finalFile.getUrl();
    report.source_job_id = payload.job_id;
    report.source_job_folder_url = folders.job.getUrl();
    report.source_outputs_folder_url = folders.outputs.getUrl();
    report.source_final_report_url = finalFile.getUrl();
    report.email_source_mode = "API_POST_CURRENT_JOB";
    attachEvidenceLoopMetadata(report, browserReport, folders, {
      job_id: payload.job_id,
      email: payload.email,
      source_files: savedFiles,
      correction_count: 0,
      rerun_count: 0,
      human_review_status: HUMAN_REVIEW_PENDING
    });
    const geminiReviewPackFile = folders.outputs.createFile(`${payload.job_id}-optional-gemini-review-pack.md`, buildGeminiReviewPackMarkdown(report, browserReport), MimeType.PLAIN_TEXT);
    report.generated_files.gemini_review_pack_url = geminiReviewPackFile.getUrl();
    createDeepReviewArtifact(folders.outputs, payload.job_id, report, browserReport);
    finalFile.setContent(JSON.stringify(report, null, 2));

    let emailDelivery = emptyEmailDelivery(payload.email, payload.job_id);
    try {
      emailDelivery = sendReportEmail(payload.email, payload.job_id, report, markdownFile.getBlob(), report.result_url);
    } catch (error) {
      emailDelivery = failedEmailDelivery(payload.email, payload.job_id, error);
    }
    emailDelivery = finalizeBoardroomEmailDelivery(payload.job_id, report, emailDelivery, {
      mode: payload.mode,
      recipient: payload.email,
      source: "API_POST_CURRENT_JOB"
    });
    report.email_delivery = emailDelivery;
    report.job_state = report.missing_evidence_queue && report.missing_evidence_queue.length ? JOB_STATE_MISSING_EVIDENCE_OPEN : JOB_STATE_ACTION_REPORT_SENT;
    writeJobMemory(folders, report, browserReport);
    finalFile.setContent(JSON.stringify(report, null, 2));
    writeJobState(folders, newJobState(payload.job_id, report.job_state, {
      mode: payload.mode,
      email: payload.email,
      report_quality_status: report.report_quality_status,
      finding_count: (browserReport.findings || []).length,
      missing_evidence_count: (report.missing_evidence_queue || []).length,
      email_status: emailDelivery.email_status || ""
    }));
    appendAuditRow(payload, report, savedFiles, folders.job.getUrl(), emailDelivery);

    return jsonResponse({
      ok: true,
      job_id: payload.job_id,
      result_url: report.result_url,
      email_status: emailDelivery.email_status || "",
      email_to: emailDelivery.email_to || "",
      email_error: emailDelivery.email_error || "",
      missing_evidence_count: (report.missing_evidence_queue || []).length,
      message: payload.mode === "DEEP_ANALYSIS"
        ? "Deep Analysis report generated. Use the result_url if email delivery is delayed or blocked."
        : "Browser report generated. Use the result_url if email delivery is delayed or blocked."
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error && error.message ? error.message : String(error) });
  }
}

/* ============================================================
   CORRECTED validateReportOutput — matches your REAL schema
   (financial_category, amount_inr, evidence_quality, calculation,
   citations), verified against 3 real production reports.
   Replace your old validateReportOutput with this one.
   ============================================================ */

function validateReportOutput(report, browserReport) {
  const errors = [];
  const warnings = [];
  const findings = browserReport.findings || [];

  // CHECK 1: Finding count.
  // Zero findings is only valid when the system explicitly says
  // "nothing was found" (EVIDENCE_INTAKE_EXCEPTION). If it claims
  // analysis_generated=true but produced no findings, that's a bug.
  if (findings.length === 0 && browserReport.analysis_generated === true) {
    errors.push("FINDING_COUNT_ZERO: analysis_generated=true but no findings were produced");
  }

  // CHECK 2: Allowed categories only (catches mislabeled findings).
  const ALLOWED_CATEGORIES = ["LEAKAGE_AND_OVERRUN", "BASELINE_BUDGET", "ESG_METRIC"];
  findings.forEach((f, idx) => {
    if (f.financial_category && ALLOWED_CATEGORIES.indexOf(f.financial_category) === -1) {
      errors.push(`UNKNOWN_CATEGORY: Finding ${idx} has category "${f.financial_category}"`);
    }
  });

  // CHECK 3: Math check — Actual - Budget must equal difference (±₹1).
  findings.forEach((f, idx) => {
    const calc = f.calculation || {};
    if (calc.budget > 0 && calc.actual > 0) {
      const expected = calc.actual - calc.budget;
      const divergence = Math.abs(expected - (calc.difference || 0));
      if (divergence > 1) {
        errors.push(`MATH_MISMATCH: Finding ${idx} — Actual(${calc.actual}) - Budget(${calc.budget}) = ${expected}, but difference is ${calc.difference}`);
      }
    }
  });

  // CHECK 4: Evidence-quality-to-value consistency.
  // If evidence_quality claims a specific figure type, that figure must
  // actually be present. (A narrative-only watchlist signal with 0/0
  // is fine — that's a real, valid "needs follow-up" state, NOT an error.)
  findings.forEach((f, idx) => {
    if (f.evidence_quality === "CITED_DAYS" && !(f.days > 0)) {
      errors.push(`MISSING_DAYS: Finding ${idx} marked CITED_DAYS but days=${f.days}`);
    }
    if ((f.evidence_quality === "CITED_AMOUNT" || f.evidence_quality === "STRUCTURED_ACTUAL_BUDGET") && !(f.amount_inr > 0)) {
      errors.push(`MISSING_AMOUNT: Finding ${idx} marked ${f.evidence_quality} but amount_inr=${f.amount_inr}`);
    }
  });

  // CHECK 5: Fabricated leakage — a LEAKAGE_AND_OVERRUN finding whose only
  // support is a bare keyword hit (CITED_NARRATIVE) must NOT carry a
  // nonzero amount unless that amount also has a calculation backing it.
  findings.forEach((f, idx) => {
    if (f.financial_category === "LEAKAGE_AND_OVERRUN" &&
        f.evidence_quality === "CITED_NARRATIVE" &&
        f.amount_inr > 0) {
      errors.push(`FABRICATED_LEAKAGE: Finding ${idx} is narrative-only evidence but claims INR ${f.amount_inr}`);
    }
  });

  // CHECK 5b: THE CLIENT-FACING ONE. Any amount a finding claims must
  // actually appear as a currency figure in that finding's own citation
  // text. This is the check that stops fabricated rupee figures reaching
  // a client's board pack. Observed real failures it catches:
  //   - "penalty ... INR 6"   <- was "≥6/month" HSE inspection target
  //   - "INR 12" x7 findings  <- was "Total Purchase Orders 12"
  //   - "INR 120"             <- was skilled-worker headcount 120
  //   - "INR 8"               <- was clock time "08:00"
  //   - "INR 21"              <- was "Total Change Orders 21"
  // Applies to ALL categories, not just leakage: an ESG or variation-order
  // finding with a wrong rupee figure still goes out to the client as fact.
  findings.forEach((f, idx) => {
    if (!(f.amount_inr > 0)) return;
    // Exemption: a STRUCTURED_ACTUAL_BUDGET amount is a *computed*
    // difference (Actual - Budget). It legitimately never appears
    // verbatim in the source text, so verify the inputs instead —
    // CHECK 3 already re-does that arithmetic.
    const calc = f.calculation || {};
    if (f.evidence_quality === "STRUCTURED_ACTUAL_BUDGET" &&
        calc.budget > 0 && calc.actual > 0 &&
        Math.abs((calc.actual - calc.budget) - f.amount_inr) <= 1) {
      return;
    }
    const cites = f.citations || [];
    const amountStr = String(f.amount_inr);
    const hasCurrencyContext = cites.some(c => {
      const text = (c.quoted_span || "");
      // \b word boundaries are essential: without them "Rs" matches inside
      // ordinary words like "hours" and "workers", which silently turned
      // the clock time "08:00" into a verified INR 8 during testing.
      const currencyPattern = /(\bINR\b|\bRs\b\.?|₹)\s*[\d,]*\s*/gi;
      let match;
      while ((match = currencyPattern.exec(text)) !== null) {
        const windowText = text.substr(match.index, match[0].length + amountStr.length + 5);
        if (windowText.replace(/[,\s]/g, "").indexOf(amountStr) !== -1) return true;
      }
      return false;
    });
    if (!hasCurrencyContext) {
      errors.push(`UNVERIFIED_AMOUNT: Finding ${idx} claims INR ${f.amount_inr} but no citation shows this figure next to a currency marker (INR/Rs/₹) — likely a count, rate, headcount, or timestamp misread as an amount`);
    }
  });

  // CHECK 5c: Count-word guard. Even when a rupee symbol happens to sit
  // nearby, a figure introduced by a counting phrase ("Total Purchase
  // Orders 12", "Workers 120", "Total Change Orders 21", "Reporting
  // Months 24") is a record count, not money. Catches the boilerplate
  // metadata headers repeated across whole document families.
  const COUNT_PHRASES = /(total\s+(purchase\s+orders|change\s+orders|rfis|documents|records)|workers?|headcount|strength|reporting\s+months|count|\bno\.?s?\b|qty|quantity)\s*[:\-]?\s*$/i;
  findings.forEach((f, idx) => {
    if (!(f.amount_inr > 0)) return;
    const amountStr = String(f.amount_inr);
    (f.citations || []).forEach(c => {
      const text = (c.quoted_span || "");
      let pos = text.indexOf(amountStr);
      while (pos !== -1) {
        const preceding = text.substring(Math.max(0, pos - 40), pos);
        if (COUNT_PHRASES.test(preceding)) {
          errors.push(`COUNT_READ_AS_AMOUNT: Finding ${idx} claims INR ${amountStr}, but in the citation that figure follows a counting phrase ("${preceding.trim().slice(-30)}") — this is a record count, not a rupee amount`);
          return;
        }
        pos = text.indexOf(amountStr, pos + 1);
      }
    });
  });

  // CHECK 5d: Multi-amount citation warning (row-jump risk). When a
  // citation contains several distinct Rs./INR figures, the extractor may
  // have attached the wrong one to this finding — e.g. a tower crane's
  // Rs.85,000 labelled as the "diesel" ESG figure when the diesel
  // generator's real cost was Rs.22,000 in the same table row. Warning,
  // not error: this is a smell for manual review, not proof of a bug.
  findings.forEach((f, idx) => {
    if (!(f.amount_inr > 0)) return;
    (f.citations || []).forEach(c => {
      const figures = (c.quoted_span || "").match(/(INR|Rs\.?|₹)\s*[\d][\d,\.]*/gi) || [];
      if (figures.length > 2) {
        warnings.push(`MULTI_AMOUNT_CITATION: Finding ${idx} cites INR ${f.amount_inr} from a passage containing ${figures.length} separate currency figures — verify the right one was attributed`);
      }
    });
  });

  // CHECK 6: Every finding must cite its source (file + quoted span).
  findings.forEach((f, idx) => {
    const cites = f.citations || [];
    const hasValidCitation = cites.length > 0 && cites.every(c => c.file && c.quoted_span);
    if (!hasValidCitation) {
      errors.push(`MISSING_CITATION: Finding ${idx} has no valid citation`);
    }
  });

  // CHECK 7: Truncation warning — statement or quoted text cut off mid-sentence.
  findings.forEach((f, idx) => {
    if ((f.statement || "").trim().endsWith("...")) {
      warnings.push(`POSSIBLE_TRUNCATION: Finding ${idx} statement ends with "..."`);
    }
    (f.citations || []).forEach((c, cIdx) => {
      if ((c.quoted_span || "").trim().endsWith("...")) {
        warnings.push(`POSSIBLE_TRUNCATION: Finding ${idx} citation ${cIdx} ends with "..."`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings,
    checkedAt: new Date().toISOString(),
    job_id: report.source_job_id || (report.form_intake && report.form_intake.job_id) || null
  };
}

/* ============================================================
   Error log writer — unchanged from before, included for completeness.
   Run initValidationErrorLog() once, manually, before first deploy.
   ============================================================ */

/**
 * OPTIONAL — you do NOT need to run this. Your ConstroVet-Validation-Errors
 * sheet and its "validation-errors" tab already exist. This is here only to
 * rebuild them if the sheet is ever lost.
 *
 * Note: uses openById, NOT getActive(). getActive() returns null in a
 * standalone Apps Script (one not created from inside a spreadsheet),
 * which is what throws "Cannot read properties of null".
 * Safe to run twice — it won't duplicate the tab or the headers.
 */
function initValidationErrorLog() {
  const ss = SpreadsheetApp.openById(VALIDATION_LOG_SHEET_ID);
  let sheet = ss.getSheetByName("validation-errors");
  if (!sheet) {
    sheet = ss.insertSheet("validation-errors");
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "timestamp", "job_id", "error_count", "error_list",
      "warning_count", "warning_list", "action_taken",
      "reverted_to_version", "source_document_template"
    ]);
    Logger.log("Validation error log headers created.");
  } else {
    Logger.log("Validation error log already set up — nothing to do.");
  }
}

function logValidationError(job_id, validationResult, browserReport) {
  const ss = SpreadsheetApp.openById(VALIDATION_LOG_SHEET_ID);
  const sheet = ss.getSheetByName("validation-errors");
  if (!sheet) {
    Logger.log("WARNING: validation-errors tab not found — error not logged for " + job_id);
    return;
  }
  sheet.appendRow([
    new Date().toISOString(),
    job_id,
    validationResult.errors.length,
    validationResult.errors.join(" | "),
    validationResult.warnings.length,
    validationResult.warnings.join(" | "),
    validationResult.isValid ? "PASSED_VALIDATION" : "REVERTED_NOT_SENT",
    "7",
    detectDocumentTemplate(browserReport)
  ]);
}

// ROADMAP.md Milestone 7 (2026-09-04, six-lens audit). Run this on a time-based
// trigger (recommend every 15-30 minutes, not daily -- see ROADMAP.md's
// Milestone 7 note on why the check interval is the real design variable).
// Detects two distinct failure modes, either of which halts sending:
//   1. Presence: the validation-layer functions this deployment depends on
//      are missing (typeof check, not existence-by-inference -- see AGENTS.md
//      guardrail #6, real schemas only).
//   2. Invocation: the validation layer is present but was not actually
//      exercised on the most recent real job -- present-but-bypassed is the
//      same client-facing risk as absent.
// Idle periods (no job since the last check) never trigger a false alarm --
// there is nothing to check invocation against, so only presence is checked.
function boardroomGateHealthCheck() {
  const props = PropertiesService.getScriptProperties();
  const reasons = [];

  if (typeof validateReportOutput !== "function") reasons.push("validateReportOutput is missing from this deployment.");
  if (typeof logValidationError !== "function") reasons.push("logValidationError is missing from this deployment.");
  if (typeof heldForValidationFailureDelivery_ !== "function") reasons.push("heldForValidationFailureDelivery_ is missing from this deployment.");
  if (typeof heldForExtractionFailureDelivery_ !== "function") reasons.push("heldForExtractionFailureDelivery_ is missing from this deployment.");
  if (typeof boardroomTechnicalExtractionFailures_ !== "function") reasons.push("boardroomTechnicalExtractionFailures_ is missing from this deployment.");

  if (!reasons.length) {
    const lastJobId = String(props.getProperty(BOARDROOM_LAST_JOB_PROPERTY) || "").trim();
    if (lastJobId) {
      try {
        const sheet = SpreadsheetApp.openById(VALIDATION_LOG_SHEET_ID).getSheetByName("validation-errors");
        // Positional columns match logValidationError's own appendRow order
        // exactly (timestamp=0, job_id=1) -- not a header-text lookup, so a
        // renamed header cell cannot silently break this check.
        const data = sheet.getDataRange().getValues();
        let found = false;
        for (let i = data.length - 1; i >= 1; i--) {
          if (String(data[i][1]) === lastJobId) { found = true; break; }
        }
        if (!found) {
          reasons.push("Most recent job " + lastJobId + " has no row on the validation-errors sheet -- the gate may not have been invoked.");
        }
      } catch (sheetError) {
        reasons.push("Could not read the validation-errors sheet to confirm invocation: " + sheetError.message);
      }
    }
  }

  if (reasons.length) {
    props.setProperty(GATE_HEALTH_PROPERTY, "FAILED");
    try {
      MailApp.sendEmail(
        VALIDATION_ALERT_EMAIL,
        "[GATE HEALTH FAILED] Constrovet validation layer",
        "The scheduled gate health check found a problem and has HALTED all outbound " +
        "client reports until this is cleared.\n\n" +
        "Reasons:\n  " + reasons.join("\n  ") + "\n\n" +
        "Run boardroomClearGateHealthKillSwitch_() from the Apps Script editor only " +
        "after the underlying problem is fixed and re-verified -- this does not clear itself."
      );
    } catch (mailError) {
      Logger.log("Gate health alert email failed: " + mailError);
    }
  }

  return { ok: reasons.length === 0, reasons: reasons };
}

// MANUAL ONLY (AGENTS.md hard stop: any live-state-clearing action is founder-
// only). Never call this from a trigger or from boardroomGateHealthCheck itself
// -- run it from the Apps Script editor, by a human, only after confirming the
// underlying gate-health problem is actually fixed and re-verified.
function boardroomClearGateHealthKillSwitch_() {
  PropertiesService.getScriptProperties().deleteProperty(GATE_HEALTH_PROPERTY);
  Logger.log("GATE_HEALTH kill-switch cleared manually at " + new Date().toISOString());
}

/**
 * Derive a document-family label from the source filenames so repeated
 * failures from one boilerplate template can be grouped in review.
 * "Procurement_Governance---Taran-Bhagat.pdf"      -> "Procurement_*"
 * "M20_CostEstimate_BAD---Taran-Bhagat.pdf"        -> "M20_*"
 * "boardroom-professional-actions-delay-only.csv"  -> "boardroom-*"
 */
function detectDocumentTemplate(browserReport) {
  const outcomes = (browserReport && browserReport.document_outcomes) || [];
  const families = {};
  outcomes.forEach(o => {
    const name = o.file || "";
    let family = "OTHER";
    const mMonth = name.match(/^(M\d+)_/);
    const mPrefix = name.match(/^([A-Za-z]+)[_\-]/);
    if (mMonth) family = mMonth[1] + "_*";
    else if (mPrefix) family = mPrefix[1] + "_*";
    families[family] = true;
  });
  return Object.keys(families).join(", ") || "UNKNOWN";
}

function onFormSubmit(e) {
  return handleBoardroomFormSubmit(e);
}

function onCorrectionFormSubmit(e) {
  return handleBoardroomCorrectionFormSubmit(e);
}

// --- Duplicate-submission guard (added 2026-08-30) ---------------------
// Google Forms can fire onFormSubmit more than once for the same physical
// response. Each firing carries the SAME response object, so we use its
// stable response ID as a claim key: only the first firing to grab the
// claim (via a short script lock) proceeds; any near-simultaneous repeat
// firing for the same response is dropped before it does any work at all
// (no duplicate job folder, no duplicate client email, no duplicate audit
// row). A brand-new, different submission always gets its own ID and is
// never affected. If the lock or cache is unavailable for any reason, we
// fail OPEN (allow processing) so a real submission is never silently lost.
function getBoardroomResponseId_(e) {
  try {
    if (e && e.response && typeof e.response.getId === "function") {
      const id = e.response.getId();
      if (id) return String(id);
    }
  } catch (err) {
    // fall through
  }
  return "";
}

function claimBoardroomSubmission_(responseId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return true; // could not get the lock in time -- fail open, allow processing
  }
  try {
    const cache = CacheService.getScriptCache();
    const key = "boardroom_claim_" + responseId;
    if (cache.get(key)) {
      return false; // another (duplicate) firing already claimed this exact response
    }
    cache.put(key, "1", 21600); // 6 hours -- far longer than any duplicate-firing window
    return true;
  } catch (err) {
    return true; // cache unavailable -- fail open, allow processing
  } finally {
    lock.releaseLock();
  }
}
// -------------------------------------------------------------------------

function handleBoardroomFormSubmit(e) {
  const responseId = getBoardroomResponseId_(e);
  if (responseId && !claimBoardroomSubmission_(responseId)) {
    return {
      ok: true,
      duplicate_submission_ignored: true,
      response_id: responseId,
      message: "Duplicate onFormSubmit firing for the same response was detected and ignored."
    };
  }
  const startedAt = new Date();
  const jobId = makeBoardroomJobId(startedAt);
  rememberLatestBoardroomJob(jobId);
  const props = PropertiesService.getScriptProperties();
  const responseFolderId = props.getProperty("BOARDROOM_RESPONSE_FOLDER_ID") || "";
  const deepAnalysisEnabled = String(props.getProperty("ENABLE_BOARDROOM_DEEP_ANALYSIS") || "false").toLowerCase() === "true";
  const submitterEmailInfo = getBoardroomSubmitterEmailInfo(e);
  const submitterEmail = submitterEmailInfo.email;
  const folders = prepareJobFolders(jobId);
  const formFiles = getBoardroomFilesFromEvent(e);
  writeJobState(folders, newJobState(jobId, JOB_STATE_INTAKE_RECEIVED, {
    mode: "FORM_INTAKE",
    email: submitterEmail,
    received_file_count: formFiles.length,
    submitter_email_source: submitterEmailInfo.source
  }));
  appendBoardroomAuditRow({
    timestamp: startedAt,
    job_id: jobId,
    mode: "FORM_INTAKE_RECEIVED",
    email: submitterEmail,
    received_file_count: formFiles.length,
    accepted_file_count: "",
    rejected_files: [],
    finding_count: "",
    gemini_status: "NOT_STARTED",
    drive_folder: folders.job.getUrl(),
    result_url: "",
    result_access_key: "",
    email_source_mode: "CURRENT_UPLOAD_SESSION",
    source_job_id: jobId,
    source_job_folder_url: folders.job.getUrl(),
    source_final_report_url: "",
    submitter_email_source: submitterEmailInfo.source,
    report_quality_status: "",
    job_state: JOB_STATE_INTAKE_RECEIVED,
    source_files: boardroomSourceFileNames(formFiles),
    missing_evidence_count: 0,
    correction_count: 0,
    rerun_count: 0,
    human_review_status: HUMAN_REVIEW_PENDING,
    result_url_health: "",
    email_delivery: emptyEmailDelivery(submitterEmail, jobId)
  });
  const accepted = [];
  const rejected = [];
  const savedFiles = [];
  const documents = [];

  formFiles.forEach((fileInfo) => {
    const review = reviewBoardroomFile(fileInfo, accepted.length, deepAnalysisEnabled, responseFolderId);
    if (!review.accept) {
      rejected.push({ ...fileInfo, reason: review.reason });
      if (review.quarantine) quarantineBoardroomFile(fileInfo, review.reason);
      return;
    }
    accepted.push(fileInfo);
  });

  accepted.forEach((fileInfo) => {
    const copied = copyBoardroomFileToInput(fileInfo, folders.input);
    savedFiles.push(copied);
    documents.push(extractBoardroomDocument(copied));
  });

  writeJobState(folders, newJobState(jobId, JOB_STATE_EXTRACTION_COMPLETE, {
    mode: "FORM_INTAKE",
    email: submitterEmail,
    received_file_count: formFiles.length,
    accepted_file_count: accepted.length,
    rejected_file_count: rejected.length
  }));
  const browserReport = buildBoardroomOutput(documents, rejected);
  eev2AttachLiveSchedulePosition(browserReport);
  const verifierResult = deepAnalysisEnabled
    ? runGeminiVerifier(browserReport)
    : fallbackVerifier(browserReport);
  writeJobState(folders, newJobState(jobId, JOB_STATE_VERIFICATION_COMPLETE, {
    mode: "FORM_INTAKE",
    email: submitterEmail,
    finding_count: (browserReport.findings || []).length,
    deterministic_verification_status: ((browserReport.deterministic_verifier_result || {}).verification_status || "UNKNOWN"),
    gemini_status: verifierResult.verification_status || verifierResult.status || "UNKNOWN"
  }));
  const payload = {
    job_id: jobId,
    mode: deepAnalysisEnabled ? "FORM_DEEP_ANALYSIS" : "FORM_INTAKE_REPORT",
    email: submitterEmail
  };
  const report = buildReport(payload, browserReport, verifierResult, savedFiles);
  report.form_intake = {
    submitted_at: startedAt.toISOString(),
    received_file_count: formFiles.length,
    accepted_file_count: accepted.length,
    rejected_files: rejected,
    submitter_email_source: submitterEmailInfo.source
  };

  const accessKey = makeResultAccessKey();
  report.result_access_key = accessKey;
  report.result_url = buildResultUrl(jobId, accessKey);
  report.result_url_health = resultUrlHealth(report.result_url);
  const browserFile = folders.outputs.createFile(`${jobId}-browser-report.json`, JSON.stringify(browserReport, null, 2), MimeType.PLAIN_TEXT);
  const markdownFile = folders.outputs.createFile(`${jobId}-executive-report.md`, report.markdown, MimeType.PLAIN_TEXT);
  report.generated_files = {
    browser_report_url: browserFile.getUrl(),
    executive_report_url: markdownFile.getUrl()
  };
  const finalFile = folders.outputs.createFile(`${jobId}-final-report.json`, JSON.stringify(report, null, 2), MimeType.PLAIN_TEXT);
  report.generated_files.final_report_url = finalFile.getUrl();
  report.source_job_id = jobId;
  report.source_job_folder_url = folders.job.getUrl();
  report.source_outputs_folder_url = folders.outputs.getUrl();
  report.source_final_report_url = finalFile.getUrl();
  report.email_source_mode = "CURRENT_UPLOAD_SESSION";
  attachEvidenceLoopMetadata(report, browserReport, folders, {
    job_id: jobId,
    email: submitterEmail,
    source_files: savedFiles,
    correction_count: 0,
    rerun_count: 0,
    human_review_status: HUMAN_REVIEW_PENDING
  });
  const geminiReviewPackFile = folders.outputs.createFile(`${jobId}-optional-gemini-review-pack.md`, buildGeminiReviewPackMarkdown(report, browserReport), MimeType.PLAIN_TEXT);
  report.generated_files.gemini_review_pack_url = geminiReviewPackFile.getUrl();
  createDeepReviewArtifact(folders.outputs, jobId, report, browserReport);
  finalFile.setContent(JSON.stringify(report, null, 2));
  let emailDelivery = missingUserEmailDelivery(jobId);
  const technicalExtractionFailures = boardroomTechnicalExtractionFailures_(report);
  const validationResult = validateReportOutput(report, browserReport);   // <-- NEW
  logValidationError(jobId, validationResult, browserReport);             // <-- NEW (logs pass AND fail)
  if (technicalExtractionFailures.length) {
    // A document we could not READ is not a document the client failed to
    // SUPPLY. Hold the client report and alert admin instead of sending a
    // conclusion we know is unreliable.
    emailDelivery = heldForExtractionFailureDelivery_(jobId, submitterEmail, technicalExtractionFailures);
  } else if (!validationResult.isValid) {                                 // <-- NEW BRANCH
    // A figure we cannot verify against its own cited source is not a
    // figure a client should see on a board pack. Hold and alert.
    folders.outputs.createFile(
      `${jobId}-VALIDATION_FAILED.json`,
      JSON.stringify({ validation: validationResult, report: report }, null, 2),
      MimeType.PLAIN_TEXT
    );
    emailDelivery = heldForValidationFailureDelivery_(jobId, submitterEmail, validationResult, folders);
  } else if (isValidEmail(submitterEmail)) {
    try {
      emailDelivery = sendReportEmail(submitterEmail, jobId, report, markdownFile.getBlob(), report.result_url);
    } catch (error) {
      emailDelivery = failedEmailDelivery(submitterEmail, jobId, error);
    }
  }
  emailDelivery = finalizeBoardroomEmailDelivery(jobId, report, emailDelivery, {
    mode: payload.mode,
    recipient: submitterEmail,
    source: "CURRENT_UPLOAD_SESSION"
  });
  report.email_delivery = emailDelivery;
  report.job_state = report.missing_evidence_queue && report.missing_evidence_queue.length ? JOB_STATE_MISSING_EVIDENCE_OPEN : JOB_STATE_ACTION_REPORT_SENT;
  writeJobMemory(folders, report, browserReport);
  finalFile.setContent(JSON.stringify(report, null, 2));
  writeJobState(folders, newJobState(jobId, report.job_state, {
    mode: payload.mode,
    email: submitterEmail,
    report_quality_status: report.report_quality_status,
    finding_count: (browserReport.findings || []).length,
    missing_evidence_count: (report.missing_evidence_queue || []).length,
    email_status: emailDelivery.email_status || ""
  }));
  appendBoardroomAuditRow({
    timestamp: startedAt,
    job_id: jobId,
    mode: payload.mode,
    email: submitterEmail,
    received_file_count: formFiles.length,
    accepted_file_count: accepted.length,
    rejected_files: rejected,
    finding_count: browserReport.findings.length,
    gemini_status: verifierResult.verification_status || verifierResult.status || "UNKNOWN",
    drive_folder: folders.job.getUrl(),
    result_url: report.result_url,
    result_access_key: accessKey,
    email_source_mode: report.email_source_mode,
    source_job_id: report.source_job_id,
    source_job_folder_url: report.source_job_folder_url,
    source_final_report_url: report.source_final_report_url,
    submitter_email_source: submitterEmailInfo.source,
    report_quality_status: report.report_quality_status,
    input_classification_status: report.input_classification_status,
    input_relevance_reason: report.input_relevance_reason,
    gemini_relevance_status: report.gemini_relevance_status,
    gemini_calls_used_today: report.gemini_calls_used_today,
    analysis_generated: report.analysis_generated,
    job_state: report.job_state,
    source_files: boardroomSourceFileNames(savedFiles),
    extraction_status: JOB_STATE_EXTRACTION_COMPLETE,
    verifier_status: (browserReport.deterministic_verifier_result || {}).verification_status || "",
    missing_evidence_count: (report.missing_evidence_queue || []).length,
    correction_count: report.correction_count || 0,
    rerun_count: report.rerun_count || 0,
    human_review_status: report.human_review_status || HUMAN_REVIEW_PENDING,
    result_url_health: report.result_url_health,
    email_delivery: emailDelivery
  });

  return {
    ok: true,
    job_id: jobId,
    accepted_file_count: accepted.length,
    rejected_file_count: rejected.length,
    finding_count: browserReport.findings.length,
    result_url: report.result_url,
    email_status: emailDelivery.email_status || "",
    email_to: emailDelivery.email_to || "",
    email_error: emailDelivery.email_error || "",
    missing_evidence_count: (report.missing_evidence_queue || []).length,
    drive_folder: folders.job.getUrl()
  };
}

function handleBoardroomCorrectionFormSubmit(e) {
  const request = extractBoardroomCorrectionRequest(e);
  if (!request.job_id) throw new Error("Correction form must include the original Constrovet job ID.");
  if (!request.files.length) throw new Error("Correction form must include at least one evidence file.");
  return rerunBoardroomJobWithCorrections(request.job_id, request.files, request.email);
}

function extractBoardroomCorrectionRequest(e) {
  const submitterEmailInfo = getBoardroomSubmitterEmailInfo(e);
  const responses = getBoardroomItemResponses(e);
  let jobId = "";
  responses.forEach((item) => {
    const title = String(item.title || "").toLowerCase();
    const response = String(item.response || "");
    if (!jobId && /job|job id|original|reference/.test(title)) {
      const match = response.match(/form-\d{8}-\d{6}-[a-zA-Z0-9-]{8}|cv-[a-zA-Z0-9-]+/);
      if (match) jobId = match[0];
    }
  });
  if (!jobId) {
    const allText = responses.map((item) => String(item.response || "")).join(" ");
    const match = allText.match(/form-\d{8}-\d{6}-[a-zA-Z0-9-]{8}|cv-[a-zA-Z0-9-]+/);
    if (match) jobId = match[0];
  }
  return {
    job_id: jobId,
    email: submitterEmailInfo.email,
    email_source: submitterEmailInfo.source,
    files: getBoardroomFilesFromEvent(e)
  };
}

function rerunBoardroomJobWithCorrections(jobId, correctionFiles, recipientEmail) {
  const cleanedJobId = String(jobId || "").trim();
  rememberLatestBoardroomJob(cleanedJobId);
  const job = findProjectFolder(cleanedJobId);
  if (!job) throw new Error("Original Boardroom job folder was not found.");
  const folders = prepareJobFolders(cleanedJobId);
  const existingReport = loadReportForJob(cleanedJobId) || {};
  const previousRerunCount = Number(existingReport.rerun_count || 0);
  const previousCorrectionCount = Number(existingReport.correction_count || 0);
  const acceptedCorrections = [];
  const rejectedCorrections = [];
  const documents = [];
  const startedAt = new Date();

  writeJobState(folders, newJobState(cleanedJobId, JOB_STATE_CORRECTION_RECEIVED, {
    mode: "FORM_CORRECTION_RERUN",
    email: recipientEmail || existingReport.email || "",
    correction_file_count: (correctionFiles || []).length,
    previous_rerun_count: previousRerunCount
  }));

  archiveCurrentOutputs(folders, cleanedJobId);

  (correctionFiles || []).forEach((fileInfo) => {
    const review = reviewBoardroomFile(fileInfo, acceptedCorrections.length, false, "");
    if (!review.accept) {
      rejectedCorrections.push({ ...fileInfo, reason: review.reason });
      if (review.quarantine) quarantineBoardroomFile(fileInfo, review.reason);
      return;
    }
    const copied = copyBoardroomFileToInput(fileInfo, folders.corrections);
    acceptedCorrections.push(copied);
  });

  [...listBoardroomFolderFiles(folders.input), ...listBoardroomFolderFiles(folders.corrections)].forEach((fileInfo) => {
    documents.push(extractBoardroomDocument(fileInfo));
  });

  const browserReport = buildBoardroomOutput(documents, rejectedCorrections);
  eev2AttachLiveSchedulePosition(browserReport);
  const verifierResult = fallbackVerifier(browserReport);
  const recipient = isValidEmail(recipientEmail) ? String(recipientEmail).trim() : (existingReport.email || "");
  const payload = {
    job_id: cleanedJobId,
    mode: "FORM_CORRECTION_RERUN",
    email: recipient
  };
  const savedFiles = [...listBoardroomFolderFiles(folders.input), ...acceptedCorrections];
  const report = buildReport(payload, browserReport, verifierResult, savedFiles);
  report.form_intake = existingReport.form_intake || {};
  report.accepted_corrections = acceptedCorrections;
  report.rejected_corrections = rejectedCorrections;
  report.previous_report_generated_at = existingReport.generated_at || "";

  const accessKey = existingReport.result_access_key || makeResultAccessKey();
  report.result_access_key = accessKey;
  report.result_url = existingReport.result_url || buildResultUrl(cleanedJobId, accessKey);
  report.result_url_health = resultUrlHealth(report.result_url);
  const suffix = Utilities.formatDate(startedAt, "GMT", "yyyyMMdd-HHmmss");
  const browserFile = folders.outputs.createFile(`${cleanedJobId}-${suffix}-browser-report.json`, JSON.stringify(browserReport, null, 2), MimeType.PLAIN_TEXT);
  const markdownFile = folders.outputs.createFile(`${cleanedJobId}-${suffix}-executive-report.md`, report.markdown, MimeType.PLAIN_TEXT);
  const finalFile = folders.outputs.createFile(`${cleanedJobId}-${suffix}-final-report.json`, JSON.stringify(report, null, 2), MimeType.PLAIN_TEXT);
  upsertTextFile(folders.outputs, `${cleanedJobId}-browser-report.json`, JSON.stringify(browserReport, null, 2), MimeType.PLAIN_TEXT);
  upsertTextFile(folders.outputs, `${cleanedJobId}-executive-report.md`, report.markdown, MimeType.PLAIN_TEXT);
  upsertTextFile(folders.outputs, `${cleanedJobId}-final-report.json`, JSON.stringify(report, null, 2), MimeType.PLAIN_TEXT);
  report.generated_files = {
    browser_report_url: browserFile.getUrl(),
    executive_report_url: markdownFile.getUrl(),
    final_report_url: finalFile.getUrl()
  };
  report.source_job_id = cleanedJobId;
  report.source_job_folder_url = folders.job.getUrl();
  report.source_outputs_folder_url = folders.outputs.getUrl();
  report.source_final_report_url = finalFile.getUrl();
  report.email_source_mode = "CORRECTION_RERUN_CURRENT_JOB";
  attachEvidenceLoopMetadata(report, browserReport, folders, {
    job_id: cleanedJobId,
    email: recipient,
    source_files: savedFiles,
    correction_count: previousCorrectionCount + acceptedCorrections.length,
    rerun_count: previousRerunCount + 1,
    human_review_status: HUMAN_REVIEW_PENDING
  });
  const geminiReviewPackFile = folders.outputs.createFile(`${cleanedJobId}-${suffix}-optional-gemini-review-pack.md`, buildGeminiReviewPackMarkdown(report, browserReport), MimeType.PLAIN_TEXT);
  report.generated_files.gemini_review_pack_url = geminiReviewPackFile.getUrl();
  createDeepReviewArtifact(folders.outputs, cleanedJobId, report, browserReport, { suffix });
  report.job_state = report.missing_evidence_queue && report.missing_evidence_queue.length ? JOB_STATE_MISSING_EVIDENCE_OPEN : JOB_STATE_RERUN_COMPLETE;
  writeJobMemory(folders, report, browserReport);
  upsertTextFile(folders.outputs, `${cleanedJobId}-final-report.json`, JSON.stringify(report, null, 2), MimeType.PLAIN_TEXT);

  let emailDelivery = missingUserEmailDelivery(cleanedJobId);
  if (isValidEmail(recipient)) {
    try {
      emailDelivery = sendReportEmail(recipient, cleanedJobId, report, markdownFile.getBlob(), report.result_url);
    } catch (error) {
      emailDelivery = failedEmailDelivery(recipient, cleanedJobId, error);
    }
  }
  emailDelivery = finalizeBoardroomEmailDelivery(cleanedJobId, report, emailDelivery, {
    mode: payload.mode,
    recipient,
    source: "CORRECTION_RERUN_CURRENT_JOB"
  });
  report.email_delivery = emailDelivery;
  upsertTextFile(folders.outputs, `${cleanedJobId}-final-report.json`, JSON.stringify(report, null, 2), MimeType.PLAIN_TEXT);
  writeJobState(folders, newJobState(cleanedJobId, report.job_state, {
    mode: payload.mode,
    email: recipient,
    report_quality_status: report.report_quality_status,
    finding_count: (browserReport.findings || []).length,
    missing_evidence_count: (report.missing_evidence_queue || []).length,
    correction_count: report.correction_count,
    rerun_count: report.rerun_count,
    email_status: emailDelivery.email_status || ""
  }));
  appendBoardroomAuditRow({
    timestamp: startedAt,
    job_id: cleanedJobId,
    mode: payload.mode,
    email: recipient,
    received_file_count: (correctionFiles || []).length,
    accepted_file_count: acceptedCorrections.length,
    rejected_files: rejectedCorrections,
    finding_count: (browserReport.findings || []).length,
    gemini_status: verifierResult.verification_status || verifierResult.status || "UNKNOWN",
    drive_folder: folders.job.getUrl(),
    result_url: report.result_url,
    result_access_key: accessKey,
    email_source_mode: report.email_source_mode,
    source_job_id: cleanedJobId,
    source_job_folder_url: folders.job.getUrl(),
    source_final_report_url: report.source_final_report_url,
    submitter_email_source: "CORRECTION_FORM",
    report_quality_status: report.report_quality_status,
    input_classification_status: report.input_classification_status,
    input_relevance_reason: report.input_relevance_reason,
    gemini_relevance_status: report.gemini_relevance_status,
    gemini_calls_used_today: report.gemini_calls_used_today,
    analysis_generated: report.analysis_generated,
    job_state: report.job_state,
    source_files: boardroomSourceFileNames(savedFiles),
    extraction_status: JOB_STATE_EXTRACTION_COMPLETE,
    verifier_status: (browserReport.deterministic_verifier_result || {}).verification_status || "",
    missing_evidence_count: (report.missing_evidence_queue || []).length,
    correction_count: report.correction_count,
    rerun_count: report.rerun_count,
    human_review_status: report.human_review_status || HUMAN_REVIEW_PENDING,
    result_url_health: report.result_url_health,
    email_delivery: emailDelivery
  });
  return {
    ok: true,
    job_id: cleanedJobId,
    accepted_correction_count: acceptedCorrections.length,
    rejected_correction_count: rejectedCorrections.length,
    finding_count: (browserReport.findings || []).length,
    rerun_count: report.rerun_count,
    job_state: report.job_state,
    email_status: emailDelivery.email_status,
    email_to: emailDelivery.email_to || "",
    email_error: emailDelivery.email_error || "",
    result_url: report.result_url || "",
    missing_evidence_count: (report.missing_evidence_queue || []).length,
    drive_folder: folders.job.getUrl()
  };
}

function installBoardroomFormTrigger() {
  const props = PropertiesService.getScriptProperties();
  const formId = props.getProperty("BOARDROOM_FORM_ID");
  if (!formId) throw new Error("BOARDROOM_FORM_ID script property is required.");
  const form = FormApp.openById(formId);
  const existing = ScriptApp.getProjectTriggers().filter((trigger) => {
    const handler = trigger.getHandlerFunction && trigger.getHandlerFunction();
    return handler === "onFormSubmit" || handler === "installBoardroomFormTrigger";
  });
  existing.forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger("onFormSubmit").forForm(form).onFormSubmit().create();
  return { ok: true, form_id: formId, trigger: "onFormSubmit", deleted_existing_triggers: existing.length };
}

function installBoardroomCorrectionFormTrigger() {
  const props = PropertiesService.getScriptProperties();
  const formId = props.getProperty("BOARDROOM_CORRECTION_FORM_ID");
  if (!formId) throw new Error("BOARDROOM_CORRECTION_FORM_ID script property is required.");
  const form = FormApp.openById(formId);
  const existing = ScriptApp.getProjectTriggers().filter((trigger) => {
    const handler = trigger.getHandlerFunction && trigger.getHandlerFunction();
    return handler === "onCorrectionFormSubmit" || handler === "installBoardroomCorrectionFormTrigger";
  });
  existing.forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger("onCorrectionFormSubmit").forForm(form).onFormSubmit().create();
  return { ok: true, form_id: formId, trigger: "onCorrectionFormSubmit", deleted_existing_triggers: existing.length };
}

function serveBoardroomResult(params) {
  const jobId = String(params.job_id || "").trim();
  const key = String(params.key || "").trim();
  const format = String(params.format || "html").toLowerCase();
  if (!/^form-\d{8}-\d{6}-[a-zA-Z0-9-]{8}$|^cv-[a-zA-Z0-9-]+$/.test(jobId)) {
    return resultErrorResponse(404, "Report not found.", format);
  }
  if (!key || key.length < 32) return resultErrorResponse(403, "Invalid or missing access key.", format);
  const report = loadReportForJob(jobId);
  if (!report) return resultErrorResponse(404, "Report not found.", format);
  if (String(report.result_access_key || "") !== key) return resultErrorResponse(403, "Invalid or missing access key.", format);
  const sanitized = sanitizeReportForViewer(report);
  if (format === "json") return jsonResponse({ ok: true, status: 200, report: sanitized });
  return HtmlService.createHtmlOutput(renderBoardroomResultHtml(sanitized))
    .setTitle(`Constrovet Report ${jobId}`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function resultErrorResponse(status, message, format) {
  if (String(format || "").toLowerCase() === "json") return jsonResponse({ ok: false, status, error: message });
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Constrovet Report</title></head><body style="margin:0;font-family:Arial,sans-serif;background:#f7f5f1;color:#172026"><main style="max-width:760px;margin:0 auto;padding:48px 20px"><p style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#64748b">Constrovet</p><h1 style="font-size:28px;margin:8px 0 12px">${status}</h1><p style="font-size:16px;line-height:1.6">${escapeHtml(message)}</p><p style="font-size:13px;color:#66737d">Use the private report link sent by email. Reports are not publicly listed.</p></main></body></html>`;
  return HtmlService.createHtmlOutput(html).setTitle(`Constrovet Report ${status}`);
}

function loadReportForJob(jobId) {
  const projectFolder = findProjectFolder(jobId);
  if (!projectFolder) return null;
  const outputs = findChildFolder(projectFolder, "outputs");
  if (!outputs) return null;
  const files = outputs.getFilesByName(`${jobId}-final-report.json`);
  if (!files.hasNext()) return null;
  try {
    return JSON.parse(files.next().getBlob().getDataAsString());
  } catch (error) {
    return null;
  }
}

function findProjectFolder(jobId) {
  const root = findChildFolder(DriveApp.getRootFolder(), CONSTROVET_ROOT_FOLDER);
  if (!root) return null;
  const projects = findChildFolder(root, CONSTROVET_PROJECTS_FOLDER);
  if (!projects) return null;
  return findChildFolder(projects, jobId);
}

function findChildFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : null;
}

function sanitizeReportForViewer(report) {
  const browserReport = report.browser_report || {};
  return {
    job_id: report.job_id,
    mode: report.mode,
    generated_at: report.generated_at,
    result_url: report.result_url || "",
    result_url_health: report.result_url_health || resultUrlHealth(report.result_url || ""),
    report_quality_status: report.report_quality_status || browserReport.report_quality_status || "",
    input_classification_status: browserReport.input_classification_status || report.input_classification_status || report.report_quality_status || "",
    input_relevance_reason: browserReport.input_relevance_reason || report.input_relevance_reason || "",
    gemini_relevance_status: browserReport.gemini_relevance_status || report.gemini_relevance_status || "NOT_RUN",
    gemini_calls_used_today: browserReport.gemini_calls_used_today || report.gemini_calls_used_today || 0,
    analysis_generated: Boolean(browserReport.analysis_generated || report.analysis_generated),
    documents_processed_count: report.documents_processed_count || browserReport.documents_processed_count || 0,
    documents_with_no_signal: report.documents_with_no_signal || browserReport.documents_with_no_signal || 0,
    document_outcomes: browserReport.document_outcomes || [],
    executive_brief: browserReport.executive_brief || {},
    findings: browserReport.findings || [],
    top_5_actions: browserReport.top_5_actions || [],
    recoverable_cost_exposure: browserReport.recoverable_cost_exposure || {},
    immediate_control_failures: browserReport.immediate_control_failures || [],
    missing_evidence_blocking_recovery: browserReport.missing_evidence_blocking_recovery || [],
    missing_evidence_queue: report.missing_evidence_queue || browserReport.missing_evidence_queue || [],
    executive_action_plan: browserReport.executive_action_plan || {},
    honesty_check: browserReport.honesty_check || {},
    gemini_verifier_result: report.gemini_verifier_result || {},
    deterministic_verifier_result: browserReport.deterministic_verifier_result || {},
    job_state: report.job_state || "",
    correction_count: report.correction_count || 0,
    rerun_count: report.rerun_count || 0,
    human_review_status: report.human_review_status || "",
    evidence_loop: report.evidence_loop || {},
    form_intake: report.form_intake || {},
    generated_files: {
      executive_report_url: report.generated_files && report.generated_files.executive_report_url ? report.generated_files.executive_report_url : "",
      final_report_url: report.generated_files && report.generated_files.final_report_url ? report.generated_files.final_report_url : "",
      browser_report_url: report.generated_files && report.generated_files.browser_report_url ? report.generated_files.browser_report_url : "",
      gemini_review_pack_url: report.generated_files && report.generated_files.gemini_review_pack_url ? report.generated_files.gemini_review_pack_url : "",
      deep_review_url: report.generated_files && report.generated_files.deep_review_url ? report.generated_files.deep_review_url : ""
    }
  };
}

function renderBoardroomResultHtml(report) {
  const findings = report.findings || [];
  const grouped = groupFindingsByCategory(findings);
  const leakageTotal = (grouped.LEAKAGE_AND_OVERRUN || []).reduce((sum, item) => sum + Number(item.amount_inr || 0), 0);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Constrovet Boardroom Result</title>
  <style>
    :root{color-scheme:light;--ink:#172026;--muted:#66737d;--line:#d9ded8;--paper:#fff;--wash:#f7f5f1;--green:#047857;--amber:#b45309;--sky:#0369a1}
    *{box-sizing:border-box}body{margin:0;background:var(--wash);color:var(--ink);font-family:Arial,Helvetica,sans-serif}main{max-width:1120px;margin:0 auto;padding:32px 18px 56px}.eyebrow{margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--green)}h1{margin:0;font-size:clamp(28px,5vw,48px);line-height:1.05;letter-spacing:0}h2{margin:0 0 14px;font-size:22px}h3{margin:0 0 8px;font-size:17px}.lead{max-width:780px;margin:16px 0 0;color:var(--muted);font-size:17px;line-height:1.6}.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:24px 0}.tile,.card{border:1px solid var(--line);border-radius:8px;background:var(--paper);padding:16px}.tile span{display:block;color:var(--muted);font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:.08em}.tile strong{display:block;margin-top:6px;font-size:18px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:18px}.section{margin-top:28px}.finding{border-top:1px solid var(--line);padding:16px 0}.finding:first-child{border-top:0;padding-top:0}.tag{display:inline-block;border-radius:6px;padding:5px 8px;font-size:12px;font-weight:700}.tag.leakage{background:#fee2e2;color:#991b1b}.tag.baseline{background:#dbeafe;color:#1d4ed8}.tag.esg{background:#dcfce7;color:#166534}.quote{margin-top:10px;border-left:3px solid var(--green);padding-left:12px;color:#3f4b53;font-size:14px;line-height:1.55}.muted{color:var(--muted)}.actions{padding-left:18px}.actions li{margin:8px 0}.links a{display:inline-block;margin:6px 10px 0 0;color:var(--sky);font-weight:700;text-decoration:none}@media(max-width:640px){main{padding-top:24px}.card,.tile{padding:14px}}
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Private Constrovet Boardroom Result</p>
    <h1>${escapeHtml(report.executive_brief.headline || "Analysed project report")}</h1>
    <p class="lead">This report is generated from uploaded Workspace intake evidence. Review each cited span before commercial, legal, or recovery action.</p>
    <div class="meta">
      <div class="tile"><span>Job</span><strong>${escapeHtml(report.job_id)}</strong></div>
      <div class="tile"><span>Mode</span><strong>${escapeHtml(report.mode)}</strong></div>
      <div class="tile"><span>Findings</span><strong>${findings.length}</strong></div>
      <div class="tile"><span>Leakage / overrun</span><strong>INR ${formatInr(leakageTotal)}</strong></div>
    </div>
    ${renderActionPlanHtml(report)}
    ${renderDocumentOutcomesResultHtml(report)}
    ${boardroomIsNoAnalysisNotice(report) ? "" : renderFindingGroupHtml("Leakage And Overrun", grouped.LEAKAGE_AND_OVERRUN || [], "leakage")}
    ${boardroomIsNoAnalysisNotice(report) ? "" : renderFindingGroupHtml("Baseline Budget", grouped.BASELINE_BUDGET || [], "baseline")}
    ${boardroomIsNoAnalysisNotice(report) ? "" : renderFindingGroupHtml("ESG Metrics", grouped.ESG_METRIC || [], "esg")}
    ${renderHonestyHtml(report)}
    ${renderReportLinksHtml(report)}
  </main>
</body>
</html>`;
}

function renderDocumentOutcomesResultHtml(report) {
  if (report.report_quality_status !== REPORT_EVIDENCE_INTAKE_EXCEPTION && !(report.document_outcomes || []).length) return "";
  const outcomes = report.document_outcomes || [];
  const items = outcomes.length
    ? outcomes.map((item) => `<li><strong>${escapeHtml(item.file || "unknown")}:</strong> ${escapeHtml(item.status || "UNKNOWN")}${item.reason ? ` - ${escapeHtml(item.reason)}` : ""}</li>`).join("")
    : "<li class=\"muted\">No source document outcomes were recorded.</li>";
  return `<section class="section card"><h2>Evidence Intake Status</h2>
    <p class="muted">Quality: ${escapeHtml(report.report_quality_status || "UNKNOWN")} | Processed: ${escapeHtml(report.documents_processed_count || 0)} | No-signal: ${escapeHtml(report.documents_with_no_signal || 0)}</p>
    <ul class="actions">${items}</ul>
  </section>`;
}

function groupFindingsByCategory(findings) {
  return (findings || []).reduce((groups, finding) => {
    const key = finding.financial_category || "UNCATEGORIZED";
    if (!groups[key]) groups[key] = [];
    groups[key].push(finding);
    return groups;
  }, {});
}

function renderActionPlanHtml(report) {
  if (boardroomIsNoAnalysisNotice(report)) return "";
  const decisionPack = report.executive_decision_pack || {};
  const actions = report.executive_action_plan || {};
  const periods = ["7_days", "30_days", "90_days"];
  const decisionHtml = `<section class="section card"><h2>Board Decision Required</h2>
    <p>${escapeHtml(decisionPack.decision_required || boardroomBoardDecisionRequired(report))}</p>
    <p class="muted">INR at stake from cited leakage/overrun: INR ${formatInr(decisionPack.money_at_stake_inr || 0)} | Evidence: ${escapeHtml(decisionPack.evidence_status || "CITED_EVIDENCE_REVIEW_REQUIRED")} | Blocked by missing evidence: ${decisionPack.blocked_by_missing_evidence ? "Yes" : "No"}</p>
  </section>`;
  const actionHtml = `<section class="section card"><h2>7 / 30 / 90 Actions</h2><div class="grid">${periods.map((period) => {
    const items = actions[period] || [];
    return `<div><h3>${escapeHtml(period.replace("_", " "))}</h3><ol class="actions">${items.length ? items.map((item) => `<li><strong>${escapeHtml(item.title || "Action")}:</strong> ${escapeHtml(item.recommendation || item.action || "")}<br><span class="muted">Owner: ${escapeHtml(item.owner_role || "Project Controls")} | Evidence: ${escapeHtml(item.evidence_status || "CITED_EVIDENCE_REVIEW_REQUIRED")} | Recovery-ready: ${item.blocked_by_missing_evidence ? "No" : "Yes"}</span></li>`).join("") : "<li class=\"muted\">No action produced for this horizon.</li>"}</ol></div>`;
  }).join("")}</div></section>`;
  const citations = decisionPack.citations || [];
  const citationHtml = `<section class="section card"><h2>Citations Behind Actions</h2><ul class="actions">${citations.length ? citations.map((citation) => `<li>${escapeHtml(citation.file || "unknown")} (${escapeHtml(citation.page_or_sheet || "unknown")}): "${escapeHtml(citation.quoted_span || "")}"</li>`).join("") : "<li class=\"muted\">No action citations were available.</li>"}</ul></section>`;
  return decisionHtml + actionHtml + citationHtml;
}

function renderFindingGroupHtml(title, findings, tagClass) {
  return `<section class="section card"><h2>${escapeHtml(title)} (${findings.length})</h2>${findings.length ? findings.map((finding) => renderFindingHtml(finding, tagClass)).join("") : "<p class=\"muted\">No cited findings in this category.</p>"}</section>`;
}

function renderFindingHtml(finding, tagClass) {
  const citation = (finding.citations || [])[0] || {};
  const calculation = finding.calculation || {};
  return `<article class="finding">
    <span class="tag ${tagClass}">${escapeHtml(finding.financial_category || "FINDING")}</span>
    <h3>${escapeHtml(finding.statement || "")}</h3>
    <p class="muted">Amount: INR ${formatInr(finding.amount_inr || 0)} | Days: ${escapeHtml(finding.days || 0)} | Confidence: ${escapeHtml(finding.confidence || "LOW")}</p>
    ${calculation.formula ? `<p class="muted">Calculation: ${escapeHtml(calculation.formula)} = INR ${formatInr(calculation.difference || 0)}</p>` : ""}
    <p class="quote">${escapeHtml(citation.file || "unknown")} (${escapeHtml(citation.page_or_sheet || "unknown")}): "${escapeHtml(citation.quoted_span || "")}"</p>
  </article>`;
}

function renderHonestyHtml(report) {
  const honesty = report.honesty_check || {};
  const missing = honesty.missing_evidence || [];
  const unprocessed = honesty.documents_not_processed || [];
  return `<section class="section card"><h2>Honesty Check</h2>
    <h3>Missing Evidence</h3><ul class="actions">${missing.length ? missing.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li class=\"muted\">No missing evidence listed.</li>"}</ul>
    <h3>Documents Not Processed</h3><ul class="actions">${unprocessed.length ? unprocessed.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li class=\"muted\">No unprocessed documents listed.</li>"}</ul>
  </section>`;
}

function renderReportLinksHtml(report) {
  const files = report.generated_files || {};
  const links = [
    files.executive_report_url ? `<a href="${escapeHtml(files.executive_report_url)}" target="_blank" rel="noopener">Executive Markdown</a>` : "",
    files.final_report_url ? `<a href="${escapeHtml(files.final_report_url)}" target="_blank" rel="noopener">Final JSON</a>` : "",
    files.browser_report_url ? `<a href="${escapeHtml(files.browser_report_url)}" target="_blank" rel="noopener">Browser JSON</a>` : "",
    files.gemini_review_pack_url ? `<a href="${escapeHtml(files.gemini_review_pack_url)}" target="_blank" rel="noopener">Optional Gemini Review Pack</a>` : ""
  ].filter(Boolean).join("");
  return `<section class="section card links"><h2>Generated Files</h2>${links || "<p class=\"muted\">No Drive report links available.</p>"}</section>`;
}

function makeResultAccessKey() {
  return `${Utilities.getUuid()}${Utilities.getUuid()}`.replace(/-/g, "");
}

function buildResultUrl(jobId, accessKey) {
  const props = PropertiesService.getScriptProperties();
  const configuredBase = props.getProperty("BOARDROOM_RESULT_BASE_URL") || "";
  const serviceBase = ScriptApp.getService().getUrl() || "";
  const base = validAppsScriptResultBase(configuredBase) ? cleanResultBaseUrl(configuredBase) : (validAppsScriptResultBase(serviceBase) ? cleanResultBaseUrl(serviceBase) : "");
  if (!base) return "";
  return `${base}?job_id=${encodeURIComponent(jobId)}&key=${encodeURIComponent(accessKey)}`;
}

function validAppsScriptResultBase(url) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/i.test(String(url || ""));
}

function cleanResultBaseUrl(url) {
  return String(url || "").split("?")[0];
}

function parseRequest(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error("Missing request body.");
  return JSON.parse(e.postData.contents);
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Invalid payload.");
  if (!["DEEP_ANALYSIS", "EMAIL_BROWSER_REPORT"].includes(payload.mode)) throw new Error("Invalid mode.");
  if (!isValidEmail(payload.email)) throw new Error("Valid email is required.");
  if (!payload.job_id || !/^cv-[a-zA-Z0-9-]+$/.test(payload.job_id)) throw new Error("Valid job_id is required.");
  if (!payload.browser_report || !Array.isArray(payload.browser_report.findings)) throw new Error("Browser report with findings[] is required.");
  if (payload.mode === "DEEP_ANALYSIS") {
    if (!Array.isArray(payload.files) || payload.files.length === 0) throw new Error("Deep Analysis requires uploaded files.");
    if (payload.files.length > MAX_FILES) throw new Error(`Upload ${MAX_FILES} files or fewer during the controlled pilot.`);
    payload.files.forEach(validateFilePayload);
  }
}

function validateFilePayload(file) {
  if (!file || !file.name || !file.base64) throw new Error("Each file needs name and base64 content.");
  const lower = String(file.name).toLowerCase();
  if (!lower.endsWith(".pdf") && !lower.endsWith(".csv")) throw new Error(`${file.name} is not a PDF or CSV file.`);
  if (Number(file.size_bytes || 0) > MAX_FILE_BYTES) throw new Error(`${file.name} exceeds the 10 MB Deep Analysis limit.`);
}

function makeBoardroomJobId(date) {
  const stamp = Utilities.formatDate(date || new Date(), "GMT", "yyyyMMdd-HHmmss");
  const random = Utilities.getUuid().slice(0, 8);
  return `form-${stamp}-${random}`;
}

function getBoardroomSubmitterEmail(e) {
  return getBoardroomSubmitterEmailInfo(e).email;
}

function getBoardroomSubmitterEmailInfo(e) {
  if (e && e.response && typeof e.response.getRespondentEmail === "function") {
    const email = e.response.getRespondentEmail();
    if (isValidEmail(email)) return { email: String(email).trim(), source: "FORM_RESPONDENT_EMAIL" };
  }
  const candidates = [];
  getBoardroomItemResponses(e).forEach((item) => {
    const title = String(item.title || "").toLowerCase();
    if (/email|e-mail|mail/.test(title)) candidates.push(String(item.response || ""));
  });
  const email = candidates.map((item) => item.trim()).find(isValidEmail) || "";
  return email ? { email, source: "FORM_EMAIL_FIELD" } : { email: "", source: "MISSING" };
}

// Defence in depth. Even with the pattern above corrected, a single
// unreadable Drive reference must not destroy an entire client submission --
// that is what happened at 00:03 and again at 11:19, and both times the
// client received nothing at all. Partial failure now continues with the
// files that ARE readable; total failure still fails loudly, because an
// empty report is worse than an error.
function getBoardroomFilesFromEvent(e) {
  const byId = {};
  const attempted = [];
  const skipped = [];
  getBoardroomItemResponses(e).forEach((item) => {
    extractDriveFileIds(item.response).forEach((id) => {
      if (byId[id]) return;
      attempted.push(id);
      try {
        byId[id] = driveFileInfo(id, item.title);
      } catch (error) {
        skipped.push(id);
      }
    });
  });
  const files = Object.keys(byId).map((id) => byId[id]);
  if (skipped.length) {
    console.warn(`Boardroom intake skipped ${skipped.length} unreadable Drive reference(s): ${skipped.join(", ")}`);
  }
  if (!files.length && attempted.length) {
    throw new Error(`None of the ${attempted.length} uploaded file reference(s) could be opened. First failures: ${skipped.slice(0, 5).join(", ")}`);
  }
  return files;
}

function getBoardroomItemResponses(e) {
  if (!e || !e.response || typeof e.response.getItemResponses !== "function") return [];
  return e.response.getItemResponses().map((itemResponse) => ({
    title: itemResponse.getItem().getTitle(),
    response: itemResponse.getResponse()
  }));
}

function extractDriveFileIds(value) {
  const ids = [];
  if (Array.isArray(value)) {
    value.forEach((item) => extractDriveFileIds(item).forEach((id) => ids.push(id)));
    return ids;
  }
  const text = String(value || "");
  if (!text) return ids;
  const patterns = [
    /\/file\/d\/([A-Za-z0-9_-]{20,})/g,
    /[?&]id=([A-Za-z0-9_-]{20,})/g,
    // NOT \b...\b: a hyphen is not a word character, so a Drive ID ending in
    // "-" had its last character severed, yielding a phantom ID one character
    // short. driveFileInfo was then called on the phantom and threw
    // "Invalid file or folder ID", killing the whole submission. These
    // lookarounds treat "-" as part of the token, which it is.
    /(?<![A-Za-z0-9_-])([A-Za-z0-9_-]{25,})(?![A-Za-z0-9_-])/g
  ];
  patterns.forEach((regex) => {
    let match;
    while ((match = regex.exec(text))) ids.push(match[1]);
  });
  return [...new Set(ids)];
}

function driveFileInfo(fileId, sourceQuestion) {
  const file = DriveApp.getFileById(fileId);
  return {
    id: fileId,
    name: file.getName(),
    mime_type: file.getMimeType(),
    size_bytes: Number(file.getSize() || 0),
    drive_url: file.getUrl(),
    source_question: sourceQuestion || ""
  };
}

function boardroomFileKind(fileInfo) {
  const lower = String(fileInfo && fileInfo.name ? fileInfo.name : "").toLowerCase();
  const mime = String(fileInfo && fileInfo.mime_type ? fileInfo.mime_type : "").toLowerCase();
  if (lower.endsWith(".csv") || mime === "text/csv" || mime === String(MimeType.CSV).toLowerCase()) return "csv";
  if (lower.endsWith(".pdf") || mime === String(MimeType.PDF).toLowerCase()) return "pdf";
  if (/\.(jpe?g|png|webp)$/i.test(lower) || /^image\/(jpeg|png|webp)$/i.test(mime)) return "image";
  return "unsupported";
}

function reviewBoardroomFile(fileInfo, acceptedCount, deepAnalysisEnabled, responseFolderId) {
  if (!fileInfo || !fileInfo.id) return { accept: false, reason: "MISSING_FILE_ID" };
  const name = String(fileInfo.name || "");
  const kind = boardroomFileKind(fileInfo);
  if (kind === "unsupported") return { accept: false, reason: "UNSUPPORTED_FILE_TYPE" };
  if (Number(fileInfo.size_bytes || 0) > MAX_FILE_BYTES) return { accept: false, reason: "FILE_EXCEEDS_10_MB" };
  if (responseFolderId && !boardroomFileHasParent(fileInfo.id, responseFolderId)) return { accept: false, reason: "OUTSIDE_BOARDROOM_RESPONSE_FOLDER" };
  if (privateLookingFileName(name)) return { accept: false, reason: "PRIVATE_LOOKING_FILENAME", quarantine: true };
  const max = deepAnalysisEnabled ? BOARDROOM_DEEP_ANALYSIS_MAX_FILES : BOARDROOM_MAX_FILES;
  if (acceptedCount >= max) return { accept: false, reason: `FILE_LIMIT_EXCEEDED_${max}` };
  return { accept: true };
}

function boardroomFileHasParent(fileId, folderId) {
  try {
    const parents = DriveApp.getFileById(fileId).getParents();
    while (parents.hasNext()) {
      if (parents.next().getId() === folderId) return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

function privateLookingFileName(name) {
  return /medical|certificate|aadhaar|aadhar|pan card|passport|bank|salary|personal|plot|land|document\s*\d+/i.test(String(name || ""));
}

function quarantineBoardroomFile(fileInfo, reason) {
  try {
    const folder = getOrCreateFolder(getOrCreateFolder(DriveApp.getRootFolder(), CONSTROVET_ROOT_FOLDER), "quarantine");
    const copy = DriveApp.getFileById(fileInfo.id).makeCopy(`${reason}-${safeFileName(fileInfo.name)}`, folder);
    return copy.getUrl();
  } catch (error) {
    return "";
  }
}

function copyBoardroomFileToInput(fileInfo, inputFolder) {
  const source = DriveApp.getFileById(fileInfo.id);
  const copied = source.makeCopy(safeFileName(fileInfo.name), inputFolder);
  return {
    id: copied.getId(),
    source_id: fileInfo.id,
    name: copied.getName(),
    mime_type: copied.getMimeType(),
    size_bytes: Number(copied.getSize() || fileInfo.size_bytes || 0),
    drive_url: copied.getUrl()
  };
}

function listBoardroomFolderFiles(folder) {
  const files = [];
  const iterator = folder.getFiles();
  while (iterator.hasNext()) {
    const file = iterator.next();
    files.push({
      id: file.getId(),
      name: file.getName(),
      mime_type: file.getMimeType(),
      size_bytes: Number(file.getSize() || 0),
      drive_url: file.getUrl()
    });
  }
  return files;
}

function archiveCurrentOutputs(folders, jobId) {
  const stamp = Utilities.formatDate(new Date(), "GMT", "yyyyMMdd-HHmmss");
  const archiveFolder = getOrCreateFolder(folders.archive, `outputs-${stamp}`);
  const names = [
    `${jobId}-browser-report.json`,
    `${jobId}-executive-report.md`,
    `${jobId}-final-report.json`,
    `${jobId}-optional-gemini-review-pack.md`,
    `${jobId}-deep-review.json`,
    `${jobId}-job-state.json`
  ];
  names.forEach((name) => {
    const files = folders.outputs.getFilesByName(name);
    while (files.hasNext()) {
      const file = files.next();
      file.makeCopy(name, archiveFolder);
    }
  });
  writeJobState(folders, newJobState(jobId, JOB_STATE_ARCHIVED, {
    archived_at: new Date().toISOString(),
    archive_folder_url: archiveFolder.getUrl()
  }));
  return archiveFolder.getUrl();
}

function extractBoardroomDocument(fileInfo) {
  const kind = boardroomFileKind(fileInfo);
  if (kind === "csv") {
    const text = DriveApp.getFileById(fileInfo.id).getBlob().getDataAsString();
    return {
      id: fileInfo.id,
      file: fileInfo.name,
      type: "csv",
      mime_type: fileInfo.mime_type || "text/csv",
      size_bytes: Number(fileInfo.size_bytes || 0),
      pages: parseBoardroomCsvPages(text),
      raw_text: String(text || "").slice(0, 10000)
    };
  }
  if (kind === "pdf") {
    const extracted = extractPdfTextWithOptionalOcr(fileInfo);
    if (extracted.text) {
      return {
        id: fileInfo.id,
        file: fileInfo.name,
        type: "pdf",
        mime_type: fileInfo.mime_type || MimeType.PDF,
        size_bytes: Number(fileInfo.size_bytes || 0),
        pages: [{ label: "Workspace OCR", text: extracted.text }]
      };
    }
    return {
      id: fileInfo.id,
      file: fileInfo.name,
      type: "pdf",
      mime_type: fileInfo.mime_type || MimeType.PDF,
      size_bytes: Number(fileInfo.size_bytes || 0),
      pages: [],
      extraction_error: extracted.reason || "TEXT_EXTRACTION_UNAVAILABLE"
    };
  }
  if (kind === "image") {
    return {
      id: fileInfo.id,
      file: fileInfo.name,
      type: "image",
      mime_type: fileInfo.mime_type || mimeTypeForName(fileInfo.name),
      size_bytes: Number(fileInfo.size_bytes || 0),
      pages: []
    };
  }
  return { id: fileInfo.id, file: fileInfo.name, type: "unknown", pages: [], extraction_error: "UNSUPPORTED_FILE_TYPE" };
}

// --- Extraction resilience + technical-failure separation (2026-08-31) ---
// A Drive throttle ("User rate limit exceeded") used to make a readable PDF
// look like absent evidence: the document was never read, and the client was
// told their evidence was missing. That is wrong advice stated confidently,
// which is worse than no report. Two changes below:
//   1. transient Drive errors are retried with exponential backoff;
//   2. if a document still cannot be READ, that is recorded as a technical
//      failure -- never as a conclusion about what the client supplied.
function boardroomIsTransientDriveError_(error) {
  const message = String(error && error.message ? error.message : error);
  return /rate limit|ratelimitexceeded|userratelimitexceeded|quota|backenderror|internal error|try again|timed out|timeout|unavailable|\b429\b|\b500\b|\b503\b/i.test(message);
}

function extractPdfTextWithOptionalOcr(fileInfo) {
  if (typeof Drive === "undefined" || !Drive.Files || typeof Drive.Files.copy !== "function") {
    return { text: "", reason: "TEXT_EXTRACTION_UNAVAILABLE_ADVANCED_DRIVE_SERVICE_DISABLED" };
  }
  const maxAttempts = 3;
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let docId = "";
    try {
      const resource = { title: `${fileInfo.name} OCR`, mimeType: MimeType.GOOGLE_DOCS };
      const converted = Drive.Files.copy(resource, fileInfo.id, { ocr: true, ocrLanguage: "en" });
      docId = converted.id;
      const body = DocumentApp.openById(docId).getBody();
      return { text: body ? body.getText() : "", reason: "", attempts: attempt };
    } catch (error) {
      lastError = error;
    } finally {
      if (docId) {
        try {
          DriveApp.getFileById(docId).setTrashed(true);
        } catch (cleanupError) {
          // Leave converted OCR artifact in Drive if cleanup fails.
        }
      }
    }
    if (attempt >= maxAttempts || !boardroomIsTransientDriveError_(lastError)) break;
    Utilities.sleep(Math.round(Math.pow(2, attempt - 1) * 1500 + Math.random() * 500));
  }
  const message = String(lastError && lastError.message ? lastError.message : lastError).slice(0, 120);
  return { text: "", reason: `TEXT_EXTRACTION_UNAVAILABLE_${message}`, attempts: maxAttempts };
}

function boardroomTechnicalExtractionFailures_(report) {
  const queue = (report && report.missing_evidence_queue) || [];
  const notes = [];
  queue.forEach(function (item) {
    const text = String((item && (item.missing_item || item.missingItem)) || item || "");
    if (/TEXT_EXTRACTION_UNAVAILABLE/i.test(text)) notes.push(text);
  });
  return notes;
}

function heldForExtractionFailureDelivery_(jobId, email, notes) {
  const delivery = emptyEmailDelivery(email, jobId);
  delivery.email_status = "EMAIL_HELD_EXTRACTION_FAILURE";
  delivery.email_error = `Client report withheld: ${notes.length} document(s) could not be read for technical reasons, so any missing-evidence conclusion would be unreliable. ${notes.join(" | ")}`.slice(0, 900);
  return delivery;
}

/* ============================================================
   HOLD-AND-ALERT for the FORM-TRIGGER validation path — mirrors
   heldForExtractionFailureDelivery_ above. Added so that
   handleBoardroomFormSubmit (form-trigger intake) can hold and
   alert on a validation failure the same way doPost (API intake)
   already does, instead of silently sending the client an
   unverified figure.
   ============================================================ */
function heldForValidationFailureDelivery_(jobId, submitterEmail, validationResult, folders) {
  // Group repeated errors so 7 duplicate documents read as 1 root cause.
  const grouped = {};
  validationResult.errors.forEach(msg => {
    const type = String(msg).split(":")[0];
    grouped[type] = (grouped[type] || 0) + 1;
  });
  const summary = Object.keys(grouped)
    .map(k => `${k} x${grouped[k]}`)
    .join(", ");

  try {
    MailApp.sendEmail(
      VALIDATION_ALERT_EMAIL,
      `[VALIDATION FAILED] Constrovet ${jobId}`,
      `Report for job ${jobId} FAILED output validation and was NOT sent to the client.\n\n` +
      `Summary: ${summary}\n\n` +
      `Errors (${validationResult.errors.length}):\n  ` +
      validationResult.errors.join("\n  ") + `\n\n` +
      `Warnings (${validationResult.warnings.length}):\n  ` +
      (validationResult.warnings.join("\n  ") || "none") + `\n\n` +
      `Intended recipient: ${submitterEmail || "(none)"}\n` +
      `Job folder: ${folders.job.getUrl()}\n` +
      `Outputs folder: ${folders.outputs.getUrl()}\n\n` +
      `The full report and validation detail are saved as ` +
      `${jobId}-VALIDATION_FAILED.json in the outputs folder.`
    );
  } catch (err) {
    Logger.log("Validation alert email failed for " + jobId + ": " + err);
  }

  return {
    email_to: submitterEmail || "",
    email_cc: "",
    email_subject: "",
    email_sent_at: "",
    email_status: "HELD_VALIDATION_FAILED",
    email_error: summary
  };
}

function parseBoardroomCsvPages(text) {
  const rows = parseBoardroomCsv(text);
  if (!rows.length) return [];
  const headers = rows[0].map((item) => String(item || "").trim());
  return rows.slice(1).map((row, index) => {
    const cells = headers.map((header, cellIndex) => `${header}: ${row[cellIndex] || ""}`);
    return {
      label: `CSV row ${index + 2}`,
      text: cells.join(" | "),
      headers,
      row
    };
  });
}

function parseBoardroomCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const input = String(text || "");
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function buildBoardroomOutput(documents, rejectedFiles) {
  const findings = [];
  const documentsNotProcessed = [];
  const documentOutcomes = [];
  const classificationSummary = newBoardroomClassificationSummary();
  (documents || []).forEach((document) => {
    let found = 0;
    let textLength = 0;
    (document.pages || []).forEach((page) => {
      if (!page.text) return;
      textLength += String(page.text || "").length;
      const pageFindings = extractBoardroomFindings(document.file, page.label, page.text, page);
      found += pageFindings.length;
      findings.push(...pageFindings);
    });
    const classification = classifyBoardroomDocument(document, found, textLength);
    if (!found) documentsNotProcessed.push(classification.reason);
    recordBoardroomClassification(classificationSummary, classification);
    documentOutcomes.push({
      file: document.file,
      type: document.type || "unknown",
      pages_processed: (document.pages || []).length,
      text_length: textLength,
      finding_count: found,
      status: classification.status,
      reason: classification.reason,
      gemini_relevance_status: classification.gemini_relevance_status || "NOT_RUN"
    });
  });
  (rejectedFiles || []).forEach((file) => {
    const classification = classifyRejectedBoardroomFile(file);
    documentsNotProcessed.push(classification.reason);
    recordBoardroomClassification(classificationSummary, classification);
    documentOutcomes.push({
      file: file.name || file.id,
      type: "rejected",
      pages_processed: 0,
      text_length: 0,
      finding_count: 0,
      status: classification.status,
      reason: classification.reason,
      gemini_relevance_status: classification.gemini_relevance_status || "NOT_RUN"
    });
  });
  const rawFindings = scoreBoardroomFindings(dedupeBoardroomFindings(findings).slice(0, 80));
  const deterministicVerifierResult = runDeterministicVerifier(rawFindings);
  const citedFindings = scoreBoardroomFindings(deterministicVerifierResult.verified_findings);
  const reportQualityStatus = determineBoardroomReportStatus(citedFindings, documentOutcomes);
  const documentsWithNoSignal = documentOutcomes.filter((item) => item.status !== "STRUCTURED_CONSTRUCTION_EVIDENCE").length;
  const executiveActionPlan = reportQualityStatus === REPORT_EXECUTIVE_ACTION_PLAN || reportQualityStatus === REPORT_EVIDENCE_INTAKE_EXCEPTION
    ? buildBoardroomExecutiveActionPlan(citedFindings)
    : {};
  const missingEvidence = reportQualityStatus === REPORT_EXECUTIVE_ACTION_PLAN || reportQualityStatus === REPORT_EVIDENCE_INTAKE_EXCEPTION
    ? buildBoardroomMissingEvidence(citedFindings, documentsNotProcessed)
    : documentsNotProcessed;
  const executiveBrief = citedFindings.length
    ? buildBoardroomExecutiveBrief(citedFindings, documentsNotProcessed)
    : buildBoardroomNoFindingBrief(reportQualityStatus, documentsNotProcessed);
  const executiveDecisionPack = buildExecutiveDecisionPack({
    findings: citedFindings,
    executiveBrief,
    executiveActionPlan,
    missingEvidence,
    reportQualityStatus
  });
  const modelAuditTrail = {
    analysis_mode: "workspace_form_deterministic_rules",
    execution_layer: "Google Workspace Apps Script form trigger",
    file_handling: "Files are copied from the Google Forms response folder into a controlled Workspace project folder.",
    xai_method: [
      "Evidence windows are selected from CSV rows or extracted text containing construction cost, schedule, leakage, commercial-control, or ESG keywords.",
      "Financial categories are assigned by deterministic keyword rules.",
      "When budget and actual are both cited and actual is greater than budget, overrun is calculated as Actual - Budget.",
      "Risk score combines cash impact, category, urgency, evidence quality, and confidence; it does not create new facts.",
      "Raw uploaded documents are not sent to Gemini by default."
    ]
  };
  return {
    report_quality_status: reportQualityStatus,
    input_classification_status: reportQualityStatus,
    input_relevance_reason: classificationSummary.firstReason || "",
    gemini_relevance_status: boardroomGeminiRelevanceAggregateStatus(classificationSummary.geminiStatuses),
    gemini_calls_used_today: geminiRelevanceCallsUsedToday(),
    analysis_generated: reportQualityStatus === REPORT_EXECUTIVE_ACTION_PLAN,
    documents_processed_count: (documents || []).length,
    documents_with_no_signal: documentsWithNoSignal,
    document_outcomes: documentOutcomes,
    raw_finding_count: rawFindings.length,
    findings: citedFindings,
    deterministic_verifier_result: deterministicVerifierResult,
    executive_brief: executiveBrief,
    executive_decision_pack: executiveDecisionPack,
    top_5_actions: buildBoardroomTopExecutiveActions(citedFindings),
    recoverable_cost_exposure: buildBoardroomRecoverableCostExposure(citedFindings),
    immediate_control_failures: buildBoardroomImmediateControlFailures(citedFindings),
    missing_evidence_blocking_recovery: missingEvidence,
    executive_action_plan: executiveActionPlan,
    rationale: buildBoardroomRationale(citedFindings, modelAuditTrail),
    model_audit_trail: modelAuditTrail,
    gemini_verifier_result: {
      status: "NOT_RUN",
      reason: "Form automation creates a deterministic report first. Gemini verification runs only when ENABLE_BOARDROOM_DEEP_ANALYSIS is true.",
      allowed_input_policy: "Send only findings, cited spans, calculations, action plan, and honesty check to Gemini."
    },
    honesty_check: {
      missing_evidence: [
        "Workspace form automation is deterministic and keyword based; review citations before using findings for decisions.",
        "PDF text extraction requires the Advanced Drive service. PDFs without extracted text are listed as missing evidence."
      ],
      documents_not_processed: documentsNotProcessed,
      assumptions: [
        "Amounts are interpreted as INR when the source line uses INR, Rs, or rupee symbols.",
        "Rejected, irrelevant, unsupported, and context-only files are not counted as evidence for recovery actions."
      ]
    }
  };
}

function newBoardroomClassificationSummary() {
  return { firstReason: "", geminiStatuses: [] };
}

function recordBoardroomClassification(summary, classification) {
  if (!summary.firstReason && classification.reason) summary.firstReason = classification.reason;
  if (classification.gemini_relevance_status) summary.geminiStatuses.push(classification.gemini_relevance_status);
}

function classifyBoardroomDocument(document, findingCount, textLength) {
  const file = document.file || "unknown";
  if (findingCount > 0) {
    return {
      status: "STRUCTURED_CONSTRUCTION_EVIDENCE",
      reason: `${file}: cited construction project evidence was extracted.`,
      gemini_relevance_status: "NOT_RUN"
    };
  }
  if (document.type === "image") return classifyBoardroomImageDocument(document);
  if (document.type === "csv") return classifyBoardroomCsvDocument(document);
  if (document.type === "pdf") return classifyBoardroomPdfDocument(document, textLength);
  return {
    status: REPORT_UNSUPPORTED_FILE_TYPE,
    reason: `${file}: unsupported file type; no Constrovet analysis was generated.`,
    gemini_relevance_status: "NOT_RUN"
  };
}

function classifyRejectedBoardroomFile(file) {
  const status = String(file.reason || "") === "UNSUPPORTED_FILE_TYPE" ? REPORT_UNSUPPORTED_FILE_TYPE : REPORT_IRRELEVANT_DATA_FILE;
  return {
    status,
    reason: `${file.name || file.id}: rejected from automation (${file.reason}).`,
    gemini_relevance_status: "NOT_RUN"
  };
}

function classifyBoardroomCsvDocument(document) {
  const file = document.file || "unknown";
  const text = boardroomDocumentText(document);
  if (boardroomCsvHasConstructionHeaders(document) || boardroomQuantifiedEvidenceRe().test(text)) {
    return {
      status: REPORT_EVIDENCE_INTAKE_EXCEPTION,
      reason: boardroomDocumentNoSignalReason(document, text.length),
      gemini_relevance_status: "NOT_RUN"
    };
  }
  if (boardroomConstructionContextRe().test(text)) {
    return {
      status: REPORT_CONSTRUCTION_CONTEXT_ONLY,
      reason: `${file}: construction context was present, but no quantified budget, actual, schedule, leakage, or ESG evidence was extracted.`,
      gemini_relevance_status: "NOT_RUN"
    };
  }
  return {
    status: REPORT_IRRELEVANT_DATA_FILE,
    reason: `${file}: CSV does not contain construction project progress, cost, schedule, leakage, invoice, BOQ, or ESG evidence.`,
    gemini_relevance_status: "NOT_RUN"
  };
}

function classifyBoardroomPdfDocument(document, textLength) {
  const file = document.file || "unknown";
  const text = boardroomDocumentText(document);
  if (document.extraction_error) {
    if (boardroomHasConstructionFileNameHint(file)) {
      return {
        status: REPORT_EVIDENCE_INTAKE_EXCEPTION,
        reason: boardroomDocumentNoSignalReason(document, textLength),
        gemini_relevance_status: "NOT_RUN"
      };
    }
    return {
      status: REPORT_IRRELEVANT_DATA_FILE,
      reason: `${file}: PDF text extraction failed and the filename does not indicate construction project evidence (${document.extraction_error}).`,
      gemini_relevance_status: "NOT_RUN"
    };
  }
  if (boardroomQuantifiedEvidenceRe().test(text)) {
    return {
      status: REPORT_EVIDENCE_INTAKE_EXCEPTION,
      reason: boardroomDocumentNoSignalReason(document, textLength),
      gemini_relevance_status: "NOT_RUN"
    };
  }
  if (boardroomConstructionContextRe().test(text) || boardroomHasConstructionFileNameHint(file)) {
    return {
      status: REPORT_CONSTRUCTION_CONTEXT_ONLY,
      reason: `${file}: construction context was detected, but no quantified project progress, cost, schedule, leakage, or ESG evidence was extracted.`,
      gemini_relevance_status: "NOT_RUN"
    };
  }
  return {
    status: REPORT_IRRELEVANT_DATA_FILE,
    reason: `${file}: extracted PDF text is not related to construction project progress, cost, schedule, leakage, or ESG evidence.`,
    gemini_relevance_status: "NOT_RUN"
  };
}

function classifyBoardroomImageDocument(document) {
  const file = document.file || "unknown";
  const gemini = tryGeminiImageRelevanceClassification(document);
  if (gemini.gemini_relevance_status === "CLASSIFIED") {
    if (gemini.classification_status === REPORT_IRRELEVANT_DATA_FILE) {
      return {
        status: REPORT_IRRELEVANT_DATA_FILE,
        reason: `${file}: Gemini relevance gate classified this image as unrelated to construction project progress data. ${gemini.reason}`,
        gemini_relevance_status: gemini.gemini_relevance_status
      };
    }
    if (gemini.classification_status === "STRUCTURED_CONSTRUCTION_EVIDENCE" || gemini.classification_status === REPORT_CONSTRUCTION_CONTEXT_ONLY) {
      return {
        status: REPORT_CONSTRUCTION_CONTEXT_ONLY,
        reason: `${file}: image appears construction-related, but no extractable cited budget, actual, schedule, leakage, or ESG data was available. ${gemini.reason}`,
        gemini_relevance_status: gemini.gemini_relevance_status
      };
    }
  }
  if (boardroomHasConstructionFileNameHint(file)) {
    return {
      status: REPORT_CONSTRUCTION_CONTEXT_ONLY,
      reason: `${file}: image filename suggests construction context, but image-only uploads cannot support quantified findings without extracted cited evidence.`,
      gemini_relevance_status: gemini.gemini_relevance_status
    };
  }
  return {
    status: REPORT_IRRELEVANT_DATA_FILE,
    reason: `${file}: image file was not analyzed because no construction project progress evidence was detected by filename or classifier.`,
    gemini_relevance_status: gemini.gemini_relevance_status
  };
}

function determineBoardroomReportStatus(findings, documentOutcomes) {
  if ((findings || []).length) return REPORT_EXECUTIVE_ACTION_PLAN;
  const statuses = (documentOutcomes || []).map((item) => item.status);
  if (statuses.indexOf(REPORT_EVIDENCE_INTAKE_EXCEPTION) >= 0) return REPORT_EVIDENCE_INTAKE_EXCEPTION;
  if (statuses.indexOf(REPORT_CONSTRUCTION_CONTEXT_ONLY) >= 0) return REPORT_CONSTRUCTION_CONTEXT_ONLY;
  if (statuses.indexOf(REPORT_IRRELEVANT_DATA_FILE) >= 0) return REPORT_IRRELEVANT_DATA_FILE;
  if (statuses.indexOf(REPORT_UNSUPPORTED_FILE_TYPE) >= 0) return REPORT_UNSUPPORTED_FILE_TYPE;
  return REPORT_EVIDENCE_INTAKE_EXCEPTION;
}

function buildBoardroomNoFindingBrief(status, documentsNotProcessed) {
  const headlineByStatus = {};
  headlineByStatus[REPORT_IRRELEVANT_DATA_FILE] = "Uploaded file was not related to construction project progress evidence.";
  headlineByStatus[REPORT_UNSUPPORTED_FILE_TYPE] = "Uploaded file type is not supported for Constrovet analysis.";
  headlineByStatus[REPORT_CONSTRUCTION_CONTEXT_ONLY] = "Construction context was detected, but no quantified project progress evidence was extracted.";
  headlineByStatus[REPORT_EVIDENCE_INTAKE_EXCEPTION] = "No cited cost, schedule, ESG, or leakage evidence was extracted.";
  return {
    headline: headlineByStatus[status] || headlineByStatus[REPORT_EVIDENCE_INTAKE_EXCEPTION],
    decision_focus: "No executive recovery or cost-control action should be taken from this upload.",
    critical_or_high_count: 0,
    total_cited_leakage_inr: 0,
    documents_with_no_signal: (documentsNotProcessed || []).length,
    caveat: "No commercial, legal, recovery, or cost-saving claim has been made because there are no cited findings."
  };
}

function boardroomDocumentNoSignalReason(document, textLength) {
  const file = document.file || "unknown";
  if (document.extraction_error) {
    if (/ADVANCED_DRIVE_SERVICE_DISABLED/i.test(document.extraction_error)) return `${file}: PDF OCR unavailable because the Advanced Drive service is not enabled.`;
    if (/TEXT_EXTRACTION_UNAVAILABLE/i.test(document.extraction_error)) return `${file}: PDF OCR produced no extractable text (${document.extraction_error}).`;
    return `${file}: ${document.extraction_error}`;
  }
  if (document.type === "pdf" && !textLength) return `${file}: PDF OCR produced no extractable text.`;
  if (document.type === "pdf") return `${file}: OCR text extracted but no construction cost, schedule, leakage, commercial-control, or ESG keywords were found.`;
  if (document.type === "csv") return `${file}: CSV parsed but no budget, actual, leakage, delay, invoice, payment, wastage, rework, fuel, energy, water, or emissions fields were found.`;
  return `${file}: no cost, schedule, leakage, commercial-control, or ESG signal found by deterministic Workspace scan.`;
}

function boardroomDocumentText(document) {
  return [
    document.raw_text || "",
    ...((document.pages || []).map((page) => page.text || ""))
  ].join("\n");
}

function boardroomCsvHasConstructionHeaders(document) {
  return (document.pages || []).some((page) => {
    const headers = page.headers || [];
    const signalHeaders = headers.filter((header) => boardroomCsvHeaderSignalRe().test(String(header || "").toLowerCase()));
    const strongHeaders = headers.filter((header) => boardroomCsvStrongHeaderSignalRe().test(String(header || "").toLowerCase()));
    return signalHeaders.length >= 2 || strongHeaders.length >= 1;
  });
}

function boardroomCsvHeaderSignalRe() {
  return /budget|boq|planned|estimate|contract|baseline|actual|spent|cost incurred|cost to date|paid|payment|invoice|ra bill|running account|ipc|delay|days|schedule|wastage|waste|rework|idle|excess|consumption|diesel|fuel|energy|water|carbon|emission|scope|debit note|deduction|back charge|quantity|qty/;
}

function boardroomCsvStrongHeaderSignalRe() {
  return /budget|boq|contract value|cost incurred|cost to date|paid amount|payment amount|invoice|ra bill|running account|ipc|delay|schedule|wastage|rework|idle|diesel|fuel|energy|water|carbon|emission|debit note|deduction|back charge/;
}

function boardroomQuantifiedEvidenceRe() {
  return /budget|boq|actual|cost incurred|paid|invoice|ra bill|running account|ipc|delay|days?|schedule|wastage|rework|idle|diesel|fuel|energy|water|carbon|emission|scope|debit note|deduction|back charge|₹|inr|rs\.?/i;
}

function boardroomConstructionContextRe() {
  return /construction|project|site|civil|contractor|work order|boq|ra bill|running account|ipc|interim payment|contract value|progress|schedule|eot|extension of time|slab|foundation|excavation|concrete|steel|mep|labour|plant|material|subcontractor|variation|change order/i;
}

function boardroomHasConstructionFileNameHint(name) {
  return /construction|project|site|civil|boq|ra[-_\s]?bill|running[-_\s]?account|ipc|invoice|budget|actual|delay|schedule|progress|contract|work[-_\s]?order|esg|diesel|fuel|energy|water|carbon|emission|wastage|rework|labour|plant|material|contractor/i.test(String(name || ""));
}

function extractBoardroomFindings(file, pageOrSheet, text, page) {
  const findings = [];
  const recomputedRateFindings = boardroomRecomputedRateFindings_(file, pageOrSheet, text);
  // Runs unconditionally, like the rate-recompute check above: a Schedule Status document also
  // carries Planned/Actual Progress percentages and is very likely routed and handled as a
  // PROGRESS_REPORT by the structured router below. That handling must not be replaced -- this
  // adds contradiction findings (SPI vs its own label, completion-date slip vs its own label,
  // critical-path status) on top of whatever the router already extracted from the same page.
  const scheduleStatusFindings = eev2ScheduleStatusContradictionFindings_(file, pageOrSheet, text);

  const structured =
    eev2RouteStructuredBoardroomFindings(
      file,
      pageOrSheet,
      text
    );

  if (structured && structured.handled) {
    findings.push(...(structured.findings || []));
    findings.push(...recomputedRateFindings);
    findings.push(...scheduleStatusFindings);
    return findings;
  }

  if (page && page.headers && page.row) {
    const rowFinding = boardroomCsvBudgetActualFinding(file, pageOrSheet, text, page.headers, page.row);
    if (rowFinding) findings.push(rowFinding);
  }
  boardroomEvidenceWindows(text).forEach((span) => {
    const lower = span.toLowerCase();
    const budget = boardroomValueNear(lower, span, boardroomBaselineRe());
    const actual = boardroomValueNear(lower, span, boardroomActualRe());
    const variation = boardroomVariationOrderEvidence_(span);
    if (variation) {
      findings.push(boardroomFinding(
        `Approved variation/change order with cited cost impact of INR ${formatInr(variation.amount)}${variation.days ? ` and ${variation.days} day(s) stated schedule impact` : ""}. Approved change against baseline -- monitor; not contractor-recoverable leakage.`,
        "BASELINE_BUDGET", variation.amount, variation.days, file, pageOrSheet, span, variation.amount, 0, 0, "MEDIUM"));
    }
    if (!variation && budget !== null) {
      findings.push(boardroomFinding(`Baseline budget evidence of INR ${formatInr(budget)} is cited.`, "BASELINE_BUDGET", budget, 0, file, pageOrSheet, span, budget, 0, 0, "MEDIUM"));
    }
    if (budget !== null && actual !== null && actual > budget) {
      findings.push(boardroomFinding(`Actual exceeds budget by INR ${formatInr(actual - budget)}.`, "LEAKAGE_AND_OVERRUN", actual - budget, 0, file, pageOrSheet, span, budget, actual, actual - budget, "HIGH"));
    }
    if (boardroomLeakageRe().test(lower)) {
      // EEV2-004: was boardroomFirstAmount(span), which scanned from character 0
      // and let a trigger term claim any figure in the span regardless of which
      // label owned it. No fallback to `actual` here: when no figure is owned by
      // the trigger the finding reports 0 and keeps its narrative and days.
      const amount = boardroomTriggerOwnedAmount(span, boardroomLeakageRe());
      const days = boardroomFirstDays(span);
      findings.push(boardroomFinding(boardroomSignalStatement_("LEAKAGE", span, amount, days), "LEAKAGE_AND_OVERRUN", amount, days, file, pageOrSheet, span, budget || 0, actual || 0, actual && budget ? actual - budget : 0, amount || days ? "MEDIUM" : "LOW"));
    } else if (boardroomEsgRe().test(lower)) {
      const esgAmount = boardroomFirstAmount(span) || 0;
      const esgDays = boardroomFirstDays(span);
      findings.push(boardroomFinding(boardroomSignalStatement_("ESG", span, esgAmount, esgDays), "ESG_METRIC", esgAmount, esgDays, file, pageOrSheet, span, 0, 0, 0, "MEDIUM"));
    }
  });
  findings.push(...recomputedRateFindings);
  findings.push(...scheduleStatusFindings);
  return findings;
}

// An approved variation/change order is a committed cost change against the
// baseline. It is NOT contractor-recoverable leakage, so it is cited as
// baseline context (monitor) rather than inflating any recovery figure.
// A finding is a statement about the evidence, not a slice of the evidence.
// These two used to emit a raw 140-character fragment of the source table as
// their statement, which read as unfinished work once statements became the
// headline section of the client email. The raw text still appears -- in the
// citation, where it belongs.
// Taking the FIRST match names whichever term happens to appear earliest --
// on a waste report that produced "relating to fuel" because the word fuel
// sat in a bracketed list above the headline. Pick the term that dominates
// the passage instead: most frequent, then most specific (longest).
function boardroomMatchedTerm_(text, regex) {
  const hits = String(text || "").match(new RegExp(regex.source, "ig")) || [];
  if (!hits.length) return "";
  const counts = {};
  hits.forEach(function (hit) {
    const key = String(hit).toLowerCase().trim();
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts).sort(function (a, b) {
    if (counts[b] !== counts[a]) return counts[b] - counts[a];
    return b.length - a.length;
  })[0] || "";
}

function boardroomSignalStatement_(kind, span, amount, days) {
  const term = kind === "ESG"
    ? boardroomMatchedTerm_(span, boardroomEsgRe())
    : boardroomMatchedTerm_(span, boardroomLeakageRe());
  const figures = [];
  if (Number(amount || 0) > 0) figures.push(`INR ${formatInr(amount)}`);
  if (Number(days || 0) > 0) figures.push(`${days} day(s)`);
  if (!figures.length) {
    const percent = /([0-9]+(?:\.[0-9]+)?)\s*%/.exec(String(span || ""));
    if (percent) figures.push(`${percent[1]}%`);
  }
  const figureText = figures.length ? ` Cited figure(s): ${figures.join(", ")}.` : "";
  if (kind === "ESG") {
    return `ESG metric evidence${term ? ` relating to ${term}` : ""} was found in this document.${figureText} Context only -- no cost exposure is implied. The source text is quoted in the citations below.`;
  }
  return `Possible leakage or overrun signal${term ? ` (trigger term: ${term})` : ""} was found in this document.${figureText} Supporting evidence is required before any recovery action. The source text is quoted in the citations below.`;
}

function boardroomVariationOrderEvidence_(span) {
  const text = String(span || "");
  if (!/variation|change order|\bvo[-\s]?\d/i.test(text)) return null;
  if (!/cost impact|amount|value|rs\.?|inr|₹/i.test(text)) return null;
  const amount = boardroomFirstAmount(text);
  if (!amount) return null;
  return { amount: amount, days: boardroomFirstDays(text) };
}

// Deterministic arithmetic check: where a document states an overall rate and
// also shows the rows behind it, recompute the quantity-weighted average and
// flag disagreement. No model involved -- this is arithmetic. It is trusted
// only when the parsed row quantities reconcile to the document's own stated
// TOTAL (within 1%), which proves the table was read correctly.
function boardroomRecomputeStatedRate_(text) {
  const flat = String(text || "").replace(/\s+/g, " ");
  const stated = /(?:overall|total|average|weighted)[^%]{0,60}?rate\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)\s*%/i.exec(flat);
  if (!stated) return null;
  const totalMatch = /\bTOTAL\b\s+([0-9]+(?:\.[0-9]+)?)/i.exec(flat);
  if (!totalMatch) return null;
  const body = flat.slice(0, totalMatch.index);
  const pairs = [];
  const rowRe = /([0-9]+(?:\.[0-9]+)?)\s+(?:(?!\d+(?:\.\d+)?\s)[^%]){0,140}?([0-9]{1,3})\s*%/g;
  let match;
  while ((match = rowRe.exec(body))) pairs.push([Number(match[1]), Number(match[2])]);
  if (pairs.length < 3) return null;
  const quantity = pairs.reduce((sum, pair) => sum + pair[0], 0);
  const declaredTotal = Number(totalMatch[1]);
  if (!declaredTotal || Math.abs(quantity - declaredTotal) / declaredTotal > 0.01) return null;
  const weighted = pairs.reduce((sum, pair) => sum + pair[0] * pair[1], 0) / quantity;
  return {
    claimed: Number(stated[1]),
    computed: Number(weighted.toFixed(2)),
    gap: Number((Number(stated[1]) - weighted).toFixed(2)),
    rows: pairs.length,
    quantity: Number(quantity.toFixed(2)),
    citation: flat.slice(stated.index, Math.min(flat.length, stated.index + 160))
  };
}

function boardroomRecomputedRateFindings_(file, pageOrSheet, text) {
  const check = boardroomRecomputeStatedRate_(text);
  if (!check || Math.abs(check.gap) < 0.5) return [];
  if (!boardroomEsgRe().test(String(text || "").toLowerCase())) return [];
  const direction = check.gap > 0 ? "overstates" : "understates";
  const statement = `Stated headline rate of ${check.claimed}% ${direction} the document's own data: recomputing the quantity-weighted average across its ${check.rows} rows (total ${check.quantity}, matching the document's own stated TOTAL) gives ${check.computed}% -- a gap of ${Math.abs(check.gap)} percentage points. Verify before relying on the stated figure.`;
  return [boardroomFinding(statement, "ESG_METRIC", 0, 0, file, pageOrSheet, check.citation, 0, 0, 0, "HIGH")];
}

function boardroomCsvBudgetActualFinding(file, pageOrSheet, span, headers, row) {
  let budget = null;
  let actual = null;
  headers.forEach((header, index) => {
    const key = String(header || "").toLowerCase();
    const value = boardroomParseAmount(row[index] || "");
    if (value === null) return;
    if (/budget|boq|planned|estimate|contract|baseline/.test(key)) budget = value;
    if (/actual|spent|cost incurred|cost to date|paid amount|payment amount|expenditure|debit amount|deduction amount|back charge amount/.test(key)) actual = value;
  });
  if (budget === null || actual === null || actual <= budget) return null;
  return boardroomFinding(`CSV row shows Actual - Budget overrun of INR ${formatInr(actual - budget)}.`, "LEAKAGE_AND_OVERRUN", actual - budget, 0, file, pageOrSheet, span, budget, actual, actual - budget, "HIGH");
}

// A period is not always the end of a sentence. "Rs. 1,050,000" was being
// split into "... Rs." + "1,050,000 ...", orphaning every rupee figure from
// its currency marker -- so amounts became invisible to the extractor, and a
// Rs 1,050,000 approved variation order was reported as "no cost evidence
// found". The lookbehind below keeps known abbreviations intact.
function boardroomEvidenceWindows(text) {
  return String(text || "").replace(/\s+/g, " ")
    .split(/(?<!\b(?:Rs|INR|No|Nos|Pvt|Ltd|Co|Inc|Sr|Jr|Mr|Mrs|Ms|Dr|Approx|Est|Ref|Fig|vs|etc|viz)\.)(?<=[.!?])\s+|\s+\|\s+|;\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 12 && boardroomConstructionSignalRe().test(part.toLowerCase()))
    .slice(0, 40);
}

function boardroomConstructionSignalRe() {
  // \bld\b (not bare "ld"): the bare form matched as a substring inside ordinary words --
  // "cold", "Welding", "building", "held" -- and pulled in whatever dollar figure happened to sit
  // nearby as if it were liquidated-damages evidence. Confirmed 1 Sept 2026 on real production
  // documents: a BoQ's plumbing line "hot & cold water piping" and an energy report's "Welding
  // Set" both matched "ld" and fabricated cited "leakage" amounts (INR 35 and INR 37,620) from a
  // per-unit BOQ rate and an unrelated equipment cost row -- neither document contains any real
  // liquidated-damages or leakage signal. \b requires "ld" to stand alone (as the LD abbreviation
  // typically appears: "LD clause", "LD: Rs. 50,000", "(LD)"), not embedded in another word.
  return /budget|boq|actual|overrun|delay|penalty|\bld\b|liquidated damages|eot|extension of time|variation|change order|debit note|wastage|waste|rework|idle|idle plant|idle labour|idle equipment|excess|consumption|invoice|ra bill|running account|ipc|interim payment|paid|spent|escalation|reconciliation|retention|deduction|back charge|delayed po|purchase order delay|carbon|energy|water|diesel|fuel|electricity|emission|scope|days?|₹|inr|rs\.?/i;
}

function boardroomBaselineRe() {
  return /budget|boq|planned|estimate|contract value|contract sum|baseline|ra bill|running account|ipc|interim payment|cumulative work done|advance recovery|variation order|change order|cost impact|approved variation/;
}

function boardroomActualRe() {
  return /actual|spent|cost incurred|paid|invoice|expenditure|consumption|debit note|deduction|back charge/;
}

function boardroomLeakageRe() {
  // \bld\b, not bare "ld" -- see boardroomConstructionSignalRe() for why: the unbounded form
  // matched inside "cold", "Welding", etc. and fabricated cited leakage amounts from unrelated
  // nearby figures. Confirmed on real production documents 1 Sept 2026.
  // \blate\b, not bare "late" -- ROADMAP.md Milestone 3 fix, 2026-09-04. Bare "late" matched
  // inside "plate", "template", "escalated", "calculate", "translate", "relate", "inflate" --
  // confirmed via a 30-word construction-vocabulary sweep against real production spans
  // ("Shuttering plate hire Rs.2,40,000" was fabricated as leakage this way). Standalone
  // "late" (e.g. "late fee waiver") still correctly matches -- only the substring form is fixed.
  return /overrun|cost variance|actual exceeds|spent more|\bld\b|liquidated damages|penalty|wastage|rework|idle|idle plant|idle labour|idle equipment|excess|delay|delayed|slippage|\blate\b|behind schedule|purchase order delay|debit note|back charge|deduction|consumption variance|material variance|price escalation|escalation claim|reconciliation gap|unreconciled|delay cost/;
}

function boardroomTriggerOwnedAmount(text, keywordRegex) {
  const source = String(text || "");
  const currency = /(?:₹|\bINR\b|\bRs\.?)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac)?/ig;
  const trigger = new RegExp(keywordRegex.source, "i");
  let match;
  let previousEnd = 0;
  while ((match = currency.exec(source))) {
    const labelStart = Math.max(previousEnd, match.index - BOARDROOM_LABEL_WINDOW);
    const labelRegion = source.slice(labelStart, match.index);
    previousEnd = match.index + match[0].length;
    if (!trigger.test(labelRegion)) continue;
    let value = Number(match[1].replace(/,/g, ""));
    const unit = (match[2] || "").toLowerCase();
    if (unit === "crore" || unit === "cr") value *= 10000000;
    if (unit === "lakh" || unit === "lac") value *= 100000;
    return value;
  }
  return 0;
}

function boardroomEsgRe() {
  return /carbon|waste diversion|energy|water|fuel|diesel|electricity|emission|scope 1|scope 2|scope 3/;
}

function boardroomValueNear(lower, original, keywordRegex) {
  const text = String(original || "");
  const keyword = new RegExp(keywordRegex.source, "i");
  const match = keyword.exec(text);
  if (!match) return null;
  const after = text.slice(match.index, Math.min(text.length, match.index + 140));
  const afterAmount = boardroomFirstAmount(after);
  if (afterAmount) return afterAmount;
  const before = text.slice(Math.max(0, match.index - 90), match.index);
  const beforeAmount = boardroomLastAmount(before);
  return beforeAmount || null;
}

function boardroomFirstAmount(text) {
  const match = /(?:₹|\bINR\b|\bRs\.?)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac)?/i.exec(String(text || ""));
  if (!match) return 0;
  let value = Number(match[1].replace(/,/g, ""));
  const unit = (match[2] || "").toLowerCase();
  if (unit === "crore" || unit === "cr") value *= 10000000;
  if (unit === "lakh" || unit === "lac") value *= 100000;
  return value;
}

function boardroomLastAmount(text) {
  const regex = /(?:₹|\bINR\b|\bRs\.?)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac)?/ig;
  let match;
  let value = 0;
  while ((match = regex.exec(String(text || "")))) {
    value = Number(match[1].replace(/,/g, ""));
    const unit = (match[2] || "").toLowerCase();
    if (unit === "crore" || unit === "cr") value *= 10000000;
    if (unit === "lakh" || unit === "lac") value *= 100000;
  }
  return value;
}

function boardroomParseAmount(value) {
  const amount = boardroomFirstAmount(value);
  if (amount) return amount;
  const numeric = String(value || "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return numeric ? Number(numeric[0]) : null;
}

function boardroomFirstDays(text) {
  const match = String(text || "").match(/(\d+(?:\.\d+)?)\s*(?:day|days)\b/i);
  return match ? Number(match[1]) : 0;
}

function boardroomFinding(statement, category, amount, days, file, pageOrSheet, span, budget, actual, difference, confidence) {
  return {
    statement,
    financial_category: category,
    amount_inr: Number(amount || 0),
    days: Number(days || 0),
    citations: [{ file, page_or_sheet: pageOrSheet, quoted_span: String(span || "").slice(0, 500) }],
    calculation: {
      budget: Number(budget || 0),
      actual: Number(actual || 0),
      difference: Number(difference || 0),
      formula: "Actual - Budget"
    },
    confidence
  };
}

function runDeterministicVerifier(findings) {
  const verified = [];
  const unsupported = [];
  const corrected = [];
  (findings || []).forEach((finding, index) => {
    const normalized = normalizeFindingForVerification(finding);
    const issues = verifyBoardroomFinding(normalized);
    if (issues.length) {
      unsupported.push({
        source_finding_index: index + 1,
        statement: finding.statement || "",
        reasons: issues
      });
      return;
    }
    const originalDifference = Number(((finding.calculation || {}).difference) || 0);
    const originalAmount = Number(finding.amount_inr || 0);
    const budget = Number((normalized.calculation || {}).budget || 0);
    const actual = Number((normalized.calculation || {}).actual || 0);
    if (budget > 0 && actual > 0) {
      const recalculated = actual - budget;
      normalized.calculation.difference = recalculated;
      if (actual > budget && normalized.financial_category === "LEAKAGE_AND_OVERRUN" && normalized.recoverability_guardrail !== "NOT_ESTABLISHED") normalized.amount_inr = recalculated;
      if (originalDifference !== recalculated || (actual > budget && originalAmount !== normalized.amount_inr)) {
        corrected.push({
          source_finding_index: index + 1,
          budget,
          actual,
          difference: recalculated,
          formula: "Actual - Budget"
        });
      }
    }
    verified.push(normalized);
  });
  const status = unsupported.length
    ? (verified.length ? "NEEDS_REVIEW" : "EVIDENCE_INTAKE_EXCEPTION")
    : "VERIFIED";
  return {
    verification_status: status,
    verifier: "DETERMINISTIC_WORKSPACE_VERIFIER",
    raw_finding_count: (findings || []).length,
    verified_finding_count: verified.length,
    verified_findings: verified,
    corrected_calculations: corrected,
    unsupported_claims_removed: unsupported,
    checks: [
      "citation_required",
      "category_allowed",
      "actual_minus_budget_recalculated",
      "positive_actual_over_budget_requires_leakage_category",
      "baseline_and_esg_not_counted_as_leakage",
      "amount_or_days_required_for leakage signals"
    ],
    model_audit_trail: {
      raw_documents_sent_to_gemini: false,
      gemini_used: false,
      execution_layer: "Google Workspace Apps Script deterministic verifier"
    }
  };
}

function normalizeFindingForVerification(finding) {
  const citation = ((finding || {}).citations || [])[0] || {};
  const calculation = (finding || {}).calculation || {};
  const normalized = {
    statement: String((finding || {}).statement || ""),
    financial_category: String((finding || {}).financial_category || ""),
    amount_inr: Math.max(0, Number((finding || {}).amount_inr || 0)),
    days: Math.max(0, Number((finding || {}).days || 0)),
    citations: [{
      file: String(citation.file || ""),
      page_or_sheet: String(citation.page_or_sheet || ""),
      quoted_span: String(citation.quoted_span || "").slice(0, 500)
    }],
    calculation: {
      budget: Math.max(0, Number(calculation.budget || 0)),
      actual: Math.max(0, Number(calculation.actual || 0)),
      difference: Number(calculation.difference || 0),
      formula: "Actual - Budget"
    },
    confidence: ["HIGH", "MEDIUM", "LOW"].indexOf((finding || {}).confidence) >= 0 ? finding.confidence : "LOW",
    exposure_amount_inr: Math.max(0, Number((finding || {}).exposure_amount_inr || 0)),
    eev2_semantic_classification: String((finding || {}).eev2_semantic_classification || ""),
    recoverability_guardrail: String((finding || {}).recoverability_guardrail || "")
  };
  return normalized;
}
function boardroomIsEev2UnestablishedExposure(finding) {
  const semantic = String(
    (finding || {}).eev2_semantic_classification || ""
  ).toUpperCase();

  const guardrail = String(
    (finding || {}).recoverability_guardrail || ""
  ).toUpperCase();

  return (
    guardrail === "NOT_ESTABLISHED" &&
    [
      "COST_EXPOSURE",
      "FORECAST_OVERRUN",
      "COST_VARIANCE"
    ].indexOf(semantic) >= 0
  );
}
function verifyBoardroomFinding(finding) {
  const issues = [];

  const category = String(
    (finding || {}).financial_category || ""
  );

  const citation =
    ((finding || {}).citations || [])[0] || {};

  const span = String(
    citation.quoted_span || ""
  );

  const evidenceText =
    `${finding.statement || ""} ${span}`.toLowerCase();

  const calculation =
    (finding || {}).calculation || {};

  const budget = Number(calculation.budget || 0);
  const actual = Number(calculation.actual || 0);

  const semantic = String(
    (finding || {}).eev2_semantic_classification || ""
  ).toUpperCase();

  const guardrail = String(
    (finding || {}).recoverability_guardrail || ""
  ).toUpperCase();

  const isEev2UnestablishedExposure =
    guardrail === "NOT_ESTABLISHED" &&
    (
      semantic === "COST_EXPOSURE" ||
      semantic === "FORECAST_OVERRUN" ||
      semantic === "COST_VARIANCE"
    );

  const isEev2GuardrailedControlFinding =
    guardrail === "NOT_ESTABLISHED" &&
    semantic === "EOT_STATUS";

  const allowed = [
    "BASELINE_BUDGET",
    "LEAKAGE_AND_OVERRUN",
    "ESG_METRIC"
  ];

  if (allowed.indexOf(category) < 0) {
    issues.push(
      "financial_category must be BASELINE_BUDGET, LEAKAGE_AND_OVERRUN, or ESG_METRIC."
    );
  }

  if (
    !citation.file ||
    !citation.page_or_sheet ||
    !span
  ) {
    issues.push(
      "finding is missing required citation file, page/sheet, or quoted span."
    );
  }

  if (!finding.statement) {
    issues.push(
      "finding is missing a statement."
    );
  }

  if (
    Number(finding.amount_inr || 0) < 0 ||
    Number(finding.days || 0) < 0
  ) {
    issues.push(
      "amount_inr and days must not be negative."
    );
  }

  if (
    budget > 0 &&
    actual > 0 &&
    actual > budget &&
    category !== "LEAKAGE_AND_OVERRUN"
  ) {
    issues.push(
      "Actual greater than Budget must be a separate LEAKAGE_AND_OVERRUN finding."
    );
  }

  if (
    category === "BASELINE_BUDGET" &&
    !boardroomBaselineRe().test(evidenceText)
  ) {
    issues.push(
      "BASELINE_BUDGET finding lacks cited baseline, BOQ, planned, contract, or budget evidence."
    );
  }

  if (
    category === "LEAKAGE_AND_OVERRUN" &&
    Number(finding.amount_inr || 0) <= 0 &&
    Number(finding.days || 0) <= 0 &&
    !boardroomLeakageRe().test(evidenceText) &&
    !isEev2UnestablishedExposure &&
    !isEev2GuardrailedControlFinding
  ) {
    issues.push(
      "LEAKAGE_AND_OVERRUN finding lacks cited amount, days, or leakage/overrun signal."
    );
  }

  if (
    category === "ESG_METRIC" &&
    !boardroomEsgRe().test(evidenceText)
  ) {
    issues.push(
      "ESG_METRIC finding lacks cited ESG metric evidence."
    );
  }

  if (
    category === "ESG_METRIC" &&
    boardroomLeakageRe().test(evidenceText) &&
    !boardroomEsgRe().test(evidenceText)
  ) {
    issues.push(
      "ESG evidence cannot be used as leakage without separate cost evidence."
    );
  }

  return issues;
}

function dedupeBoardroomFindings(findings) {
  const seen = {};
  return findings.filter((item) => {
    const citation = item.citations[0] || {};
    const key = `${item.financial_category}|${item.statement}|${citation.file}|${citation.page_or_sheet}|${citation.quoted_span}`;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function scoreBoardroomFindings(findings) {
  return findings.map((item) => {
    const score = boardroomRiskScore(item);
    return {
      ...item,
      risk_score: score,
      severity: boardroomSeverity(score),
      recoverability: boardroomRecoverability(item),
      evidence_quality: boardroomEvidenceQuality(item),
      cash_impact: boardroomCashImpact(item.amount_inr),
      urgency: boardroomUrgency(item),
      control_theme: boardroomControlTheme(item),
      actionability: boardroomActionability(item)
    };
  });
}

function boardroomActionability(item) {
  if (!item || item.financial_category === "BASELINE_BUDGET" || item.financial_category === "ESG_METRIC") return ACTION_MONITORING_CONTEXT;
  if (item.financial_category !== "LEAKAGE_AND_OVERRUN") return ACTION_EVIDENCE_FOLLOWUP;
  if (item.recoverability_guardrail === "NOT_ESTABLISHED") return ACTION_EVIDENCE_FOLLOWUP;
  if (boardroomHasQuantifiedCostExposure(item) || Number(item.days || 0) > 0) return ACTION_RECOVERABLE;
  return ACTION_EVIDENCE_FOLLOWUP;
}

function boardroomHasQuantifiedCostExposure(item) {
  if (!item || item.recoverability_guardrail === "NOT_ESTABLISHED") return false;
  const calculation = item.calculation || {};
  return Number(item.amount_inr || 0) > 0 || (Number(calculation.budget || 0) > 0 && Number(calculation.actual || 0) > Number(calculation.budget || 0));
}

function boardroomHasScheduleImpactOnly(item) {
  return item && item.financial_category === "LEAKAGE_AND_OVERRUN" && Number(item.days || 0) > 0 && !boardroomHasQuantifiedCostExposure(item);
}

function boardroomRiskScore(item) {
  let score = 0;
  const amount = Number(item.amount_inr || 0);
  if (item.financial_category === "LEAKAGE_AND_OVERRUN") score += 25;
  if (item.financial_category === "ESG_METRIC") score += 8;
  if (amount >= 5000000) score += 35;
  else if (amount >= 500000) score += 25;
  else if (amount > 0) score += 15;
  if (Number(item.days || 0) >= 30) score += 15;
  else if (Number(item.days || 0) > 0) score += 10;
  if (item.calculation.actual > item.calculation.budget && item.calculation.budget > 0) score += 15;
  // A document that contradicts its own arithmetic is a hard finding, not a
  // footnote. Scaled by how badly it disagrees, so a rounding-level gap stays
  // moderate while a material overstatement reaches HIGH.
  const contradiction = boardroomParseRateContradiction_(item.statement);
  if (contradiction) score += contradiction.gap >= 5 ? 50 : 35;
  // Same principle for a schedule-status document that contradicts its own status label: an
  // SPI below 1.0 or a completion-date slip called "ON SCHEDULE"/"ON TRACK" is a reporting-
  // integrity problem, scaled by how large the gap is. A stated Critical Path Status of CRITICAL
  // always lands at the top tier -- float fully consumed is inherently a severe schedule signal,
  // and must never be able to sit uncounted under a "Critical/high findings: 0" rollup.
  const scheduleContradiction = eev2ParseScheduleStatusContradiction_(item.statement);
  if (scheduleContradiction) {
    if (scheduleContradiction.type === "CRITICAL_PATH") score += 50;
    else score += scheduleContradiction.gap >= (scheduleContradiction.type === "SPI" ? 5 : 20) ? 50 : 35;
  }
  if (item.confidence === "HIGH") score += 10;
  if (item.confidence === "MEDIUM") score += 5;
  if (boardroomEvidenceQuality(item) === "STRUCTURED_ACTUAL_BUDGET") score += 10;
  return Math.min(100, score);
}

function boardroomSeverity(score) {
  if (score >= 75) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function boardroomRecoverability(item) {
  if (item.financial_category !== "LEAKAGE_AND_OVERRUN") return "LOW";
  if (item.recoverability_guardrail === "NOT_ESTABLISHED") return "UNKNOWN";
  if (item.amount_inr > 0 && item.confidence === "HIGH") return "HIGH";
  if (item.amount_inr > 0 || item.days > 0) return "MEDIUM";
  return "UNKNOWN";
}

function boardroomEvidenceQuality(item) {
  if (item.calculation.actual > item.calculation.budget && item.calculation.budget > 0) return "STRUCTURED_ACTUAL_BUDGET";
  if (item.amount_inr > 0) return "CITED_AMOUNT";
  if (item.days > 0) return "CITED_DAYS";
  if (item.citations && item.citations[0] && item.citations[0].quoted_span) return "CITED_NARRATIVE";
  return "MISSING";
}

function boardroomCashImpact(amount) {
  if (amount >= 5000000) return "HIGH";
  if (amount >= 500000) return "MEDIUM";
  if (amount > 0) return "LOW";
  return "NONE";
}

function boardroomUrgency(item) {
  if (item.financial_category === "LEAKAGE_AND_OVERRUN" && (item.amount_inr >= 500000 || item.days > 0)) return "IMMEDIATE";
  if (item.financial_category === "LEAKAGE_AND_OVERRUN") return "30_DAYS";
  if (item.financial_category === "ESG_METRIC") return "90_DAYS";
  return "MONITOR";
}

function boardroomControlTheme(item) {
  const lower = item.citations && item.citations[0] ? String(item.citations[0].quoted_span || "").toLowerCase() : "";
  if (/ld|liquidated damages|delay|eot|extension of time/.test(lower)) return "schedule_recovery";
  if (/wastage|rework|idle|excess|consumption|material variance/.test(lower)) return "site_execution_control";
  if (/po|purchase order|variation|debit note|invoice|ra bill|ipc|reconciliation/.test(lower)) return "commercial_control";
  if (item.financial_category === "ESG_METRIC") return "esg_monitoring";
  if (item.financial_category === "BASELINE_BUDGET") return "baseline_context";
  return "project_control";
}

function boardroomOwnerRole(item) {
  const lower = item && item.citations && item.citations[0] ? String(item.citations[0].quoted_span || "").toLowerCase() : "";
  if ((item || {}).financial_category === "ESG_METRIC" || /carbon|waste diversion|energy|water|fuel|diesel|electricity|emission|scope [123]/.test(lower)) return "ESG / Sustainability";
  if (/ld|liquidated damages|delay|eot|extension of time|slippage|behind schedule/.test(lower) || boardroomHasScheduleImpactOnly(item)) return "Planning / Project Controls";
  if (/delayed po|purchase order delay|po delay|wastage|rework|idle|idle plant|idle labour|idle equipment|excess|consumption|material variance/.test(lower)) return "Procurement / Stores";
  if (/penalty|debit note|deduction|back charge|variation|change order|claim|recovery|commercial/.test(lower)) return "Contracts / Commercial";
  if (/budget|boq|actual|spent|cost incurred|paid|payment|invoice|ra bill|running account|ipc|expenditure/.test(lower)) return "Finance / Cost Control";
  if ((item || {}).financial_category === "BASELINE_BUDGET") return "Project Controls";
  return "Project Controls";
}

function boardroomDueHorizon(item) {
  if (boardroomActionability(item) === ACTION_EVIDENCE_FOLLOWUP) return "7_days";
  if (boardroomHasQuantifiedCostExposure(item) || boardroomHasScheduleImpactOnly(item)) return "7_days";
  if ((item || {}).financial_category === "ESG_METRIC" || (item || {}).financial_category === "BASELINE_BUDGET") return "90_days";
  return "30_days";
}

function boardroomActionEvidenceStatus(item) {
  if (!item || !((item.citations || [])[0] || {}).quoted_span) return "MISSING_CITATION";
  if (boardroomActionability(item) === ACTION_EVIDENCE_FOLLOWUP) return "CITED_BUT_NEEDS_SUPPORT";
  if ((item.financial_category || "") === "BASELINE_BUDGET" || (item.financial_category || "") === "ESG_METRIC") return "MONITOR_ONLY";
  if ((item.evidence_quality || "") === "STRUCTURED_ACTUAL_BUDGET") return "STRUCTURED_CITED_EVIDENCE";
  return "CITED_EVIDENCE_REVIEW_REQUIRED";
}

function boardroomRankFindings(findings) {
  return [...findings].sort((a, b) => {
    const categoryScore = boardroomCategoryRank(b) - boardroomCategoryRank(a);
    if (categoryScore) return categoryScore;
    const riskScoreDelta = Number(b.risk_score || 0) - Number(a.risk_score || 0);
    if (riskScoreDelta) return riskScoreDelta;
    const amountScore = Number(b.amount_inr || 0) - Number(a.amount_inr || 0);
    if (amountScore) return amountScore;
    const daysScore = Number(b.days || 0) - Number(a.days || 0);
    if (daysScore) return daysScore;
    return boardroomConfidenceRank(b.confidence) - boardroomConfidenceRank(a.confidence);
  });
}

function boardroomCategoryRank(item) {
  if (item.financial_category === "LEAKAGE_AND_OVERRUN") return 4;
  if (Number(item.days || 0) > 0) return 3;
  if (item.financial_category === "ESG_METRIC") return 2;
  if (item.financial_category === "BASELINE_BUDGET") return 1;
  return 0;
}

function boardroomConfidenceRank(confidence) {
  if (confidence === "HIGH") return 3;
  if (confidence === "MEDIUM") return 2;
  if (confidence === "LOW") return 1;
  return 0;
}

function buildBoardroomExecutiveBrief(findings, documentsNotProcessed) {
  const ranked = boardroomRankFindings(findings);
  const leakage = findings.filter(
    (item) => item.financial_category === "LEAKAGE_AND_OVERRUN"
  );

  const recoverableLeakage = leakage.filter(
    boardroomHasQuantifiedCostExposure
  );

  const totalLeakage = recoverableLeakage.reduce(
    (sum, item) => sum + Number(item.amount_inr || 0),
    0
  );

  const scheduleOnly = leakage.filter(
    boardroomHasScheduleImpactOnly
  );

  const exposureHeadline =
    eev2ExecutiveExposureHeadline(findings);

  const exposureSummary =
    eev2BuildExecutiveExposureSummary(findings);

  const critical = findings.filter(
    (item) => item.severity === "CRITICAL"
  ).length;

  const high = findings.filter(
    (item) => item.severity === "HIGH"
  ).length;

  return {
    headline:
      exposureHeadline ||
      (
        totalLeakage > 0
          ? `Cited quantified recoverable leakage totals INR ${formatInr(totalLeakage)} across ${recoverableLeakage.length} finding(s).`
          : leakage.length
            ? `No quantified recoverable leakage was extracted; ${leakage.length} leakage/watchlist signal(s) need evidence follow-up${scheduleOnly.length ? `, including ${scheduleOnly.length} cited schedule-impact item(s)` : ""}.`
            : "No cited cost, schedule, ESG, or leakage evidence was extracted."
      ),

    decision_focus:
      exposureSummary.exposure_item_count
        ? "Validate quantified cost exposure and establish causation/recoverability before any recovery classification."
        : (
            ranked[0]
              ? `Start with Finding ${findings.indexOf(ranked[0]) + 1}: ${ranked[0].statement}`
              : "Resubmit structured source evidence before executive action."
          ),

    critical_or_high_count: critical + high,

    total_cited_leakage_inr: totalLeakage,

    quantified_cost_exposure: exposureSummary,

    documents_with_no_signal:
      (documentsNotProcessed || []).length,

    caveat:
      "Actions remain decision-support only and must be reviewed against cited evidence before commercial, legal, or recovery steps."
  };
}

function buildBoardroomTopExecutiveActions(findings) {
  const ranked = boardroomRankFindings(findings);
  const actions = [];

  const exposureAction =
    eev2BuildExposureValidationAction(findings);

  if (exposureAction) {
    actions.push({
      ...exposureAction,
      action: exposureAction.recommendation
    });
  }

  ranked
    .filter(
      (item) =>
        boardroomActionability(item) === ACTION_RECOVERABLE
    )
    .slice(0, 3)
    .forEach((item) => {
      actions.push(
        boardroomFindingAction(item, findings)
      );
    });

  const exposureIndexes = new Set(
    (exposureAction &&
      exposureAction.source_finding_indexes) ||
      []
  );

  const followups = ranked.filter((item) => {
    const index = findings.indexOf(item) + 1;

    return (
      boardroomActionability(item) ===
        ACTION_EVIDENCE_FOLLOWUP &&
      !exposureIndexes.has(index)
    );
  });

  if (followups.length) {
    actions.push(
      boardroomAggregateAction(
        "Complete evidence before executive escalation",
        `Keep ${followups.length} watchlist signal(s) as evidence follow-up until comparable Budget/Actual, invoice/payment, delay-day, or BOQ support is submitted.`,
        followups
          .slice(0, 5)
          .map(
            (item) =>
              findings.indexOf(item) + 1
          ),
        ACTION_EVIDENCE_FOLLOWUP,
        "LOW"
      )
    );
  }

  const monitoring = ranked.filter(
    (item) =>
      boardroomActionability(item) ===
      ACTION_MONITORING_CONTEXT
  );

  if (monitoring.length) {
    actions.push(
      boardroomAggregateAction(
        "Track baseline and ESG context separately",
        "Keep baseline and ESG items in the monitoring pack; do not count them as leakage without separate cost evidence.",
        monitoring
          .slice(0, 5)
          .map(
            (item) =>
              findings.indexOf(item) + 1
          ),
        ACTION_MONITORING_CONTEXT,
        "LOW"
      )
    );
  }

  return dedupeExecutiveActions(actions)
    .slice(0, 5)
    .map((action, index) => ({
      ...action,
      rank: index + 1
    }));
}

function buildExecutiveDecisionPack(options) {
  const findings =
    (options && options.findings) || [];

  const actionPlan =
    (options &&
      options.executiveActionPlan) ||
    {};

  const missingEvidence =
    actionableMissingEvidenceItems(
      (options &&
        options.missingEvidence) ||
        []
    );

  const status =
    (options &&
      options.reportQualityStatus) ||
    "";

  const topActions =
    collectExecutiveActionCards(
      actionPlan
    ).slice(0, 5);

  const moneyAtStake =
    boardroomQuantifiedLeakageTotal(
      findings
    );

  const headline =
    ((options &&
      options.executiveBrief) ||
      {}).headline ||
    (
      findings.length
        ? `Cited project evidence produced ${findings.length} finding(s).`
        : boardroomNoAnalysisHeadline(
            status ||
              REPORT_EVIDENCE_INTAKE_EXCEPTION
          )
    );

  const sourceFindingIndexes =
    uniqueNumbers(
      topActions.reduce(
        (all, action) =>
          all.concat(
            action.source_finding_indexes ||
              []
          ),
        []
      )
    );

  return {
    headline,

    money_at_stake_inr:
      moneyAtStake,

    quantified_cost_exposure:
      eev2BuildExecutiveExposureSummary(
        findings
      ),

    decision_required:
      boardroomBoardDecisionRequired({
        findings,
        top_5_actions:
          buildBoardroomTopExecutiveActions(
            findings
          ),
        report_quality_status: status
      }),

    top_actions: topActions,

    owner_role:
      topActions.length
        ? topActions[0].owner_role
        : "",

    due_horizon:
      topActions.length
        ? topActions[0].due_horizon
        : "",

    evidence_status:
      boardroomDecisionPackEvidenceStatus(
        findings,
        missingEvidence
      ),

    source_finding_indexes:
      sourceFindingIndexes,

    citations:
      boardroomActionCitationsFromIndexes(
        findings,
        sourceFindingIndexes
      ),

    blocked_by_missing_evidence:
      Boolean(
        (missingEvidence || []).length
      ),

    missing_evidence:
      missingEvidence || []
  };
}

// Filters out generic, non-actionable system disclaimers that were previously shown to clients
// as if they were the client's own evidence obligations. These describe Constrovet's own pipeline
// behaviour (deterministic keyword matching, OCR service requirements, citation completeness) --
// none of them name anything the client can submit. Genuine, specific gaps (a named file, a named
// finding missing one side of a budget/actual comparison) are untouched by this filter.
function actionableMissingEvidenceItems(items) {
  return (items || [])
    .map((item) => String(item || "").trim())
    .filter((item) => item && !/No blocking evidence gap/i.test(item))
    .filter((item) => !/Workspace form automation is deterministic|review citations before using findings/i.test(item))
    .filter((item) => !/PDF text extraction requires the Advanced Drive service/i.test(item))
    .filter((item) => !/Every executive recovery action needs file and page.sheet traceability/i.test(item))
    .filter((item) => !/Comparable Budget and Actual values were not found for every suspected variance/i.test(item));
}

// Caps a client-facing list at `limit` items WITHOUT silently dropping the rest. A checklist the
// client is expected to fully resolve (missing evidence, documents not processed) must never claim
// completeness it doesn't have -- if there is more than `limit`, the last slot is replaced with an
// honest "...and N more" line naming where the complete list actually lives (found 1 Sept 2026: a
// real 10-file intake had 2 of its 10 rejected files silently missing from the client email while
// the internal audit record correctly listed all 10).
function boardroomTruncateWithNotice_(items, limit, noun) {
  const all = items || [];
  if (all.length <= limit) return all.slice();
  const shown = all.slice(0, Math.max(0, limit - 1));
  const remaining = all.length - shown.length;
  return shown.concat([`...and ${remaining} more ${noun}${remaining === 1 ? "" : "s"} -- see the full list in your Constrovet project output folder.`]);
}

function collectExecutiveActionCards(actionPlan) {
  const cards = [];
  ["7_days", "30_days", "90_days"].forEach((horizon) => {
    ((actionPlan || {})[horizon] || []).forEach((action) => {
      cards.push({
        title: action.title || "Action",
        recommendation: action.recommendation || action.action || "",
        owner_role: action.owner_role || "Project Controls",
        due_horizon: action.due_horizon || horizon,
        evidence_status: action.evidence_status || "CITED_EVIDENCE_REQUIRED",
        source_finding_indexes: normalizeFindingIndexes(action.source_finding_indexes || [action.source_finding_index]),
        citations: action.citations || [],
        blocked_by_missing_evidence: Boolean(action.blocked_by_missing_evidence),
        confidence: action.confidence || "LOW",
        actionability: action.actionability || ""
      });
    });
  });
  return cards;
}

function boardroomDecisionPackEvidenceStatus(findings, missingEvidence) {
  if (!findings.length) return "NO_CITED_FINDINGS";
  if ((missingEvidence || []).length) return "CITED_WITH_OPEN_EVIDENCE_GAPS";
  if (findings.some((item) => (item.evidence_quality || "") === "STRUCTURED_ACTUAL_BUDGET")) return "STRUCTURED_CITED_EVIDENCE";
  return "CITED_EVIDENCE_REVIEW_REQUIRED";
}

function boardroomActionCitationsFromIndexes(findings, indexes) {
  return normalizeFindingIndexes(indexes || [])
    .map((index) => ((findings || [])[index - 1] || {}).citations || [])
    .reduce((all, citations) => all.concat(citations), [])
    .filter((citation) => citation && citation.file && citation.page_or_sheet && citation.quoted_span)
    .slice(0, 10);
}

function boardroomActionTitle(item) {
  if (boardroomHasQuantifiedCostExposure(item)) return "Recover or contain quantified cost exposure";
  if (boardroomHasScheduleImpactOnly(item)) return "Validate cited schedule impact";
  if (boardroomActionability(item) === ACTION_EVIDENCE_FOLLOWUP) return "Complete evidence before executive escalation";
  if (item.financial_category === "ESG_METRIC") return "Track ESG metric separately";
  return "Keep baseline value out of leakage";
}

function boardroomActionText(item) {
  if (boardroomHasQuantifiedCostExposure(item)) {
    return `Approve validation of INR ${formatInr(item.amount_inr)} cited exposure against invoices, approvals, and BOQ support before any recovery or avoidance action.`;
  }
  if (boardroomHasScheduleImpactOnly(item)) {
    return `Validate ${item.days} cited delay day(s), identify the affected schedule activity, and add cost support before any commercial claim.`;
  }
  if (boardroomActionability(item) === ACTION_EVIDENCE_FOLLOWUP) {
    return "Keep this as an evidence follow-up; collect comparable Budget/Actual, invoice/payment, delay-day, or BOQ support before escalation.";
  }
  if (item.financial_category === "ESG_METRIC") return "Keep the ESG metric in the monitoring pack unless separate financial evidence supports a cost finding.";
  return "Use this as approved context for variance review; do not count it as leakage.";
}

function boardroomFindingAction(item, findings) {
  const index = findings.indexOf(item) + 1;
  return {
    title: boardroomActionTitle(item),
    action: boardroomActionText(item),
    source_finding_index: index,
    source_finding_indexes: [index],
    owner_role: boardroomOwnerRole(item),
    due_horizon: boardroomDueHorizon(item),
    evidence_status: boardroomActionEvidenceStatus(item),
    citations: boardroomActionCitationsFromIndexes(findings, [index]),
    blocked_by_missing_evidence: boardroomActionability(item) !== ACTION_RECOVERABLE,
    risk_score: item.risk_score,
    severity: item.severity,
    recoverability: item.recoverability,
    evidence_quality: item.evidence_quality,
    actionability: boardroomActionability(item)
  };
}

function boardroomAggregateAction(title, action, sourceFindingIndexes, actionability, confidence) {
  return {
    title,
    action,
    source_finding_index: (sourceFindingIndexes || [])[0] || 0,
    source_finding_indexes: sourceFindingIndexes || [],
    owner_role: actionability === ACTION_MONITORING_CONTEXT ? "Project Controls" : "Finance / Cost Control",
    due_horizon: actionability === ACTION_MONITORING_CONTEXT ? "90_days" : "7_days",
    evidence_status: actionability === ACTION_MONITORING_CONTEXT ? "MONITOR_ONLY" : "MISSING_EVIDENCE",
    citations: [],
    blocked_by_missing_evidence: actionability === ACTION_EVIDENCE_FOLLOWUP,
    risk_score: 0,
    severity: "LOW",
    recoverability: "LOW",
    evidence_quality: "MIXED",
    actionability,
    confidence: confidence || "LOW"
  };
}

function dedupeExecutiveActions(actions) {
  const seen = {};
  return (actions || []).filter((action) => {
    const key = `${action.actionability || ""}|${action.title || ""}|${action.action || action.recommendation || ""}`;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function buildBoardroomRecoverableCostExposure(findings) {
  const items = boardroomRankFindings(findings).filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN" && boardroomHasQuantifiedCostExposure(item));
  return {
    total_cited_amount_inr: items.reduce((sum, item) => sum + Number(item.amount_inr || 0), 0),
    item_count: items.length,
    high_recoverability_count: items.filter((item) => item.recoverability === "HIGH").length,
    finding_indexes: items.slice(0, 10).map((item) => findings.indexOf(item) + 1)
  };
}

function boardroomQuantifiedLeakageTotal(findings) {
  return (findings || [])
    .filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN" && boardroomHasQuantifiedCostExposure(item))
    .reduce((sum, item) => sum + Number(item.amount_inr || 0), 0);
}

function buildBoardroomImmediateControlFailures(findings) {
  return boardroomRankFindings(findings)
    .filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN" && item.urgency === "IMMEDIATE")
    .slice(0, 5)
    .map((item) => ({
      source_finding_index: findings.indexOf(item) + 1,
      control_theme: item.control_theme,
      severity: item.severity,
      action: boardroomActionText(item)
    }));
}

function buildBoardroomMissingEvidence(findings, documentsNotProcessed) {
  const gaps = [];
  // Only raise a Budget/Actual gap against a specific cost-overrun finding that is actually
  // missing one side of the comparison it depends on -- never as a blanket statement that fires
  // just because other, legitimately non-budget-comparison findings exist (ESG, delay, VO, cost
  // exposure). Named by file so the client knows exactly what to submit and why.
  //
  // financial_category === "LEAKAGE_AND_OVERRUN" alone is NOT a safe signal here: every EEV2
  // module (delay-day counts, schedule-status contradictions, cost-exposure summaries) also uses
  // this category purely to route actionability, with budget/actual left at 0 by design because
  // they were never a budget-vs-actual comparison in the first place. A real production run
  // proved this out -- a delay-day count and three schedule-status label contradictions all got
  // told to submit "missing Budget and Actual figures" they never claimed to have. Every EEV2
  // finding carries either eev2_semantic_classification or recoverability_guardrail
  // "NOT_ESTABLISHED" (often both); the legacy per-span leakage findings this check was written
  // for carry neither. Excluding on either signal is what actually narrows this to genuine,
  // legacy-style budget/actual claims.
  //
  // Those two markers are not the only way a LEAKAGE_AND_OVERRUN finding can legitimately have
  // no budget/actual to compare. The generic keyword fallback (the one every non-EEV2-module
  // document goes through -- see boardroomEvidenceWindows()) tags ANY span containing a trigger
  // term like "delay" or "penalty" as LEAKAGE_AND_OVERRUN even when nothing quantifiable was
  // nearby -- it never claimed a budget-vs-actual comparison in the first place, so there is
  // nothing missing to confirm. Confirmed 1 Sept 2026 on a real production EOT claim (job
  // form-20260901-071257-6379ac7a): 24 separate narrative "possible leakage... trigger term:
  // delay" findings, none carrying a budget figure, an actual figure, or even a cited rupee
  // amount, each generated its own "missing the Budget and Actual figures" gap -- 24 near-
  // identical false-positive asks stacked onto a client who never claimed a dollar variance in
  // that document at all (their actual claim was a schedule/day-count one, already correctly
  // asked for elsewhere in the report). A finding only genuinely claims a budget-vs-actual
  // comparison if it cites at least one side of that comparison, or an amount -- one of budget,
  // actual, or amount_inr being nonzero. A finding with none of the three carries no dollar
  // dimension to complete.
  findings.forEach((item) => {
    if ((item || {}).financial_category !== "LEAKAGE_AND_OVERRUN") return;
    if ((item || {}).eev2_semantic_classification) return;
    if ((item || {}).recoverability_guardrail === "NOT_ESTABLISHED") return;
    const calc = (item || {}).calculation || {};
    const hasBudget = Number(calc.budget || 0) > 0;
    const hasActual = Number(calc.actual || 0) > 0;
    if (hasBudget && hasActual) return;
    if (!hasBudget && !hasActual && !(Number((item || {}).amount_inr || 0) > 0)) return;
    const file = ((item.citations || [])[0] || {}).file || "the source document";
    const missingSide = !hasBudget && !hasActual
      ? "the Budget and Actual figures"
      : (!hasBudget ? "the approved Budget/BOQ figure" : "the Actual/spend figure");
    gaps.push(`${file}: this cost-overrun finding is missing ${missingSide} needed to confirm the stated variance -- please submit the missing figure(s) for this line item.`);
  });
  // File/page/sheet traceability on every finding is Constrovet's own extraction-quality gate --
  // the citation is produced by our OCR and analysis pipeline, not supplied by the client. It is
  // not something the client can submit, so it is no longer raised as a client evidence request.
  documentsNotProcessed.forEach((item) => gaps.push(item));
  return gaps;
}

function buildBoardroomExecutiveActionPlan(findings) {
  if (!findings.length) {
    return buildBoardroomIntakeRemediationPlan();
  }

  const ranked = boardroomRankFindings(findings);

  const recoverable = ranked.filter(
    (item) =>
      boardroomActionability(item) ===
      ACTION_RECOVERABLE
  );

  const quantified = recoverable.filter(
    boardroomHasQuantifiedCostExposure
  );

  const scheduleOnly = recoverable.filter(
    boardroomHasScheduleImpactOnly
  );

  const followups = ranked.filter(
    (item) =>
      boardroomActionability(item) ===
      ACTION_EVIDENCE_FOLLOWUP
  );

  const monitoring = ranked.filter(
    (item) =>
      boardroomActionability(item) ===
      ACTION_MONITORING_CONTEXT
  );

  const plan = {
    "7_days": [],
    "30_days": [],
    "90_days": []
  };

  const exposureValidationAction =
    eev2BuildExposureValidationAction(findings);

  const exposureDecisionAction =
    eev2BuildExposureDecisionAction(findings);

  if (exposureValidationAction) {
    plan["7_days"].push(
      exposureValidationAction
    );
  }

  if (exposureDecisionAction) {
    plan["30_days"].push(
      exposureDecisionAction
    );
  }

  if (quantified.length) {
    plan["7_days"].push(
      boardroomAction(
        "Validate quantified exposure",
        `Approve validation of INR ${formatInr(quantified[0].amount_inr)} cited exposure against invoices, approvals, BOQ lines, and payment records before assigning recovery work.`,
        quantified
          .slice(0, 3)
          .map(
            (item) =>
              findings.indexOf(item) + 1
          ),
        quantified[0].confidence,
        findings
      )
    );

    plan["30_days"].push(
      boardroomAction(
        "Decide recovery or avoidance route",
        "Proceed only on quantified findings whose cited amount, approval trail, and responsibility can be verified from source records.",
        quantified
          .slice(0, 3)
          .map(
            (item) =>
              findings.indexOf(item) + 1
          ),
        "MEDIUM",
        findings
      )
    );

    plan["90_days"].push(
      boardroomAction(
        "Prevent recurrence of verified exposure",
        "Convert verified quantified exposure into monthly variance checks and closeout evidence requirements.",
        quantified
          .slice(0, 5)
          .map(
            (item) =>
              findings.indexOf(item) + 1
          ),
        "MEDIUM",
        findings
      )
    );
  }

  if (scheduleOnly.length) {
    plan["7_days"].push(
      boardroomAction(
        "Validate cited schedule impact",
        `Confirm ${scheduleOnly[0].days} cited delay day(s), affected activity, and current critical-path status before cost escalation.`,
        scheduleOnly
          .slice(0, 3)
          .map(
            (item) =>
              findings.indexOf(item) + 1
          ),
        scheduleOnly[0].confidence,
        findings
      )
    );

    plan["30_days"].push(
      boardroomAction(
        "Update schedule forecast",
        "Reflect cited delay-day evidence in the next schedule review and collect cost support separately if a cost claim is expected.",
        scheduleOnly
          .slice(0, 3)
          .map(
            (item) =>
              findings.indexOf(item) + 1
          ),
        "MEDIUM",
        findings
      )
    );
  }

  if (
    followups.length ||
    (!quantified.length &&
      !scheduleOnly.length)
  ) {
    plan["7_days"].push(
      boardroomAction(
        "Collect missing commercial support",
        "Request invoice/payment/BOQ support, comparable Budget/Actual values, BOQ line labels, and delay-day support for watchlist findings.",
        followups
          .slice(0, 5)
          .map(
            (item) =>
              findings.indexOf(item) + 1
          ),
        "LOW",
        findings
      )
    );

    plan["30_days"].push(
      boardroomAction(
        "Rerun after corrected evidence",
        "Submit corrected evidence against the same job ID and rerun the review before executive escalation.",
        followups
          .slice(0, 5)
          .map(
            (item) =>
              findings.indexOf(item) + 1
          ),
        "LOW",
        findings
      )
    );

    plan["90_days"].push(
      boardroomAction(
        "Standardize intake only if gaps recur",
        "If repeated evidence gaps continue, standardize the intake template for Budget, Actual, invoice, schedule, and ESG fields.",
        followups
          .slice(0, 5)
          .map(
            (item) =>
              findings.indexOf(item) + 1
          ),
        "LOW",
        findings
      )
    );
  }

  if (monitoring.length) {
    plan["90_days"].push(
      boardroomAction(
        "Track context outside leakage",
        "Monitor only: keep baseline and ESG items in dashboards unless separate cost evidence supports a leakage finding.",
        monitoring
          .slice(0, 5)
          .map(
            (item) =>
              findings.indexOf(item) + 1
          ),
        "LOW",
        findings
      )
    );
  }

  return {
    "7_days":
      dedupeBoardroomPlanActions(
        plan["7_days"]
      ),

    "30_days":
      dedupeBoardroomPlanActions(
        plan["30_days"]
      ),

    "90_days":
      dedupeBoardroomPlanActions(
        plan["90_days"]
      )
  };
}

function buildBoardroomIntakeRemediationPlan() {
  return {
    "7_days": [
      boardroomAction("Resubmit structured cost evidence", "Upload CSV evidence with columns such as Budget, Actual, Cost Incurred, Paid Amount, Invoice, Delay Days, Wastage, Rework, Diesel, Fuel, Energy, Water, or Emissions.", [], "LOW"),
      boardroomAction("Confirm PDF OCR readiness", "If submitting PDFs, enable Apps Script Advanced Drive service OCR and use searchable PDFs or clear scans.", [], "LOW"),
      boardroomAction("Attach source traceability", "Include file names, BOQ line references, invoice IDs, payment references, or schedule row labels so every future finding can be cited.", [], "LOW")
    ],
    "30_days": [
      boardroomAction("Standardize intake template", "Use a recurring budget-vs-actual and leakage register template for every Boardroom upload.", [], "LOW"),
      boardroomAction("Separate baseline from leakage", "Keep BOQ, contract value, planned spend, and cumulative work done separate from actual overspend, penalties, wastage, rework, and idle-resource costs.", [], "LOW"),
      boardroomAction("Add ESG metric fields", "Capture diesel, fuel, energy, water, waste diversion, carbon, and emissions fields separately from financial recovery evidence.", [], "LOW")
    ],
    "90_days": [
      boardroomAction("Institutionalize evidence capture", "Make budget, actual, invoice, schedule, and ESG records part of monthly project controls before Boardroom review.", [], "LOW"),
      boardroomAction("Track intake quality", "Track rejected files, OCR failures, missing columns, and no-signal documents until the process consistently produces cited findings.", [], "LOW"),
      boardroomAction("Prepare next executive review pack", "Resubmit with structured source evidence before using the report for recovery, commercial, legal, or control decisions.", [], "LOW")
    ]
  };
}

function boardroomAction(title, recommendation, sourceFindingIndexes, confidence, findings) {
  const indexes = normalizeFindingIndexes(sourceFindingIndexes || []);
  const linkedFindings = indexes.map((index) => ((findings || [])[index - 1])).filter(Boolean);
  const primary = linkedFindings[0] || null;
  const actionability = primary ? boardroomActionability(primary) : ACTION_EVIDENCE_FOLLOWUP;
  return {
    title,
    recommendation,
    source_finding_indexes: indexes,
    owner_role: primary ? boardroomOwnerRole(primary) : "Project Controls",
    due_horizon: primary ? boardroomDueHorizon(primary) : "7_days",
    evidence_status: primary ? boardroomActionEvidenceStatus(primary) : "MISSING_EVIDENCE",
    citations: boardroomActionCitationsFromIndexes(findings || [], indexes),
    blocked_by_missing_evidence: !primary || actionability === ACTION_EVIDENCE_FOLLOWUP,
    actionability,
    confidence
  };
}

function dedupeBoardroomPlanActions(actions) {
  const seen = {};
  return (actions || []).filter((action) => {
    const key = `${action.title || ""}|${action.recommendation || ""}`;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function buildBoardroomRationale(findings, modelAuditTrail) {
  return {
    method: modelAuditTrail.xai_method,
    ranked_finding_indexes: boardroomRankFindings(findings).map((item) => findings.indexOf(item) + 1),
    citation_count: findings.reduce((sum, item) => sum + item.citations.length, 0),
    limitations: [
      "This Workspace automation is decision-support only.",
      "It does not certify recovery, compliance, contract entitlement, or legal liability.",
      "Unsupported amounts, dates, causes, and actions are not inferred."
    ]
  };
}

function boardroomShortStatement(span) {
  const text = String(span || "");
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function enforceRateLimit(email) {
  const props = PropertiesService.getScriptProperties();
  const day = Utilities.formatDate(new Date(), "GMT", "yyyyMMdd");
  const key = `rate:${day}:${String(email).toLowerCase()}`;
  const count = Number(props.getProperty(key) || "0");
  if (count >= DAILY_EMAIL_LIMIT) throw new Error("Daily report request limit reached for this email.");
  props.setProperty(key, String(count + 1));
}

function prepareJobFolders(jobId) {
  const root = getOrCreateFolder(DriveApp.getRootFolder(), CONSTROVET_ROOT_FOLDER);
  const projects = getOrCreateFolder(root, CONSTROVET_PROJECTS_FOLDER);
  const job = getOrCreateFolder(projects, jobId);
  const input = getOrCreateFolder(job, "input");
  const outputs = getOrCreateFolder(job, "outputs");
  const missingEvidence = getOrCreateFolder(job, "missing_evidence");
  const corrections = getOrCreateFolder(job, "corrections");
  const memory = getOrCreateFolder(job, "memory");
  const archive = getOrCreateFolder(job, "archive");
  return { root, projects, job, input, outputs, missingEvidence, corrections, memory, archive };
}

function getOrCreateFolder(parent, name) {
  const existing = parent.getFoldersByName(name);
  return existing.hasNext() ? existing.next() : parent.createFolder(name);
}

function upsertTextFile(folder, name, content, mimeType) {
  const files = folder.getFilesByName(name);
  if (files.hasNext()) {
    const file = files.next();
    file.setContent(content);
    return file;
  }
  return folder.createFile(name, content, mimeType || MimeType.PLAIN_TEXT);
}

function newJobState(jobId, state, metadata) {
  return {
    job_id: jobId,
    state,
    updated_at: new Date().toISOString(),
    metadata: metadata || {}
  };
}

function writeJobState(folders, stateRecord) {
  const file = upsertTextFile(folders.outputs, `${stateRecord.job_id}-job-state.json`, JSON.stringify(stateRecord, null, 2), MimeType.PLAIN_TEXT);
  return file.getUrl();
}

function boardroomSourceFileNames(files) {
  return (files || []).map((file) => file.name || file.file || file.id || "").filter(Boolean).join("; ");
}

function attachEvidenceLoopMetadata(report, browserReport, folders, options) {
  const jobId = options.job_id || report.job_id;
  const queue = buildMissingEvidenceQueue(jobId, browserReport, options.email);
  browserReport.missing_evidence_queue = queue;
  report.missing_evidence_queue = queue;
  report.correction_count = Number(options.correction_count || 0);
  report.rerun_count = Number(options.rerun_count || 0);
  report.human_review_status = options.human_review_status || HUMAN_REVIEW_PENDING;
  report.extraction_status = JOB_STATE_EXTRACTION_COMPLETE;
  report.job_state = queue.length ? JOB_STATE_MISSING_EVIDENCE_OPEN : JOB_STATE_VERIFICATION_COMPLETE;
  report.evidence_loop = {
    architecture: "WORKSPACE_FIRST",
    job_state_model: [
      JOB_STATE_INTAKE_RECEIVED,
      JOB_STATE_EXTRACTION_COMPLETE,
      JOB_STATE_VERIFICATION_COMPLETE,
      JOB_STATE_ACTION_REPORT_SENT,
      JOB_STATE_MISSING_EVIDENCE_OPEN,
      JOB_STATE_CORRECTION_RECEIVED,
      JOB_STATE_RERUN_COMPLETE,
      JOB_STATE_ARCHIVED
    ],
    source_files: (options.source_files || []).map((file) => ({
      name: file.name || "",
      size_bytes: Number(file.size_bytes || 0),
      drive_url: file.drive_url || ""
    })),
    missing_evidence_count: queue.length,
    correction_count: report.correction_count,
    rerun_count: report.rerun_count,
    human_review_status: report.human_review_status
  };
  writeMissingEvidenceQueue(folders, jobId, queue);
  writeJobMemory(folders, report, browserReport);
  return report;
}

function createDeepReviewArtifact(outputsFolder, jobId, report, browserReport, options) {
  const review = buildDeepReview(report, browserReport);
  report.deep_review = review;
  if (!report.generated_files) report.generated_files = {};
  const currentName = `${jobId}-deep-review.json`;
  const currentFile = upsertTextFile(outputsFolder, currentName, JSON.stringify(review, null, 2), MimeType.PLAIN_TEXT);
  report.generated_files.deep_review_url = currentFile.getUrl();
  if (options && options.suffix) {
    const versionedFile = outputsFolder.createFile(`${jobId}-${options.suffix}-deep-review.json`, JSON.stringify(review, null, 2), MimeType.PLAIN_TEXT);
    report.generated_files.deep_review_url = versionedFile.getUrl();
    report.generated_files.current_deep_review_url = currentFile.getUrl();
  }
  return review;
}

function buildDeepReview(report, browserReport) {
  const safeBrowserReport = browserReport || {};
  const findings = safeBrowserReport.findings || [];
  const actions = collectDeepReviewActions(safeBrowserReport);
  const unsupportedClaims = collectUnsupportedClaims(report, safeBrowserReport, actions);
  const missedEvidenceQuestions = buildDeepReviewEvidenceQuestions(report, safeBrowserReport, findings);
  const criticFindings = buildDeepReviewCriticFindings(findings, safeBrowserReport, actions);
  const recommendedCorrections = buildDeepReviewCorrections(unsupportedClaims, missedEvidenceQuestions, criticFindings);
  const citedActionIndexes = uniqueNumbers(actions.reduce((all, action) => all.concat(action.source_finding_indexes || []), []));
  const citedFindingIndexes = uniqueNumbers(findings.map((_, index) => index + 1));
  const status = determineDeepReviewStatus(report, safeBrowserReport, findings, unsupportedClaims, missedEvidenceQuestions);
  return {
    job_id: report.job_id || "",
    generated_at: new Date().toISOString(),
    review_status: status,
    review_lane: "MANUAL_WORKSPACE_DEEP_REVIEW",
    source_policy: {
      raw_documents_included: false,
      web_search_used: false,
      external_model_called: false,
      source_of_truth: "Existing Constrovet final-report.json, cited findings, verifier result, honesty check, actionability labels, and audit metadata.",
      blocked_patterns: [
        "No DuckDuckGo or live web search for findings.",
        "No Colab/Ollama production runtime.",
        "No Oracle/FastAPI deployment.",
        "No eval-based calculator.",
        "No invented amounts, dates, causes, owners, recovery steps, or legal conclusions."
      ]
    },
    input_snapshot: {
      report_quality_status: report.report_quality_status || safeBrowserReport.report_quality_status || "",
      job_state: report.job_state || "",
      email_status: ((report.email_delivery || {}).email_status || ""),
      deterministic_verification_status: ((safeBrowserReport.deterministic_verifier_result || {}).verification_status || ""),
      gemini_verification_status: ((report.gemini_verifier_result || {}).verification_status || (report.gemini_verifier_result || {}).status || "UNKNOWN"),
      finding_count: findings.length,
      action_count: actions.length,
      missing_evidence_count: (report.missing_evidence_queue || safeBrowserReport.missing_evidence_queue || []).length,
      correction_count: Number(report.correction_count || 0),
      rerun_count: Number(report.rerun_count || 0)
    },
    specialist_lenses: buildDeepReviewSpecialistLenses(findings, safeBrowserReport),
    critic_findings: criticFindings,
    unsupported_claims: unsupportedClaims,
    missed_evidence_questions: missedEvidenceQuestions,
    recommended_corrections: recommendedCorrections,
    source_finding_indexes: citedFindingIndexes,
    action_source_finding_indexes: citedActionIndexes,
    audit_metadata: {
      email_source_mode: report.email_source_mode || "",
      source_job_id: report.source_job_id || report.job_id || "",
      source_job_folder_url: report.source_job_folder_url || "",
      source_outputs_folder_url: report.source_outputs_folder_url || "",
      source_final_report_url: report.source_final_report_url || "",
      result_url_health: report.result_url_health || resultUrlHealth(report.result_url || ""),
      human_review_status: report.human_review_status || HUMAN_REVIEW_PENDING
    },
    honesty_check: safeBrowserReport.honesty_check || {}
  };
}

function collectDeepReviewActions(browserReport) {
  const actions = [];
  (browserReport.top_5_actions || []).forEach((action) => {
    actions.push({
      section: "top_5_actions",
      title: action.title || "",
      text: action.action || action.recommendation || "",
      actionability: action.actionability || "",
      source_finding_indexes: normalizeFindingIndexes(action.source_finding_indexes || [action.source_finding_index])
    });
  });
  const plan = browserReport.executive_action_plan || {};
  ["7_days", "30_days", "90_days"].forEach((section) => {
    (plan[section] || []).forEach((action) => {
      actions.push({
        section,
        title: action.title || "",
        text: action.action || action.recommendation || "",
        actionability: action.actionability || "",
        source_finding_indexes: normalizeFindingIndexes(action.source_finding_indexes || [action.source_finding_index])
      });
    });
  });
  return actions;
}

function collectUnsupportedClaims(report, browserReport, actions) {
  const claims = [];
  const deterministic = browserReport.deterministic_verifier_result || {};
  (deterministic.unsupported_claims_removed || []).forEach((item) => {
    claims.push({
      source: "deterministic_verifier",
      claim: `Unsupported finding ${item.source_finding_index || ""}`.trim(),
      reason: (item.reasons || []).join("; "),
      source_finding_indexes: normalizeFindingIndexes([item.source_finding_index])
    });
  });
  actions.forEach((action) => {
    const sourceIndexes = normalizeFindingIndexes(action.source_finding_indexes || []);
    const linkedFindings = sourceIndexes.map((index) => (browserReport.findings || [])[index - 1]).filter(Boolean);
    const hasRecoverableSource = linkedFindings.some((item) => boardroomActionability(item) === ACTION_RECOVERABLE);
    const text = `${action.title || ""} ${action.text || ""}`;
    if (/recover|recovery|commercial claim|legal|liability|freeze spend|contain exposure/i.test(text) && !hasRecoverableSource) {
      claims.push({
        source: action.section || "executive_action",
        claim: action.title || action.text || "Unsupported recovery-language action",
        reason: "Recovery or containment language is allowed only when linked to RECOVERABLE_ACTION findings.",
        source_finding_indexes: sourceIndexes
      });
    }
    if (!sourceIndexes.length && /recover|claim|delay|cost|amount|budget|actual|invoice/i.test(text)) {
      claims.push({
        source: action.section || "executive_action",
        claim: action.title || action.text || "Uncited executive action",
        reason: "Commercially relevant actions must reference source finding indexes.",
        source_finding_indexes: []
      });
    }
  });
  const recoveryActionsOutsidePlan = actions.filter((action) => /recover|recovery|commercial claim|commercial recovery|legal|liability|freeze spend|contain exposure/i.test(`${action.title || ""} ${action.text || ""}`));
  if ((report.report_quality_status || browserReport.report_quality_status) !== REPORT_EXECUTIVE_ACTION_PLAN && recoveryActionsOutsidePlan.length) {
    claims.push({
      source: "report_mode",
      claim: "Recovery-style executive actions were present outside EXECUTIVE_ACTION_PLAN mode.",
      reason: "Irrelevant, unsupported, context-only, or intake-exception reports must not promote recovery actions.",
      source_finding_indexes: uniqueNumbers(recoveryActionsOutsidePlan.reduce((all, action) => all.concat(action.source_finding_indexes || []), []))
    });
  }
  return dedupeDeepReviewObjects(claims);
}

function buildDeepReviewEvidenceQuestions(report, browserReport, findings) {
  const questions = [];
  (report.missing_evidence_queue || browserReport.missing_evidence_queue || []).forEach((item) => {
    questions.push({
      question: `Submit ${item.required_evidence_type || "PROJECT_CONTROL_EVIDENCE"} for: ${item.missing_item || item}`,
      reason: "Open missing-evidence queue item.",
      source_finding_indexes: normalizeFindingIndexes([item.affected_finding_index])
    });
  });
  const hasBudgetActual = findings.some((item) => Number((item.calculation || {}).budget || 0) > 0 && Number((item.calculation || {}).actual || 0) > 0);
  if (findings.length && !hasBudgetActual) {
    questions.push({
      question: "Provide comparable Budget and Actual columns or rows for suspected financial variances.",
      reason: "No finding contains both budget and actual values.",
      source_finding_indexes: findings.map((_, index) => index + 1)
    });
  }
  findings.forEach((item, index) => {
    if (boardroomActionability(item) === ACTION_EVIDENCE_FOLLOWUP) {
      questions.push({
        question: `Provide stronger commercial support for Finding ${index + 1}.`,
        reason: "Finding is a watchlist or narrative signal, not a recoverable action.",
        source_finding_indexes: [index + 1]
      });
    }
  });
  return dedupeDeepReviewObjects(questions);
}

function buildDeepReviewCriticFindings(findings, browserReport, actions) {
  const critic = [];
  if (!findings.length) {
    critic.push({
      severity: "HIGH",
      issue: "No cited findings are available for executive action.",
      recommendation: "Keep output as an intake exception and request structured evidence.",
      source_finding_indexes: []
    });
  }
  findings.forEach((item, index) => {
    const findingIndex = index + 1;
    const actionability = boardroomActionability(item);
    if (!((item.citations || [])[0] || {}).quoted_span) {
      critic.push({
        severity: "HIGH",
        issue: `Finding ${findingIndex} is missing a quoted span.`,
        recommendation: "Do not use the finding until file, page/sheet, and quoted span are all present.",
        source_finding_indexes: [findingIndex]
      });
    }
    if (item.financial_category === "LEAKAGE_AND_OVERRUN" && actionability !== ACTION_RECOVERABLE) {
      critic.push({
        severity: "MEDIUM",
        issue: `Finding ${findingIndex} is leakage/watchlist but not recoverable.`,
        recommendation: "Keep it as evidence follow-up unless positive INR exposure or cited delay support exists.",
        source_finding_indexes: [findingIndex]
      });
    }
    if ((item.financial_category === "BASELINE_BUDGET" || item.financial_category === "ESG_METRIC") && actionability !== ACTION_MONITORING_CONTEXT) {
      critic.push({
        severity: "MEDIUM",
        issue: `Finding ${findingIndex} should remain monitoring context.`,
        recommendation: "Do not count baseline or ESG-only evidence as leakage.",
        source_finding_indexes: [findingIndex]
      });
    }
  });
  const duplicateActions = findDuplicateDeepReviewActions(actions);
  duplicateActions.forEach((duplicate) => critic.push(duplicate));
  return dedupeDeepReviewObjects(critic);
}

function buildDeepReviewCorrections(unsupportedClaims, missedEvidenceQuestions, criticFindings) {
  const corrections = [];
  if (unsupportedClaims.length) {
    corrections.push({
      correction: "Remove unsupported recovery, liability, legal, or containment claims before executive use.",
      reason: `${unsupportedClaims.length} unsupported claim(s) were detected.`,
      source_finding_indexes: uniqueNumbers(unsupportedClaims.reduce((all, item) => all.concat(item.source_finding_indexes || []), []))
    });
  }
  if (missedEvidenceQuestions.length) {
    corrections.push({
      correction: "Ask the submitter for missing evidence and rerun the same job after corrected evidence arrives.",
      reason: `${missedEvidenceQuestions.length} missing-evidence question(s) remain open.`,
      source_finding_indexes: uniqueNumbers(missedEvidenceQuestions.reduce((all, item) => all.concat(item.source_finding_indexes || []), []))
    });
  }
  if (criticFindings.some((item) => /duplicate/i.test(item.issue || ""))) {
    corrections.push({
      correction: "Dedupe repeated executive actions before email or board circulation.",
      reason: "Repeated action titles with the same source findings reduce executive actionability.",
      source_finding_indexes: []
    });
  }
  if (!corrections.length) {
    corrections.push({
      correction: "Proceed only after human review confirms citations and commercial context.",
      reason: "No deterministic deep-review blocker was found.",
      source_finding_indexes: []
    });
  }
  return corrections;
}

function buildDeepReviewSpecialistLenses(findings, browserReport) {
  return [
    {
      lens: "estimator",
      check: "Budget, Actual, and Actual - Budget calculations are cited and positive exposure is not invented.",
      finding_indexes: findings.map((item, index) => Number((item.calculation || {}).budget || 0) > 0 || Number((item.calculation || {}).actual || 0) > 0 ? index + 1 : 0).filter(Boolean)
    },
    {
      lens: "compliance",
      check: "No permit, liability, legal, or contractual entitlement claim is made without cited source evidence.",
      finding_indexes: []
    },
    {
      lens: "vendor",
      check: "Vendor, invoice, PO, payment, and quote issues remain evidence follow-up unless cited amounts support action.",
      finding_indexes: findings.map((item, index) => /vendor|invoice|po|purchase|quote|payment/i.test(`${item.statement || ""} ${JSON.stringify(item.citations || [])}`) ? index + 1 : 0).filter(Boolean)
    },
    {
      lens: "risk",
      check: "Risk score and severity are derived from cited findings and do not create new facts.",
      finding_indexes: findings.map((_, index) => index + 1)
    },
    {
      lens: "research",
      check: "External research is disabled for findings; only document outcomes and honesty-check gaps are reviewed.",
      finding_indexes: [],
      document_outcomes_count: (browserReport.document_outcomes || []).length
    }
  ];
}

function determineDeepReviewStatus(report, browserReport, findings, unsupportedClaims, missedEvidenceQuestions) {
  const mode = report.report_quality_status || browserReport.report_quality_status || "";
  if (!findings.length || mode !== REPORT_EXECUTIVE_ACTION_PLAN) return DEEP_REVIEW_STATUS_BLOCKED;
  if (unsupportedClaims.length || missedEvidenceQuestions.length) return DEEP_REVIEW_STATUS_NEEDS_EVIDENCE;
  return DEEP_REVIEW_STATUS_READY;
}

function findDuplicateDeepReviewActions(actions) {
  const seen = {};
  const duplicates = [];
  (actions || []).forEach((action) => {
    const key = `${String(action.title || "").toLowerCase()}|${(action.source_finding_indexes || []).join("-")}`;
    if (!key.replace("|", "")) return;
    if (seen[key]) {
      duplicates.push({
        severity: "LOW",
        issue: `Duplicate executive action: ${action.title || "Untitled action"}`,
        recommendation: "Keep one action per title and source finding set.",
        source_finding_indexes: action.source_finding_indexes || []
      });
    }
    seen[key] = true;
  });
  return duplicates;
}

function normalizeFindingIndexes(indexes) {
  return uniqueNumbers((indexes || []).map((index) => Number(index || 0)).filter((index) => index > 0));
}

function uniqueNumbers(values) {
  const seen = {};
  return (values || [])
    .map((value) => Number(value || 0))
    .filter((value) => value > 0)
    .filter((value) => {
      if (seen[value]) return false;
      seen[value] = true;
      return true;
    });
}

function dedupeDeepReviewObjects(items) {
  const seen = {};
  return (items || []).filter((item) => {
    const key = JSON.stringify(item || {});
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function buildMissingEvidenceQueue(jobId, browserReport, ownerEmail) {
  const items = [
    ...((browserReport || {}).missing_evidence_blocking_recovery || []),
    ...(((browserReport || {}).honesty_check || {}).documents_not_processed || [])
  ].filter(Boolean);
  const seen = {};
  return actionableMissingEvidenceItems(items)
    .filter((item) => {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    })
    .map((item, index) => ({
      id: `${jobId}-ME-${String(index + 1).padStart(3, "0")}`,
      job_id: jobId,
      missing_item: item,
      affected_finding_index: inferAffectedFindingIndex(item),
      required_evidence_type: classifyMissingEvidenceType(item),
      status: "OPEN",
      owner_email: isValidEmail(ownerEmail) ? String(ownerEmail).trim() : "",
      created_at: new Date().toISOString(),
      resolved_at: ""
    }));
}

function inferAffectedFindingIndex(item) {
  const match = String(item || "").match(/finding\s+(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function classifyMissingEvidenceType(item) {
  const text = String(item || "").toLowerCase();
  if (/budget|actual|boq|invoice|payment|ra bill|ipc|cost/.test(text)) return "COST_AND_COMMERCIAL_EVIDENCE";
  if (/delay|schedule|eot|days/.test(text)) return "SCHEDULE_EVIDENCE";
  if (/diesel|fuel|energy|water|carbon|emission|waste/.test(text)) return "ESG_EVIDENCE";
  if (/ocr|pdf|text extraction|advanced drive/.test(text)) return "EXTRACTABLE_TEXT_OR_OCR";
  if (/file|page|sheet|traceability|citation/.test(text)) return "SOURCE_TRACEABILITY";
  return "PROJECT_CONTROL_EVIDENCE";
}

function writeMissingEvidenceQueue(folders, jobId, queue) {
  const json = JSON.stringify({ job_id: jobId, updated_at: new Date().toISOString(), items: queue || [] }, null, 2);
  const csv = [
    "id,job_id,status,owner_email,required_evidence_type,affected_finding_index,created_at,resolved_at,missing_item",
    ...(queue || []).map((item) => [
      csvCell(item.id),
      csvCell(item.job_id),
      csvCell(item.status),
      csvCell(item.owner_email),
      csvCell(item.required_evidence_type),
      csvCell(item.affected_finding_index),
      csvCell(item.created_at),
      csvCell(item.resolved_at),
      csvCell(item.missing_item)
    ].join(","))
  ].join("\n");
  upsertTextFile(folders.missingEvidence, `${jobId}-missing-evidence-queue.json`, json, MimeType.PLAIN_TEXT);
  upsertTextFile(folders.missingEvidence, `${jobId}-missing-evidence-queue.csv`, csv, "text/csv");
}

function writeJobMemory(folders, report, browserReport) {
  const verifier = (browserReport || {}).deterministic_verifier_result || {};
  const projectKnowledge = buildProjectKnowledgeMemory(report, browserReport);
  const actionRegister = buildActionRegisterMemory(report, browserReport);
  const evidenceGapRegister = buildEvidenceGapRegisterMemory(report, browserReport);
  const memory = {
    job_id: report.job_id,
    updated_at: new Date().toISOString(),
    durable_context_only: true,
    report_quality_status: report.report_quality_status || "",
    job_state: report.job_state || "",
    correction_count: Number(report.correction_count || 0),
    rerun_count: Number(report.rerun_count || 0),
    accepted_corrections: report.accepted_corrections || [],
    rejected_corrections: report.rejected_corrections || [],
    verifier_status: verifier.verification_status || "",
    corrected_calculations: verifier.corrected_calculations || [],
    unsupported_claims_removed: verifier.unsupported_claims_removed || [],
    missing_evidence_queue: report.missing_evidence_queue || [],
    extraction_errors: ((browserReport || {}).document_outcomes || [])
      .filter((item) => item.reason && item.status !== "STRUCTURED_CONSTRUCTION_EVIDENCE")
      .map((item) => ({ file: item.file, status: item.status, reason: item.reason }))
  };
  upsertTextFile(folders.memory, `${report.job_id}-memory.json`, JSON.stringify(memory, null, 2), MimeType.PLAIN_TEXT);
  upsertTextFile(folders.memory, "project-knowledge.json", JSON.stringify(projectKnowledge, null, 2), MimeType.PLAIN_TEXT);
  upsertTextFile(folders.memory, "action-register.json", JSON.stringify(actionRegister, null, 2), MimeType.PLAIN_TEXT);
  upsertTextFile(folders.memory, "evidence-gap-register.json", JSON.stringify(evidenceGapRegister, null, 2), MimeType.PLAIN_TEXT);
}

function buildProjectKnowledgeMemory(report, browserReport) {
  const findings = (browserReport || {}).findings || [];
  const verifier = (browserReport || {}).deterministic_verifier_result || {};
  return {
    job_id: report.job_id || "",
    updated_at: new Date().toISOString(),
    source_policy: "PROJECT_LEVEL_EVIDENCE_ONLY",
    prohibited_inferences: [
      "No invented causes, liability, entitlement, recovery probability, legal conclusions, or savings.",
      "No global cross-project benchmarking."
    ],
    report_quality_status: report.report_quality_status || (browserReport || {}).report_quality_status || "",
    executive_decision_pack: (browserReport || {}).executive_decision_pack || report.executive_decision_pack || {},
    normalized_cited_facts: findings.map((finding, index) => ({
      finding_index: index + 1,
      statement: finding.statement || "",
      financial_category: finding.financial_category || "",
      amount_inr: Number(finding.amount_inr || 0),
      days: Number(finding.days || 0),
      calculation: finding.calculation || {},
      confidence: finding.confidence || "LOW",
      evidence_quality: finding.evidence_quality || "",
      recoverability: finding.recoverability || "",
      actionability: finding.actionability || "",
      owner_role: boardroomOwnerRole(finding),
      due_horizon: boardroomDueHorizon(finding),
      citations: finding.citations || []
    })),
    recurring_extraction_issues: ((browserReport || {}).document_outcomes || [])
      .filter((item) => item.reason && item.status !== "STRUCTURED_CONSTRUCTION_EVIDENCE")
      .map((item) => ({ file: item.file || "", status: item.status || "", reason: item.reason || "" })),
    verifier_status: verifier.verification_status || "",
    corrected_calculations: verifier.corrected_calculations || [],
    unsupported_claims_removed: verifier.unsupported_claims_removed || []
  };
}

function buildActionRegisterMemory(report, browserReport) {
  const pack = (browserReport || {}).executive_decision_pack || report.executive_decision_pack || {};
  const actions = collectExecutiveActionCards((browserReport || {}).executive_action_plan || {});
  return {
    job_id: report.job_id || "",
    updated_at: new Date().toISOString(),
    status_policy: "OPEN_UNTIL_HUMAN_REVIEW_OR_CORRECTION",
    board_decision_required: pack.decision_required || "",
    money_at_stake_inr: Number(pack.money_at_stake_inr || 0),
    actions: actions.map((action, index) => ({
      id: `${report.job_id || "job"}-action-${index + 1}`,
      status: "OPEN",
      title: action.title || "Action",
      recommendation: action.recommendation || action.action || "",
      owner_role: action.owner_role || "Project Controls",
      due_horizon: action.due_horizon || "",
      evidence_status: action.evidence_status || "",
      blocked_by_missing_evidence: Boolean(action.blocked_by_missing_evidence),
      source_finding_indexes: action.source_finding_indexes || [],
      citations: action.citations || [],
      confidence: action.confidence || "LOW"
    }))
  };
}

function buildEvidenceGapRegisterMemory(report, browserReport) {
  const queue = report.missing_evidence_queue || (browserReport || {}).missing_evidence_queue || [];
  const missing = actionableMissingEvidenceItems(boardroomMissingEvidenceItems(browserReport || {}));
  const seen = {};
  const items = [];
  queue.forEach((item) => {
    const key = `${item.required_evidence_type || ""}|${item.missing_item || ""}|${item.affected_finding_index || ""}`;
    seen[key] = true;
    items.push({
      id: item.id || "",
      job_id: item.job_id || report.job_id || "",
      status: item.status || "OPEN",
      owner_email: item.owner_email || "",
      required_evidence_type: item.required_evidence_type || "PROJECT_CONTROL_EVIDENCE",
      affected_finding_index: item.affected_finding_index || "",
      missing_item: item.missing_item || "",
      created_at: item.created_at || "",
      resolved_at: item.resolved_at || ""
    });
  });
  missing.forEach((item, index) => {
    const key = `UNSTRUCTURED_GAP|${item}|`;
    if (seen[key]) return;
    items.push({
      id: `${report.job_id || "job"}-gap-${index + 1}`,
      job_id: report.job_id || "",
      status: "OPEN",
      owner_email: "",
      required_evidence_type: classifyMissingEvidenceType(item),
      affected_finding_index: "",
      missing_item: item,
      created_at: new Date().toISOString(),
      resolved_at: ""
    });
  });
  return {
    job_id: report.job_id || "",
    updated_at: new Date().toISOString(),
    source_policy: "OPEN_GAPS_ONLY_NO_INFERRED_FACTS",
    items
  };
}

function csvCell(value) {
  const text = String(value === undefined || value === null ? "" : value);
  return `"${text.replace(/"/g, '""')}"`;
}

function saveUploadedFiles(files, inputFolder) {
  return files.map((file) => {
    const bytes = Utilities.base64Decode(file.base64);
    const blob = Utilities.newBlob(bytes, file.mime_type || mimeTypeForName(file.name), safeFileName(file.name));
    const driveFile = inputFolder.createFile(blob);
    return {
      name: file.name,
      size_bytes: file.size_bytes || bytes.length,
      drive_url: driveFile.getUrl()
    };
  });
}

function mimeTypeForName(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "text/csv";
}

function runGeminiVerifier(browserReport) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured in Apps Script properties.");
  const model = PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL") || "gemini-2.5-pro";
  const safePayload = evidenceOnlyPayload(browserReport);
  const prompt = buildGeminiPrompt(safePayload);
  const response = UrlFetchApp.fetch(`${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json"
      }
    })
  });
  const status = response.getResponseCode();
  const body = response.getContentText();
  if (status >= 400) throw new Error(`Gemini request failed with HTTP ${status}: ${body.slice(0, 300)}`);
  const parsed = JSON.parse(body);
  const text = parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content && parsed.candidates[0].content.parts
    ? parsed.candidates[0].content.parts.map((part) => part.text || "").join("")
    : "";
  if (!text) throw new Error("Gemini response was empty.");
  return JSON.parse(extractJson(text));
}

function evidenceOnlyPayload(browserReport) {
  return {
    findings: browserReport.findings || [],
    executive_brief: browserReport.executive_brief || {},
    top_5_actions: browserReport.top_5_actions || [],
    recoverable_cost_exposure: browserReport.recoverable_cost_exposure || {},
    immediate_control_failures: browserReport.immediate_control_failures || [],
    missing_evidence_blocking_recovery: browserReport.missing_evidence_blocking_recovery || [],
    executive_action_plan: browserReport.executive_action_plan || {},
    rationale: browserReport.rationale || {},
    model_audit_trail: browserReport.model_audit_trail || {},
    honesty_check: browserReport.honesty_check || {},
    input_classification_status: browserReport.input_classification_status || browserReport.report_quality_status || "",
    input_relevance_reason: browserReport.input_relevance_reason || "",
    gemini_relevance_status: browserReport.gemini_relevance_status || "NOT_RUN",
    gemini_calls_used_today: browserReport.gemini_calls_used_today || 0,
    analysis_generated: Boolean(browserReport.analysis_generated),
    input_guardrail: {
      raw_documents_sent: false,
      allowed_content: "findings, cited spans, calculations, action plan, honesty check, and audit metadata only"
    }
  };
}

function buildGeminiPrompt(payload) {
  return [
    "You are Constrovet's executive verifier for construction cost control.",
    "Use only the provided cited findings, quoted spans, calculations, action plans, honesty check, and audit metadata.",
    "Do not invent facts, causes, dates, amounts, contract entitlement, recovery probability, or legal conclusions.",
    "Recalculate Actual - Budget wherever budget and actual are provided.",
    "Reject unsupported claims into unsupported_claims_removed and honesty_check.",
    "Return strict JSON with keys: verification_status, executive_brief, board_summary, top_decisions_required, contractor_questions, recovery_actions, unsupported_claims_removed, honesty_check, model_audit_trail.",
    JSON.stringify(payload)
  ].join("\n\n");
}

function tryGeminiImageRelevanceClassification(document) {
  const notRun = (reason) => ({
    gemini_relevance_status: "NOT_RUN",
    classification_status: "",
    reason,
    gemini_calls_used_today: geminiRelevanceCallsUsedToday()
  });
  if (!geminiRelevanceGateEnabled()) return notRun("Gemini relevance gate is disabled.");
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty("GEMINI_API_KEY");
  if (!apiKey) return notRun("GEMINI_API_KEY is not configured.");
  const size = Number(document.size_bytes || 0);
  const maxBytes = geminiMaxClassifierBytes();
  if (size <= 0 || size > maxBytes) return notRun(`Image skipped by classifier size gate (${size} bytes, max ${maxBytes}).`);
  const callsUsed = geminiRelevanceCallsUsedToday();
  const limit = geminiRelevanceDailyLimit();
  if (callsUsed >= limit) {
    return {
      gemini_relevance_status: "QUOTA_SKIPPED",
      classification_status: "",
      reason: `Gemini daily relevance limit reached (${callsUsed}/${limit}).`,
      gemini_calls_used_today: callsUsed
    };
  }
  try {
    incrementGeminiRelevanceCallsUsedToday();
    const blob = DriveApp.getFileById(document.id).getBlob();
    const mime = document.mime_type || blob.getContentType() || mimeTypeForName(document.file);
    const data = Utilities.base64Encode(blob.getBytes());
    const model = props.getProperty(GEMINI_RELEVANCE_MODEL_PROPERTY) || DEFAULT_GEMINI_RELEVANCE_MODEL;
    const response = UrlFetchApp.fetch(`${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: buildGeminiRelevancePromptText(document) },
            { inlineData: { mimeType: mime, data } }
          ]
        }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json"
        }
      })
    });
    const status = response.getResponseCode();
    const body = response.getContentText();
    if (status >= 400) {
      return {
        gemini_relevance_status: "FAILED",
        classification_status: "",
        reason: `Gemini relevance request failed with HTTP ${status}: ${body.slice(0, 240)}`,
        gemini_calls_used_today: geminiRelevanceCallsUsedToday()
      };
    }
    const parsed = JSON.parse(body);
    const text = parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content && parsed.candidates[0].content.parts
      ? parsed.candidates[0].content.parts.map((part) => part.text || "").join("")
      : "";
    const result = JSON.parse(extractJson(text));
    return {
      gemini_relevance_status: "CLASSIFIED",
      classification_status: normalizeGeminiClassificationStatus(result.classification_status),
      reason: String(result.reason || "").slice(0, 500),
      gemini_calls_used_today: geminiRelevanceCallsUsedToday()
    };
  } catch (error) {
    return {
      gemini_relevance_status: "FAILED",
      classification_status: "",
      reason: error && error.message ? error.message : String(error),
      gemini_calls_used_today: geminiRelevanceCallsUsedToday()
    };
  }
}

function buildGeminiRelevancePromptText(document) {
  return [
    "You are Constrovet's strict relevance classifier for construction project progress evidence.",
    "Classify the uploaded image only. Do not extract or invent costs, dates, causes, risks, recovery actions, or legal conclusions.",
    "Construction project progress evidence means visible project controls, cost, schedule, invoice/payment, BOQ, RA bill, delay, wastage, rework, material, fuel, water, energy, carbon, or emissions information.",
    "Ordinary personal images, portraits, documents unrelated to projects, generic photos, chat screenshots, logos, or files with no project-controls evidence are IRRELEVANT_DATA_FILE.",
    "A construction site photo with no quantified controls data is CONSTRUCTION_CONTEXT_ONLY.",
    "Return strict JSON only:",
    "{",
    "  \"classification_status\": \"STRUCTURED_CONSTRUCTION_EVIDENCE | CONSTRUCTION_CONTEXT_ONLY | IRRELEVANT_DATA_FILE\",",
    "  \"reason\": \"one short evidence-based reason\"",
    "}",
    "",
    `Filename: ${document.file || "unknown"}`
  ].join("\n");
}

function normalizeGeminiClassificationStatus(status) {
  const value = String(status || "").trim().toUpperCase();
  if (value === "STRUCTURED_CONSTRUCTION_EVIDENCE") return "STRUCTURED_CONSTRUCTION_EVIDENCE";
  if (value === REPORT_CONSTRUCTION_CONTEXT_ONLY) return REPORT_CONSTRUCTION_CONTEXT_ONLY;
  if (value === REPORT_IRRELEVANT_DATA_FILE) return REPORT_IRRELEVANT_DATA_FILE;
  return REPORT_IRRELEVANT_DATA_FILE;
}

function geminiRelevanceGateEnabled() {
  return String(PropertiesService.getScriptProperties().getProperty(GEMINI_RELEVANCE_GATE_PROPERTY) || "false").toLowerCase() === "true";
}

function geminiRelevanceDailyLimit() {
  const value = Number(PropertiesService.getScriptProperties().getProperty(GEMINI_DAILY_CALL_LIMIT_PROPERTY) || DEFAULT_GEMINI_DAILY_CALL_LIMIT);
  return Math.max(0, Math.floor(value || DEFAULT_GEMINI_DAILY_CALL_LIMIT));
}

function geminiMaxClassifierBytes() {
  const value = Number(PropertiesService.getScriptProperties().getProperty(GEMINI_MAX_FILE_BYTES_FOR_CLASSIFIER_PROPERTY) || DEFAULT_GEMINI_MAX_FILE_BYTES_FOR_CLASSIFIER);
  return Math.max(1, Math.floor(value || DEFAULT_GEMINI_MAX_FILE_BYTES_FOR_CLASSIFIER));
}

function geminiRelevanceCallsUsedToday() {
  const props = PropertiesService.getScriptProperties();
  return Number(props.getProperty(geminiRelevanceDailyCountKey()) || "0");
}

function incrementGeminiRelevanceCallsUsedToday() {
  const props = PropertiesService.getScriptProperties();
  const key = geminiRelevanceDailyCountKey();
  const next = Number(props.getProperty(key) || "0") + 1;
  props.setProperty(key, String(next));
  return next;
}

function geminiRelevanceDailyCountKey() {
  const day = Utilities.formatDate(new Date(), "GMT", "yyyyMMdd");
  return `gemini_relevance:${day}`;
}

function boardroomGeminiRelevanceAggregateStatus(statuses) {
  const values = (statuses || []).filter(Boolean);
  if (!values.length) return "NOT_RUN";
  if (values.indexOf("FAILED") >= 0) return "FAILED";
  if (values.indexOf("CLASSIFIED") >= 0) return "CLASSIFIED";
  if (values.indexOf("QUOTA_SKIPPED") >= 0) return "QUOTA_SKIPPED";
  return "NOT_RUN";
}

function buildGeminiReviewPackMarkdown(report, browserReport) {
  const payload = buildGeminiReviewPackPayload(report, browserReport);
  return [
    "# Constrovet Optional Gemini Review Pack",
    "",
    `Job: ${report.job_id || payload.job_id}`,
    `Report mode: ${payload.report_quality_status}`,
    `Email source mode: ${payload.email_source_mode}`,
    `Source job folder: ${payload.source_job_folder_url || "not available"}`,
    "",
    "Use this pack manually in Gemini Pro web for admin quality review or executive polishing. Do not upload raw source documents unless explicitly approved.",
    "",
    "## Optimized Gemini Prompt",
    "",
    "```text",
    buildGeminiReviewPromptText(),
    "```",
    "",
    "## Evidence Payload JSON",
    "",
    "```json",
    JSON.stringify(payload, null, 2),
    "```"
  ].join("\n");
}

function buildGeminiReviewPackPayload(report, browserReport) {
  const safePayload = evidenceOnlyPayload(browserReport || {});
  return {
    job_id: report.job_id || "",
    generated_at: report.generated_at || new Date().toISOString(),
    report_quality_status: report.report_quality_status || (browserReport || {}).report_quality_status || "",
    email_source_mode: report.email_source_mode || "",
    source_job_id: report.source_job_id || report.job_id || "",
    source_job_folder_url: report.source_job_folder_url || "",
    source_outputs_folder_url: report.source_outputs_folder_url || "",
    source_final_report_url: report.source_final_report_url || "",
    result_url: report.result_url || "",
    result_url_health: report.result_url_health || resultUrlHealth(report.result_url || ""),
    input_classification_status: (browserReport || {}).input_classification_status || report.report_quality_status || "",
    input_relevance_reason: (browserReport || {}).input_relevance_reason || "",
    gemini_relevance_status: (browserReport || {}).gemini_relevance_status || "NOT_RUN",
    gemini_calls_used_today: (browserReport || {}).gemini_calls_used_today || 0,
    analysis_generated: Boolean((browserReport || {}).analysis_generated),
    documents_processed_count: report.documents_processed_count || (browserReport || {}).documents_processed_count || 0,
    documents_with_no_signal: report.documents_with_no_signal || (browserReport || {}).documents_with_no_signal || 0,
    document_outcomes: (browserReport || {}).document_outcomes || [],
    deterministic_verifier_result: (browserReport || {}).deterministic_verifier_result || {},
    missing_evidence_queue: report.missing_evidence_queue || (browserReport || {}).missing_evidence_queue || [],
    job_state: report.job_state || "",
    correction_count: report.correction_count || 0,
    rerun_count: report.rerun_count || 0,
    human_review_status: report.human_review_status || "",
    evidence_loop: report.evidence_loop || {},
    form_intake: report.form_intake || {},
    saved_file_metadata: (report.saved_files || []).map((file) => ({
      name: file.name || "",
      size_bytes: Number(file.size_bytes || 0)
    })),
    evidence_only_payload: safePayload,
    input_guardrail: {
      raw_documents_included: false,
      intended_use: "Manual Gemini Pro web review of cited findings, calculations, action plan, document outcomes, and honesty check only."
    }
  };
}

function buildGeminiReviewPromptText() {
  return [
    "You are Constrovet's executive verifier for construction cost control.",
    "",
    "Use only the provided cited findings, quoted spans, calculations, action plan, document outcomes, and honesty check.",
    "",
    "Rules:",
    "1. Do not invent amounts, dates, causes, contract entitlement, liability, recovery probability, or legal conclusions.",
    "2. Every executive claim must trace to a citation: file, page/sheet, quoted span.",
    "3. Recalculate Actual - Budget wherever both values exist.",
    "4. If Actual > Budget, classify the difference as LEAKAGE_AND_OVERRUN.",
    "5. Baseline budget, BOQ, contract value, planned spend, and cumulative work done are context, not leakage.",
    "6. If no cited findings exist after plausible construction evidence was attempted, return EVIDENCE_INTAKE_EXCEPTION, not an executive recovery plan.",
    "7. If the upload is irrelevant, unsupported, or construction context only, return that report mode and do not create a 7/30/90 action plan.",
    "8. Separate missing evidence from proven findings.",
    "9. Remove unsupported claims.",
    "",
    "Return strict JSON:",
    "{",
    "  \"verification_status\": \"VERIFIED | NEEDS_REVIEW | EVIDENCE_INTAKE_EXCEPTION | IRRELEVANT_DATA_FILE | UNSUPPORTED_FILE_TYPE | CONSTRUCTION_CONTEXT_ONLY\",",
    "  \"report_mode\": \"EXECUTIVE_ACTION_PLAN | EVIDENCE_INTAKE_EXCEPTION | IRRELEVANT_DATA_FILE | UNSUPPORTED_FILE_TYPE | CONSTRUCTION_CONTEXT_ONLY\",",
    "  \"executive_headline\": \"\",",
    "  \"board_decision_required\": [],",
    "  \"top_3_actions\": [],",
    "  \"corrected_calculations\": [],",
    "  \"unsupported_claims_removed\": [],",
    "  \"contractor_questions\": [],",
    "  \"missing_evidence\": [],",
    "  \"professional_email_summary\": \"\",",
    "  \"honesty_check\": {}",
    "}",
    "",
    "Evidence payload: use the Evidence Payload JSON in this file."
  ].join("\n");
}

function extractJson(text) {
  const trimmed = String(text || "").trim();
  if (trimmed.startsWith("{")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Gemini response did not contain JSON.");
  return trimmed.slice(start, end + 1);
}

function applyDeterministicVerification(browserReport, force) {
  if (!browserReport || typeof browserReport !== "object") return browserReport;
  if (!force && browserReport.deterministic_verifier_result && Array.isArray(browserReport.findings)) return browserReport;
  const originalFindings = browserReport.findings || [];
  const deterministic = runDeterministicVerifier(originalFindings);
  browserReport.raw_finding_count = browserReport.raw_finding_count === undefined ? originalFindings.length : browserReport.raw_finding_count;
  browserReport.findings = scoreBoardroomFindings(deterministic.verified_findings || []);
  browserReport.deterministic_verifier_result = deterministic;
  const documentOutcomes = browserReport.document_outcomes || [];
  const documentsNotProcessed = ((browserReport.honesty_check || {}).documents_not_processed || []);
  const status = determineBoardroomReportStatus(browserReport.findings, documentOutcomes);
  browserReport.report_quality_status = status;
  browserReport.input_classification_status = browserReport.input_classification_status || status;
  browserReport.analysis_generated = status === REPORT_EXECUTIVE_ACTION_PLAN;
  browserReport.executive_brief = browserReport.findings.length
    ? buildBoardroomExecutiveBrief(browserReport.findings, documentsNotProcessed)
    : buildBoardroomNoFindingBrief(status, documentsNotProcessed);
  browserReport.top_5_actions = buildBoardroomTopExecutiveActions(browserReport.findings);
  browserReport.recoverable_cost_exposure = buildBoardroomRecoverableCostExposure(browserReport.findings);
  browserReport.immediate_control_failures = buildBoardroomImmediateControlFailures(browserReport.findings);
  browserReport.missing_evidence_blocking_recovery = browserReport.findings.length
    ? buildBoardroomMissingEvidence(browserReport.findings, documentsNotProcessed)
    : (browserReport.missing_evidence_blocking_recovery || documentsNotProcessed);
  browserReport.executive_action_plan = status === REPORT_EXECUTIVE_ACTION_PLAN || status === REPORT_EVIDENCE_INTAKE_EXCEPTION
    ? buildBoardroomExecutiveActionPlan(browserReport.findings)
    : {};
  browserReport.executive_decision_pack = buildExecutiveDecisionPack({
    findings: browserReport.findings,
    executiveBrief: browserReport.executive_brief,
    executiveActionPlan: browserReport.executive_action_plan,
    missingEvidence: browserReport.missing_evidence_blocking_recovery || [],
    reportQualityStatus: status
  });
  browserReport.rationale = buildBoardroomRationale(browserReport.findings, browserReport.model_audit_trail || {
    xai_method: ["Deterministic Workspace verifier rebuilt report from cited findings."]
  });
  const honesty = browserReport.honesty_check || {};
  const removed = (deterministic.unsupported_claims_removed || []).map((item) => `Removed unsupported finding ${item.source_finding_index}: ${item.reasons.join("; ")}`);
  browserReport.honesty_check = {
    missing_evidence: [...(honesty.missing_evidence || []), ...removed],
    documents_not_processed: honesty.documents_not_processed || [],
    assumptions: honesty.assumptions || []
  };
  return browserReport;
}

function fallbackVerifier(browserReport) {
  applyDeterministicVerification(browserReport);
  const deterministic = (browserReport || {}).deterministic_verifier_result || {};
  return {
    verification_status: deterministic.verification_status || "VERIFIED",
    executive_brief: browserReport.executive_brief || {},
    board_summary: "Deterministic Workspace verifier completed. Gemini Deep Analysis was not run.",
    top_decisions_required: browserReport.top_5_actions || [],
    contractor_questions: [],
    recovery_actions: browserReport.executive_action_plan || {},
    unsupported_claims_removed: deterministic.unsupported_claims_removed || [],
    honesty_check: browserReport.honesty_check || {},
    model_audit_trail: {
      raw_documents_sent_to_gemini: false,
      gemini_used: false,
      deterministic_verifier_used: true
    }
  };
}

function buildReport(payload, browserReport, verifierResult, savedFiles) {
  applyDeterministicVerification(browserReport);
  normalizeReportQuality(browserReport);
  const markdown = buildMarkdownReport(payload, browserReport, verifierResult, savedFiles);
  return {
    job_id: payload.job_id,
    mode: payload.mode,
    email: payload.email,
    browser_report: browserReport,
    gemini_verifier_result: verifierResult,
    saved_files: savedFiles,
    report_quality_status: browserReport.report_quality_status,
    input_classification_status: browserReport.input_classification_status || browserReport.report_quality_status,
    executive_decision_pack: browserReport.executive_decision_pack || {},
    input_relevance_reason: browserReport.input_relevance_reason || "",
    gemini_relevance_status: browserReport.gemini_relevance_status || "NOT_RUN",
    gemini_calls_used_today: browserReport.gemini_calls_used_today || 0,
    analysis_generated: Boolean(browserReport.analysis_generated),
    documents_processed_count: browserReport.documents_processed_count || 0,
    documents_with_no_signal: browserReport.documents_with_no_signal || 0,
    generated_at: new Date().toISOString(),
    markdown
  };
}

function normalizeReportQuality(browserReport) {
  if (!browserReport || typeof browserReport !== "object") return;
  const findings = (browserReport && browserReport.findings) || [];
  if (!browserReport.report_quality_status) {
    browserReport.report_quality_status = findings.length ? REPORT_EXECUTIVE_ACTION_PLAN : REPORT_EVIDENCE_INTAKE_EXCEPTION;
  }
  if (!browserReport.input_classification_status) browserReport.input_classification_status = browserReport.report_quality_status;
  if (!browserReport.gemini_relevance_status) browserReport.gemini_relevance_status = "NOT_RUN";
  if (browserReport.gemini_calls_used_today === undefined) browserReport.gemini_calls_used_today = 0;
  if (browserReport.analysis_generated === undefined) browserReport.analysis_generated = browserReport.report_quality_status === REPORT_EXECUTIVE_ACTION_PLAN;
  if (browserReport.documents_processed_count === undefined) {
    browserReport.documents_processed_count = (browserReport.document_outcomes || []).filter((item) => item.type !== "rejected").length;
  }
  if (browserReport.documents_with_no_signal === undefined) {
    browserReport.documents_with_no_signal = (browserReport.document_outcomes || []).filter((item) => item.status !== "STRUCTURED_CONSTRUCTION_EVIDENCE").length;
  }
  if (!browserReport.executive_decision_pack) {
    browserReport.executive_decision_pack = buildExecutiveDecisionPack({
      findings,
      executiveBrief: browserReport.executive_brief || {},
      executiveActionPlan: browserReport.executive_action_plan || {},
      missingEvidence: browserReport.missing_evidence_blocking_recovery || [],
      reportQualityStatus: browserReport.report_quality_status
    });
  }
}

function resultUrlHealth(url) {
  const value = String(url || "");
  if (!value) return "MISSING_RESULT_BASE_URL";
  if (/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/i.test(value)) return "SCRIPT_URL_PRESENT";
  return "INVALID_RESULT_BASE_URL";
}

function buildMarkdownReport(payload, browserReport, verifierResult, savedFiles) {
  normalizeReportQuality(browserReport);
  if (boardroomIsNoAnalysisNotice(browserReport)) return buildNoAnalysisMarkdown(payload, browserReport, savedFiles);
  if (boardroomIsIntakeException(browserReport)) return buildIntakeExceptionMarkdown(payload, browserReport, verifierResult, savedFiles);
  const findings = browserReport.findings || [];
  const totalLeakage = boardroomQuantifiedLeakageTotal(findings);
  const decisionPack = browserReport.executive_decision_pack || {};
  const lines = [
    "# Constrovet Executive Report",
    "",
    `Job: ${payload.job_id}`,
    `Mode: ${payload.mode}`,
    `Recipient: ${payload.email}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Executive Summary",
    "",
    browserReport.executive_brief && browserReport.executive_brief.headline ? browserReport.executive_brief.headline : "No executive headline was produced by browser analysis.",
    `Total quantified recoverable leakage: INR ${formatInr(totalLeakage)}`,
    `Critical/high findings: ${(browserReport.executive_brief || {}).critical_or_high_count || 0}`,
    `Documents with no signal: ${browserReport.documents_with_no_signal || 0}`,
    `Gemini verification status: ${verifierResult.verification_status || "UNKNOWN"}`,
    "",
    "## Board Decision Required",
    "",
    decisionPack.decision_required || boardroomBoardDecisionRequired(browserReport),
    "",
    "## Executive Decision Pack",
    "",
    `INR at stake from cited leakage/overrun: INR ${formatInr(decisionPack.money_at_stake_inr || totalLeakage)}`,
    `Evidence status: ${decisionPack.evidence_status || "CITED_EVIDENCE_REVIEW_REQUIRED"}`,
    `Actions blocked by missing evidence: ${decisionPack.blocked_by_missing_evidence ? "Yes" : "No"}`,
    "",
    "## Top Actions",
    ""
  ];
  (decisionPack.top_actions || browserReport.top_5_actions || []).forEach((action, index) => {
    lines.push(`- ${index + 1}. ${action.title || "Action"}: ${action.recommendation || action.action || ""}`);
    lines.push(`  Owner role: ${action.owner_role || "Project Controls"}; Due: ${String(action.due_horizon || "").replace("_", " ")}; Evidence: ${action.evidence_status || "CITED_EVIDENCE_REVIEW_REQUIRED"}`);
    if ((action.source_finding_indexes || []).length) lines.push(`  Source findings: ${action.source_finding_indexes.join(", ")}`);
  });
  lines.push("", "## 7/30/90 Action Plan", "");
  ["7_days", "30_days", "90_days"].forEach((period) => {
    lines.push(`### ${period.replace("_", " ")}`);
    ((browserReport.executive_action_plan || {})[period] || []).forEach((action) => {
      lines.push(`- ${action.title}: ${action.recommendation}`);
      lines.push(`  Owner role: ${action.owner_role || "Project Controls"}; Evidence: ${action.evidence_status || "CITED_EVIDENCE_REVIEW_REQUIRED"}; Recovery-ready: ${action.blocked_by_missing_evidence ? "No" : "Yes"}`);
    });
    lines.push("");
  });
  lines.push("## Citations Behind Actions", "");
  (decisionPack.citations || []).forEach((citation) => {
    lines.push(`- ${citation.file || "unknown"} (${citation.page_or_sheet || "unknown"}): "${citation.quoted_span || ""}"`);
  });
  if (!((decisionPack.citations || []).length)) lines.push("- No action citations were available.");
  lines.push("## Gemini Deep Analysis", "", JSON.stringify(verifierResult, null, 2), "", "## Citations", "");
  findings.forEach((finding, index) => {
    const citation = (finding.citations || [])[0] || {};
    lines.push(`### Finding ${index + 1}: ${finding.financial_category}`);
    lines.push(`- ${finding.statement}`);
    lines.push(`- Amount INR: ${finding.amount_inr || 0}; Days: ${finding.days || 0}; Confidence: ${finding.confidence || "LOW"}`);
    lines.push(`- Citation: ${citation.file || "unknown"} (${citation.page_or_sheet || "unknown"}): "${citation.quoted_span || ""}"`);
    lines.push("");
  });
  lines.push("## Evidence Quality", "");
  boardroomEvidenceQualitySummary(findings).forEach((item) => lines.push(`- ${item}`));
  lines.push("", "## Recoverability", "");
  boardroomRecoverabilitySummary(findings).forEach((item) => lines.push(`- ${item}`));
  lines.push("");
  if (savedFiles.length) {
    lines.push("## Stored Source Files", "");
    savedFiles.forEach((file) => lines.push(`- ${file.name}: ${file.drive_url}`));
  }
  return lines.join("\n");
}

function buildNoAnalysisMarkdown(payload, browserReport, savedFiles) {
  const status = browserReport.report_quality_status || REPORT_IRRELEVANT_DATA_FILE;
  const lines = [
    `# Constrovet ${boardroomReportStatusLabel(status)}`,
    "",
    `Job: ${payload.job_id}`,
    `Mode: ${payload.mode}`,
    `Recipient: ${payload.email}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Result",
    "",
    boardroomNoAnalysisHeadline(status),
    "",
    "No Constrovet executive analysis, recovery plan, 7/30/90 action plan, or cost-saving claim has been generated for this upload.",
    "",
    "## Classification",
    "",
    `Status: ${status}`,
    `Reason: ${browserReport.input_relevance_reason || "No relevant construction project evidence was detected."}`,
    `Gemini relevance status: ${browserReport.gemini_relevance_status || "NOT_RUN"}`,
    `Gemini calls used today: ${browserReport.gemini_calls_used_today || 0}`,
    "",
    "## What Was Processed",
    ""
  ];
  const outcomes = browserReport.document_outcomes || [];
  if (outcomes.length) {
    outcomes.forEach((item) => lines.push(`- ${item.file}: ${item.status}${item.reason ? ` - ${item.reason}` : ""}`));
  } else {
    lines.push("- No source document outcomes were recorded.");
  }
  lines.push("", "## Next Step", "");
  lines.push("- Upload PDF or CSV project evidence with budget, actual, schedule, invoice/payment, BOQ, RA bill, leakage, or ESG fields.");
  lines.push("- Image-only files can be classified for relevance but cannot support quantified findings without extracted cited evidence.");
  if (savedFiles.length) {
    lines.push("", "## Stored Source Files", "");
    savedFiles.forEach((file) => lines.push(`- ${file.name}: ${file.drive_url}`));
  }
  return lines.join("\n");
}

function buildIntakeExceptionMarkdown(payload, browserReport, verifierResult, savedFiles) {
  const outcomes = browserReport.document_outcomes || [];
  const rejected = ((browserReport.honesty_check || {}).documents_not_processed || []).filter((item) => /rejected from automation/i.test(item));
  const lines = [
    "# Constrovet Evidence Intake Exception",
    "",
    `Job: ${payload.job_id}`,
    `Mode: ${payload.mode}`,
    `Recipient: ${payload.email}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Intake Status",
    "",
    "No cited cost, schedule, ESG, or leakage evidence was extracted.",
    `Documents processed: ${browserReport.documents_processed_count || 0}`,
    `Documents with no signal: ${browserReport.documents_with_no_signal || 0}`,
    `Rejected documents: ${rejected.length}`,
    `Gemini verification status: ${verifierResult.verification_status || "UNKNOWN"}`,
    "",
    "## What Was Processed",
    ""
  ];
  if (outcomes.length) {
    outcomes.forEach((item) => lines.push(`- ${item.file}: ${item.status}${item.reason ? ` - ${item.reason}` : ""}`));
  } else {
    lines.push("- No source document outcomes were recorded.");
  }
  lines.push("", "## Required Next Upload", "");
  boardroomRequiredUploadFields().forEach((item) => lines.push(`- ${item}`));
  lines.push("", "## Intake Remediation Plan", "");
  ["7_days", "30_days", "90_days"].forEach((period) => {
    lines.push(`### ${period.replace("_", " ")}`);
    ((browserReport.executive_action_plan || {})[period] || []).forEach((action) => lines.push(`- ${action.title}: ${action.recommendation}`));
    lines.push("");
  });
  lines.push("## Missing Evidence / Documents Not Processed", "");
  boardroomMissingEvidenceItems(browserReport).forEach((item) => lines.push(`- ${item}`));
  if (savedFiles.length) {
    lines.push("", "## Stored Source Files", "");
    savedFiles.forEach((file) => lines.push(`- ${file.name}: ${file.drive_url}`));
  }
  lines.push("", "No commercial, legal, recovery, or cost-saving claim has been made because there are no cited findings.");
  return lines.join("\n");
}

function sendReportEmail(email, jobId, report, markdownBlob, resultUrl) {
  if (PropertiesService.getScriptProperties().getProperty(GATE_HEALTH_PROPERTY) === "FAILED") {
    throw new Error(
      "GATE_HEALTH_FAILED: automated sending is halted because boardroomGateHealthCheck() " +
      "found a problem with the validation layer. See the [GATE HEALTH FAILED] alert email. " +
      "Run boardroomClearGateHealthKillSwitch_() manually after the problem is fixed."
    );
  }
  if (!isValidEmail(email)) throw new Error("Valid user email is required before sending the executive report.");
  const recipient = String(email).trim();
  const cc = boardroomAdminCc(recipient);
  const subject = `[Constrovet] ${boardroomReportSubjectPrefix(report.browser_report || {})} - ${jobId}`;
  const mail = {
    to: recipient,
    subject,
    body: buildExecutiveEmailText(jobId, report, resultUrl),
    htmlBody: buildExecutiveEmailHtml(jobId, report, resultUrl)
  };
  if (cc) mail.cc = cc;
  MailApp.sendEmail(mail);
  return {
    email_to: recipient,
    email_cc: cc,
    email_subject: subject,
    email_sent_at: new Date().toISOString(),
    email_status: "EMAIL_SENT",
    email_error: ""
  };
}

function emptyEmailDelivery(email, jobId) {
  const recipient = isValidEmail(email) ? String(email).trim() : "";
  return {
    email_to: recipient,
    email_cc: boardroomAdminCc(recipient),
    email_subject: `Constrovet Boardroom Report - ${jobId}`,
    email_sent_at: "",
    email_status: "EMAIL_NOT_ATTEMPTED",
    email_error: ""
  };
}

function missingUserEmailDelivery(jobId) {
  return {
    email_to: "",
    email_cc: "",
    email_subject: `Constrovet Boardroom Report - ${jobId}`,
    email_sent_at: "",
    email_status: "EMAIL_NOT_SENT_MISSING_USER_EMAIL",
    email_error: "No valid form respondent email or Email field was captured."
  };
}

function failedEmailDelivery(email, jobId, error) {
  const delivery = emptyEmailDelivery(email, jobId);
  delivery.email_status = "EMAIL_FAILED";
  delivery.email_error = error && error.message ? error.message : String(error);
  return delivery;
}

function rememberLatestBoardroomJob(jobId) {
  const cleanedJobId = String(jobId || "").trim();
  if (!cleanedJobId) return;
  PropertiesService.getScriptProperties().setProperty(BOARDROOM_LAST_JOB_PROPERTY, cleanedJobId);
}

function finalizeBoardroomEmailDelivery(jobId, report, delivery, options) {
  const result = delivery || emptyEmailDelivery((options || {}).recipient || "", jobId);
  const status = String(result.email_status || "");
  if (!["EMAIL_FAILED", "EMAIL_NOT_SENT_MISSING_USER_EMAIL", "EMAIL_HELD_EXTRACTION_FAILURE"].includes(status)) return result;
  result.original_email_status = status;
  const notice = sendBoardroomEmailAdminNotice(jobId, report, result, options || {});
  result.admin_notice_status = notice.status;
  result.admin_notice_to = notice.email_to || "";
  result.admin_notice_error = notice.error || "";
  if (notice.status === "EMAIL_SENT") {
    if (status === "EMAIL_HELD_EXTRACTION_FAILURE") {
      result.email_status = "EMAIL_HELD_ADMIN_NOTIFIED";
    } else {
      result.email_status = status === "EMAIL_FAILED" ? "EMAIL_FAILED_ADMIN_NOTIFIED" : "EMAIL_NOT_SENT_ADMIN_NOTIFIED";
    }
  } else {
    result.email_status = "EMAIL_ADMIN_NOTICE_FAILED";
  }
  return result;
}

function sendBoardroomEmailAdminNotice(jobId, report, delivery, options) {
  const props = PropertiesService.getScriptProperties();
  const admin = String(props.getProperty("BOARDROOM_NOTIFY_EMAIL") || DEFAULT_BOARDROOM_NOTIFY_EMAIL).trim();
  if (!isValidEmail(admin)) {
    return { status: "EMAIL_NOT_SENT_MISSING_ADMIN_EMAIL", email_to: "", error: "BOARDROOM_NOTIFY_EMAIL is not a valid email." };
  }
  const heldForExtraction = String(delivery.email_status || "") === "EMAIL_HELD_EXTRACTION_FAILURE";
  const subject = heldForExtraction
    ? `[Constrovet] Report HELD - document could not be read - ${jobId}`
    : `[Constrovet] Email delivery issue - ${jobId}`;
  const resultUrl = report && report.result_url ? report.result_url : "";
  const body = [
    heldForExtraction
      ? "Constrovet did NOT send this report to the client. One or more uploaded documents could not be READ for a technical reason (see the delivery error below), so any 'missing evidence' conclusion in this report would be wrong. Re-run the job once the cause is clear."
      : "Constrovet generated a report, but user email delivery needs attention.",
    "",
    `Job ID: ${jobId}`,
    `Mode: ${(options || {}).mode || (report || {}).mode || ""}`,
    `Intended recipient: ${delivery.email_to || (options || {}).recipient || ""}`,
    `Delivery status: ${delivery.email_status || ""}`,
    `Delivery error: ${delivery.email_error || ""}`,
    `Report URL: ${resultUrl || "not available"}`,
    `Result URL health: ${(report || {}).result_url_health || resultUrlHealth(resultUrl || "")}`,
    `Missing evidence count: ${((report || {}).missing_evidence_queue || []).length}`,
    "",
    "The Drive outputs should still exist. Use the report URL or latest-job resend helper after fixing the delivery cause."
  ].join("\n");
  try {
    MailApp.sendEmail({ to: admin, subject, body });
    return { status: "EMAIL_SENT", email_to: admin, error: "" };
  } catch (error) {
    return {
      status: "EMAIL_FAILED",
      email_to: admin,
      error: error && error.message ? error.message : String(error)
    };
  }
}

function sentEmailDelivery(recipient, subject, cc) {
  return {
    email_to: recipient,
    email_cc: cc || "",
    email_subject: subject,
    email_sent_at: new Date().toISOString(),
    email_status: "EMAIL_SENT",
    email_error: ""
  };
}

function sendBoardroomEmailSmokeTest() {
  const props = PropertiesService.getScriptProperties();
  const recipient = String(props.getProperty("BOARDROOM_RESEND_EMAIL") || "").trim();
  if (!isValidEmail(recipient)) throw new Error("BOARDROOM_RESEND_EMAIL must be a valid email for the smoke test.");
  const subject = `[Constrovet] Email smoke test - ${Utilities.formatDate(new Date(), "GMT", "yyyyMMdd-HHmmss")}`;
  const body = [
    "This report was requested from Constrovet Boardroom intake.",
    "",
    "This is a minimal plain-text MailApp smoke test.",
    "If this message arrives but a report email does not, Gmail or Workspace filtering may be affecting HTML content or sender rules.",
    "",
    `Recipient: ${recipient}`,
    `Sent at: ${new Date().toISOString()}`
  ].join("\n");
  const cc = boardroomAdminCc(recipient);
  const mail = { to: recipient, subject, body };
  if (cc) mail.cc = cc;
  try {
    MailApp.sendEmail(mail);
    const delivery = sentEmailDelivery(recipient, subject, cc);
    appendBoardroomAuditRow({
      timestamp: new Date(),
      job_id: "EMAIL_SMOKE_TEST",
      mode: "EMAIL_SMOKE_TEST",
      email: recipient,
      received_file_count: "",
      accepted_file_count: "",
      rejected_files: [],
      finding_count: "",
      gemini_status: "NOT_APPLICABLE",
      drive_folder: "",
      result_url: "",
      result_access_key: "",
      email_source_mode: "SMOKE_TEST_MINIMAL_TEXT",
      source_job_id: "",
      source_job_folder_url: "",
      source_final_report_url: "",
      submitter_email_source: "BOARDROOM_RESEND_EMAIL",
      report_quality_status: "",
      result_url_health: "",
      email_delivery: delivery
    });
    return { ok: true, email_to: delivery.email_to, email_subject: delivery.email_subject, email_status: delivery.email_status };
  } catch (error) {
    const delivery = failedEmailDelivery(recipient, "EMAIL_SMOKE_TEST", error);
    delivery.email_subject = subject;
    appendBoardroomAuditRow({
      timestamp: new Date(),
      job_id: "EMAIL_SMOKE_TEST",
      mode: "EMAIL_SMOKE_TEST",
      email: recipient,
      received_file_count: "",
      accepted_file_count: "",
      rejected_files: [],
      finding_count: "",
      gemini_status: "NOT_APPLICABLE",
      drive_folder: "",
      result_url: "",
      result_access_key: "",
      email_source_mode: "SMOKE_TEST_MINIMAL_TEXT",
      source_job_id: "",
      source_job_folder_url: "",
      source_final_report_url: "",
      submitter_email_source: "BOARDROOM_RESEND_EMAIL",
      report_quality_status: "",
      result_url_health: "",
      email_delivery: delivery
    });
    throw error;
  }
}

function resendBoardroomReport(jobId, recipientEmail) {
  const job = findProjectFolder(String(jobId || "").trim());
  if (!job) throw new Error("Boardroom job folder was not found.");
  const outputs = findChildFolder(job, "outputs");
  if (!outputs) throw new Error("Boardroom outputs folder was not found.");
  const report = loadReportForJob(jobId);
  if (!report) throw new Error("Final report JSON was not found or could not be parsed.");
  const recipient = isValidEmail(recipientEmail) ? recipientEmail : (report.email || "");
  if (!isValidEmail(recipient)) throw new Error("A valid resend recipient email is required.");
  normalizeReportQuality(report.browser_report || {});
  report.report_quality_status = (report.browser_report || {}).report_quality_status;
  report.documents_processed_count = (report.browser_report || {}).documents_processed_count || 0;
  report.documents_with_no_signal = (report.browser_report || {}).documents_with_no_signal || 0;
  report.markdown = buildMarkdownReport(report, report.browser_report || {}, report.gemini_verifier_result || {}, report.saved_files || []);
  const markdownBlob = loadMarkdownBlobForJob(outputs, jobId, report);
  const delivery = sendReportEmail(recipient, jobId, report, markdownBlob, report.result_url || buildResultUrl(jobId, report.result_access_key || ""));
  report.email_delivery = delivery;
  report.email_delivery.resend = true;
  report.source_job_id = jobId;
  report.source_job_folder_url = job.getUrl();
  report.source_outputs_folder_url = outputs.getUrl();
  report.source_final_report_url = report.generated_files && report.generated_files.final_report_url ? report.generated_files.final_report_url : "";
  report.email_source_mode = "MANUAL_EXACT_JOB_RESEND";
  updateFinalReportFile(outputs, jobId, report);
  appendBoardroomAuditRow({
    timestamp: new Date(),
    job_id: jobId,
    mode: "MANUAL_RESEND",
    email: recipient,
    received_file_count: report.form_intake ? report.form_intake.received_file_count : "",
    accepted_file_count: report.form_intake ? report.form_intake.accepted_file_count : "",
    rejected_files: report.form_intake ? report.form_intake.rejected_files : [],
    finding_count: ((report.browser_report || {}).findings || []).length,
    gemini_status: ((report.gemini_verifier_result || {}).verification_status || (report.gemini_verifier_result || {}).status || "UNKNOWN"),
    drive_folder: job.getUrl(),
    result_url: report.result_url || "",
    result_access_key: report.result_access_key || "",
    email_source_mode: report.email_source_mode,
    source_job_id: report.source_job_id,
    source_job_folder_url: report.source_job_folder_url,
    source_final_report_url: report.source_final_report_url,
    submitter_email_source: "MANUAL_RESEND",
    report_quality_status: report.report_quality_status || ((report.browser_report || {}).report_quality_status || ""),
    result_url_health: report.result_url_health || resultUrlHealth(report.result_url || ""),
    email_delivery: delivery
  });
  return {
    ok: true,
    job_id: jobId,
    email_to: delivery.email_to,
    email_cc: delivery.email_cc,
    email_subject: delivery.email_subject,
    email_status: delivery.email_status
  };
}

function resendBoardroomReportSmallThenFull(jobId, recipientEmail) {
  const cleanedJobId = String(jobId || "").trim();
  const job = findProjectFolder(cleanedJobId);
  if (!job) throw new Error("Boardroom job folder was not found.");
  const report = loadReportForJob(cleanedJobId);
  if (!report) throw new Error("Final report JSON was not found or could not be parsed.");
  const recipient = isValidEmail(recipientEmail) ? String(recipientEmail).trim() : (report.email || "");
  if (!isValidEmail(recipient)) throw new Error("A valid resend recipient email is required.");
  const smallSubject = `[Constrovet] Report delivery check - ${cleanedJobId}`;
  const smallBody = [
    "This report was requested from Constrovet Boardroom intake.",
    "",
    `Small delivery check for job: ${cleanedJobId}`,
    "If this arrives but the report email does not, filtering may be affecting HTML content or sender rules.",
    "",
    `Recipient: ${recipient}`,
    `Sent at: ${new Date().toISOString()}`
  ].join("\n");
  const cc = boardroomAdminCc(recipient);
  const mail = { to: recipient, subject: smallSubject, body: smallBody };
  if (cc) mail.cc = cc;
  MailApp.sendEmail(mail);
  const smallDelivery = sentEmailDelivery(recipient, smallSubject, cc);
  appendBoardroomAuditRow({
    timestamp: new Date(),
    job_id: cleanedJobId,
    mode: "MANUAL_RESEND_SMALL_CHECK",
    email: recipient,
    received_file_count: report.form_intake ? report.form_intake.received_file_count : "",
    accepted_file_count: report.form_intake ? report.form_intake.accepted_file_count : "",
    rejected_files: report.form_intake ? report.form_intake.rejected_files : [],
    finding_count: ((report.browser_report || {}).findings || []).length,
    gemini_status: ((report.gemini_verifier_result || {}).verification_status || (report.gemini_verifier_result || {}).status || "UNKNOWN"),
    drive_folder: job.getUrl(),
    result_url: report.result_url || "",
    result_access_key: report.result_access_key || "",
    email_source_mode: "MANUAL_RESEND_SMALL_THEN_FULL",
    source_job_id: cleanedJobId,
    source_job_folder_url: job.getUrl(),
    source_final_report_url: report.source_final_report_url || (report.generated_files && report.generated_files.final_report_url ? report.generated_files.final_report_url : ""),
    submitter_email_source: "MANUAL_RESEND",
    report_quality_status: report.report_quality_status || ((report.browser_report || {}).report_quality_status || ""),
    result_url_health: report.result_url_health || resultUrlHealth(report.result_url || ""),
    email_delivery: smallDelivery
  });
  const fullResult = resendBoardroomReport(cleanedJobId, recipient);
  return {
    ok: true,
    job_id: cleanedJobId,
    small_email_status: smallDelivery.email_status,
    small_email_subject: smallDelivery.email_subject,
    full_email_status: fullResult.email_status,
    full_email_subject: fullResult.email_subject,
    email_to: recipient
  };
}

function resendConfiguredBoardroomReport() {
  const props = PropertiesService.getScriptProperties();
  const jobId = String(props.getProperty("BOARDROOM_RESEND_JOB_ID") || "").trim();
  if (!jobId) throw new Error("BOARDROOM_RESEND_JOB_ID script property is required.");
  const recipient = String(props.getProperty("BOARDROOM_RESEND_EMAIL") || "").trim();
  return resendBoardroomReport(jobId, recipient);
}

function resendConfiguredBoardroomReportSmallThenFull() {
  const props = PropertiesService.getScriptProperties();
  const jobId = String(props.getProperty("BOARDROOM_RESEND_JOB_ID") || "").trim();
  if (!jobId) throw new Error("BOARDROOM_RESEND_JOB_ID script property is required.");
  const recipient = String(props.getProperty("BOARDROOM_RESEND_EMAIL") || "").trim();
  return resendBoardroomReportSmallThenFull(jobId, recipient);
}

function resendLatestBoardroomReportSmallThenFull() {
  const latest = findLatestBoardroomAuditRow();
  if (!latest) throw new Error("No Boardroom audit row was found.");
  const props = PropertiesService.getScriptProperties();
  const recipient = String(props.getProperty("BOARDROOM_RESEND_EMAIL") || latest.email_to || latest.email || "").trim();
  if (!isValidEmail(recipient)) throw new Error("BOARDROOM_RESEND_EMAIL or the latest audit row must contain a valid recipient email.");
  return resendBoardroomReportSmallThenFull(latest.job_id, recipient);
}

function configureConstrovetBoardroomRuntimeSettings() {
  return repairBoardroomRuntimeSettings();
}

function repairBoardroomRuntimeSettings() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    BOARDROOM_RESULT_BASE_URL: BOARDROOM_LIVE_ENDPOINT
  }, false);
  props.deleteProperty("BOARDROOM_RESEND_JOB_ID");
  const latest = findLatestBoardroomAuditRow();
  return {
    ok: true,
    configured: {
      BOARDROOM_RESULT_BASE_URL: BOARDROOM_LIVE_ENDPOINT,
      BOARDROOM_RESEND_JOB_ID: "",
      BOARDROOM_LAST_JOB_ID: props.getProperty(BOARDROOM_LAST_JOB_PROPERTY) || ""
    },
    latest_job: latest || null,
    diagnosis: latest ? diagnoseBoardroomEmailDelivery(latest.job_id) : null
  };
}

function diagnoseConfiguredBoardroomEmailDelivery() {
  const props = PropertiesService.getScriptProperties();
  const jobId = String(props.getProperty("BOARDROOM_RESEND_JOB_ID") || props.getProperty(BOARDROOM_LAST_JOB_PROPERTY) || "").trim();
  if (!jobId) return diagnoseLatestBoardroomEmailDelivery();
  return diagnoseBoardroomEmailDelivery(jobId);
}

function diagnoseLatestBoardroomEmailDelivery() {
  const latest = findLatestBoardroomAuditRow();
  if (!latest) {
    return {
      ok: false,
      diagnosis: "AUDIT_ROW_NOT_FOUND",
      next_steps: [
        "Confirm the upload completed and the Apps Script trigger executed.",
        "If the upload used the website app, check the browser JSON response for job_id and result_url.",
        "If no audit row exists, inspect Apps Script executions for a failure before audit append."
      ]
    };
  }
  const diagnosis = diagnoseBoardroomEmailDelivery(latest.job_id);
  diagnosis.latest_audit_row = latest;
  return diagnosis;
}

function diagnoseBoardroomEmailDelivery(jobId) {
  const cleanedJobId = String(jobId || "").trim();
  if (!cleanedJobId) throw new Error("A Boardroom job ID is required.");
  const latest = findLatestAuditRecordForJob(cleanedJobId);
  if (!latest) {
    return {
      ok: false,
      job_id: cleanedJobId,
      diagnosis: "AUDIT_ROW_NOT_FOUND",
      next_steps: [
        "Confirm the job ID is exact.",
        "Search the audit sheet by timestamp, recipient, and subject.",
        "If no audit row exists, inspect Apps Script executions for a form-trigger failure before email sending."
      ]
    };
  }
  const status = latest.email_status || "";
  const diagnosis = {
    ok: true,
    job_id: cleanedJobId,
    diagnosis: status || "EMAIL_STATUS_EMPTY",
    audit_row: latest,
    gmail_search: `in:anywhere "${cleanedJobId}"`,
    next_steps: []
  };
  if (status === "EMAIL_SENT") {
    diagnosis.next_steps = [
      "Apps Script accepted the MailApp send; search Gmail with the exact job ID.",
      "Check Spam, All Mail, Promotions, and Workspace/domain filtering.",
      "Run sendBoardroomEmailSmokeTest with BOARDROOM_RESEND_EMAIL set to the intended recipient.",
      "If the smoke test arrives but the report does not, inspect filtering of HTML content or sender/domain rules."
    ];
  } else if (["EMAIL_FAILED", "EMAIL_FAILED_ADMIN_NOTIFIED", "EMAIL_ADMIN_NOTICE_FAILED"].includes(status)) {
    diagnosis.next_steps = [
      `Fix the MailApp failure shown in email_error: ${latest.email_error || "missing error text"}`,
      "After the fix, run resendLatestBoardroomReportSmallThenFull or set BOARDROOM_RESEND_JOB_ID and run resendConfiguredBoardroomReportSmallThenFull.",
      status === "EMAIL_ADMIN_NOTICE_FAILED" ? "Admin fallback email also failed; inspect MailApp quota, authorization, and Workspace sender restrictions." : "Admin fallback was attempted; inspect BOARDROOM_NOTIFY_EMAIL if no admin notice arrived."
    ];
  } else if (["EMAIL_NOT_SENT_MISSING_USER_EMAIL", "EMAIL_NOT_SENT_ADMIN_NOTIFIED"].includes(status)) {
    diagnosis.next_steps = [
      "Enable Google Form respondent email collection or add a required Email field.",
      "Set BOARDROOM_RESEND_EMAIL to the intended recipient.",
      "Run resendLatestBoardroomReportSmallThenFull or resendConfiguredBoardroomReportSmallThenFull for this job."
    ];
  } else {
    diagnosis.next_steps = [
      "Open the audit row and inspect email_to, email_subject, email_error, submitter_email_source, and email_source_mode.",
      "If email_to is blank, fix form email capture and resend manually.",
      "If email_error is blank and status is empty, inspect Apps Script execution logs around the job timestamp."
    ];
  }
  return diagnosis;
}

function findLatestBoardroomAuditRow() {
  const sheet = getAuditSheet();
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return null;
  const header = values[0];
  const jobIdIndex = header.indexOf("job_id");
  const modeIndex = header.indexOf("mode");
  if (jobIdIndex < 0) return null;
  for (let rowIndex = values.length - 1; rowIndex >= 1; rowIndex -= 1) {
    const row = values[rowIndex];
    const jobId = String(row[jobIdIndex] || "").trim();
    const mode = modeIndex >= 0 ? String(row[modeIndex] || "") : "";
    if (!jobId || jobId === "EMAIL_SMOKE_TEST") continue;
    if (!/^form-|^cv-/.test(jobId) && !/FORM_|EMAIL_BROWSER_REPORT|DEEP_ANALYSIS|MANUAL_RESEND/.test(mode)) continue;
    return auditRecordFromRow(header, row, rowIndex + 1);
  }
  return null;
}

function findLatestAuditRecordForJob(jobId) {
  const sheet = getAuditSheet();
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return null;
  const header = values[0];
  const jobIdIndex = header.indexOf("job_id");
  if (jobIdIndex < 0) return null;
  const records = [];
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    if (String(row[jobIdIndex] || "").trim() !== jobId) continue;
    records.push(auditRecordFromRow(header, row, rowIndex + 1));
  }
  return records.length ? records[records.length - 1] : null;
}

function auditRecordFromRow(header, row, rowNumber) {
  const record = { row_number: rowNumber };
  header.forEach((name, index) => {
    record[name] = row[index] || "";
  });
  return record;
}

function loadMarkdownBlobForJob(outputs, jobId, report) {
  const files = outputs.getFilesByName(`${jobId}-executive-report.md`);
  if (files.hasNext()) {
    const file = files.next();
    file.setContent(report.markdown || "");
    return file.getBlob();
  }
  return Utilities.newBlob(report.markdown || buildMarkdownReport(report, report.browser_report || {}, report.gemini_verifier_result || {}, report.saved_files || []), MimeType.PLAIN_TEXT, `${jobId}-executive-report.md`);
}

function updateFinalReportFile(outputs, jobId, report) {
  const files = outputs.getFilesByName(`${jobId}-final-report.json`);
  if (!files.hasNext()) throw new Error("Final report JSON file was not found.");
  files.next().setContent(JSON.stringify(report, null, 2));
}

function boardroomAdminCc(recipient) {
  const props = PropertiesService.getScriptProperties();
  const enabled = String(props.getProperty(BOARDROOM_ADMIN_CC_PROPERTY) || "false").toLowerCase() === "true";
  const admin = props.getProperty("BOARDROOM_NOTIFY_EMAIL") || DEFAULT_BOARDROOM_NOTIFY_EMAIL;
  if (!enabled || !isValidEmail(admin) || String(admin).toLowerCase() === String(recipient || "").toLowerCase()) return "";
  return admin;
}

function buildExecutiveEmailHtml(jobId, report, resultUrl) {
  const browserReport = report.browser_report || {};
  normalizeReportQuality(browserReport);
  if (boardroomIsNoAnalysisNotice(browserReport)) return buildNoAnalysisEmailHtml(jobId, report);
  if (boardroomIsIntakeException(browserReport)) return buildIntakeExceptionEmailHtml(jobId, report, resultUrl);
  const findings = browserReport.findings || [];
  const leakageTotal = boardroomQuantifiedLeakageTotal(findings);
  const decisionPack = browserReport.executive_decision_pack || {};
  const headline = browserReport.executive_brief && browserReport.executive_brief.headline
    ? browserReport.executive_brief.headline
    : "No executive headline was produced.";
  return `<div style="font-family:Arial,sans-serif;color:#172026;line-height:1.5;max-width:760px">
    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase;color:#047857">Constrovet Executive Action Plan</p>
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.2">Project evidence review completed</h1>
    <p style="margin:0 0 12px;color:#3f4b53">This report was requested from Constrovet Boardroom intake.</p>
    <p style="margin:0 0 12px"><strong>Job:</strong> ${escapeHtml(jobId)}<br><strong>Mode:</strong> ${escapeHtml(report.mode)}<br><strong>Generated:</strong> ${escapeHtml(report.generated_at || "")}</p>
    <h2 style="font-size:18px;margin:18px 0 8px">Executive Summary</h2>
    <p style="margin:0 0 8px">${escapeHtml(headline)}</p>
    ${renderExecutiveKpisEmailHtml(browserReport, leakageTotal)}
    ${eev2ScheduleEmailHtml(browserReport)}
    <h2 style="font-size:18px;margin:18px 0 8px">Board Decision Required</h2>
    <p style="margin:0 0 8px">${escapeHtml(decisionPack.decision_required || boardroomBoardDecisionRequired(browserReport))}</p>
    <p style="margin:0 0 12px;color:#66737d">INR at stake from cited leakage/overrun: INR ${formatInr(decisionPack.money_at_stake_inr || leakageTotal)} | Evidence: ${escapeHtml(decisionPack.evidence_status || "CITED_EVIDENCE_REVIEW_REQUIRED")} | Actions blocked by missing evidence: ${decisionPack.blocked_by_missing_evidence ? "Yes" : "No"}</p>
    ${renderExecutiveActionsEmailHtml(browserReport)}
    ${renderExecutiveActionPlanEmailHtml(browserReport)}
    ${renderFindingStatementsEmailHtml(browserReport)}
    ${renderEvidenceQualityEmailHtml(browserReport)}
    ${renderActionCitationsEmailHtml(browserReport)}
    ${renderMissingEvidenceEmailHtml(browserReport)}
    <p style="margin:14px 0;color:#66737d">The full evidence files are stored in the Constrovet project output folder for audit review.</p>
    <p style="margin:14px 0;color:#66737d;font-size:13px">Decision-support only. Review cited evidence before commercial, legal, or recovery action.</p>
  </div>`;
}

function buildExecutiveEmailText(jobId, report, resultUrl) {
  const browserReport = report.browser_report || {};
  normalizeReportQuality(browserReport);
  if (boardroomIsNoAnalysisNotice(browserReport)) return buildNoAnalysisEmailText(jobId, report);
  if (boardroomIsIntakeException(browserReport)) return buildIntakeExceptionEmailText(jobId, report, resultUrl);
  const findings = browserReport.findings || [];
  const leakageTotal = boardroomQuantifiedLeakageTotal(findings);
  const decisionPack = browserReport.executive_decision_pack || {};
  const lines = [
    "Constrovet Executive Action Plan",
    "This report was requested from Constrovet Boardroom intake.",
    "",
    `Job: ${jobId}`,
    `Mode: ${report.mode}`,
    `Generated: ${report.generated_at || ""}`,
    "",
    "Executive Summary",
    browserReport.executive_brief && browserReport.executive_brief.headline ? browserReport.executive_brief.headline : "No executive headline was produced.",
    `Total quantified recoverable leakage: INR ${formatInr(leakageTotal)}`,
    `Cited findings: ${findings.length}`,
    `Critical/high findings: ${(browserReport.executive_brief || {}).critical_or_high_count || 0}`,
    `Documents with no signal: ${browserReport.documents_with_no_signal || 0}`,
    "",
...eev2ScheduleEmailTextLines(browserReport),
    `Gemini status: ${(report.gemini_verifier_result || {}).verification_status || "NOT_RUN"}`,
    "",
    "Board Decision Required",
    decisionPack.decision_required || boardroomBoardDecisionRequired(browserReport),
    `INR at stake from cited leakage/overrun: INR ${formatInr(decisionPack.money_at_stake_inr || leakageTotal)}`,
    `Evidence status: ${decisionPack.evidence_status || "CITED_EVIDENCE_REVIEW_REQUIRED"}`,
    `Actions blocked by missing evidence: ${decisionPack.blocked_by_missing_evidence ? "Yes" : "No"}`
  ];
  lines.push("", "Top 3 Decisions / Actions");
  const actions = (decisionPack.top_actions || browserReport.top_5_actions || []).slice(0, 3);
  if (actions.length) actions.forEach((action) => {
    lines.push(`- ${action.title || "Action"}: ${action.action || action.recommendation || ""}`);
    lines.push(`  Owner role: ${action.owner_role || "Project Controls"}; Due: ${String(action.due_horizon || "").replace("_", " ")}; Evidence: ${action.evidence_status || "CITED_EVIDENCE_REVIEW_REQUIRED"}`);
  });
  else lines.push("- No cited executive action was produced. Review missing evidence and resubmit clearer project evidence.");
  lines.push("", "7/30/90 Action Plan");
  ["7_days", "30_days", "90_days"].forEach((period) => {
    lines.push(period.replace("_", " "));
    ((browserReport.executive_action_plan || {})[period] || []).forEach((action) => {
      lines.push(`- ${action.title}: ${action.recommendation}`);
      lines.push(`  Owner role: ${action.owner_role || "Project Controls"}; Evidence: ${action.evidence_status || "CITED_EVIDENCE_REVIEW_REQUIRED"}; Recovery-ready: ${action.blocked_by_missing_evidence ? "No" : "Yes"}`);
    });
  });
  boardroomFindingStatementLines_(browserReport).forEach((line) => lines.push(line));
  if ((decisionPack.citations || []).length) {
    lines.push("", "Citations Behind Actions");
    (decisionPack.citations || []).slice(0, 6).forEach((citation) => {
      const body = citation.derived
        ? `${citation.quoted_span || ""} (derived from document values, not a verbatim quote)`
        : `"${citation.quoted_span || ""}"`;
      lines.push(`- ${citation.file || "unknown"} (${citation.page_or_sheet || "unknown"}): ${body}`);
      const note = boardroomCitationDisputeNote_(browserReport, citation);
      if (note) lines.push(`  ** ${note}`);
    });
  }
  const missing = boardroomTruncateWithNotice_(boardroomMissingEvidenceItems(browserReport), 8, "item");
  if (missing.length) {
    lines.push("", "Missing Evidence / Documents Not Processed");
    missing.forEach((item) => lines.push(`- ${item}`));
  }
  lines.push("", "Evidence Quality");
  boardroomEvidenceQualitySummary(findings).forEach((item) => lines.push(`- ${item}`));
  lines.push("", "Recoverability");
  boardroomRecoverabilitySummary(findings).forEach((item) => lines.push(`- ${item}`));
  lines.push("", "The full evidence files are stored in the Constrovet project output folder for audit review.");
  lines.push("", "Decision-support only. Review cited evidence before commercial, legal, or recovery action.");
  return lines.join("\n");
}

function renderExecutiveActionsEmailHtml(browserReport) {
  const pack = browserReport.executive_decision_pack || {};
  const actions = (pack.top_actions || browserReport.top_5_actions || []).slice(0, 3);
  const items = actions.length
    ? actions.map((action) => `<li><strong>${escapeHtml(action.title || "Action")}:</strong> ${escapeHtml(action.action || action.recommendation || "")}<br><span style="color:#66737d">Owner: ${escapeHtml(action.owner_role || "Project Controls")} | Due: ${escapeHtml(String(action.due_horizon || "").replace("_", " "))} | Evidence: ${escapeHtml(action.evidence_status || "CITED_EVIDENCE_REVIEW_REQUIRED")}</span></li>`).join("")
    : "<li>No cited executive action was produced. Review missing evidence and resubmit clearer project evidence.</li>";
  return `<h2 style="font-size:18px;margin:18px 0 8px">Top 3 Decisions / Actions</h2><ol style="margin-top:0;padding-left:22px">${items}</ol>`;
}

function buildNoAnalysisEmailHtml(jobId, report) {
  const browserReport = report.browser_report || {};
  const status = browserReport.report_quality_status || REPORT_IRRELEVANT_DATA_FILE;
  return `<div style="font-family:Arial,sans-serif;color:#172026;line-height:1.5;max-width:760px">
    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase;color:#991b1b">Constrovet ${escapeHtml(boardroomReportStatusLabel(status))}</p>
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.2">${escapeHtml(boardroomNoAnalysisHeadline(status))}</h1>
    <p style="margin:0 0 12px"><strong>Job:</strong> ${escapeHtml(jobId)}<br><strong>Mode:</strong> ${escapeHtml(report.mode)}<br><strong>Generated:</strong> ${escapeHtml(report.generated_at || "")}</p>
    <div style="border:1px solid #fecaca;background:#fef2f2;border-radius:6px;padding:12px;margin:14px 0"><strong>No analysis was generated.</strong> Constrovet did not create findings, recovery recommendations, or cost-saving claims for this upload.</div>
    ${renderNoAnalysisKpisEmailHtml(browserReport, report)}
    <h2 style="font-size:18px;margin:18px 0 8px">Classification</h2>
    <p style="margin:0 0 8px"><strong>Status:</strong> ${escapeHtml(status)}<br><strong>Reason:</strong> ${escapeHtml(browserReport.input_relevance_reason || "No relevant construction project evidence was detected.")}<br><strong>Gemini relevance:</strong> ${escapeHtml(browserReport.gemini_relevance_status || "NOT_RUN")}</p>
    ${renderDocumentOutcomesEmailHtml(browserReport)}
    <h2 style="font-size:18px;margin:18px 0 8px">Accepted Evidence For Analysis</h2>
    <p style="margin:0 0 12px">Upload PDF or CSV project evidence with budget, actual, schedule, invoice/payment, BOQ, RA bill, leakage, or ESG fields. Image-only uploads can be classified for relevance but cannot support quantified findings without extracted cited evidence.</p>
    <p style="margin:14px 0;color:#66737d">The full evidence files are stored in the Constrovet project output folder for audit review.</p>
  </div>`;
}

function buildNoAnalysisEmailText(jobId, report) {
  const browserReport = report.browser_report || {};
  const status = browserReport.report_quality_status || REPORT_IRRELEVANT_DATA_FILE;
  const lines = [
    `Constrovet ${boardroomReportStatusLabel(status)}`,
    "",
    `Job: ${jobId}`,
    `Mode: ${report.mode}`,
    `Generated: ${report.generated_at || ""}`,
    "",
    boardroomNoAnalysisHeadline(status),
    "No analysis was generated. Constrovet did not create findings, recovery recommendations, or cost-saving claims for this upload.",
    "",
    "Classification",
    `Status: ${status}`,
    `Reason: ${browserReport.input_relevance_reason || "No relevant construction project evidence was detected."}`,
    `Gemini relevance: ${browserReport.gemini_relevance_status || "NOT_RUN"}`,
    `Gemini calls used today: ${browserReport.gemini_calls_used_today || 0}`,
    "",
    "What Was Processed"
  ];
  const outcomes = browserReport.document_outcomes || [];
  if (outcomes.length) outcomes.forEach((item) => lines.push(`- ${item.file}: ${item.status}${item.reason ? ` - ${item.reason}` : ""}`));
  else lines.push("- No source document outcomes were recorded.");
  lines.push("", "Accepted Evidence For Analysis");
  lines.push("- Upload PDF or CSV project evidence with budget, actual, schedule, invoice/payment, BOQ, RA bill, leakage, or ESG fields.");
  lines.push("- Image-only uploads can be classified for relevance but cannot support quantified findings without extracted cited evidence.");
  lines.push("", "The full evidence files are stored in the Constrovet project output folder for audit review.");
  return lines.join("\n");
}

function buildIntakeExceptionEmailHtml(jobId, report, resultUrl) {
  const browserReport = report.browser_report || {};
  return `<div style="font-family:Arial,sans-serif;color:#172026;line-height:1.5;max-width:760px">
    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase;color:#b45309">Constrovet Evidence Intake Exception</p>
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.2">No cited cost, schedule, ESG, or leakage evidence was extracted</h1>
    <p style="margin:0 0 12px"><strong>Job:</strong> ${escapeHtml(jobId)}<br><strong>Mode:</strong> ${escapeHtml(report.mode)}<br><strong>Generated:</strong> ${escapeHtml(report.generated_at || "")}</p>
    <div style="border:1px solid #f59e0b;background:#fffbeb;border-radius:6px;padding:12px;margin:14px 0"><strong>No executive recovery action has been produced.</strong> Constrovet did not find cited project evidence strong enough to support a leakage, schedule, ESG, or baseline finding.</div>
    ${renderIntakeKpisEmailHtml(browserReport, report)}
    ${renderDocumentOutcomesEmailHtml(browserReport)}
    ${renderRequiredUploadFieldsEmailHtml()}
    ${renderExecutiveActionPlanEmailHtml(browserReport)}
    ${renderMissingEvidenceEmailHtml(browserReport)}
    <p style="margin:14px 0;color:#66737d">The full evidence files are stored in the Constrovet project output folder for audit review.</p>
    <p style="margin:14px 0;color:#66737d;font-size:13px">Decision-support only. No commercial, legal, recovery, or cost-saving claim has been made because there are no cited findings.</p>
  </div>`;
}

function buildIntakeExceptionEmailText(jobId, report, resultUrl) {
  const browserReport = report.browser_report || {};
  const lines = [
    "Constrovet Evidence Intake Exception",
    "",
    `Job: ${jobId}`,
    `Mode: ${report.mode}`,
    `Generated: ${report.generated_at || ""}`,
    "",
    "No cited cost, schedule, ESG, or leakage evidence was extracted.",
    "No executive recovery action has been produced.",
    "",
    "Intake Status",
    `Files received: ${((report.form_intake || {}).received_file_count !== undefined) ? (report.form_intake || {}).received_file_count : "unknown"}`,
    `Files accepted: ${((report.form_intake || {}).accepted_file_count !== undefined) ? (report.form_intake || {}).accepted_file_count : "unknown"}`,
    `Files rejected: ${((report.form_intake || {}).rejected_files || []).length}`,
    `Documents processed: ${browserReport.documents_processed_count || 0}`,
    `Documents with no signal: ${browserReport.documents_with_no_signal || 0}`,
    `Cited findings: 0`,
    "",
    "What Was Processed"
  ];
  const outcomes = browserReport.document_outcomes || [];
  if (outcomes.length) outcomes.forEach((item) => lines.push(`- ${item.file}: ${item.status}${item.reason ? ` - ${item.reason}` : ""}`));
  else lines.push("- No source document outcomes were recorded.");
  lines.push("", "Required Next Upload");
  boardroomRequiredUploadFields().forEach((item) => lines.push(`- ${item}`));
  lines.push("", "Intake Remediation Plan");
  ["7_days", "30_days", "90_days"].forEach((period) => {
    lines.push(period.replace("_", " "));
    ((browserReport.executive_action_plan || {})[period] || []).forEach((action) => lines.push(`- ${action.title}: ${action.recommendation}`));
  });
  const missing = boardroomTruncateWithNotice_(boardroomMissingEvidenceItems(browserReport), 8, "item");
  if (missing.length) {
    lines.push("", "Missing Evidence / Documents Not Processed");
    missing.forEach((item) => lines.push(`- ${item}`));
  }
  lines.push("", "The full evidence files are stored in the Constrovet project output folder for audit review.");
  lines.push("", "No commercial, legal, recovery, or cost-saving claim has been made because there are no cited findings.");
  return lines.join("\n");
}

function renderExecutiveKpisEmailHtml(browserReport, leakageTotal) {
  const findings = browserReport.findings || [];
  const brief = browserReport.executive_brief || {};
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:14px 0;width:100%;max-width:680px"><tr>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>INR ${formatInr(leakageTotal)}</strong><br><span style="color:#66737d">Quantified leakage</span></td>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${findings.length}</strong><br><span style="color:#66737d">Cited findings</span></td>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${brief.critical_or_high_count || 0}</strong><br><span style="color:#66737d">Critical / high</span></td>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${browserReport.documents_with_no_signal || 0}</strong><br><span style="color:#66737d">No-signal docs</span></td>
  </tr></table>`;
}

function renderIntakeKpisEmailHtml(browserReport, report) {
  const intake = report.form_intake || {};
  const received = intake.received_file_count !== undefined ? intake.received_file_count : "unknown";
  const accepted = intake.accepted_file_count !== undefined ? intake.accepted_file_count : "unknown";
  const rejected = (intake.rejected_files || []).length;
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:14px 0;width:100%;max-width:680px"><tr>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${escapeHtml(received)}</strong><br><span style="color:#66737d">Files received</span></td>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${escapeHtml(accepted)}</strong><br><span style="color:#66737d">Files accepted</span></td>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${rejected}</strong><br><span style="color:#66737d">Files rejected</span></td>
  </tr><tr>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${browserReport.documents_processed_count || 0}</strong><br><span style="color:#66737d">Documents processed</span></td>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${browserReport.documents_with_no_signal || 0}</strong><br><span style="color:#66737d">No-signal documents</span></td>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>0</strong><br><span style="color:#66737d">Cited findings</span></td>
  </tr></table>`;
}

function renderNoAnalysisKpisEmailHtml(browserReport, report) {
  const intake = report.form_intake || {};
  const received = intake.received_file_count !== undefined ? intake.received_file_count : "unknown";
  const accepted = intake.accepted_file_count !== undefined ? intake.accepted_file_count : "unknown";
  const rejected = (intake.rejected_files || []).length;
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:14px 0;width:100%;max-width:680px"><tr>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${escapeHtml(received)}</strong><br><span style="color:#66737d">Files received</span></td>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${escapeHtml(accepted)}</strong><br><span style="color:#66737d">Files accepted</span></td>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${rejected}</strong><br><span style="color:#66737d">Files rejected</span></td>
  </tr><tr>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${browserReport.documents_processed_count || 0}</strong><br><span style="color:#66737d">Documents processed</span></td>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>${escapeHtml(browserReport.gemini_relevance_status || "NOT_RUN")}</strong><br><span style="color:#66737d">Gemini relevance</span></td>
    <td style="border:1px solid #d9ded8;padding:10px"><strong>0</strong><br><span style="color:#66737d">Cited findings</span></td>
  </tr></table>`;
}

function renderDocumentOutcomesEmailHtml(browserReport) {
  const all = browserReport.document_outcomes || [];
  const outcomes = all.slice(0, 10);
  if (!outcomes.length) return "<h2 style=\"font-size:18px;margin:18px 0 8px\">What Was Processed</h2><p>No source document outcomes were recorded.</p>";
  const items = outcomes.map((item) => `<li><strong>${escapeHtml(item.file || "unknown")}:</strong> ${escapeHtml(item.status || "UNKNOWN")}${item.reason ? ` - ${escapeHtml(item.reason)}` : ""}</li>`).join("")
    + (all.length > 10 ? `<li style="color:#66737d">...and ${all.length - 10} more file(s) -- see the full list in your Constrovet project output folder.</li>` : "");
  return `<h2 style="font-size:18px;margin:18px 0 8px">What Was Processed</h2><ul style="margin-top:0;padding-left:20px">${items}</ul>`;
}

function renderRequiredUploadFieldsEmailHtml() {
  return `<h2 style="font-size:18px;margin:18px 0 8px">Required Next Upload</h2><ul style="margin-top:0;padding-left:20px">${boardroomRequiredUploadFields().map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderEvidenceQualityEmailHtml(browserReport) {
  const findings = browserReport.findings || [];
  return `<h2 style="font-size:18px;margin:18px 0 8px">Evidence Quality / Recoverability</h2><ul style="margin-top:0;padding-left:20px">${[...boardroomEvidenceQualitySummary(findings), ...boardroomRecoverabilitySummary(findings)].map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderExecutiveActionPlanEmailHtml(browserReport) {
  const plan = browserReport.executive_action_plan || {};
  const blocks = ["7_days", "30_days", "90_days"].map((period) => {
    const items = (plan[period] || []).map((action) => `<li><strong>${escapeHtml(action.title || "Action")}:</strong> ${escapeHtml(action.recommendation || "")}<br><span style="color:#66737d">Owner: ${escapeHtml(action.owner_role || "Project Controls")} | Evidence: ${escapeHtml(action.evidence_status || "CITED_EVIDENCE_REVIEW_REQUIRED")} | Recovery-ready: ${action.blocked_by_missing_evidence ? "No" : "Yes"}</span></li>`).join("");
    return `<h3 style="font-size:15px;margin:12px 0 4px">${escapeHtml(period.replace("_", " "))}</h3><ul style="margin-top:0;padding-left:20px">${items || "<li>No action produced for this horizon.</li>"}</ul>`;
  }).join("");
  return `<h2 style="font-size:18px;margin:18px 0 8px">7 / 30 / 90 Action Plan</h2>${blocks}`;
}

// The report was already computing findings the client never saw: the email
// rendered citations only. So the system could prove a stated figure wrong and
// then quote that same figure approvingly, with no warning attached. These
// helpers surface the finding statements, and mark any citation whose figure a
// finding has disputed.
// One parser for the deterministic-contradiction wording, shared by the
// citation warning and the severity score, so the two can never disagree.
function boardroomParseRateContradiction_(statement) {
  const match = /Stated headline rate of ([0-9.]+)% (?:overstates|understates)[\s\S]*?gives ([0-9.]+)%/.exec(String(statement || ""));
  if (!match) return null;
  return {
    claimed: match[1],
    computed: match[2],
    gap: Math.abs(Number(match[1]) - Number(match[2]))
  };
}

function boardroomDisputedFigures_(browserReport) {
  const disputes = [];
  ((browserReport || {}).findings || []).forEach(function (finding) {
    const parsed = boardroomParseRateContradiction_(finding.statement);
    if (!parsed) return;
    disputes.push({
      file: (((finding.citations || [])[0]) || {}).file || "",
      claimed: parsed.claimed,
      computed: parsed.computed
    });
  });
  return disputes;
}

function boardroomCitationDisputeNote_(browserReport, citation) {
  const span = String((citation || {}).quoted_span || "");
  const file = String((citation || {}).file || "");
  let note = "";
  boardroomDisputedFigures_(browserReport).forEach(function (dispute) {
    if (note) return;
    if (dispute.file && file && dispute.file !== file) return;
    if (span.indexOf(dispute.claimed + "%") < 0) return;
    note = `DISPUTED: the ${dispute.claimed}% figure quoted above disagrees with this document's own rows. Deterministic recheck gives ${dispute.computed}%. Do not rely on the quoted figure.`;
  });
  return note;
}

function renderFindingStatementsEmailHtml(browserReport) {
  const all = (browserReport || {}).findings || [];
  const findings = all.slice(0, 8);
  if (!findings.length) return "";
  const items = findings.map(function (finding) {
    const file = (((finding.citations || [])[0]) || {}).file || "";
    return `<li style="margin-bottom:6px">${escapeHtml(finding.statement || "")}${file ? `<br><span style="color:#66737d;font-size:13px">Source: ${escapeHtml(file)}</span>` : ""}</li>`;
  }).join("") + (all.length > 8 ? `<li style="margin-bottom:6px;color:#66737d">...and ${all.length - 8} more cited finding(s) -- see the full list in your Constrovet project output folder.</li>` : "");
  return `<h2 style="font-size:18px;margin:18px 0 8px">What The Evidence Shows</h2><ul style="margin-top:0;padding-left:20px">${items}</ul>`;
}

function boardroomFindingStatementLines_(browserReport) {
  const all = (browserReport || {}).findings || [];
  const findings = all.slice(0, 8);
  if (!findings.length) return [];
  const lines = ["", "What The Evidence Shows"];
  findings.forEach(function (finding) {
    const file = (((finding.citations || [])[0]) || {}).file || "";
    lines.push(`- ${finding.statement || ""}${file ? ` (source: ${file})` : ""}`);
  });
  if (all.length > 8) lines.push(`- ...and ${all.length - 8} more cited finding(s) -- see the full list in your Constrovet project output folder.`);
  return lines;
}

function renderActionCitationsEmailHtml(browserReport) {
  const citations = ((browserReport.executive_decision_pack || {}).citations || []).slice(0, 6);
  if (!citations.length) return "";
  return `<h2 style="font-size:18px;margin:18px 0 8px">Citations Behind Actions</h2><ul style="margin-top:0;padding-left:20px">${citations.map((citation) => {
    const note = boardroomCitationDisputeNote_(browserReport, citation);
    const span = escapeHtml(citation.quoted_span || "");
    const body = citation.derived ? `${span} <span style="color:#66737d">(derived from document values, not a verbatim quote)</span>` : `"${span}"`;
    return `<li style="margin-bottom:6px">${escapeHtml(citation.file || "unknown")} (${escapeHtml(citation.page_or_sheet || "unknown")}): ${body}${note ? `<br><strong style="color:#b45309">${escapeHtml(note)}</strong>` : ""}</li>`;
  }).join("")}</ul>`;
}

function renderMissingEvidenceEmailHtml(browserReport) {
  const fullQueue = browserReport.missing_evidence_queue || [];
  const items = fullQueue.length
    ? boardroomTruncateWithNotice_(fullQueue.map((item) => `${item.required_evidence_type}: ${item.missing_item}`), 8, "item")
    : boardroomTruncateWithNotice_(boardroomMissingEvidenceItems(browserReport), 8, "item");
  if (!items.length) return "";
  return `<h2 style="font-size:18px;margin:18px 0 8px">Missing Evidence Request</h2><p style="margin:0 0 8px">Please submit corrected evidence against the same Constrovet job ID so the loop can rerun the review.</p><ul style="margin-top:0;padding-left:20px">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function boardroomMissingEvidenceItems(browserReport) {
  const honesty = browserReport.honesty_check || {};
  return actionableMissingEvidenceItems([
    ...(honesty.missing_evidence || []),
    ...(honesty.documents_not_processed || [])
  ]);
}

function boardroomIsIntakeException(browserReport) {
  normalizeReportQuality(browserReport);
  return !browserReport || browserReport.report_quality_status === REPORT_EVIDENCE_INTAKE_EXCEPTION;
}

function boardroomIsNoAnalysisNotice(browserReport) {
  normalizeReportQuality(browserReport);
  return [
    REPORT_IRRELEVANT_DATA_FILE,
    REPORT_UNSUPPORTED_FILE_TYPE,
    REPORT_CONSTRUCTION_CONTEXT_ONLY
  ].indexOf(browserReport.report_quality_status) >= 0;
}

function boardroomReportStatusLabel(status) {
  const value = String(status || "");
  if (value === REPORT_IRRELEVANT_DATA_FILE) return "Irrelevant Data File";
  if (value === REPORT_UNSUPPORTED_FILE_TYPE) return "Unsupported Upload";
  if (value === REPORT_CONSTRUCTION_CONTEXT_ONLY) return "Construction Context Only";
  if (value === REPORT_EVIDENCE_INTAKE_EXCEPTION) return "Evidence Intake Exception";
  return "Executive Action Plan";
}

function boardroomReportSubjectPrefix(browserReport) {
  normalizeReportQuality(browserReport);
  const status = browserReport.report_quality_status;
  if (status === REPORT_IRRELEVANT_DATA_FILE) return "Irrelevant Upload";
  if (status === REPORT_UNSUPPORTED_FILE_TYPE) return "Unsupported Upload";
  if (status === REPORT_CONSTRUCTION_CONTEXT_ONLY) return "Construction Context Only";
  if (status === REPORT_EVIDENCE_INTAKE_EXCEPTION) return "Evidence Intake Exception";
  return "Executive Action Plan";
}

function boardroomNoAnalysisHeadline(status) {
  if (status === REPORT_IRRELEVANT_DATA_FILE) return "Uploaded file is not relevant to construction project progress evidence";
  if (status === REPORT_UNSUPPORTED_FILE_TYPE) return "Uploaded file type is not supported for Constrovet analysis";
  if (status === REPORT_CONSTRUCTION_CONTEXT_ONLY) return "Construction context found, but no quantified evidence was extracted";
  return "No cited evidence was extracted";
}

function boardroomBoardDecisionRequired(browserReport) {
  const findings = browserReport.findings || [];
  if (!findings.length) return "Do not take recovery or control action from this run. First resubmit structured evidence with cited budget, actual, delay, leakage, or ESG fields.";
  const actions = browserReport.top_5_actions || [];
  const quantifiedActions = actions.filter((action) => action.actionability === ACTION_RECOVERABLE && !/schedule impact/i.test(action.title || ""));
  if (quantifiedActions.length > 1) {
    // More than one quantified-recoverable finding: quoting just the first one's amount (as the
    // single-action branch below does) understates what the board is actually being asked to
    // approve. Found 1 Sept 2026 in real production data: the headline correctly totaled INR
    // 37,655 "across 2 finding(s)" while this line, unfixed, quoted only the first finding's INR
    // 37,620 -- a client-visible mismatch between two lines of the same "Board Decision Required"
    // section. Use the same deterministic sum the headline uses instead.
    const total = boardroomQuantifiedLeakageTotal(findings);
    return `Approve quantified-exposure validation only: Approve validation of INR ${formatInr(total)} cited exposure across ${quantifiedActions.length} finding(s) against invoices, approvals, and BOQ support before any recovery or avoidance action.`;
  }
  if (quantifiedActions.length === 1) return `Approve quantified-exposure validation only: ${quantifiedActions[0].action || quantifiedActions[0].recommendation}`;
  const schedule = actions.find((action) => action.actionability === ACTION_RECOVERABLE);
  if (schedule) return `Approve schedule-impact validation only: ${schedule.action || schedule.recommendation}`;
  const followup = actions.find((action) => action.actionability === ACTION_EVIDENCE_FOLLOWUP);
  if (followup) return `No quantified recoverable leakage was extracted. ${followup.action || followup.recommendation}`;
  return "Use cited baseline and ESG items as monitoring context only; do not assign recovery work without quantified cost evidence.";
}

function boardroomRequiredUploadFields() {
  return [
    "CSV columns for Budget / BOQ / Planned / Contract value and Actual / Cost incurred / Paid amount.",
    "Delay Days or schedule slippage fields where time impact is claimed.",
    "Invoice, RA bill, IPC, payment, debit note, deduction, or back-charge references.",
    "Wastage, rework, idle labour, idle plant, excess consumption, delayed PO, or penalty fields for leakage review.",
    "Diesel, fuel, energy, water, waste diversion, carbon, or emissions fields for ESG review.",
    "File, sheet, row, BOQ line, invoice ID, or schedule activity labels for traceable citations."
  ];
}

function boardroomEvidenceQualitySummary(findings) {
  const counts = countBy(findings.map((item) => item.evidence_quality || "UNKNOWN"));
  return [
    `Structured Actual-Budget findings: ${counts.STRUCTURED_ACTUAL_BUDGET || 0}`,
    `Cited amount findings: ${counts.CITED_AMOUNT || 0}`,
    `Cited days findings: ${counts.CITED_DAYS || 0}`,
    `Narrative-only findings: ${counts.CITED_NARRATIVE || 0}`
  ];
}

function boardroomRecoverabilitySummary(findings) {
  const counts = countBy(findings.map((item) => item.recoverability || "UNKNOWN"));
  return [
    `High recoverability findings: ${counts.HIGH || 0}`,
    `Medium recoverability findings: ${counts.MEDIUM || 0}`,
    `Low or unknown recoverability findings: ${(counts.LOW || 0) + (counts.UNKNOWN || 0)}`
  ];
}

function countBy(values) {
  return (values || []).reduce((counts, value) => {
    const key = value || "UNKNOWN";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function boardroomAnalysisIncomplete(browserReport) {
  const findings = browserReport.findings || [];
  const missing = boardroomMissingEvidenceItems(browserReport).join(" ");
  return !findings.length || /TEXT_EXTRACTION_UNAVAILABLE|Advanced Drive service/i.test(missing);
}

function appendAuditRow(payload, report, savedFiles, folderUrl, emailDelivery) {
  const sheet = getAuditSheet();
  const delivery = emailDelivery || report.email_delivery || {};
  const browserReport = report.browser_report || {};
  const verifier = browserReport.deterministic_verifier_result || {};
  sheet.appendRow([
    new Date(),
    payload.job_id,
    payload.mode,
    payload.email,
    savedFiles.length,
    (report.browser_report.findings || []).length,
    report.gemini_verifier_result.verification_status || "UNKNOWN",
    folderUrl,
    "",
    report.result_url || "",
    report.result_access_key || "",
    report.email_source_mode || "",
    report.source_job_id || payload.job_id || "",
    report.source_job_folder_url || folderUrl || "",
    report.source_final_report_url || (report.generated_files && report.generated_files.final_report_url ? report.generated_files.final_report_url : ""),
    "",
    delivery.email_to || "",
    delivery.email_cc || "",
    delivery.email_subject || "",
    delivery.email_status || "",
    delivery.email_error || "",
    report.report_quality_status || (report.browser_report || {}).report_quality_status || "",
    report.input_classification_status || (report.browser_report || {}).input_classification_status || "",
    report.input_relevance_reason || (report.browser_report || {}).input_relevance_reason || "",
    report.gemini_relevance_status || (report.browser_report || {}).gemini_relevance_status || "",
    report.gemini_calls_used_today || (report.browser_report || {}).gemini_calls_used_today || 0,
    report.analysis_generated === undefined ? "" : String(Boolean(report.analysis_generated)),
    report.result_url_health || resultUrlHealth(report.result_url || ""),
    report.job_state || "",
    boardroomSourceFileNames(savedFiles),
    report.extraction_status || "",
    verifier.verification_status || "",
    (report.missing_evidence_queue || []).length,
    report.correction_count || 0,
    report.rerun_count || 0,
    report.human_review_status || HUMAN_REVIEW_PENDING
  ]);
}

function appendBoardroomAuditRow(entry) {
  const sheet = getAuditSheet();
  const rejectedSummary = (entry.rejected_files || [])
    .map((file) => `${file.name || file.id}:${file.reason}`)
    .join("; ");
  const delivery = entry.email_delivery || {};
  sheet.appendRow([
    entry.timestamp || new Date(),
    entry.job_id,
    entry.mode,
    entry.email,
    entry.accepted_file_count,
    entry.finding_count,
    entry.gemini_status,
    entry.drive_folder,
    `received=${entry.received_file_count}; rejected=${rejectedSummary || "none"}`,
    entry.result_url || "",
    entry.result_access_key || "",
    entry.email_source_mode || "",
    entry.source_job_id || entry.job_id || "",
    entry.source_job_folder_url || entry.drive_folder || "",
    entry.source_final_report_url || "",
    entry.submitter_email_source || "",
    delivery.email_to || "",
    delivery.email_cc || "",
    delivery.email_subject || "",
    delivery.email_status || "",
    delivery.email_error || "",
    entry.report_quality_status || "",
    entry.input_classification_status || "",
    entry.input_relevance_reason || "",
    entry.gemini_relevance_status || "",
    entry.gemini_calls_used_today || 0,
    entry.analysis_generated === undefined ? "" : String(Boolean(entry.analysis_generated)),
    entry.result_url_health || resultUrlHealth(entry.result_url || ""),
    entry.job_state || "",
    entry.source_files || "",
    entry.extraction_status || "",
    entry.verifier_status || "",
    entry.missing_evidence_count || 0,
    entry.correction_count || 0,
    entry.rerun_count || 0,
    entry.human_review_status || HUMAN_REVIEW_PENDING
  ]);
}

function getAuditSheet() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty("AUDIT_SPREADSHEET_ID");
  let spreadsheet;
  if (id) {
    spreadsheet = SpreadsheetApp.openById(id);
  } else {
    spreadsheet = SpreadsheetApp.create("Constrovet Apps Script Audit Log");
    props.setProperty("AUDIT_SPREADSHEET_ID", spreadsheet.getId());
  }
  const sheet = spreadsheet.getActiveSheet();
  ensureAuditHeader(sheet);
  return sheet;
}

function ensureAuditHeader(sheet) {
  const header = [
    "timestamp",
    "job_id",
    "mode",
    "email",
    "file_count",
    "finding_count",
    "gemini_status",
    "drive_folder",
    "intake_summary",
    "result_url",
    "result_access_key",
    "email_source_mode",
    "source_job_id",
    "source_job_folder_url",
    "source_final_report_url",
    "submitter_email_source",
    "email_to",
    "email_cc",
    "email_subject",
    "email_status",
    "email_error",
    "report_quality_status",
    "input_classification_status",
    "input_relevance_reason",
    "gemini_relevance_status",
    "gemini_calls_used_today",
    "analysis_generated",
    "result_url_health",
    "job_state",
    "source_files",
    "extraction_status",
    "verifier_status",
    "missing_evidence_count",
    "correction_count",
    "rerun_count",
    "human_review_status"
  ];
  const width = header.length;
  const range = sheet.getRange(1, 1, 1, width);
  const existing = range.getValues()[0];
  const needsHeader = existing.every((value) => !value) || header.some((value, index) => existing[index] !== value);
  if (needsHeader) range.setValues([header]);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function safeFileName(value) {
  return String(value || "file").trim().replace(/[^a-z0-9_.-]+/gi, "-").replace(/^-|-$/g, "") || "file";
}

function formatInr(value) {
  return Math.round(Number(value || 0)).toLocaleString("en-IN");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}