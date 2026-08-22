import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateCostLock, formatInr, validateCostLock } from "../claim-companion/calculator.js";
import { inferEstimateFields, inferPolicyFields, inferPrescriptionFields } from "../claim-companion/extractor.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("claim-companion/index.html");
const app = read("claim-companion/app.js");
const extractor = read("claim-companion/extractor.js");
const backend = read("claim-companion/apps-script/Code.gs");
const manifest = JSON.parse(read("claim-companion/manifest.webmanifest"));

test("public route exposes all three required documents and five steps", () => {
  assert.match(extractor, /Health insurance policy/);
  assert.match(extractor, /Hospital prescription or treatment advice/);
  assert.match(extractor, /Hospital estimate or package quotation/);
  for (const step of ["Email", "Documents", "Details", "Review", "Done"]) assert.match(page, new RegExp(`>${step}<`));
});

test("registration, consent and hospital verification are mandatory", () => {
  for (const id of ["registration-consent", "accuracy-consent", "hospital-consent", "hospital-email"]) assert.match(page, new RegExp(`id="${id}"[^>]*required|required[^>]*id="${id}"`));
  assert.match(app, /REQUEST_MAGIC_LINK|requestMagicLink/);
  assert.match(backend, /verify-hospital/);
  assert.match(backend, /No report is attached until verification/);
});

test("PWA is installable and scoped to Claim Companion", () => {
  assert.equal(manifest.start_url, "/claim-companion/");
  assert.equal(manifest.scope, "/claim-companion/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons.length, 2);
  assert.match(page, /manifest\.webmanifest/);
  assert.match(app, /serviceWorker\.register/);
});

test("reference example calculates insurer and patient shares consistently", () => {
  const result = calculateCostLock({
    estimatedBill: 124567,
    sumInsured: 500000,
    nonPayables: 9965,
    deductible: 0,
    copayPercent: 45,
    stayDays: 2,
    roomLimit: 3500,
    actualRoomRate: 5000,
    proportionateCharges: 104602
  });
  assert.equal(Math.round(result.estimatedInsurerContribution + result.estimatedPatientShare), 124567);
  assert.equal(result.hasRoomLimitImpact, true);
  assert.match(formatInr(result.estimatedPatientShare), /₹/);
});

test("validation blocks impossible and incomplete estimates", () => {
  const errors = validateCostLock({ procedureName: "", hospitalName: "", estimatedBill: 100, sumInsured: 0, nonPayables: 200 });
  assert.ok(errors.length >= 4);
});

test("local extractors find common Indian policy and quotation fields", () => {
  const policy = inferPolicyFields("Sum Insured INR 5,00,000. Room rent limit INR 3,500 per day. Co-pay 20%. Deductible Rs 10,000.");
  assert.deepEqual({ sumInsured: policy.sumInsured, roomLimit: policy.roomLimit, copayPercent: policy.copayPercent, deductible: policy.deductible }, { sumInsured: 500000, roomLimit: 3500, copayPercent: 20, deductible: 10000 });
  const estimate = inferEstimateFields("Private room INR 5,000 per day. Grand Total ₹1,24,567. Non-payables ₹9,965.");
  assert.equal(estimate.estimatedBill, 124567);
  assert.equal(estimate.actualRoomRate, 5000);
  assert.equal(estimate.nonPayables, 9965);
  const fullEstimate = inferEstimateFields("Medicines and consumables INR 6,000. Grand Total INR 1,24,567. Estimated non-payables INR 9,965 included in total.");
  assert.equal(fullEstimate.nonPayables, 9965);
  const prescription = inferPrescriptionFields("Provisional diagnosis\nSymptomatic gallstone disease\nRecommended procedure\nLaparoscopic cholecystectomy");
  assert.match(prescription.procedureName, /Laparoscopic cholecystectomy/i);
  const hospital = inferPrescriptionFields("Hospital Treatment Advice\nGreen Valley Multispeciality Hospital\nExpected stay 2 days\nRoom requested Single private room\nRecommended procedure\nLaparoscopic cholecystectomy");
  assert.equal(hospital.hospitalName, "Green Valley Multispeciality Hospital");
  assert.equal(hospital.stayDays, 2);
  assert.equal(hospital.roomCategory, "Private room");
});

test("document values are auto-filled while patients add only preferences or missing details", () => {
  assert.match(page, /Add only what is missing/);
  assert.match(page, /id="document-values"/);
  assert.match(page, /id="nursing-care"/);
  assert.match(page, /name="attendantStay"/);
  assert.match(page, /Anything else\?/);
  assert.match(app, /compilePreferences/);
  assert.match(app, /needs-input/);
  assert.match(app, /for \(const source of \[policy, estimate, prescription\]\)/);
});

test("unsafe approval claims and public AI calls are absent", () => {
  const combined = [page, app, backend].join("\n");
  assert.doesNotMatch(combined, /pre-authorization approved|cashless approved|expected insurer sanction/i);
  assert.doesNotMatch(backend, /generativelanguage|Gemini|OpenAI|Vertex/);
  assert.match(backend, /estimated insurer contribution/i);
});

test("legal and deletion routes exist in the application", () => {
  for (const route of ["privacy.html", "terms.html", "delete-data.html"]) assert.match(page, new RegExp(route.replace(".", "\\.")));
});
