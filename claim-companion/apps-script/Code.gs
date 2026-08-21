const CC = Object.freeze({
  ROOT_FOLDER_NAME: "Claim Companion - Private",
  AUDIT_FILE_NAME: "Claim Companion - Audit",
  PUBLIC_URL: "https://www.constrovet.com/claim-companion/",
  SUPPORT_EMAIL: "admin@constrovet.com",
  MAX_FILE_BYTES: 8 * 1024 * 1024,
  MAX_TOTAL_BYTES: 20 * 1024 * 1024,
  MAX_REPORTS_PER_EMAIL_PER_DAY: 2,
  MAX_REGISTRATION_EMAILS_PER_DAY: 5,
  PATIENT_TOKEN_SECONDS: 30 * 60,
  HOSPITAL_TOKEN_MILLIS: 48 * 60 * 60 * 1000,
  RETENTION_DAYS: 30,
  AUDIT_MONTHS: 12
});

function doGet(e) {
  const params = (e && e.parameter) || {};
  try {
    if (params.action === "verify-patient") return verifyPatient_(params.token || "");
    if (params.action === "verify-hospital") return verifyHospital_(params.token || "");
    return HtmlService.createHtmlOutput("<p>Claim Companion secure processor is available.</p>");
  } catch (error) {
    return resultPage_("Verification unavailable", safeMessage_(error));
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (payload.website) throw new Error("Request rejected.");
    if (payload.action === "REQUEST_MAGIC_LINK") return requestMagicLink_(payload);
    if (payload.action === "SUBMIT_COST_LOCK") return submitCostLock_(payload);
    throw new Error("Unsupported request.");
  } catch (error) {
    return json_({ ok: false, error: safeMessage_(error) });
  }
}

function requestMagicLink_(payload) {
  const email = validEmail_(payload.email);
  const name = cleanText_(payload.name, 100);
  if (!name) throw new Error("Name is required.");
  enforceDailyLimit_("registration", email, CC.MAX_REGISTRATION_EMAILS_PER_DAY);
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error("Email capacity is temporarily unavailable.");

  const token = randomToken_();
  const key = "patient:" + sha256_(token);
  CacheService.getScriptCache().put(key, JSON.stringify({ email: email, name: name, verified: false, createdAt: Date.now() }), CC.PATIENT_TOKEN_SECONDS);
  const endpoint = ScriptApp.getService().getUrl();
  if (!endpoint) throw new Error("The Apps Script web app is not deployed.");
  const link = endpoint + "?action=verify-patient&token=" + encodeURIComponent(token);
  MailApp.sendEmail({
    to: email,
    subject: "Your Claim Companion secure sign-in link",
    body: "Open this secure link to continue your Cost-Lock estimate:\n\n" + link + "\n\nThis link expires in 30 minutes. If you did not request it, ignore this email.",
    htmlBody: emailShell_("Continue your Cost-Lock estimate", "Use the secure button below. This link expires in 30 minutes.", link, "Continue securely"),
    name: "Claim Companion",
    replyTo: CC.SUPPORT_EMAIL
  });
  return json_({ ok: true });
}

function verifyPatient_(token) {
  const key = "patient:" + sha256_(token);
  const cache = CacheService.getScriptCache();
  const raw = cache.get(key);
  if (!raw) return resultPage_("Link expired", "Request a new secure link from Claim Companion.");
  const record = JSON.parse(raw);
  record.verified = true;
  record.verifiedAt = Date.now();
  cache.put(key, JSON.stringify(record), CC.PATIENT_TOKEN_SECONDS);
  const redirect = CC.PUBLIC_URL + "?verified=1&token=" + encodeURIComponent(token) + "&email=" + encodeURIComponent(record.email);
  return redirectPage_(redirect);
}

