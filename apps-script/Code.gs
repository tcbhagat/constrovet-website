const CONSTROVET_ROOT_FOLDER = "Constrovet";
const CONSTROVET_PROJECTS_FOLDER = "projects";
const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const BOARDROOM_MAX_FILES = 10;
const BOARDROOM_DEEP_ANALYSIS_MAX_FILES = 3;
const DAILY_EMAIL_LIMIT = 5;
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_BOARDROOM_NOTIFY_EMAIL = "admin@constrovet.com";
const BOARDROOM_ADMIN_CC_PROPERTY = "BOARDROOM_CC_ADMIN";

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

    const accessKey = makeResultAccessKey();
    report.result_access_key = accessKey;
    report.result_url = buildResultUrl(payload.job_id, accessKey);
    const browserFile = folders.outputs.createFile(`${payload.job_id}-browser-report.json`, JSON.stringify(browserReport, null, 2), MimeType.PLAIN_TEXT);
    const markdownFile = folders.outputs.createFile(`${payload.job_id}-executive-report.md`, report.markdown, MimeType.PLAIN_TEXT);
    report.generated_files = {
      browser_report_url: browserFile.getUrl(),
      executive_report_url: markdownFile.getUrl()
    };
    const finalFile = folders.outputs.createFile(`${payload.job_id}-final-report.json`, JSON.stringify(report, null, 2), MimeType.PLAIN_TEXT);
    report.generated_files.final_report_url = finalFile.getUrl();
    finalFile.setContent(JSON.stringify(report, null, 2));

    let emailDelivery = emptyEmailDelivery(payload.email, payload.job_id);
    try {
      emailDelivery = sendReportEmail(payload.email, payload.job_id, report, markdownFile.getBlob(), report.result_url);
      report.email_delivery = emailDelivery;
      finalFile.setContent(JSON.stringify(report, null, 2));
    } catch (error) {
      emailDelivery = failedEmailDelivery(payload.email, payload.job_id, error);
      report.email_delivery = emailDelivery;
      finalFile.setContent(JSON.stringify(report, null, 2));
      appendAuditRow(payload, report, savedFiles, folders.job.getUrl(), emailDelivery);
      throw error;
    }
    appendAuditRow(payload, report, savedFiles, folders.job.getUrl(), emailDelivery);

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

function onFormSubmit(e) {
  return handleBoardroomFormSubmit(e);
}

