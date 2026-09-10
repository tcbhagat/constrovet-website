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
// PO-5578-007 fixture, REPLACED 2026-09-10 (Phase 4 fixture-provenance
// triage): this is now the real Gemini quoted_span from job
// form-20260909-072421-33a43b52's own final-report.json, byte-identical to
// the span independently verified in EEV2RowBoundaryRegression.gs.
// "Rs.3,670.55" (the AAC Blocks unit rate on the PO-5578-007 row) sits at
// character 929 of this 1619-char string -- past the old 500-character
// storage-site truncation cutoff, confirming the truncation bug this suite
// targets was real for this document.
//
// The previous fixture was the same table as rendered by Google Drive's
// read_file_content tool, which inserts "\n\n" between rows. Real Gemini OCR
// has no newlines at all. That mismatch is exactly what let EEV2-009's
// newline row-boundary guard pass here while the defect shipped to
// production. Swapping in the real shape means every assertion below now
// exercises the code path production actually takes.
//
// EEV2-009 (folded into this same file/suite, not a separate gate entry):
// this real text originally surfaced a SEPARATE, GENUINE defect, found
// while wiring in this fixture: the table extraction has no whitespace
// between columns ("Supplier-GDelayed", "Supplier-GAggregates", etc).
// boardroomTriggerOwnedAmount's 40-char BOARDROOM_LABEL_WINDOW was measured
// in raw characters, not tokens, so PO-5578-006's status word "Delayed"
// (as the tail of "Supplier-GDelayed") landed inside the 40-char window
// immediately before PO-5578-007's "Rs.3,670.55" and was picked up as that
// figure's owning label -- even though "Delayed" describes the PREVIOUS
// row's PO, not PO-5578-007 (which is itself status "Delivered"). A
// SEVERITY check added here confirmed the consequence was real: building
// the resulting mislabeled finding and running it through
// validateReportOutput came back isValid=true, errors=[] -- the gate would
// have shipped a fabricated leakage figure to a client board pack. This is
// cross-row label bleed from column concatenation -- distinct from EEV2-
// 008's citation truncation bug and from EEV2-004's proximity/ownership
// fix (which solved a same-row mislabelling, not a cross-row one).
//
// ATTEMPTED FIX (EEV2-009, DISPROVEN): boardroomTriggerOwnedAmount's label
// region was capped at the nearest preceding newline (row boundary). That
// passed here against the then-current Drive-shaped fixture, but real Gemini
// OCR emits no newlines, so in production the cap never fired and the bug
// shipped. Retained in Code.gs as cheap defense for genuinely multi-line
// input, but it is NOT what closes this defect.
//
// ACTUAL FIX (EEV2-012): the OCR-column-join veto -- if 3+ digits touching
// 2+ letters ("PO-5578-007AAC", "Blocks335") sit between the nearest trigger
// word and the figure, they are on different logical rows of a flattened
// table and the trigger does not own the figure. Ordinary prose always
// separates a number from a word with a space; a flattened OCR cell boundary
// does not. With the real span now used as this file's fixture, the
// assertions below exercise that veto directly.