function submitCostLock_(payload) {
  const identity = requirePatient_(payload.authToken, payload.email);
  const email = identity.email;
  enforceDailyLimit_("report", email, CC.MAX_REPORTS_PER_EMAIL_PER_DAY);
  const reference = validReference_(payload.reference);
  const hospitalEmail = validEmail_(payload.hospitalEmail);
  const details = validateDetails_(payload.details || {});
  const documents = validateDocuments_(payload.documents || []);
  const calculation = calculate_(details);
  const consent = payload.consent || {};
  if (!consent.accuracy || !consent.hospitalDelivery || !consent.submittedAt) throw new Error("Required consent is missing.");
  if (MailApp.getRemainingDailyQuota() < 2) throw new Error("Email capacity is temporarily unavailable.");

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const root = getRootFolder_();
    const caseFolder = root.createFolder(reference);
    const inputFolder = caseFolder.createFolder("inputs");
    const reportFolder = caseFolder.createFolder("report");
    const savedDocuments = documents.map(function (item) {
      const bytes = Utilities.base64Decode(item.base64);
      const file = inputFolder.createFile(Utilities.newBlob(bytes, item.mimeType, safeFileName_(item.name)));
      return { role: item.role, fileId: file.getId(), name: file.getName() };
    });
    const reportBlob = buildPdf_(reference, identity.name, email, hospitalEmail, details, calculation, savedDocuments);
    const reportFile = reportFolder.createFile(reportBlob.setName("Cost-Lock-" + reference + ".pdf"));
    const deleteAfter = new Date(Date.now() + CC.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    appendAudit_({ reference: reference, patientEmail: email, hospitalEmail: hospitalEmail, createdAt: new Date(), status: "PATIENT_SENT_HOSPITAL_PENDING", folderId: caseFolder.getId(), reportFileId: reportFile.getId(), deleteAfter: deleteAfter, deletedAt: "" });

    sendPatientReport_(email, reference, reportFile.getBlob(), calculation);
    sendHospitalVerification_(hospitalEmail, reference, reportFile.getId());
    return json_({ ok: true, reference: reference });
  } finally {
    lock.releaseLock();
  }
}

function requirePatient_(token, claimedEmail) {
  if (!token) throw new Error("Secure sign-in is required.");
  const raw = CacheService.getScriptCache().get("patient:" + sha256_(token));
  if (!raw) throw new Error("Secure sign-in expired. Request a new link.");
  const record = JSON.parse(raw);
  const email = validEmail_(claimedEmail);
  if (!record.verified || record.email !== email) throw new Error("Email verification failed.");
  return record;
}

function sendHospitalVerification_(hospitalEmail, reference, reportFileId) {
  const token = randomToken_();
  const key = "CC_HOSP_" + sha256_(token);
  PropertiesService.getScriptProperties().setProperty(key, JSON.stringify({ hospitalEmail: hospitalEmail, reference: reference, reportFileId: reportFileId, expiresAt: Date.now() + CC.HOSPITAL_TOKEN_MILLIS }));
  const link = ScriptApp.getService().getUrl() + "?action=verify-hospital&token=" + encodeURIComponent(token);
  MailApp.sendEmail({
    to: hospitalEmail,
    subject: "Verify hospital delivery for Cost-Lock " + reference,
    body: "A patient authorized delivery of an independent Cost-Lock estimate to this address. Verify this hospital administration address to receive the PDF:\n\n" + link + "\n\nNo report is attached to this verification email.",
    htmlBody: emailShell_("Verify hospital report delivery", "A patient authorized delivery of an independent Cost-Lock estimate to this address. No report is attached until verification.", link, "Verify and receive report"),
    name: "Claim Companion",
    replyTo: CC.SUPPORT_EMAIL
  });
}

function verifyHospital_(token) {
  const properties = PropertiesService.getScriptProperties();
  const key = "CC_HOSP_" + sha256_(token);
  const raw = properties.getProperty(key);
  if (!raw) return resultPage_("Link unavailable", "This verification link is invalid or has already been used.");
  const record = JSON.parse(raw);
  if (Date.now() > Number(record.expiresAt)) {
    properties.deleteProperty(key);
    return resultPage_("Link expired", "Ask the patient to submit a new hospital delivery request.");
  }
  const report = DriveApp.getFileById(record.reportFileId).getBlob();
  MailApp.sendEmail({
    to: record.hospitalEmail,
    subject: "Cost-Lock estimate " + record.reference,
    body: "Attached is the patient-authorized independent Cost-Lock estimate. It is not an insurer or TPA authorization, sanction or guarantee.",
    htmlBody: "<p>Attached is the patient-authorized independent Cost-Lock estimate.</p><p><strong>It is not an insurer or TPA authorization, sanction or guarantee.</strong></p>",
    attachments: [report],
    name: "Claim Companion",
    replyTo: CC.SUPPORT_EMAIL
  });
  updateAuditStatus_(record.reference, "PATIENT_AND_HOSPITAL_SENT");
  properties.deleteProperty(key);
  return resultPage_("Report delivered", "The Cost-Lock PDF has been emailed to this verified hospital address.");
}

