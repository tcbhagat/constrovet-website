import { calculateCostLock, formatInr, validateCostLock } from "./calculator.js";
import { documentSpecs, extractDocument, fileToData, inferEstimateFields, inferPolicyFields, inferPrescriptionFields, validateDocument } from "./extractor.js";
import { requestMagicLink, submitCostLock } from "./api.js";

const config = window.CLAIM_COMPANION_CONFIG;
const state = {
  step: 1,
  name: "",
  email: "",
  authToken: "",
  files: {},
  extracted: {},
  details: {},
  calculation: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const setStatus = (element, message, type = "") => { element.textContent = message; element.dataset.state = type; };
const formObject = (form) => Object.fromEntries(new FormData(form).entries());

function showStep(step) {
  state.step = step;
  $$(".step-panel").forEach((panel) => {
    const active = Number(panel.dataset.step) === step;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  $$("[data-step-marker]").forEach((marker) => {
    const number = Number(marker.dataset.stepMarker);
    marker.classList.toggle("is-current", number === step);
    marker.classList.toggle("is-complete", number < step);
    if (number === step) marker.setAttribute("aria-current", "step"); else marker.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  const heading = $(`[data-step="${step}"] h1`);
  if (heading) heading.focus({ preventScroll: true });
}

function initializeVerification() {
  const query = new URLSearchParams(location.search);
  const verified = query.get("verified") === "1";
  const token = query.get("token") || "";
  const email = query.get("email") || "";
  if (!verified || !token || !email) return;
  const pending = JSON.parse(localStorage.getItem("cc_pending_registration") || "{}");
  state.name = pending.name || "Patient";
  state.email = email;
  state.authToken = token;
  $("#patient-name").value = state.name;
  $("#patient-email").value = state.email;
  history.replaceState({}, "", location.pathname);
  showStep(2);
}

function renderUploads() {
  const list = $("#upload-list");
  const template = $("#upload-template");
  documentSpecs.forEach((spec) => {
    const fragment = template.content.cloneNode(true);
    const row = $(".upload-row", fragment);
    row.dataset.document = spec.key;
    $(".upload-label strong", row).textContent = spec.label;
    $(".upload-label span", row).textContent = spec.required ? "(required)" : "(optional)";
    const input = $("input[type=file]", row);
    input.name = spec.key;
    input.accept = spec.accept;
    input.required = spec.required;
    input.addEventListener("change", () => handleFileSelection(spec, row, input.files[0]));
    $(".file-result button", row).addEventListener("click", () => clearFile(spec, row, input));
    list.appendChild(fragment);
  });
}

function handleFileSelection(spec, row, file) {
  const error = validateDocument(file, spec, config);
  const status = $("#documents-status");
  if (error) {
    clearFile(spec, row, $("input[type=file]", row));
    setStatus(status, `${spec.label}: ${error}`, "error");
    return;
  }
  state.files[spec.key] = file;
  const result = $(".file-result", row);
  $(".drop-zone", row).hidden = true;
  result.hidden = false;
  $(".file-icon", result).textContent = file.type === "application/pdf" ? "PDF" : "IMG";
  $("span:nth-child(2) strong", result).textContent = file.name;
  $("span:nth-child(2) small", result).textContent = `${Math.max(1, Math.round(file.size / 1024))} KB • Ready to read`;
  setStatus(status, "", "");
}

function clearFile(spec, row, input) {
  delete state.files[spec.key];
  delete state.extracted[spec.key];
  input.value = "";
  $(".drop-zone", row).hidden = false;
  $(".file-result", row).hidden = true;
}

function updateFileProgress(key, percent, message) {
  const result = $(`[data-document="${key}"] .file-result`);
  if (!result) return;
  $("span:nth-child(2) small", result).textContent = `${message} • ${percent}%`;
}

function prefillDetails() {
  const policy = inferPolicyFields(state.extracted.policy || "");
  const estimate = inferEstimateFields(state.extracted.estimate || "");
  const prescription = inferPrescriptionFields(state.extracted.prescription || "");
  const values = {};
  for (const source of [policy, estimate, prescription]) {
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined && value !== null && value !== "" && value !== 0) values[key] = value;
    }
  }
  const mapping = {
    procedureName: "#procedure-name", hospitalName: "#hospital-name", hospitalEmail: "#hospital-email", roomCategory: "#room-category",
    sumInsured: "#sum-insured", roomLimit: "#room-limit", copayPercent: "#copay-percent", deductible: "#deductible",
    waitingNote: "#waiting-note", policyPeriod: "#policy-period", proportionateScalingApplies: "#proportionate-scaling",
    estimatedBill: "#estimated-bill", stayDays: "#stay-days", actualRoomRate: "#actual-room-rate", nonPayables: "#non-payables"
  };
  let autoFilled = 0;
  Object.entries(mapping).forEach(([key, selector]) => {
    const field = $(selector);
    const value = values[key];
    if (!field || value === undefined || value === null || value === "" || value === 0) return;
    field.value = typeof value === "boolean" ? String(value) : value;
    field.closest(".field")?.classList.add("is-extracted");
    autoFilled += 1;
  });
  const requiredDocumentFields = ["#procedure-name", "#hospital-name", "#sum-insured", "#estimated-bill"];
  const missing = requiredDocumentFields.map((selector) => $(selector)).filter((field) => !field.value || (field.type === "number" && Number(field.value) <= 0));
  missing.forEach((field) => field.closest(".field")?.classList.add("needs-input"));
  const details = $("#document-values");
  details.open = missing.length > 0;
  $("#document-values-summary").textContent = missing.length ? `${autoFilled} found · ${missing.length} to add` : `${autoFilled} found`;
  $("#auto-fill-summary").textContent = missing.length
    ? `We filled ${autoFilled} values. Add ${missing.length} missing ${missing.length === 1 ? "detail" : "details"} below.`
    : `We filled ${autoFilled} values. Add only your preferences below.`;
}

function compilePreferences(data) {
  const preferences = [`Room: ${data.roomCategory}`, `Nursing: ${data.nursingCare}`];
  for (const key of ["attendantStay", "dietarySupport", "accessibilitySupport"]) {
    if (data[key]) preferences.push(data[key]);
  }
  if (data.additionalRequests?.trim()) preferences.push(data.additionalRequests.trim());
  return preferences.join("; ");
}

function renderReview() {
  const details = state.details;
  const calculation = calculateCostLock(details);
  state.calculation = calculation;
  const date = details.treatmentDate ? new Date(`${details.treatmentDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not specified";
  const range = (low, high) => Math.round(low) === Math.round(high) ? formatInr(low) : `${formatInr(low)} – ${formatInr(high)}`;
  const availableBalance = calculation.availableBalanceKnown ? formatInr(calculation.availableBalance) : "Not present in uploaded documents";
  const blocks = [
    ["Treatment", [`<strong>${escapeHtml(details.procedureName)}</strong>`, `Hospital: ${escapeHtml(details.hospitalName)}`, `Preferred room: ${escapeHtml(details.roomCategory)}`], 3],
    ["Policy limits", [`Base sum insured: ${formatInr(details.sumInsured)}`, `Current available balance: ${escapeHtml(availableBalance)}`, `Room limit: ${details.roomLimit ? `${formatInr(details.roomLimit)}/day` : "Not found"}`, `Co-pay: ${details.copayPercent === "" ? "Not found" : `${escapeHtml(details.copayPercent)}%`}`], 3],
    ["Hospital estimate", [`Estimated hospital bill: <strong>${formatInr(details.estimatedBill)}</strong>`, `Estimated insurer contribution: <strong>${range(calculation.insurerContributionLow, calculation.insurerContributionHigh)}</strong>`, `Estimated patient share: <strong>${range(calculation.patientShareLow, calculation.patientShareHigh)}</strong>`, calculation.hasEstimateRange ? "A range is shown because the documents do not identify every charge affected by room-linked proportional scaling." : "Calculated from the documented and confirmed values."], 3],
    ["Your preferences", [`Treatment date: ${escapeHtml(date)}`, escapeHtml(details.patientPreferences)], 3]
  ];
  $("#review-summary").innerHTML = blocks.map(([title, lines, target]) => `<section class="review-block"><h2>${title}</h2>${lines.map((line) => `<p>${line}</p>`).join("")}<button type="button" data-edit="${target}" aria-label="Edit ${title}">Edit</button></section>`).join("");
  $$('[data-edit]').forEach((button) => button.addEventListener("click", () => showStep(Number(button.dataset.edit))));
}

$("#email-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const submit = $("button[type=submit]", form);
  const status = $("#email-status");
  const data = formObject(form);
  submit.disabled = true;
  setStatus(status, config.demoMode ? "Opening the secure preview…" : "Sending your secure sign-in link…");
  try {
    const result = await requestMagicLink({ name: data.patientName.trim(), email: data.email.trim().toLowerCase() });
    state.name = data.patientName.trim();
    state.email = data.email.trim().toLowerCase();
    localStorage.setItem("cc_pending_registration", JSON.stringify({ name: state.name, email: state.email }));
    if (result.demo) {
      state.authToken = "DEMO_VERIFIED_TOKEN";
      showStep(2);
    } else {
      setStatus(status, "Check your email and open the secure link to continue.", "success");
    }
  } catch (error) {
    setStatus(status, error.message || "Could not send the secure link.", "error");
  } finally {
    submit.disabled = false;
  }
});

$("#documents-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = $("#documents-status");
  const missing = documentSpecs.filter((spec) => spec.required && !state.files[spec.key]);
  if (missing.length) return setStatus(status, `Add ${missing.map((item) => item.label.toLowerCase()).join(", ")}.`, "error");
  const totalBytes = Object.values(state.files).reduce((total, file) => total + file.size, 0);
  if (totalBytes > config.maxTotalBytes) return setStatus(status, `Combined files must be smaller than ${Math.round(config.maxTotalBytes / 1024 / 1024)} MB.`, "error");
  const submit = $("button[type=submit]", event.currentTarget);
  submit.disabled = true;
  try {
    for (const spec of documentSpecs.filter((item) => state.files[item.key])) {
      setStatus(status, `Reading ${spec.label.toLowerCase()} on this device…`);
      state.extracted[spec.key] = await extractDocument(state.files[spec.key], (percent, message) => updateFileProgress(spec.key, percent, message));
    }
    prefillDetails();
    showStep(3);
  } catch (error) {
    setStatus(status, error.message || "A document could not be read. Try a clearer file.", "error");
  } finally {
    submit.disabled = false;
  }
});

$("#details-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  state.details = formObject(event.currentTarget);
  state.details.proportionateScalingApplies = state.details.proportionateScalingApplies === "true";
  state.details.patientPreferences = compilePreferences(state.details);
  const errors = validateCostLock(state.details);
  if (errors.length) {
    alert(errors.join("\n"));
    return;
  }
  renderReview();
  showStep(4);
});

$("#review-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const submit = $("button[type=submit]", form);
  const status = $("#review-status");
  submit.disabled = true;
  setStatus(status, "Securing your documents and preparing the report…");
  try {
    const documents = [];
    for (const spec of documentSpecs.filter((item) => state.files[item.key])) documents.push({ role: spec.key, ...(await fileToData(state.files[spec.key])) });
    const reference = `CC-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(0, 6)}`;
    const result = await submitCostLock({
      reference,
      name: state.name,
      email: state.email,
      authToken: state.authToken,
      hospitalEmail: $("#hospital-email").value.trim().toLowerCase(),
      details: state.details,
      calculation: state.calculation,
      documents,
      extractedEvidence: Object.fromEntries(Object.entries(state.extracted).map(([key, text]) => [key, text.slice(0, 12000)])),
      consent: { accuracy: true, hospitalDelivery: true, submittedAt: new Date().toISOString() }
    });
    $("#report-reference").textContent = `Reference: ${result.reference || reference}`;
    showStep(5);
  } catch (error) {
    setStatus(status, error.message || "The request could not be submitted. Try again.", "error");
  } finally {
    submit.disabled = false;
  }
});

$$('[data-back]').forEach((button) => button.addEventListener("click", () => showStep(Number(button.dataset.back))));

let installPrompt;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  $("#install-button").hidden = false;
});
$("#install-button").addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  $("#install-button").hidden = true;
});

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("service-worker.js");
renderUploads();
initializeVerification();
