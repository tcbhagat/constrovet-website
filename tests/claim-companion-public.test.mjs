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

test("synthetic knee-replacement documents correlate without asking for supplied values", () => {
  const policyText = "STAR HEALTH & ALLIED INSURANCE CO. LTD. Product Comprehensive Health Gold Policyholder Name RAJESH SHARMA Base Sum Insured INR 5,00,000 Policy Period 23/08/2025 to 22/08/2027 Eligible Room Rent Limit INR 2,500 per day (Proportional Scaling Applies) Co-payment Clause 25% Mandatory Zone Co-pay Pre-Existing Disease (PED) Clause Hypertension (36 Months Waiting)";
  const adviceText = "APOLLO HOSPITAL, PUNE OUT-PATIENT CLINICAL EXAMINATION & ADVICE NOTE Patient Name RAJESH SHARMA Hospital & City: Apollo Hospital, Pune, Pune (Zone 1) Primary Diagnosis: Total Knee Arthroplasty (Unilateral) Surgical / Medical Advice: Total Knee Arthroplasty (Unilateral) Recommended Admission: In-Patient Hospitalization Expected Length of Stay: 4 Days DOCTOR'S CLINICAL EVALUATION & NOTES 48-year-old male. Advised unilateral TKR.";
  const estimateText = "APOLLO HOSPITAL, PUNE PRE-ADMISSION FINANCIAL COST ESTIMATE Patient Name RAJESH SHARMA Advised Procedure: Total Knee Arthroplasty (Unilateral) Proposed Hospital: Apollo Hospital, Pune, Pune (Zone 1) Selected Room Category: Deluxe Suite Expected Length of Stay: 4 Days ITEMIZED FINANCIAL ESTIMATE BREAKDOWN Room Rent & Nursing Charges (4 Days @ INR 28,065/day) INR 112,260 Surgeon, Anaesthetist & Operation Theatre Fees INR 252,585 Medicines, Consumables & Diagnostic Investigations INR 151,551 Administrative Fees & PPE Kits (IRDAI Non-Payable List I) INR 44,904 TOTAL ESTIMATED HOSPITAL BILL INR 561,300";
  const policy = inferPolicyFields(policyText);
  const advice = inferPrescriptionFields(adviceText);
  const estimate = inferEstimateFields(estimateText);
  assert.deepEqual({ sumInsured: policy.sumInsured, roomLimit: policy.roomLimit, copayPercent: policy.copayPercent, policyPeriod: policy.policyPeriod, scaling: policy.proportionateScalingApplies }, { sumInsured: 500000, roomLimit: 2500, copayPercent: 25, policyPeriod: "23/08/2025 to 22/08/2027", scaling: true });
  assert.match(policy.waitingNote, /Hypertension.*36 Months Waiting/i);
  assert.deepEqual({ procedureName: advice.procedureName, stayDays: advice.stayDays }, { procedureName: "Total Knee Arthroplasty (Unilateral)", stayDays: 4 });
  assert.match(advice.hospitalName, /Apollo Hospital/i);
  assert.deepEqual({ estimatedBill: estimate.estimatedBill, actualRoomRate: estimate.actualRoomRate, nonPayables: estimate.nonPayables, stayDays: estimate.stayDays, roomCategory: estimate.roomCategory }, { estimatedBill: 561300, actualRoomRate: 28065, nonPayables: 44904, stayDays: 4, roomCategory: "Deluxe suite" });
});

test("unknown room-linked charges produce a transparent conservative range", () => {
  const result = calculateCostLock({ estimatedBill: 561300, sumInsured: 500000, availableBalance: "", nonPayables: 44904, deductible: "", copayPercent: 25, stayDays: 4, roomLimit: 2500, actualRoomRate: 28065, proportionateCharges: "", proportionateScalingApplies: true });
  assert.equal(result.directRoomDeduction, 102260);
  assert.equal(result.hasEstimateRange, true);
  assert.equal(result.insurerContributionLow, 34500);
  assert.equal(result.insurerContributionHigh, 310602);
  assert.equal(result.patientShareLow, 250698);
  assert.equal(result.patientShareHigh, 526800);
  assert.equal(result.known.availableBalance, false);
  assert.equal(result.known.deductible, false);
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
  assert.match(extractor, /Cashless authorization or TPA response/);
  assert.match(page, /Current available balance/);
});

test("PDF report replaces generic questions with evidence status", () => {
  assert.match(backend, /DOCUMENT EVIDENCE STATUS/);
  assert.doesNotMatch(backend, /QUESTIONS TO CONFIRM/);
  assert.doesNotMatch(backend, /Ask the insurer or TPA to confirm|Ask the hospital to confirm|Request formal cashless pre-authorization/i);
  assert.match(backend, /Not present in uploaded documents/);
  assert.match(backend, /hasUncertainProportionateDeduction/);
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