function calculate_(details) {
  const total = positive_(details.estimatedBill);
  const sumInsured = positive_(details.sumInsured);
  const nonPayables = Math.min(total, positive_(details.nonPayables));
  const deductible = positive_(details.deductible);
  const copay = Math.min(100, positive_(details.copayPercent));
  const days = positive_(details.stayDays);
  const roomLimit = positive_(details.roomLimit);
  const actualRoom = positive_(details.actualRoomRate);
  const proportionateCharges = Math.min(total, positive_(details.proportionateCharges));
  const ratio = roomLimit && actualRoom > roomLimit ? Math.max(0, Math.min(1, roomLimit / actualRoom)) : 1;
  const selectedRoomCost = Math.min(total, actualRoom * days);
  const allowedRoomCost = roomLimit && actualRoom ? Math.min(selectedRoomCost, roomLimit * days) : selectedRoomCost;
  const roomDeduction = Math.max(0, selectedRoomCost - allowedRoomCost);
  const proportionalDeduction = Math.max(0, proportionateCharges * (1 - ratio));
  const beforeDeductible = Math.max(0, total - nonPayables - roomDeduction - proportionalDeduction);
  const deductibleApplied = Math.min(beforeDeductible, deductible);
  const afterDeductible = Math.max(0, beforeDeductible - deductibleApplied);
  const copayApplied = afterDeductible * copay / 100;
  const admissible = Math.max(0, afterDeductible - copayApplied);
  const insurer = Math.min(sumInsured || admissible, admissible);
  return { totalBill: total, nonPayables: nonPayables, roomRatio: ratio, directRoomDeduction: roomDeduction, proportionalDeduction: proportionalDeduction, deductibleApplied: deductibleApplied, copayApplied: copayApplied, policyAdmissible: admissible, estimatedInsurerContribution: insurer, estimatedPatientShare: Math.max(0, total - insurer) };
}

