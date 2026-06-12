const CONSTROVET_ROOT_FOLDER = "Constrovet";
const CONSTROVET_PROJECTS_FOLDER = "projects";
const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const DAILY_EMAIL_LIMIT = 5;
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function doGet() {
  return jsonResponse({
    ok: true,
    service: "Constrovet Workspace Apps Script processor",
    message: "Use POST from https://www.constrovet.com/app/."
  });
}

function doPost(e) {
  try {
    const payload = parseRequest(e);
    validatePayload(payload);
    enforceRateLimit(payload.email);

    const folders = prepareJobFolders(payload.job_id);
    const savedFiles = payload.mode === "DEEP_ANALYSIS" ? saveUploadedFiles(payload.files, folders.input) : [];
    const browserReport = payload.browser_report;
    const verifierResult = payload.mode === "DEEP_ANALYSIS" ? runGeminiVerifier(browserReport) : fallbackVerifier(browserReport);
    const report = buildReport(payload, browserReport, verifierResult, savedFiles);

    folders.outputs.createFile(`${payload.job_id}-browser-report.json`, JSON.stringify(browserReport, null, 2), MimeType.PLAIN_TEXT);
    folders.outputs.createFile(`${payload.job_id}-final-report.json`, JSON.stringify(report, null, 2), MimeType.PLAIN_TEXT);
    const markdownFile = folders.outputs.createFile(`${payload.job_id}-executive-report.md`, report.markdown, MimeType.PLAIN_TEXT);

    sendReportEmail(payload.email, payload.job_id, report, markdownFile.getBlob());
    appendAuditRow(payload, report, savedFiles, folders.job.getUrl());

    return jsonResponse({
      ok: true,
      job_id: payload.job_id,
      message: payload.mode === "DEEP_ANALYSIS"
        ? "Deep Analysis request received. The Gemini-enhanced report will be emailed after processing."
        : "Email request received. The browser report will be emailed after processing."
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error && error.message ? error.message : String(error) });
  }
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
    if (payload.files.length > MAX_FILES) throw new Error(`Upload ${MAX_FILES} files or fewer.`);
    payload.files.forEach(validateFilePayload);
  }
}

function validateFilePayload(file) {
  if (!file || !file.name || !file.base64) throw new Error("Each file needs name and base64 content.");
  const lower = String(file.name).toLowerCase();
  if (!lower.endsWith(".pdf") && !lower.endsWith(".csv")) throw new Error(`${file.name} is not a PDF or CSV file.`);
  if (Number(file.size_bytes || 0) > MAX_FILE_BYTES) throw new Error(`${file.name} exceeds the 10 MB Deep Analysis limit.`);
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
  return { root, projects, job, input, outputs };
}