function handleBoardroomFormSubmit(e) {
  const startedAt = new Date();
  const jobId = makeBoardroomJobId(startedAt);
  const props = PropertiesService.getScriptProperties();
  const notifyEmail = props.getProperty("BOARDROOM_NOTIFY_EMAIL") || DEFAULT_BOARDROOM_NOTIFY_EMAIL;
  const responseFolderId = props.getProperty("BOARDROOM_RESPONSE_FOLDER_ID") || "";
  const deepAnalysisEnabled = String(props.getProperty("ENABLE_BOARDROOM_DEEP_ANALYSIS") || "false").toLowerCase() === "true";
  const submitterEmail = getBoardroomSubmitterEmail(e) || notifyEmail;
  const folders = prepareJobFolders(jobId);
  const formFiles = getBoardroomFilesFromEvent(e);
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

  const browserReport = buildBoardroomOutput(documents, rejected);
  const verifierResult = deepAnalysisEnabled
    ? runGeminiVerifier(browserReport)
    : fallbackVerifier(browserReport);
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
    rejected_files: rejected
  };

  const accessKey = makeResultAccessKey();
  report.result_access_key = accessKey;
  report.result_url = buildResultUrl(jobId, accessKey);
  const browserFile = folders.outputs.createFile(`${jobId}-browser-report.json`, JSON.stringify(browserReport, null, 2), MimeType.PLAIN_TEXT);
  const markdownFile = folders.outputs.createFile(`${jobId}-executive-report.md`, report.markdown, MimeType.PLAIN_TEXT);
  report.generated_files = {
    browser_report_url: browserFile.getUrl(),
    executive_report_url: markdownFile.getUrl()
  };
  const finalFile = folders.outputs.createFile(`${jobId}-final-report.json`, JSON.stringify(report, null, 2), MimeType.PLAIN_TEXT);
  report.generated_files.final_report_url = finalFile.getUrl();
  finalFile.setContent(JSON.stringify(report, null, 2));
  let emailDelivery = emptyEmailDelivery(submitterEmail, jobId);
  try {
    emailDelivery = sendReportEmail(submitterEmail, jobId, report, markdownFile.getBlob(), report.result_url);
    report.email_delivery = emailDelivery;
    finalFile.setContent(JSON.stringify(report, null, 2));
  } catch (error) {
    emailDelivery = failedEmailDelivery(submitterEmail, jobId, error);
    report.email_delivery = emailDelivery;
    finalFile.setContent(JSON.stringify(report, null, 2));
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
      email_delivery: emailDelivery
    });
    throw error;
  }
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
    email_delivery: emailDelivery
  });

  return {
    ok: true,
    job_id: jobId,
    accepted_file_count: accepted.length,
    rejected_file_count: rejected.length,
    finding_count: browserReport.findings.length,
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
    executive_brief: browserReport.executive_brief || {},
    findings: browserReport.findings || [],
    top_5_actions: browserReport.top_5_actions || [],
    recoverable_cost_exposure: browserReport.recoverable_cost_exposure || {},
    immediate_control_failures: browserReport.immediate_control_failures || [],
    missing_evidence_blocking_recovery: browserReport.missing_evidence_blocking_recovery || [],
    executive_action_plan: browserReport.executive_action_plan || {},
    honesty_check: browserReport.honesty_check || {},
    gemini_verifier_result: report.gemini_verifier_result || {},
    form_intake: report.form_intake || {},
    generated_files: {
      executive_report_url: report.generated_files && report.generated_files.executive_report_url ? report.generated_files.executive_report_url : "",
      final_report_url: report.generated_files && report.generated_files.final_report_url ? report.generated_files.final_report_url : "",
      browser_report_url: report.generated_files && report.generated_files.browser_report_url ? report.generated_files.browser_report_url : ""
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
    ${renderFindingGroupHtml("Leakage And Overrun", grouped.LEAKAGE_AND_OVERRUN || [], "leakage")}
    ${renderFindingGroupHtml("Baseline Budget", grouped.BASELINE_BUDGET || [], "baseline")}
    ${renderFindingGroupHtml("ESG Metrics", grouped.ESG_METRIC || [], "esg")}
    ${renderHonestyHtml(report)}
    ${renderReportLinksHtml(report)}
  </main>
</body>
</html>`;
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
  const actions = report.executive_action_plan || {};
  const periods = ["7_days", "30_days", "90_days"];
  return `<section class="section card"><h2>7 / 30 / 90 Actions</h2><div class="grid">${periods.map((period) => {
    const items = actions[period] || [];
    return `<div><h3>${escapeHtml(period.replace("_", " "))}</h3><ol class="actions">${items.length ? items.map((item) => `<li><strong>${escapeHtml(item.title || "Action")}:</strong> ${escapeHtml(item.recommendation || item.action || "")}</li>`).join("") : "<li class=\"muted\">No action produced for this horizon.</li>"}</ol></div>`;
  }).join("")}</div></section>`;
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
    files.browser_report_url ? `<a href="${escapeHtml(files.browser_report_url)}" target="_blank" rel="noopener">Browser JSON</a>` : ""
  ].filter(Boolean).join("");
  return `<section class="section card links"><h2>Generated Files</h2>${links || "<p class=\"muted\">No Drive report links available.</p>"}</section>`;
}

function makeResultAccessKey() {
  return `${Utilities.getUuid()}${Utilities.getUuid()}`.replace(/-/g, "");
}

function buildResultUrl(jobId, accessKey) {
  const props = PropertiesService.getScriptProperties();
  const base = props.getProperty("BOARDROOM_RESULT_BASE_URL") || ScriptApp.getService().getUrl() || "";
  if (!base) return "";
  return `${base}?job_id=${encodeURIComponent(jobId)}&key=${encodeURIComponent(accessKey)}`;
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
  if (e && e.response && typeof e.response.getRespondentEmail === "function") {
    const email = e.response.getRespondentEmail();
    if (isValidEmail(email)) return email;
  }
  const candidates = [];
  getBoardroomItemResponses(e).forEach((item) => {
    const title = String(item.title || "").toLowerCase();
    if (/email|e-mail|mail/.test(title)) candidates.push(String(item.response || ""));
  });
  return candidates.map((item) => item.trim()).find(isValidEmail) || "";
}

function getBoardroomFilesFromEvent(e) {
  const byId = {};
  getBoardroomItemResponses(e).forEach((item) => {
    extractDriveFileIds(item.response).forEach((id) => {
      if (!byId[id]) byId[id] = driveFileInfo(id, item.title);
    });
  });
  return Object.keys(byId).map((id) => byId[id]);
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
    /\b([A-Za-z0-9_-]{25,})\b/g
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

function reviewBoardroomFile(fileInfo, acceptedCount, deepAnalysisEnabled, responseFolderId) {
  if (!fileInfo || !fileInfo.id) return { accept: false, reason: "MISSING_FILE_ID" };
  const name = String(fileInfo.name || "");
  const lower = name.toLowerCase();
  const allowedType = lower.endsWith(".pdf") || lower.endsWith(".csv") ||
    fileInfo.mime_type === MimeType.PDF || fileInfo.mime_type === MimeType.CSV || fileInfo.mime_type === "text/csv";
  if (!allowedType) return { accept: false, reason: "UNSUPPORTED_FILE_TYPE" };
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

function extractBoardroomDocument(fileInfo) {
  const lower = String(fileInfo.name || "").toLowerCase();
  if (lower.endsWith(".csv") || fileInfo.mime_type === "text/csv" || fileInfo.mime_type === MimeType.CSV) {
    const text = DriveApp.getFileById(fileInfo.id).getBlob().getDataAsString();
    return { file: fileInfo.name, type: "csv", pages: parseBoardroomCsvPages(text) };
  }
  if (lower.endsWith(".pdf") || fileInfo.mime_type === MimeType.PDF) {
    const extracted = extractPdfTextWithOptionalOcr(fileInfo);
    if (extracted.text) return { file: fileInfo.name, type: "pdf", pages: [{ label: "Workspace OCR", text: extracted.text }] };
    return {
      file: fileInfo.name,
      type: "pdf",
      pages: [],
      extraction_error: extracted.reason || "TEXT_EXTRACTION_UNAVAILABLE"
    };
  }
  return { file: fileInfo.name, type: "unknown", pages: [], extraction_error: "UNSUPPORTED_FILE_TYPE" };
}

function extractPdfTextWithOptionalOcr(fileInfo) {
  if (typeof Drive === "undefined" || !Drive.Files || typeof Drive.Files.copy !== "function") {
    return { text: "", reason: "TEXT_EXTRACTION_UNAVAILABLE_ADVANCED_DRIVE_SERVICE_DISABLED" };
  }
  let docId = "";
  try {
    const resource = { title: `${fileInfo.name} OCR`, mimeType: MimeType.GOOGLE_DOCS };
    const converted = Drive.Files.copy(resource, fileInfo.id, { ocr: true, ocrLanguage: "en" });
    docId = converted.id;
    const body = DocumentApp.openById(docId).getBody();
    return { text: body ? body.getText() : "", reason: "" };
  } catch (error) {
    return { text: "", reason: `TEXT_EXTRACTION_UNAVAILABLE_${String(error && error.message ? error.message : error).slice(0, 120)}` };
  } finally {
    if (docId) {
      try {
        DriveApp.getFileById(docId).setTrashed(true);
      } catch (error) {
        // Leave converted OCR artifact in Drive if cleanup fails.
      }
    }
  }
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
  (documents || []).forEach((document) => {
    let found = 0;
    (document.pages || []).forEach((page) => {
      if (!page.text) return;
      const pageFindings = extractBoardroomFindings(document.file, page.label, page.text, page);
      found += pageFindings.length;
      findings.push(...pageFindings);
    });
    if (!found) {
      documentsNotProcessed.push(`${document.file}: ${document.extraction_error || "no cost, schedule, or ESG signal found by deterministic Workspace scan."}`);
    }
  });
  (rejectedFiles || []).forEach((file) => {
    documentsNotProcessed.push(`${file.name || file.id}: rejected from automation (${file.reason}).`);
  });
  const citedFindings = scoreBoardroomFindings(dedupeBoardroomFindings(findings).slice(0, 80));
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
    findings: citedFindings,
    executive_brief: buildBoardroomExecutiveBrief(citedFindings, documentsNotProcessed),
    top_5_actions: buildBoardroomTopExecutiveActions(citedFindings),
    recoverable_cost_exposure: buildBoardroomRecoverableCostExposure(citedFindings),
    immediate_control_failures: buildBoardroomImmediateControlFailures(citedFindings),
    missing_evidence_blocking_recovery: buildBoardroomMissingEvidence(citedFindings, documentsNotProcessed),
    executive_action_plan: buildBoardroomExecutiveActionPlan(citedFindings),
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
        "Rejected files are not counted as evidence for recovery actions."
      ]
    }
  };
}

function extractBoardroomFindings(file, pageOrSheet, text, page) {
  const findings = [];
  if (page.headers && page.row) {
    const rowFinding = boardroomCsvBudgetActualFinding(file, pageOrSheet, text, page.headers, page.row);
    if (rowFinding) findings.push(rowFinding);
  }
  boardroomEvidenceWindows(text).forEach((span) => {
    const lower = span.toLowerCase();
    const budget = boardroomValueNear(lower, span, boardroomBaselineRe());
    const actual = boardroomValueNear(lower, span, boardroomActualRe());
    if (budget !== null) {
      findings.push(boardroomFinding(`Baseline budget evidence of INR ${formatInr(budget)} is cited.`, "BASELINE_BUDGET", budget, 0, file, pageOrSheet, span, budget, 0, 0, "MEDIUM"));
    }
    if (budget !== null && actual !== null && actual > budget) {
      findings.push(boardroomFinding(`Actual exceeds budget by INR ${formatInr(actual - budget)}.`, "LEAKAGE_AND_OVERRUN", actual - budget, 0, file, pageOrSheet, span, budget, actual, actual - budget, "HIGH"));
    }
    if (boardroomLeakageRe().test(lower)) {
      const amount = boardroomFirstAmount(span) || Math.max(actual || 0, 0);
      const days = boardroomFirstDays(span);
      findings.push(boardroomFinding(`Potential leakage or overrun signal: ${boardroomShortStatement(span)}`, "LEAKAGE_AND_OVERRUN", amount, days, file, pageOrSheet, span, budget || 0, actual || 0, actual && budget ? actual - budget : 0, amount || days ? "MEDIUM" : "LOW"));
    } else if (boardroomEsgRe().test(lower)) {
      findings.push(boardroomFinding(`ESG metric signal: ${boardroomShortStatement(span)}`, "ESG_METRIC", boardroomFirstAmount(span) || 0, boardroomFirstDays(span), file, pageOrSheet, span, 0, 0, 0, "MEDIUM"));
    }
  });
  return findings;
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

function boardroomEvidenceWindows(text) {
  return String(text || "").replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\s+\|\s+|;\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 12 && boardroomConstructionSignalRe().test(part.toLowerCase()))
    .slice(0, 40);
}

function boardroomConstructionSignalRe() {
  return /budget|boq|actual|overrun|delay|penalty|ld|liquidated damages|eot|extension of time|variation|change order|debit note|wastage|waste|rework|idle|idle plant|idle labour|idle equipment|excess|consumption|invoice|ra bill|running account|ipc|interim payment|paid|spent|escalation|reconciliation|retention|deduction|back charge|delayed po|purchase order delay|carbon|energy|water|diesel|fuel|electricity|emission|scope|days?|₹|inr|rs\.?/i;
}

function boardroomBaselineRe() {
  return /budget|boq|planned|estimate|contract value|contract sum|baseline|ra bill|running account|ipc|interim payment|cumulative work done|advance recovery/;
}

function boardroomActualRe() {
  return /actual|spent|cost incurred|paid|invoice|expenditure|consumption|debit note|deduction|back charge/;
}

function boardroomLeakageRe() {
  return /overrun|cost variance|actual exceeds|spent more|ld|liquidated damages|penalty|wastage|rework|idle|idle plant|idle labour|idle equipment|excess|delay|delayed|slippage|late|behind schedule|purchase order delay|debit note|back charge|deduction|consumption variance|material variance|price escalation|escalation claim|reconciliation gap|unreconciled|delay cost/;
}

function boardroomEsgRe() {
  return /carbon|waste diversion|energy|water|fuel|diesel|electricity|emission|scope 1|scope 2|scope 3/;
}

function boardroomValueNear(lower, original, keywordRegex) {
  if (!keywordRegex.test(lower)) return null;
  const value = boardroomFirstAmount(original);
  return value || null;
}

function boardroomFirstAmount(text) {
  const match = /(?:₹|INR|Rs\.?)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac)?/i.exec(String(text || ""));
  if (!match) return 0;
  let value = Number(match[1].replace(/,/g, ""));
  const unit = (match[2] || "").toLowerCase();
  if (unit === "crore" || unit === "cr") value *= 10000000;
  if (unit === "lakh" || unit === "lac") value *= 100000;
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
      control_theme: boardroomControlTheme(item)
    };
  });
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
  const leakage = findings.filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN");
  const totalLeakage = leakage.reduce((sum, item) => sum + Number(item.amount_inr || 0), 0);
  const critical = findings.filter((item) => item.severity === "CRITICAL").length;
  const high = findings.filter((item) => item.severity === "HIGH").length;
  return {
    headline: leakage.length
      ? `Cited leakage/overrun exposure totals INR ${formatInr(totalLeakage)} across ${leakage.length} finding(s).`
      : "No cited leakage/overrun exposure was proven by this Workspace form run.",
    decision_focus: ranked[0] ? `Start with Finding ${findings.indexOf(ranked[0]) + 1}: ${ranked[0].statement}` : "Improve source evidence before executive action.",
    critical_or_high_count: critical + high,
    total_cited_leakage_inr: totalLeakage,
    documents_with_no_signal: documentsNotProcessed.length,
    caveat: "Actions remain decision-support only and must be reviewed against cited evidence before commercial, legal, or recovery steps."
  };
}

function buildBoardroomTopExecutiveActions(findings) {
  return boardroomRankFindings(findings).slice(0, 5).map((item, index) => ({
    rank: index + 1,
    title: boardroomActionTitle(item),
    action: boardroomActionText(item),
    source_finding_index: findings.indexOf(item) + 1,
    risk_score: item.risk_score,
    severity: item.severity,
    recoverability: item.recoverability,
    evidence_quality: item.evidence_quality
  }));
}

function boardroomActionTitle(item) {
  if (item.financial_category === "LEAKAGE_AND_OVERRUN" && item.calculation.actual > item.calculation.budget) return "Recover or contain actual-over-budget exposure";
  if (item.financial_category === "LEAKAGE_AND_OVERRUN") return "Validate and contain leakage signal";
  if (item.financial_category === "ESG_METRIC") return "Track ESG metric separately";
  return "Use baseline value as context, not leakage";
}

function boardroomActionText(item) {
  if (item.financial_category === "LEAKAGE_AND_OVERRUN" && item.amount_inr > 0) {
    return `Assign an owner to validate INR ${formatInr(item.amount_inr)} cited exposure and prepare recovery or avoidance action.`;
  }
  if (item.financial_category === "LEAKAGE_AND_OVERRUN" && item.days > 0) {
    return `Validate ${item.days} cited delay day(s), then connect delay ownership and cost support before recovery action.`;
  }
  if (item.financial_category === "LEAKAGE_AND_OVERRUN") {
    return "Treat this as a cited leakage watchlist item; require amount, delay-day, invoice, or recovery support before executive recovery action.";
  }
  if (item.financial_category === "ESG_METRIC") return "Keep the ESG metric in the monitoring pack unless separate financial evidence supports a cost finding.";
  return "Use this as approved context for variance review; do not count it as leakage.";
}

function buildBoardroomRecoverableCostExposure(findings) {
  const items = boardroomRankFindings(findings).filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN" && item.amount_inr > 0);
  return {
    total_cited_amount_inr: items.reduce((sum, item) => sum + Number(item.amount_inr || 0), 0),
    item_count: items.length,
    high_recoverability_count: items.filter((item) => item.recoverability === "HIGH").length,
    finding_indexes: items.slice(0, 10).map((item) => findings.indexOf(item) + 1)
  };
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
  if (!findings.some((item) => item.calculation.budget > 0 && item.calculation.actual > 0)) gaps.push("Comparable Budget and Actual values were not found for every suspected variance.");
  if (!findings.some((item) => item.citations && item.citations[0] && item.citations[0].file && item.citations[0].page_or_sheet)) gaps.push("Every executive recovery action needs file and page/sheet traceability.");
  documentsNotProcessed.forEach((item) => gaps.push(item));
  if (!gaps.length) gaps.push("No blocking evidence gap was detected by the deterministic scan; still review source citations before decisions.");
  return gaps;
}

function buildBoardroomExecutiveActionPlan(findings) {
  const ranked = boardroomRankFindings(findings);
  const leakage = ranked.filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN");
  const schedule = ranked.filter((item) => item.days > 0);
  const esg = ranked.filter((item) => item.financial_category === "ESG_METRIC");
  const baseline = ranked.filter((item) => item.financial_category === "BASELINE_BUDGET");
  const primary = leakage[0] || schedule[0] || esg[0] || baseline[0] || null;
  return {
    "7_days": [
      boardroomAction("Validate cited evidence and assign owners", primary ? `Review the highest-priority cited item: ${primary.statement}` : "No cited cost, schedule, or ESG finding was extracted; review the source files and add clearer budget, actual, delay, or ESG records.", primary ? [findings.indexOf(primary) + 1] : [], primary ? "HIGH" : "LOW"),
      boardroomAction("Stop immediate leakage signals", leakage[0] ? `Freeze avoidable spend, rework, penalty, idle-resource, excess-consumption, or overrun exposure tied to: ${leakage[0].statement}` : "No cited leakage or overrun signal was extracted in this run.", leakage[0] ? [findings.indexOf(leakage[0]) + 1] : [], leakage[0] ? leakage[0].confidence : "LOW"),
      boardroomAction("Reconcile budget and actual values", leakage.find((item) => item.calculation.actual > item.calculation.budget) ? "Check supporting invoices, payment records, BOQ lines, and approvals for the cited Actual - Budget variance." : "No positive Actual - Budget overrun was extracted from the selected files.", leakage.find((item) => item.calculation.actual > item.calculation.budget) ? [findings.indexOf(leakage.find((item) => item.calculation.actual > item.calculation.budget)) + 1] : [], leakage.find((item) => item.calculation.actual > item.calculation.budget) ? "HIGH" : "LOW")
    ],
    "30_days": [
      boardroomAction("Recover or avoid documented cost exposure", leakage.length ? `Prioritize commercial recovery for ${leakage.length} cited leakage/overrun item(s), starting with INR ${formatInr(leakage[0].amount_inr)}.` : "No cited recoverable cost exposure was extracted; strengthen input records before commercial recovery action.", leakage.slice(0, 3).map((item) => findings.indexOf(item) + 1), leakage.length ? leakage[0].confidence : "LOW"),
      boardroomAction("Correct procurement, material, and execution controls", leakage.length ? "Use cited leakage causes to update approval thresholds, material consumption checks, rework controls, and delayed-PO escalation." : "No cited control failure was extracted; treat this as a data-quality gap, not proof that no leakage exists.", leakage.slice(0, 3).map((item) => findings.indexOf(item) + 1), leakage.length ? "MEDIUM" : "LOW"),
      boardroomAction("Update forecast with schedule and ESG evidence", (schedule[0] || esg[0]) ? "Reflect cited delay days and ESG metrics separately from cost leakage in the next project review." : "No cited schedule-day or ESG metric signal was extracted from this run.", [schedule[0], esg[0]].filter(Boolean).map((item) => findings.indexOf(item) + 1), (schedule[0] || esg[0]) ? "MEDIUM" : "LOW")
    ],
    "90_days": [
      boardroomAction("Institutionalize recurrence controls", leakage.length ? "Convert the cited leakage patterns into monthly variance checks, exception approvals, and closeout evidence requirements." : "First improve evidence capture, then define recurrence controls from the next cited leakage review.", leakage.slice(0, 5).map((item) => findings.indexOf(item) + 1), leakage.length ? "MEDIUM" : "LOW"),
      boardroomAction("Track closure metrics", ranked.length ? "Track cited risk value, unresolved overrun count, delay days, ESG metrics, and missing-evidence items until closure." : "Track missing-evidence items until the dashboard can extract cited findings.", ranked.slice(0, 5).map((item) => findings.indexOf(item) + 1), ranked.length ? "MEDIUM" : "LOW"),
      boardroomAction("Prepare executive review pack", ranked.length ? "Use the report and citations as the evidence index for management review; keep citations attached to every action." : "Prepare a revised document set with budget, actual, invoice, schedule, and ESG records before the next review.", ranked.slice(0, 5).map((item) => findings.indexOf(item) + 1), ranked.length ? "MEDIUM" : "LOW")
    ]
  };
}

function boardroomAction(title, recommendation, sourceFindingIndexes, confidence) {
  return { title, recommendation, source_finding_indexes: sourceFindingIndexes, confidence };
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

function sendReportEmail(email, jobId, report, markdownBlob, resultUrl) {
  const recipient = isValidEmail(email) ? email : (PropertiesService.getScriptProperties().getProperty("BOARDROOM_NOTIFY_EMAIL") || DEFAULT_BOARDROOM_NOTIFY_EMAIL);
  const cc = boardroomAdminCc(recipient);
  const subject = `Constrovet Executive Action Plan - ${jobId}`;
  const mail = {
    to: recipient,
    subject,
    body: buildExecutiveEmailText(jobId, report, resultUrl),
    htmlBody: buildExecutiveEmailHtml(jobId, report, resultUrl),
    attachments: [markdownBlob.setName(`${jobId}-executive-report.md`)]
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
  const recipient = isValidEmail(email) ? email : (PropertiesService.getScriptProperties().getProperty("BOARDROOM_NOTIFY_EMAIL") || DEFAULT_BOARDROOM_NOTIFY_EMAIL);
  return {
    email_to: recipient,
    email_cc: boardroomAdminCc(recipient),
    email_subject: `Constrovet Executive Action Plan - ${jobId}`,
    email_sent_at: "",
    email_status: "EMAIL_NOT_ATTEMPTED",
    email_error: ""
  };
}

function failedEmailDelivery(email, jobId, error) {
  const delivery = emptyEmailDelivery(email, jobId);
  delivery.email_status = "EMAIL_FAILED";
  delivery.email_error = error && error.message ? error.message : String(error);
  return delivery;
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
  const markdownBlob = loadMarkdownBlobForJob(outputs, jobId, report);
  const delivery = sendReportEmail(recipient, jobId, report, markdownBlob, report.result_url || buildResultUrl(jobId, report.result_access_key || ""));
  report.email_delivery = delivery;
  report.email_delivery.resend = true;
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

function resendConfiguredBoardroomReport() {
  const props = PropertiesService.getScriptProperties();
  const jobId = String(props.getProperty("BOARDROOM_RESEND_JOB_ID") || "").trim();
  if (!jobId) throw new Error("BOARDROOM_RESEND_JOB_ID script property is required.");
  const recipient = String(props.getProperty("BOARDROOM_RESEND_EMAIL") || "").trim();
  return resendBoardroomReport(jobId, recipient);
}

function loadMarkdownBlobForJob(outputs, jobId, report) {
  const files = outputs.getFilesByName(`${jobId}-executive-report.md`);
  if (files.hasNext()) return files.next().getBlob();
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
  const findings = browserReport.findings || [];
  const leakageTotal = findings
    .filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN")
    .reduce((sum, item) => sum + Number(item.amount_inr || 0), 0);
  const headline = browserReport.executive_brief && browserReport.executive_brief.headline
    ? browserReport.executive_brief.headline
    : "No executive headline was produced.";
  const incomplete = boardroomAnalysisIncomplete(browserReport);
  const resultLinkHtml = resultUrl
    ? `<p style="margin:18px 0"><a href="${escapeHtml(resultUrl)}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:6px;font-weight:bold">View private analysed result</a></p>`
    : "<p style=\"color:#92400e\"><strong>Private result link unavailable.</strong> Redeploy the Apps Script web app to enable private result links.</p>";
  return `<div style="font-family:Arial,sans-serif;color:#172026;line-height:1.5;max-width:760px">
    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase;color:#047857">Constrovet Executive Action Plan</p>
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.2">Project evidence review completed</h1>
    <p style="margin:0 0 12px"><strong>Job:</strong> ${escapeHtml(jobId)}<br><strong>Mode:</strong> ${escapeHtml(report.mode)}<br><strong>Generated:</strong> ${escapeHtml(report.generated_at || "")}</p>
    ${incomplete ? `<div style="border:1px solid #f59e0b;background:#fffbeb;border-radius:6px;padding:12px;margin:14px 0"><strong>Analysis incomplete:</strong> PDF text extraction was unavailable or no cited evidence was extracted. Enable Drive API OCR or submit CSV evidence with budget, actual, delay, or ESG fields.</div>` : ""}
    <h2 style="font-size:18px;margin:18px 0 8px">Executive Summary</h2>
    <p style="margin:0 0 8px">${escapeHtml(headline)}</p>
    <p style="margin:0 0 12px"><strong>Total cited leakage/overrun exposure:</strong> INR ${formatInr(leakageTotal)}<br><strong>Cited findings:</strong> ${findings.length}<br><strong>Gemini status:</strong> ${escapeHtml((report.gemini_verifier_result || {}).verification_status || "NOT_RUN")}</p>
    ${renderExecutiveActionsEmailHtml(browserReport)}
    ${renderExecutiveActionPlanEmailHtml(browserReport)}
    ${renderMissingEvidenceEmailHtml(browserReport)}
    ${resultLinkHtml}
    <p style="margin:14px 0;color:#66737d">The attached Markdown report includes the complete evidence trail, citations, rationale, honesty check, and audit details.</p>
    <p style="margin:14px 0;color:#66737d;font-size:13px">Decision-support only. Review cited evidence before commercial, legal, or recovery action.</p>
  </div>`;
}

function buildExecutiveEmailText(jobId, report, resultUrl) {
  const browserReport = report.browser_report || {};
  const findings = browserReport.findings || [];
  const leakageTotal = findings
    .filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN")
    .reduce((sum, item) => sum + Number(item.amount_inr || 0), 0);
  const lines = [
    "Constrovet Executive Action Plan",
    "",
    `Job: ${jobId}`,
    `Mode: ${report.mode}`,
    `Generated: ${report.generated_at || ""}`,
    "",
    "Executive Summary",
    browserReport.executive_brief && browserReport.executive_brief.headline ? browserReport.executive_brief.headline : "No executive headline was produced.",
    `Total cited leakage/overrun exposure: INR ${formatInr(leakageTotal)}`,
    `Cited findings: ${findings.length}`,
    `Gemini status: ${(report.gemini_verifier_result || {}).verification_status || "NOT_RUN"}`
  ];
  if (boardroomAnalysisIncomplete(browserReport)) {
    lines.push("", "Analysis incomplete: PDF text extraction was unavailable or no cited evidence was extracted. Enable Drive API OCR or submit CSV evidence.");
  }
  lines.push("", "Top 3 Decisions / Actions");
  const actions = (browserReport.top_5_actions || []).slice(0, 3);
  if (actions.length) actions.forEach((action) => lines.push(`- ${action.title || "Action"}: ${action.action || action.recommendation || ""}`));
  else lines.push("- No cited executive action was produced. Review missing evidence and resubmit clearer project evidence.");
  lines.push("", "7/30/90 Action Plan");
  ["7_days", "30_days", "90_days"].forEach((period) => {
    lines.push(period.replace("_", " "));
    ((browserReport.executive_action_plan || {})[period] || []).forEach((action) => lines.push(`- ${action.title}: ${action.recommendation}`));
  });
  const missing = boardroomMissingEvidenceItems(browserReport).slice(0, 8);
  if (missing.length) {
    lines.push("", "Missing Evidence / Documents Not Processed");
    missing.forEach((item) => lines.push(`- ${item}`));
  }
  if (resultUrl) lines.push("", `Private result link: ${resultUrl}`);
  lines.push("", "Decision-support only. Review cited evidence before commercial, legal, or recovery action.");
  return lines.join("\n");
}

function renderExecutiveActionsEmailHtml(browserReport) {
  const actions = (browserReport.top_5_actions || []).slice(0, 3);
  const items = actions.length
    ? actions.map((action) => `<li><strong>${escapeHtml(action.title || "Action")}:</strong> ${escapeHtml(action.action || action.recommendation || "")}</li>`).join("")
    : "<li>No cited executive action was produced. Review missing evidence and resubmit clearer project evidence.</li>";
  return `<h2 style="font-size:18px;margin:18px 0 8px">Top 3 Decisions / Actions</h2><ol style="margin-top:0;padding-left:22px">${items}</ol>`;
}

function renderExecutiveActionPlanEmailHtml(browserReport) {
  const plan = browserReport.executive_action_plan || {};
  const blocks = ["7_days", "30_days", "90_days"].map((period) => {
    const items = (plan[period] || []).map((action) => `<li><strong>${escapeHtml(action.title || "Action")}:</strong> ${escapeHtml(action.recommendation || "")}</li>`).join("");
    return `<h3 style="font-size:15px;margin:12px 0 4px">${escapeHtml(period.replace("_", " "))}</h3><ul style="margin-top:0;padding-left:20px">${items || "<li>No action produced for this horizon.</li>"}</ul>`;
  }).join("");
  return `<h2 style="font-size:18px;margin:18px 0 8px">7 / 30 / 90 Action Plan</h2>${blocks}`;
}

function renderMissingEvidenceEmailHtml(browserReport) {
  const items = boardroomMissingEvidenceItems(browserReport).slice(0, 8);
  if (!items.length) return "";
  return `<h2 style="font-size:18px;margin:18px 0 8px">Missing Evidence / Documents Not Processed</h2><ul style="margin-top:0;padding-left:20px">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function boardroomMissingEvidenceItems(browserReport) {
  const honesty = browserReport.honesty_check || {};
  return [
    ...(honesty.missing_evidence || []),
    ...(honesty.documents_not_processed || [])
  ].filter(Boolean);
}

function boardroomAnalysisIncomplete(browserReport) {
  const findings = browserReport.findings || [];
  const missing = boardroomMissingEvidenceItems(browserReport).join(" ");
  return !findings.length || /TEXT_EXTRACTION_UNAVAILABLE|Advanced Drive service/i.test(missing);
}

function appendAuditRow(payload, report, savedFiles, folderUrl, emailDelivery) {
  const sheet = getAuditSheet();
  const delivery = emailDelivery || report.email_delivery || {};
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
    delivery.email_to || "",
    delivery.email_cc || "",
    delivery.email_subject || "",
    delivery.email_status || "",
    delivery.email_error || ""
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
    delivery.email_to || "",
    delivery.email_cc || "",
    delivery.email_subject || "",
    delivery.email_status || "",
    delivery.email_error || ""
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
    "email_to",
    "email_cc",
    "email_subject",
    "email_status",
    "email_error"
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
