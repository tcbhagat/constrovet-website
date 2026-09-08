// EEV2-008 regression — safe to run manually in Apps Script TEST project.
// Proves the citation-truncation fix: Code.gs used to call
// String(span || "").slice(0, 500) inside boardroomFinding() (the storage
// site) and again inside normalizeFindingForVerification(), cutting the
// stored citations[0].quoted_span down to 500 characters BEFORE any
// validation ever ran. validateReportOutput's CHECK 5b (currency-context
// guard) and the deterministic verifier both re-derive their evidence from
// that same stored, already-truncated quoted_span -- so a currency figure
// whose supporting text sat past character 500 of the real evidence window
// was invisible to them, even though boardroomTriggerOwnedAmount (called at
// extraction time against the untruncated span) had already correctly
// judged it.
//
// Fix: boardroomFinding() and normalizeFindingForVerification() now store
// the FULL, untruncated span. Truncation moved to a new display-only helper,
// boardroomDisplaySpan(text, limit = 500), called only from the render
// functions that build report/email HTML or markdown (renderActionPlanHtml,
// renderFindingHtml, buildMarkdownReport, buildExecutiveEmailText,
// renderActionCitationsEmailHtml).
//
// PO-5578-007 fixture (real production shape, confirmed 2026-09-08):
// "AAC Blocks unit rate Rs.3,670.55 per cum" sits at character 671 of an
// 852-character evidence window -- past the old 500-character cutoff. It is
// a unit rate, not a leakage figure, and no leakage-trigger label sits
// within the 40-character BOARDROOM_LABEL_WINDOW immediately before it.

