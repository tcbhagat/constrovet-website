// EEV2-012 regression — the fix that actually closes the cross-row label
// bleed. Built per PLAN_02_EEV2_012_M3_FIX.md (Drive doc
// 1JQbk9jUy11l-QllJLtrgVuuJIVpjJ1erV3XJtvtPFyI), section 5 ("Regression
// fixtures — provenance stated, per the gate").
//
// Background: EEV2-009's row-boundary (newline) guard passed 16/16 against
// a fixture shaped by Google Drive's read_file_content tool (which inserts
// "\n\n" between table rows) but was a no-op against real Gemini OCR output,
// which has no newlines at all. A real Test A submission (job
// form-20260909-072421-33a43b52) shipped INR 3,671 as LEAKAGE_AND_OVERRUN --
// PO-5578-006's "Delayed" status wrongly attributed to PO-5578-007's AAC
// Blocks unit rate -- confirming the guard did not close the real defect.
// See EEV2_011_ROW_BOUNDARY_PROPOSAL_20260909.md and
// fixture-provenance-pattern-20260909.md for the full history.
//
// EEV2-012 (candidate C6, chosen after six candidates were measured against
// the real span plus 7 genuine-leakage and 6 adversarial unit-suffix cases):
// veto ownership if the text between the NEAREST trigger word and the
// figure looks like an OCR column join -- 3+ digits touching 2+ letters
// with no separator ("PO-5578-007AAC", "Blocks335"). Ordinary prose always
// separates a number from a word with a space; a flattened OCR table cell
// boundary does not. The threshold (3 digits, 2 letters) was chosen
// specifically to clear real unit suffixes ("120m3", "15no.") which must
// keep being detected as genuine.