function buildPdf_(reference, name, patientEmail, hospitalEmail, details, calculation, documents) {
  const doc = DocumentApp.create("Temporary " + reference);
  const body = doc.getBody();
  body.clear();
  body.appendParagraph("CLAIM COMPANION - COST-LOCK ESTIMATE").setHeading(DocumentApp.ParagraphHeading.TITLE).setForegroundColor("#173d82");
  body.appendParagraph("Independent pre-treatment estimate | " + reference).setForegroundColor("#475569");
  body.appendParagraph("Issued: " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMM yyyy, hh:mm a"));
  body.appendHorizontalRule();
  body.appendParagraph("ESTIMATE SUMMARY").setHeading(DocumentApp.ParagraphHeading.HEADING1).setForegroundColor("#173d82");
  appendKeyValues_(body, [["Patient / representative", name], ["Patient email", patientEmail], ["Proposed hospital", details.hospitalName], ["Planned procedure", details.procedureName], ["Preferred room", details.roomCategory], ["Expected treatment date", details.treatmentDate || "Not specified"]]);
  body.appendParagraph("COST BREAKDOWN").setHeading(DocumentApp.ParagraphHeading.HEADING1).setForegroundColor("#173d82");
  const table = body.appendTable([
    ["Calculation item", "Estimated amount"],
    ["Hospital estimate", inr_(calculation.totalBill)],
    ["Known non-payables", inr_(calculation.nonPayables)],
    ["Room-limit deduction", inr_(calculation.directRoomDeduction)],
    ["Proportionate deduction", inr_(calculation.proportionalDeduction)],
    ["Deductible", inr_(calculation.deductibleApplied)],
    ["Co-pay", inr_(calculation.copayApplied)],
    ["Estimated insurer contribution", inr_(calculation.estimatedInsurerContribution)],
    ["Estimated patient share", inr_(calculation.estimatedPatientShare)]
  ]);
  table.getRow(0).getCell(0).editAsText().setBold(true).setForegroundColor("#173d82");
  table.getRow(0).getCell(1).editAsText().setBold(true).setForegroundColor("#173d82");
  body.appendParagraph("USER-CONFIRMED POLICY AND BILL VALUES").setHeading(DocumentApp.ParagraphHeading.HEADING1).setForegroundColor("#173d82");
  appendKeyValues_(body, [["Available sum insured", inr_(details.sumInsured)], ["Room-rent limit", details.roomLimit ? inr_(details.roomLimit) + "/day" : "Not supplied"], ["Selected room rate", details.actualRoomRate ? inr_(details.actualRoomRate) + "/day" : "Not supplied"], ["Expected stay", details.stayDays + " day(s)"], ["Co-pay", details.copayPercent + "%"], ["Waiting/exclusion note", details.waitingNote || "Not supplied"], ["Care requirements", details.patientPreferences]]);
  body.appendParagraph("SOURCE DOCUMENTS").setHeading(DocumentApp.ParagraphHeading.HEADING1).setForegroundColor("#173d82");
  documents.forEach(function (item) { body.appendListItem(item.role + ": " + item.name); });
  body.appendParagraph("QUESTIONS TO CONFIRM").setHeading(DocumentApp.ParagraphHeading.HEADING1).setForegroundColor("#173d82");
  ["Ask the insurer or TPA to confirm eligibility, waiting periods, exclusions and available sum insured.", "Ask the hospital to confirm package tariff, selected room rate, consumables and items outside the package.", "Request formal cashless pre-authorization directly from the insurer or TPA."].forEach(function (item) { body.appendListItem(item); });
  body.appendParagraph("IMPORTANT NOTICE").setHeading(DocumentApp.ParagraphHeading.HEADING1).setForegroundColor("#173d82");
  body.appendParagraph("This automated document is an independent, non-binding estimate based on uploaded documents and user-confirmed values. It is not a cashless pre-authorization, insurer sanction, TPA decision, hospital quotation, policy endorsement, medical advice or financial guarantee. Final coverage and amounts may differ.").setForegroundColor("#475569");
  body.appendParagraph("Hospital delivery authorized for: " + hospitalEmail).setForegroundColor("#475569");
  doc.saveAndClose();
  const source = DriveApp.getFileById(doc.getId());
  const pdf = source.getAs(MimeType.PDF);
  source.setTrashed(true);
  return pdf;
}

function appendKeyValues_(body, rows) {
  const table = body.appendTable(rows.map(function (row) { return [String(row[0]), String(row[1])]; }));
  for (let i = 0; i < table.getNumRows(); i += 1) table.getRow(i).getCell(0).editAsText().setBold(true).setForegroundColor("#173d82");
}

function sendPatientReport_(email, reference, attachment, calculation) {
  MailApp.sendEmail({
    to: email,
    subject: "Your Cost-Lock estimate " + reference,
    body: "Your independent Cost-Lock estimate is attached. Estimated insurer contribution: " + inr_(calculation.estimatedInsurerContribution) + ". Estimated patient share: " + inr_(calculation.estimatedPatientShare) + ". This is not an approval or guarantee.",
    htmlBody: "<p>Your independent Cost-Lock estimate is attached.</p><p><strong>Estimated insurer contribution:</strong> " + inr_(calculation.estimatedInsurerContribution) + "<br><strong>Estimated patient share:</strong> " + inr_(calculation.estimatedPatientShare) + "</p><p>This is not an approval or guarantee.</p>",
    attachments: [attachment],
    name: "Claim Companion",
    replyTo: CC.SUPPORT_EMAIL
  });
}

function setupClaimCompanion() {
  const properties = PropertiesService.getScriptProperties();
  const root = DriveApp.createFolder(CC.ROOT_FOLDER_NAME);
  const sheet = SpreadsheetApp.create(CC.AUDIT_FILE_NAME);
  sheet.getSheets()[0].appendRow(["Reference", "PatientEmail", "HospitalEmail", "CreatedAt", "Status", "FolderId", "ReportFileId", "DeleteAfter", "DeletedAt"]);
  properties.setProperties({ CC_ROOT_FOLDER_ID: root.getId(), CC_AUDIT_SHEET_ID: sheet.getId() });
  ScriptApp.newTrigger("cleanupExpiredCases").timeBased().everyDays(1).atHour(2).create();
  return { rootFolderId: root.getId(), auditSheetId: sheet.getId() };
}

function cleanupExpiredCases() {
  const sheet = auditSheet_();
  const values = sheet.getDataRange().getValues();
  const now = Date.now();
  for (let row = 1; row < values.length; row += 1) {
    const deleteAfter = values[row][7] instanceof Date ? values[row][7].getTime() : new Date(values[row][7]).getTime();
    if (values[row][8] || !deleteAfter || deleteAfter > now) continue;
    try { DriveApp.getFolderById(String(values[row][5])).setTrashed(true); } catch (_error) { /* already deleted */ }
    sheet.getRange(row + 1, 9).setValue(new Date());
    sheet.getRange(row + 1, 5).setValue("FILES_DELETED");
  }
  removeExpiredHospitalTokens_();
  removeOldRateLimits_();
  purgeOldAuditRows_(sheet);
}

function getRootFolder_() {
  const id = PropertiesService.getScriptProperties().getProperty("CC_ROOT_FOLDER_ID");
  if (!id) throw new Error("Run setupClaimCompanion before accepting reports.");
  return DriveApp.getFolderById(id);
}

function auditSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("CC_AUDIT_SHEET_ID");
  if (!id) throw new Error("Audit sheet is not configured.");
  return SpreadsheetApp.openById(id).getSheets()[0];
}