function eev2RunCitationTruncationRegression() {
  const checks = [];
  const leak = boardroomLeakageRe();

  // ---------------------------------------------------------------
  // PO-5578-007: AAC Blocks unit rate, not leakage. Must extract 0 rupees
  // when boardroomTriggerOwnedAmount is called against the FULL,
  // untruncated 852-character span (proves removing the storage-site
  // truncation does not let a genuine unit rate get fabricated into a
  // leakage figure now that more text reaches downstream checks).
  // ---------------------------------------------------------------
  const po5578007Span =
    "Purchase Order PO-5578-007 dated 12-Aug-2026 covers site mobilisation of blockwork material for the Phase 2 tower block. Item 1: Cement OPC 53 Grade, 500 bags, delivered against BOQ item 3.1, GRN acknowledged by the site store on 10-Aug-2026. Item 2: River sand, 40 cum, delivered as per the approved vendor rate contract dated 02-Jun-2026 and jointly measured with the client representative. Item 3 records wastage of curing water estimated during the monsoon fortnight, tracked separately on the site diary and not carried into this purchase order value. Item 4: AAC Blocks 600x200x100mm, 4,250 Nos, rate as per the approved rate analysis on file: AAC Blocks unit rate Rs.3,670.55 per cum, applied to the confirmed BOQ quantity of 42.5 cum for this delivery lot, with the total value carried to the running account bill for certification and payment.";

  checks.push(["fixture PO-5578-007 span length exceeds the old 500-char truncation point",
    po5578007Span.length > 500]);
  checks.push(["fixture PO-5578-007: AAC Blocks unit rate figure sits past character 500",
    po5578007Span.indexOf("Rs.3,670.55") > 500]);

  const po5578007Amount = boardroomTriggerOwnedAmount(po5578007Span, leak);
  checks.push([`PO-5578-007: boardroomTriggerOwnedAmount(fullSpan) -> 0 (AAC Blocks unit rate is not leakage), got ${po5578007Amount}`,
    po5578007Amount === 0]);

  // ---------------------------------------------------------------
  // boardroomFinding() must store the FULL span, not a 500-char slice.
  // This is the actual storage-site fix: the pre-fix code stored
  // String(span).slice(0, 500), silently dropping the AAC Blocks clause
  // (and its "Rs.3,670.55" figure) out of citations[0].quoted_span before
  // any validator ever saw it.
  // ---------------------------------------------------------------
  const po5578007Finding = boardroomFinding(
    "Possible leakage or overrun signal (trigger term: wastage) was found in this document.",
    "LEAKAGE_AND_OVERRUN", 0, 0, "PO-5578-007.pdf", "Page 1", po5578007Span, 0, 0, 0, "LOW");

  checks.push(["boardroomFinding() stores the full untruncated span (no storage-site slice(0,500))",
    po5578007Finding.citations[0].quoted_span === po5578007Span]);
  checks.push(["boardroomFinding() citation retains the AAC Blocks unit rate clause past character 500",
    po5578007Finding.citations[0].quoted_span.indexOf("Rs.3,670.55") > 500]);

  // normalizeFindingForVerification() had its own redundant re-slice --
  // must also preserve the full span now.
  const normalized = normalizeFindingForVerification(po5578007Finding);
  checks.push(["normalizeFindingForVerification() no longer re-truncates quoted_span",
    normalized.citations[0].quoted_span === po5578007Span]);

  // boardroomDisplaySpan() is the new display-only truncation. It must
  // still cap render output at 500 characters -- the fix removes
  // truncation from storage/validation, not from the client-facing HTML.
  const displaySpan = boardroomDisplaySpan(po5578007Span);
  checks.push(["boardroomDisplaySpan() truncates to 500 chars plus an ellipsis for display",
    displaySpan.length === 503 && displaySpan.endsWith("...")]);
  checks.push(["boardroomDisplaySpan() leaves a short span untouched",
    boardroomDisplaySpan("short evidence") === "short evidence"]);

  // ---------------------------------------------------------------
  // Genuine leakage past character 500: a real wastage figure debited to
  // the subcontractor, with its currency marker inside the 40-char label
  // window, sitting entirely past the old 500-char truncation point. Before
  // the fix, the stored citation would never contain "Rs.3,670.55" at all
  // (it was sliced off at storage time), so validateReportOutput's CHECK 5b
  // (currency-context guard) would reject a genuine finding as
  // UNVERIFIED_AMOUNT even though boardroomTriggerOwnedAmount had correctly
  // extracted it from the full evidence window at extraction time.
  // ---------------------------------------------------------------
  const genuineSpan =
    "Purchase Order PO-5578-007 dated 12-Aug-2026 covers site mobilisation of blockwork material for the Phase 2 tower block. Item 1: Cement OPC 53 Grade, 500 bags, delivered against BOQ item 3.1, GRN acknowledged by the site store on 10-Aug-2026. Item 2: River sand, 40 cum, delivered as per the approved vendor rate contract dated 02-Jun-2026 and jointly measured with the client representative. Item 3: AAC Blocks 600x200x100mm, 4,250 Nos, rate as per the approved rate analysis on file, applied to the confirmed BOQ quantity of 42.5 cum for this delivery lot and carried to the running account bill for reference. Item 4 records wastage of curing water valued at Rs.3,670.55 during the monsoon fortnight, confirmed against the site diary and debited to the subcontractor.";

  checks.push(["genuine-leakage fixture span length exceeds the old 500-char truncation point",
    genuineSpan.length > 500]);
  checks.push(["genuine-leakage fixture: wastage figure sits past character 500",
    genuineSpan.indexOf("Rs.3,670.55") > 500]);

  const genuineAmount = boardroomTriggerOwnedAmount(genuineSpan, leak);
  checks.push([`genuine leakage: boardroomTriggerOwnedAmount(fullSpan) -> 3670.55, got ${genuineAmount}`,
    genuineAmount === 3670.55]);

  const genuineFinding = boardroomFinding(
    boardroomSignalStatement_("LEAKAGE", genuineSpan, genuineAmount, 0),
    "LEAKAGE_AND_OVERRUN", genuineAmount, 0, "PO-5578-007.pdf", "Page 1", genuineSpan, 0, 0, 0, "MEDIUM");
  genuineFinding.evidence_quality = "CITED_AMOUNT";

  const browserReport = {
    analysis_generated: true,
    findings: [genuineFinding]
  };
  const validation = validateReportOutput({}, browserReport);
  const unverifiedAmountErrors = (validation.errors || []).filter((e) => e.indexOf("UNVERIFIED_AMOUNT") === 0);

  checks.push(["validateReportOutput does not fabricate UNVERIFIED_AMOUNT once the full span (not a 500-char slice) is stored",
    unverifiedAmountErrors.length === 0]);
  checks.push(["validateReportOutput passes overall for the genuine, fully-cited leakage finding",
    validation.isValid === true]);

  // Deterministic verifier must accept the same finding (citation present,
  // amount cited, leakage trigger present in the full evidence text).
  const verifierResult = runDeterministicVerifier([genuineFinding]);
  checks.push(["runDeterministicVerifier verifies the genuine finding once given the full untruncated span",
    verifierResult.verification_status === "VERIFIED" && verifierResult.verified_finding_count === 1]);

  const output = {
    ticket: "EEV2-008",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };

  console.log("EEV2-008 CITATION TRUNCATION REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-008 citation truncation regression FAILED. See execution log.");
  console.log("EEV2-008 CITATION TRUNCATION REGRESSION PASS: ok=true");
  return output;
}