function eev2RunRowBoundaryRegression() {
  const checks = [];
  const leak = boardroomLeakageRe();

  // ---------------------------------------------------------------
  // Full real span. Not reconstructed, not pulled via Drive's
  // read_file_content (the exact tool whose "\n\n" row-join artifact caused
  // EEV2-009 to falsely pass) -- this is the literal quoted_span Gemini's
  // real OCR produced for this document, taken directly from the job's own
  // final-report.json.
  // source: form-20260909-072421-33a43b52, final-report.json quoted_span
  // (finding index 6, citations[0].quoted_span, file
  // Procurement_Purchase_Orders---Taran-Bhagat---Taran-Bhagat---Taran-Bhagat.pdf)
  // ---------------------------------------------------------------
  const realSpan =
    "PRJ-2026-5578 All Purchase Orders PO_Number Material_Description Quatity Unit Rate Total_ValuePO_Date Expected_Delivery Actual_Delivery Delivery_Delay_Days Supplier Status PO-5578-001Cement (OPC 53 Grade) 144 MT Rs.454.16 Rs.65,398.920-Aug-202406-Sep-202412-Sep-20246 Supplier-B Delayed PO-5578-002TMT Steel Bars (Fe 500D) 470 MT Rs.57,248.13Rs.26,906,620.46 23-Sep-202428-Oct-202412-Nov-202415 Supplier-C Delayed PO-5578-003Ready Mix Concrete (M30) 182 Cu.M Rs.6,367.49Rs.1,158,883.94 26-Oct-202421-Nov-202403-Dec-202412 Supplier-D Delayed PO-5578-004Bricks (Class A) 229 1000 Nos Rs.6,028.53Rs.1,380,533.88 18-Mar-202513-Apr-202514-Apr-20251 Supplier-E Delivered PO-5578-005Sand (River Sand) 285 Cu.M Rs.2,101.04Rs.598,796.59 09-Jul-202425-Jul-202401-Aug-20247 Supplier-F Delayed PO-5578-006Aggregates (20mm) 489 Cu.M Rs.1,425.83Rs.697,229.68 09-Dec-202422-Dec-202401-Jan-202510 Supplier-GDelayed PO-5578-007AAC Blocks335 Cu.M Rs.3,670.55Rs.1,229,634.43 1-Dec-202408-Jan-202508-Jan-20250 Supplier-H Delivered PO-5578-008Plywood (BWP) 493 Sheet Rs.1,934.64Rs.953,779.78 18-Feb-202528-Mar-202501-Apr-20254 Supplier-I Delivered PO-5578-009Paint (Emulsion) 309 Liter Rs.470.36 Rs.145,342.75 03-Apr-202529-Apr-202509-May-202510 Supplier-J Delayed PO-5578-010Ceramic Tiles 204 Sq.M Rs.483.32 Rs.98,596.9228-Mar-202520-Apr-202518-Apr-20250 Supplier-A Delivered PO-5578-011Aluminum Windows 490 Sq.M Rs.2,568.93Rs.1,258,776.52 18-Nov-202406-Dec-202412-Dec-20246 Supplier-B Delayed PO-5578-012Electrical Cables 59 RM Rs.163.59 Rs.9,651.7924-Sep-202431-Oct-202405-Nov-20245 Supplier-C Delivered Category: 09_Procurement NBC 2016";

  checks.push(["real span contains no newline (confirms real Gemini OCR shape, not Drive's read_file_content \\n\\n row-join artifact)",
    realSpan.indexOf("\n") === -1]);
  checks.push(["real span: AAC Blocks unit rate figure is present",
    realSpan.indexOf("Rs.3,670.55") > 0]);

  const realAmount = boardroomTriggerOwnedAmount(realSpan, leak);
  checks.push([`EEV2-012 (C6 OCR-column-join veto): boardroomTriggerOwnedAmount(realSpan) -> 0, got ${realAmount}`,
    realAmount === 0]);

  // ---------------------------------------------------------------
  // Adversarial genuine cases: unit-suffix prose that must NOT be vetoed.
  // These are legitimately synthetic (they exist to prove C6 does not
  // over-fire on ordinary construction prose containing a quantity+unit),
  // and are labelled as such per the fixture-provenance rule.
  // ---------------------------------------------------------------
  // KNOWN-SYNTHETIC: false-negative guard, unit-suffix prose ("120m3" is 3
  // digits touching 1 letter -- must clear the C6 threshold of 2+ letters).
  const reworkCase = "Rework of 120m3 of slab concrete cost Rs.4,50,000";
  const reworkAmount = boardroomTriggerOwnedAmount(reworkCase, leak);
  checks.push([`adversarial: "${reworkCase}" -> 450000, got ${reworkAmount}`,
    reworkAmount === 450000]);

  // KNOWN-SYNTHETIC: false-negative guard, unit-suffix prose ("15no." is 2
  // digits touching 2 letters -- below the C6 digit threshold of 3).
  const delayPenaltyCase = "Delay penalty for 15no. units at Rs.9,00,000 total";
  const delayPenaltyAmount = boardroomTriggerOwnedAmount(delayPenaltyCase, leak);
  checks.push([`adversarial: "${delayPenaltyCase}" -> 900000, got ${delayPenaltyAmount}`,
    delayPenaltyAmount === 900000]);

  // KNOWN-SYNTHETIC: false-negative guard, ID-in-prose ("EC-2025-014" has a
  // hyphen breaking the digit run into pieces shorter than the threshold).
  const escalationCase = "Escalation claim ref EC-2025-014 valued Rs.18,00,000";
  const escalationAmount = boardroomTriggerOwnedAmount(escalationCase, leak);
  checks.push([`adversarial: "${escalationCase}" -> 1800000, got ${escalationAmount}`,
    escalationAmount === 1800000]);

  const output = {
    ticket: "EEV2-012",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };

  console.log("EEV2-012 ROW BOUNDARY (OCR COLUMN JOIN VETO) REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-012 row boundary regression FAILED. See execution log.");
  console.log("EEV2-012 ROW BOUNDARY (OCR COLUMN JOIN VETO) REGRESSION PASS: ok=true");
  return output;
}
