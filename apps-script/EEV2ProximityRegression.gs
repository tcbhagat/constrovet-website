// EEV2-004 regression — safe to run manually in Apps Script TEST project.
// Proves the LABEL-OWNERSHIP fix at the leakage-amount call site.
//
// ROOT CAUSE (confirmed 2026-09-04 against live Code.js and the real
// browser-report.json of jobs form-20260902-152539-b6de1624 and
// form-20260902-184403-e5014284):
//
//   Code.gs:1496  if (boardroomLeakageRe().test(lower)) {
//   Code.gs:1497    const amount = boardroomFirstAmount(span) || ...
//
// .test() returns a boolean and DISCARDS the match index. Line 1497 then
// scans the whole span from character 0. The trigger term decides THAT a
// finding fires; boardroomFirstAmount independently decides WHICH number it
// carries. The two never meet.
//
// WHY PROXIMITY IS NOT THE FIX (measured on real spans, do not re-propose it):
//   fabricated  "Total Procurement Value Rs.34503245.66 Delayed POs"
//               trigger @124, figure @109  ->  gap -15
//   genuine     "...(NGT) penalty of Rs. 25,00,000"
//               trigger   @8, figure @115  ->  gap +107
// To block the fabrication you need |N| < 15; to keep the genuine penalty you
// need N >= 107. The ranges are inverted. NO value of N satisfies both. The
// fabricated figure is CLOSER to its trigger than the genuine one is.
//
// THE ACTUAL DISCRIMINATOR IS OWNERSHIP, NOT DISTANCE. Rs.34503245.66 is
// immediately preceded by the label "Total Procurement Value". That label owns
// the figure; "delay" does not. This is the same mechanism live CHECK 5c
// (Code.js:324 COUNT_PHRASES, 40-char preceding window) already uses for
// counts, generalised from counts to any label. The 40-character label window
// is inherited from that existing check, not chosen freshly.
//
// SCOPE NOTE: boardroomFirstAmount and boardroomLastAmount are NOT changed by
// EEV2-004. The EEV2-003 word-boundary suite tests those two functions directly
// and must stay green. EEV2-004 adds a new call-site function and changes only
// which function line 1497 calls.

function eev2RunProximityRegression() {
  const checks = [];
  const leak = boardroomLeakageRe();

  // ---------------------------------------------------------------
  // MUST EXTRACT 0 RUPEES.
  // Cases 1 and 2 are verbatim quoted_span values from the real
  // final-report/browser-report of job form-20260902-184403-e5014284,
  // which emailed a client an INR 27,60,26,419 headline on 2026-09-02.
  // ---------------------------------------------------------------
  const fabricationCases = [
    // Real span. 8 of that job's 9 findings are this template with the
    // Document Type swapped. The figure is the project's TOTAL PROCUREMENT
    // VALUE, claimed by the trigger term "delay" from "Delayed POs".
    "PRJ-2026-5578 Document Type Governance Category Procurement Total Purchase Orders 12 Total Procurement Value Rs.34503245.66 Delayed POs 7 (58%) On-Time Delivery Rate 41% Category: 09_Procurement NBC 2016",

    // Real span, same job, finding 5. Rs.454.16 is the cement UNIT RATE under
    // the column header "Unit Rate"; the trigger comes from the column header
    // "Delivery_Delay_Days". Fabricated by the identical mechanism.
    "PRJ-2026-5578 All Purchase Orders PO_Number Material_Description Quatity Unit Rate Total_ValuePO_Date Expected_Delivery Actual_Delivery Delivery_Delay_Days Supplier Status PO-5578-001Cement (OPC 53 Grade) 144 MT Rs.454.16 Rs.65,398.920-Aug-202406-Sep-202412-Sep-20246 Supplier-B Delayed PO-5578-002TMT Steel Bars (Fe 500D) 470 MT Rs.57,248.13Rs.26,906,620.46 23-Sep-202428-Oct-202412-Nov-202415 Supplier-C Delayed",

    // Bare metadata rows: no currency marker anywhere. Counts, headcounts,
    // clock times and inspection targets are not money.
    "Category Peak Strength Current Variance Attrition % Skilled Workers 120 78 -42 35%",
    "Working Hours 08:00 - 18:00 (10 hours) Labor Present 168 workers",
    "Tool-Box Talks Conducted 15 44 >=20/month HSE Inspections by Engineer 4 16 >=6/month",
    "Total Change Orders: 21"
  ];
  fabricationCases.forEach((text) => {
    const actual = boardroomTriggerOwnedAmount(text, leak);
    checks.push([`fabrication -> 0 : "${text.slice(0, 60)}..."`, actual === 0]);
  });

  // ---------------------------------------------------------------
  // MUST STILL EXTRACT THE CORRECT AMOUNT.
  // The trigger term sits inside the label region that owns the figure
  // ("...penalty of Rs. 25,00,000"), so the claim is legitimate.
  // ---------------------------------------------------------------
  {
    const text = "Pending Penalty: Failure to rectify within 7 days will result in a direct National Green Tribunal (NGT) penalty of Rs. 25,00,000";
    const actual = boardroomTriggerOwnedAmount(text, leak);
    checks.push(["genuine: NGT penalty -> 2500000", actual === 2500000]);
  }

  // ---------------------------------------------------------------
  // MUST BE UNAFFECTED.
  // ---------------------------------------------------------------
  {
    // Days evidence survives an amount of 0. The finding must NOT be dropped.
    const text = "Delay Days: 14 days";
    checks.push(["unaffected: delay-days path yields 14 days", boardroomFirstDays(text) === 14]);
    checks.push(["unaffected: delay-days path yields 0 rupees", boardroomTriggerOwnedAmount(text, leak) === 0]);
  }
  {
    // A percentage is not a rupee figure.
    const text = "cost variance 30.0%";
    checks.push(["unaffected: percentage path yields 0 rupees", boardroomTriggerOwnedAmount(text, leak) === 0]);
  }
  {
    // Structured budget/actual is a COMPUTED difference that never appears in
    // the text, so it does not pass through the label-ownership rule at all.
    const finding = boardroomCsvBudgetActualFinding(
      "test.csv", "Sheet1", "row",
      ["Budget", "Actual"],
      ["500000", "650000"]
    );
    checks.push(["unaffected: structured budget/actual difference = 150000",
      Boolean(finding) && finding.amount_inr === 150000]);
  }

  // ---------------------------------------------------------------
  // EEV2-003 MUST NOT REGRESS. boardroomFirstAmount is deliberately
  // left unchanged by EEV2-004; only the call site moves.
  // ---------------------------------------------------------------
  checks.push(["eev2-003 intact: boardroomFirstAmount('Cost Impact: Rs. 2,008,360.45') = 2008360.45",
    boardroomFirstAmount("Cost Impact: Rs. 2,008,360.45") === 2008360.45]);
  checks.push(["eev2-003 intact: boardroomFirstAmount('Skilled Workers 120 78 -42 35%') = 0",
    boardroomFirstAmount("Skilled Workers 120 78 -42 35%") === 0]);

  const output = {
    ticket: "EEV2-004",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };

  console.log("EEV2-004 LABEL OWNERSHIP REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-004 label ownership regression FAILED. See execution log.");
  console.log("EEV2-004 LABEL OWNERSHIP REGRESSION PASS: ok=true");
  return output;
}