function appendAudit_(record) {
  auditSheet_().appendRow([record.reference, record.patientEmail, record.hospitalEmail, record.createdAt, record.status, record.folderId, record.reportFileId, record.deleteAfter, record.deletedAt]);
}

function updateAuditStatus_(reference, status) {
  const sheet = auditSheet_();
  const values = sheet.getDataRange().getValues();
  for (let row = values.length - 1; row >= 1; row -= 1) if (values[row][0] === reference) { sheet.getRange(row + 1, 5).setValue(status); return; }
}

function removeExpiredHospitalTokens_() {
  const properties = PropertiesService.getScriptProperties();
  properties.getKeys().filter(function (key) { return key.indexOf("CC_HOSP_") === 0; }).forEach(function (key) {
    try { const record = JSON.parse(properties.getProperty(key)); if (Date.now() > Number(record.expiresAt)) properties.deleteProperty(key); } catch (_error) { properties.deleteProperty(key); }
  });
}

function removeOldRateLimits_() {
  const properties = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyyMMdd");
  properties.getKeys().filter(function (key) { return key.indexOf("CC_LIMIT_") === 0 && key.indexOf("_" + today + "_") < 0; }).forEach(function (key) { properties.deleteProperty(key); });
}

function purgeOldAuditRows_(sheet) {
  const cutoff = Date.now() - CC.AUDIT_MONTHS * 31 * 24 * 60 * 60 * 1000;
  const values = sheet.getDataRange().getValues();
  for (let row = values.length - 1; row >= 1; row -= 1) {
    const created = values[row][3] instanceof Date ? values[row][3].getTime() : new Date(values[row][3]).getTime();
    if (created && created < cutoff) sheet.deleteRow(row + 1);
  }
}

function validateDetails_(input) {
  const details = {
    procedureName: cleanText_(input.procedureName, 160), hospitalName: cleanText_(input.hospitalName, 160), treatmentDate: cleanText_(input.treatmentDate, 20), roomCategory: cleanText_(input.roomCategory, 80), patientPreferences: cleanText_(input.patientPreferences, 1200), waitingNote: cleanText_(input.waitingNote, 300),
    sumInsured: positive_(input.sumInsured), roomLimit: positive_(input.roomLimit), copayPercent: Math.min(100, positive_(input.copayPercent)), deductible: positive_(input.deductible), estimatedBill: positive_(input.estimatedBill), stayDays: positive_(input.stayDays), actualRoomRate: positive_(input.actualRoomRate), nonPayables: positive_(input.nonPayables), proportionateCharges: positive_(input.proportionateCharges)
  };
  if (!details.procedureName || !details.hospitalName || !details.roomCategory || !details.patientPreferences || !details.sumInsured || !details.estimatedBill) throw new Error("Required report details are missing.");
  if (details.nonPayables > details.estimatedBill || details.proportionateCharges > details.estimatedBill) throw new Error("A deduction exceeds the hospital estimate.");
  return details;
}