function getOrCreateFolder(parent, name) {
  const existing = parent.getFoldersByName(name);
  return existing.hasNext() ? existing.next() : parent.createFolder(name);
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
  return String(name).toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/csv";
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

function extractJson(text) {
  const trimmed = String(text || "").trim();
  if (trimmed.startsWith("{")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Gemini response did not contain JSON.");
  return trimmed.slice(start, end + 1);
}

function fallbackVerifier(browserReport) {
  return {
    verification_status: "NOT_RUN",
    executive_brief: browserReport.executive_brief || {},
    board_summary: "Browser-only report emailed without Gemini Deep Analysis.",
    top_decisions_required: browserReport.top_5_actions || [],
    contractor_questions: [],
    recovery_actions: browserReport.executive_action_plan || {},
    unsupported_claims_removed: ["Gemini was not run for this email-only request."],
    honesty_check: browserReport.honesty_check || {},
    model_audit_trail: {
      raw_documents_sent_to_gemini: false,
      gemini_used: false
    }
  };
}

function buildReport(payload, browserReport, verifierResult, savedFiles) {
  const markdown = buildMarkdownReport(payload, browserReport, verifierResult, savedFiles);
  return {
    job_id: payload.job_id,
    mode: payload.mode,
    email: payload.email,
    browser_report: browserReport,
    gemini_verifier_result: verifierResult,
    saved_files: savedFiles,
    generated_at: new Date().toISOString(),
    markdown
  };
}

function buildMarkdownReport(payload, browserReport, verifierResult, savedFiles) {
  const findings = browserReport.findings || [];
  const leakage = findings.filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN");
  const totalLeakage = leakage.reduce((sum, item) => sum + Number(item.amount_inr || 0), 0);
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
    `Total cited leakage/overrun exposure: INR ${formatInr(totalLeakage)}`,
    `Gemini verification status: ${verifierResult.verification_status || "UNKNOWN"}`,
    "",
    "## Top Actions",
    ""
  ];
  (browserReport.top_5_actions || []).forEach((action) => {
    lines.push(`- ${action.rank || ""}. ${action.title || "Action"}: ${action.action || ""}`);
  });
  lines.push("", "## 7/30/90 Action Plan", "");
  ["7_days", "30_days", "90_days"].forEach((period) => {
    lines.push(`### ${period.replace("_", " ")}`);
    ((browserReport.executive_action_plan || {})[period] || []).forEach((action) => {
      lines.push(`- ${action.title}: ${action.recommendation}`);
    });
    lines.push("");
  });
  lines.push("## Gemini Deep Analysis", "", JSON.stringify(verifierResult, null, 2), "", "## Citations", "");
  findings.forEach((finding, index) => {
    const citation = (finding.citations || [])[0] || {};
    lines.push(`### Finding ${index + 1}: ${finding.financial_category}`);
    lines.push(`- ${finding.statement}`);
    lines.push(`- Amount INR: ${finding.amount_inr || 0}; Days: ${finding.days || 0}; Confidence: ${finding.confidence || "LOW"}`);
    lines.push(`- Citation: ${citation.file || "unknown"} (${citation.page_or_sheet || "unknown"}): "${citation.quoted_span || ""}"`);
    lines.push("");
  });
  if (savedFiles.length) {
    lines.push("## Stored Source Files", "");
    savedFiles.forEach((file) => lines.push(`- ${file.name}: ${file.drive_url}`));
  }
  return lines.join("\n");
}

function sendReportEmail(email, jobId, report, markdownBlob) {
  const html = `<div style="font-family:Arial,sans-serif;color:#172026">
    <h1 style="font-size:20px">Constrovet Executive Report</h1>
    <p>Job <strong>${escapeHtml(jobId)}</strong> has completed.</p>
    <p>Mode: <strong>${escapeHtml(report.mode)}</strong></p>
    <p>Gemini status: <strong>${escapeHtml(report.gemini_verifier_result.verification_status || "UNKNOWN")}</strong></p>
    <p>The attached Markdown report includes executive actions, citations, rationale, honesty check, and audit details.</p>
    <p style="color:#66737d">Decision-support only. Review cited evidence before commercial, legal, or recovery action.</p>
  </div>`;
  MailApp.sendEmail({
    to: email,
    subject: `Constrovet Executive Report - ${jobId}`,
    body: `Constrovet report ${jobId} is attached.\n\nDecision-support only. Review cited evidence before action.`,
    htmlBody: html,
    attachments: [markdownBlob.setName(`${jobId}-executive-report.md`)]
  });
}

function appendAuditRow(payload, report, savedFiles, folderUrl) {
  const sheet = getAuditSheet();
  sheet.appendRow([
    new Date(),
    payload.job_id,
    payload.mode,
    payload.email,
    savedFiles.length,
    (report.browser_report.findings || []).length,
    report.gemini_verifier_result.verification_status || "UNKNOWN",
    folderUrl
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
    spreadsheet.getActiveSheet().appendRow(["timestamp", "job_id", "mode", "email", "file_count", "finding_count", "gemini_status", "drive_folder"]);
  }
  return spreadsheet.getActiveSheet();
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