function eev2RunCitationTruncationRegression() {
  const checks = [];
  const leak = boardroomLeakageRe();

  // ---------------------------------------------------------------
  // PO-5578-007 real span.
  //
  // REPLACED 2026-09-10 (Phase 4 fixture-provenance triage). This fixture
  // was previously the Drive-shaped rendering of this table -- rows joined
  // by "\n\n" because Google Drive's read_file_content tool inserts them.
  // Real Gemini OCR of the same document has NO newlines at all, which is
  // precisely the mismatch that let EEV2-009's newline row-boundary guard
  // pass 16/16 here while the bug shipped to production (job
  // form-20260909-072421-33a43b52 sent INR 3,671 as LEAKAGE_AND_OVERRUN).
  // See fixture-provenance-pattern-20260909.md.
  //
  // This is now the literal quoted_span Gemini produced for this document,
  // byte-identical to the one independently verified in
  // EEV2RowBoundaryRegression.gs. It tests the truncation bug BETTER than
  // the Drive-shaped text did: the AAC Blocks figure sits at index 929 of
  // a 1619-char span, so it is genuinely past the old 500-char cutoff in
  // the shape production actually sees.
  // source: form-20260909-072421-33a43b52, final-report.json quoted_span
  // (finding index 6, citations[0].quoted_span, file
  // Procurement_Purchase_Orders---Taran-Bhagat---Taran-Bhagat---Taran-Bhagat.pdf)
  // ---------------------------------------------------------------
  const po5578007Span =
    "PRJ-2026-5578 All Purchase Orders PO_Number Material_Description Quatity Unit Rate Total_ValuePO_Date Expected_Delivery Actual_Delivery Delivery_Delay_Days Supplier Status PO-5578-001Cement (OPC 53 Grade) 144 MT Rs.454.16 Rs.65,398.920-Aug-202406-Sep-202412-Sep-20246 Supplier-B Delayed PO-5578-002TMT Steel Bars (Fe 500D) 470 MT Rs.57,248.13Rs.26,906,620.46 23-Sep-202428-Oct-202412-Nov-202415 Supplier-C Delayed PO-5578-003Ready Mix Concrete (M30) 182 Cu.M Rs.6,367.49Rs.1,158,883.94 26-Oct-202421-Nov-202403-Dec-202412 Supplier-D Delayed PO-5578-004Bricks (Class A) 229 1000 Nos Rs.6,028.53Rs.1,380,533.88 18-Mar-202513-Apr-202514-Apr-20251 Supplier-E Delivered PO-5578-005Sand (River Sand) 285 Cu.M Rs.2,101.04Rs.598,796.59 09-Jul-202425-Jul-202401-Aug-20247 Supplier-F Delayed PO-5578-006Aggregates (20mm) 489 Cu.M Rs.1,425.83Rs.697,229.68 09-Dec-202422-Dec-202401-Jan-202510 Supplier-GDelayed PO-5578-007AAC Blocks335 Cu.M Rs.3,670.55Rs.1,229,634.43 1-Dec-202408-Jan-202508-Jan-20250 Supplier-H Delivered PO-5578-008Plywood (BWP) 493 Sheet Rs.1,934.64Rs.953,779.78 18-Feb-202528-Mar-202501-Apr-20254 Supplier-I Delivered PO-5578-009Paint (Emulsion) 309 Liter Rs.470.36 Rs.145,342.75 03-Apr-202529-Apr-202509-May-202510 Supplier-J Delayed PO-5578-010Ceramic Tiles 204 Sq.M Rs.483.32 Rs.98,596.9228-Mar-202520-Apr-202518-Apr-20250 Supplier-A Delivered PO-5578-011Aluminum Windows 490 Sq.M Rs.2,568.93Rs.1,258,776.52 18-Nov-202406-Dec-202412-Dec-20246 Supplier-B Delayed PO-5578-012Electrical Cables 59 RM Rs.163.59 Rs.9,651.7924-Sep-202431-Oct-202405-Nov-20245 Supplier-C Delivered Category: 09_Procurement NBC 2016";

  checks.push(["fixture is real Gemini-shaped text: contains no newline (the Drive read_file_content \"\\n\\n\" artifact that caused EEV2-009's false pass is gone)",
    po5578007Span.indexOf("\n") === -1]);

  checks.push(["fixture PO-5578-007 span length exceeds the old 500-char truncation point",
    po5578007Span.length > 500]);
  checks.push(["fixture PO-5578-007: AAC Blocks unit rate figure sits past character 500",
    po5578007Span.indexOf("Rs.3,670.55") > 500]);

  // History: this assertion once credited EEV2-009's newline row-boundary
  // guard. A real Test A submission (job form-20260909-072421-33a43b52)
  // disproved that -- real Gemini OCR has no newlines, so the guard was a
  // no-op in production and this exact figure shipped as INR 3,671 leakage.
  // See fixture-provenance-pattern-20260909.md and
  // EEV2_011_ROW_BOUNDARY_PROPOSAL_20260909.md.
  //
  // As of 2026-09-10 the fixture above IS the real Gemini-shaped span, so
  // this check now honestly exercises the production code path: the 0 comes
  // from EEV2-012's OCR-column-join veto firing on real OCR text, not from
  // a newline guard that only ever worked on Drive-shaped input.
  const po5578007Amount = boardroomTriggerOwnedAmount(po5578007Span, leak);
  checks.push([`PO-5578-007: boardroomTriggerOwnedAmount(fullSpan) -> 0 (EEV2-012's OCR-column-join veto, not the EEV2-009 newline guard which this fixture cannot honestly test), got ${po5578007Amount}`,
    po5578007Amount === 0]);

  // ---------------------------------------------------------------
  // boardroomFinding() must store the FULL span, not a 500-char slice.
  // This is the actual storage-site fix: the pre-fix code stored
  // String(span).slice(0, 500), silently dropping the AAC Blocks clause
  // (and its "Rs.3,670.55" figure) out of citations[0].quoted_span before
  // any validator ever saw it.
  // ---------------------------------------------------------------
  const po5578007Finding = boardroomFinding(
    boardroomSignalStatement_("LEAKAGE", po5578007Span, po5578007Amount, 0),
    "LEAKAGE_AND_OVERRUN", po5578007Amount, 0, "Procurement_Purchase_Orders.pdf", "Sheet1", po5578007Span, 0, 0, 0, "LOW");
  // boardroomFinding() alone does not set evidence_quality -- that is
  // scoreBoardroomFindings()'s job in the real pipeline, run once per
  // batch after extraction. Compute it the same way here so this fixture
  // matches what a real report actually carries by the time it reaches
  // validateReportOutput, instead of leaving it undefined as an artifact
  // of this test calling boardroomFinding() directly.
  po5578007Finding.evidence_quality = boardroomEvidenceQuality(po5578007Finding);

  checks.push(["boardroomFinding() stores the full untruncated span (no storage-site slice(0,500))",
    po5578007Finding.citations[0].quoted_span === po5578007Span]);
  checks.push(["boardroomFinding() citation retains the AAC Blocks unit rate clause past character 500",
    po5578007Finding.citations[0].quoted_span.indexOf("Rs.3,670.55") > 500]);

  // ---------------------------------------------------------------
  // SEVERITY CHECK: before the row-boundary guard, this exact finding
  // carried amount_inr=3670.55 (PO-5578-006's "Delayed" wrongly attributed
  // to PO-5578-007's AAC Blocks unit rate), and running it through
  // validateReportOutput came back isValid=true, errors=[] -- CHECK 5b only
  // confirms a claimed figure sits near a currency marker, it does not
  // verify the label attributing it as leakage belongs to that figure's
  // row. That meant the gate would have shipped a fabricated leakage
  // figure to a client board pack. Now that the extractor itself no longer
  // attributes PO-5578-006's "Delayed" to PO-5578-007's figure
  // (amount_inr=0, asserted above), there is no fabricated amount for
  // validateReportOutput to wrongly wave through.
  //
  // Updated for EEV2-013 (CHECK 8, added 2026-09-09): a report containing
  // only this one finding, with amount_inr=0 and evidence_quality
  // CITED_NARRATIVE (no other finding present to supply verified
  // evidence), is now CORRECTLY held under the whole-submission MUST-BLOCK
  // gate -- this is EEV2-013's intended behavior, not a regression. The
  // real production data this fixture is modeled on (job
  // form-20260909-165508-4076a2ce) has 9 such findings, all
  // CITED_NARRATIVE, and is exactly the case CHECK 8 exists to hold. So
  // this check now asserts two things separately: no fabricated amount
  // (unchanged), and isValid=false for precisely the NO_VERIFIED_EVIDENCE
  // reason -- not any fabrication-related error, proving EEV2-012's fix
  // and EEV2-013's gate are each doing their own job, not masking one
  // another.
  // ---------------------------------------------------------------
  const buggyBrowserReport = {
    analysis_generated: true,
    findings: [po5578007Finding]
  };
  const buggyValidation = validateReportOutput({}, buggyBrowserReport);
  const buggyNonBlockErrors = (buggyValidation.errors || []).filter((e) => e.indexOf("NO_VERIFIED_EVIDENCE") !== 0);
  checks.push([`SEVERITY: PO-5578-007 finding amount_inr=${po5578007Finding.amount_inr} (must be 0, not the mislabeled 3670.55) -- no fabricated amount reaches the gate`,
    po5578007Finding.amount_inr === 0]);
  checks.push([`SEVERITY: with EEV2-013 live, a lone CITED_NARRATIVE finding is correctly held (isValid=${buggyValidation.isValid}), and only for NO_VERIFIED_EVIDENCE -- no fabrication-related error also fired: ${JSON.stringify(buggyNonBlockErrors)}`,
    buggyValidation.isValid === false && buggyNonBlockErrors.length === 0]);

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