function validateDocuments_(documents) {
  if (!Array.isArray(documents) || documents.length !== 3) throw new Error("Exactly three documents are required.");
  const required = ["policy", "prescription", "estimate"];
  let total = 0;
  const cleaned = documents.map(function (item) {
    const role = cleanText_(item.role, 30);
    const size = Number(item.size) || 0;
    const mimeType = cleanText_(item.mimeType, 80);
    if (required.indexOf(role) < 0 || !item.base64 || size <= 0 || size > CC.MAX_FILE_BYTES) throw new Error("A document is invalid or too large.");
    if (["application/pdf", "image/jpeg", "image/png", "image/webp"].indexOf(mimeType) < 0) throw new Error("Unsupported document type.");
    if (role === "policy" && mimeType !== "application/pdf") throw new Error("Policy must be a PDF.");
    total += size;
    return { role: role, name: cleanText_(item.name, 180), mimeType: mimeType, size: size, base64: String(item.base64) };
  });
  if (new Set(cleaned.map(function (item) { return item.role; })).size !== 3 || total > CC.MAX_TOTAL_BYTES) throw new Error("Document set is incomplete or too large.");
  return cleaned;
}

function enforceDailyLimit_(type, email, limit) {
  const day = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyyMMdd");
  const key = "CC_LIMIT_" + type + "_" + day + "_" + sha256_(email).slice(0, 18);
  const properties = PropertiesService.getScriptProperties();
  const count = Number(properties.getProperty(key) || 0);
  if (count >= limit) throw new Error("Daily limit reached for this email address.");
  properties.setProperty(key, String(count + 1));
}

function validEmail_(value) { const email = String(value || "").trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("A valid email is required."); return email; }
function validReference_(value) { const reference = String(value || "").trim(); if (!/^CC-\d{8}-[A-Z0-9]{4,8}$/.test(reference)) throw new Error("Invalid report reference."); return reference; }
function cleanText_(value, max) { return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
function positive_(value) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : 0; }
function safeFileName_(value) { return cleanText_(value, 180).replace(/[\\/:*?"<>|]/g, "-") || "document"; }
function randomToken_() { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now() + Math.random())).replace(/=+$/, ""); }
function sha256_(value) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value)).map(function (byte) { const n = byte < 0 ? byte + 256 : byte; return ("0" + n.toString(16)).slice(-2); }).join(""); }
function inr_(value) { return "₹" + Math.round(Number(value) || 0).toLocaleString("en-IN"); }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function safeMessage_(error) { return cleanText_(error && error.message ? error.message : String(error), 240) || "Request failed."; }
function emailShell_(title, copy, link, label) { return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#071b4a"><h1 style="font-size:24px">' + title + '</h1><p>' + copy + '</p><p><a style="display:inline-block;padding:13px 20px;background:#087f84;color:#fff;text-decoration:none;border-radius:6px" href="' + link + '">' + label + '</a></p><p style="color:#64748b;font-size:13px">Claim Companion by AInnoverse Tech Centre LLP</p></div>'; }
function redirectPage_(url) { const escaped = String(url).replace(/&/g, "&amp;").replace(/"/g, "&quot;"); return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=' + escaped + '"><p><a href="' + escaped + '">Continue to Claim Companion</a></p>'); }
function resultPage_(title, message) { return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><div style="font-family:Arial,sans-serif;max-width:620px;margin:60px auto;padding:24px;color:#071b4a"><h1>' + cleanText_(title, 100) + '</h1><p>' + cleanText_(message, 400) + '</p><p><a href="' + CC.PUBLIC_URL + '">Return to Claim Companion</a></p></div>'); }
