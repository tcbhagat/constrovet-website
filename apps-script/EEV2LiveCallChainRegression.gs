// EEV2-008 — End-to-end call-chain test for eev2AttachLiveSchedulePosition
// (both real call sites) and eev2RouteStructuredBoardroomFindings.
//
// Closes the second documented test-suite blind spot
// (CONTINUATION_CONTRACT.md Ground Truth): the 12-suite harness never
// exercises eev2AttachLiveSchedulePosition (called on EVERY submission, both
// the main form path in handleBoardroomFormSubmit and the correction-rerun
// path in rerunBoardroomJobWithCorrections) or eev2RouteStructuredBoardroomFindings
// (called on every page via extractBoardroomFindings) end-to-end. This is
// exactly how all 4 Phase-1 gaps went undetected through 26/26 and 12/12
// passes -- every existing suite calls a module's own function directly with
// hand-built inputs, never through the real Code.gs functions that actually
// invoke it in production.
//
// Design: this suite is handed real Code.gs source text plus the companion
// module source texts (as a source tree, same shape as EEV2-007), confirms
// BOTH real call sites of eev2AttachLiveSchedulePosition exist in the exact
// functions AGENTS.md's intake-path fact names (handleBoardroomFormSubmit,
// rerunBoardroomJobWithCorrections), confirms extractBoardroomFindings calls
// eev2RouteStructuredBoardroomFindings, and then actually LOADS the source
// tree into a vm and drives eev2AttachLiveSchedulePosition and
// eev2RouteStructuredBoardroomFindings with realistic finding/document data
// through their real bodies -- not mocks that bypass the real call chain.
//
// This cannot run inside scripts/run-eev2-harness.mjs unmodified, because
// that harness only loads apps-script/*.gs from disk; it is instead run via
// recovery-v11/tools/verify-candidate-full-isolated.mjs-style direct vm
// loading, proven fail-then-pass in
// recovery-v11/tools/prove-eev2-008-fail-then-pass.mjs against:
//   1. the OLD, broken candidate (recovery-v11/Code.merged-candidate.js +
//      apps-script/'s stale companion files) -- must FAIL, reproducing
//      today's incident;
//   2. the Phase-1 full candidate (recovery-v11/candidate-full/) -- must PASS.
//
// NOT wired into EEV2FullRegressionGate.gs -- a new suite joining the release
// gate needs separate approval per AGENTS.md's Delegation Boundaries. This
// file only defines the check; nothing calls it automatically.

function eev2RunLiveCallChainRegression(sourceFilesByName, runtimeContext) {
  const files = sourceFilesByName || {};
  const allSource = Object.keys(files).map((name) => files[name]).join("\n");
  const reasons = [];
  const checks = [];

  function extractBody(name) {
    return (typeof eev2ExtractFunctionBody_ === "function")
      ? eev2ExtractFunctionBody_(allSource, name)
      : null;
  }

  // --- STATIC: both real call sites of eev2AttachLiveSchedulePosition ---
  const formSubmitBody = extractBody("handleBoardroomFormSubmit");
  const rerunBody = extractBody("rerunBoardroomJobWithCorrections");
  const extractFindingsBody = extractBody("extractBoardroomFindings");

  const mainPathCalls = !!formSubmitBody && /\beev2AttachLiveSchedulePosition\s*\(/.test(formSubmitBody);
  const rerunPathCalls = !!rerunBody && /\beev2AttachLiveSchedulePosition\s*\(/.test(rerunBody);
  const routingCalled = !!extractFindingsBody && /\beev2RouteStructuredBoardroomFindings\s*\(/.test(extractFindingsBody);

  checks.push(["handleBoardroomFormSubmit_found", !!formSubmitBody]);
  checks.push(["rerunBoardroomJobWithCorrections_found", !!rerunBody]);
  checks.push(["extractBoardroomFindings_found", !!extractFindingsBody]);
  checks.push(["main_form_path_calls_eev2AttachLiveSchedulePosition", mainPathCalls]);
  checks.push(["correction_rerun_path_calls_eev2AttachLiveSchedulePosition", rerunPathCalls]);
  checks.push(["extractBoardroomFindings_calls_eev2RouteStructuredBoardroomFindings", routingCalled]);

  if (!formSubmitBody) reasons.push("handleBoardroomFormSubmit is not defined in this source tree.");
  if (!rerunBody) reasons.push("rerunBoardroomJobWithCorrections is not defined in this source tree.");
  if (!extractFindingsBody) reasons.push("extractBoardroomFindings is not defined in this source tree.");
  if (formSubmitBody && !mainPathCalls) reasons.push("MISSING CALL SITE: handleBoardroomFormSubmit (main form path) does not call eev2AttachLiveSchedulePosition.");
  if (rerunBody && !rerunPathCalls) reasons.push("MISSING CALL SITE: rerunBoardroomJobWithCorrections (correction-rerun path) does not call eev2AttachLiveSchedulePosition.");
  if (extractFindingsBody && !routingCalled) reasons.push("MISSING CALL SITE: extractBoardroomFindings does not call eev2RouteStructuredBoardroomFindings.");

  // --- DYNAMIC: drive the real functions with realistic data, if a runtime was handed to us ---
  // runtimeContext, when provided, is an object exposing the already-loaded
  // functions (e.g. a vm context's globals) so this same .gs file can be
  // sourced both inside the Apps Script editor (where these functions are
  // simply in scope) and inside a Node vm harness (where they are passed in
  // explicitly). No mocking of eev2AttachLiveSchedulePosition or
  // eev2RouteStructuredBoardroomFindings themselves -- their real bodies run.
  const rt = runtimeContext || (typeof eev2AttachLiveSchedulePosition === "function" ? globalThis : null);

  function call(name, args) {
    const fn = rt && rt[name];
    if (typeof fn !== "function") throw new Error(name + " is not callable in the supplied runtime context.");
    return fn.apply(null, args);
  }

  let dynamic = { attempted: false };
  if (rt && typeof rt.eev2AttachLiveSchedulePosition === "function" && typeof rt.eev2RouteStructuredBoardroomFindings === "function") {
    dynamic.attempted = true;
    try {
      // Realistic finding set: the same shape real findings carry once they
      // reach eev2AttachLiveSchedulePosition -- a progress variance, an
      // observed-delay total, a responsibility profile, and TWO real
      // variation orders (one with schedule impact, one without), mirroring
      // EEV2LiveScheduleBridgeRegression's own fixture so a real regression
      // in the VO-aggregation call chain (Phase-1 gap #2/#3) would surface
      // here exactly as it would on a live job.
      const findings = [
        {
          statement: "Overall progress is 64.3% actual versus 66.7% planned. Source variance is -2.3% points; recalculated from displayed rounded values -2.4% points.",
          financial_category: "BASELINE_BUDGET", amount_inr: 0, exposure_amount_inr: 0, days: 0,
          citations: [{ file: "Activity_Progress.pdf", page_or_sheet: "Workspace OCR", quoted_span: "Overall Project Progress: Planned = 66.7% | Actual = 64.3% | Variance = -2.3%" }],
          calculation: { budget: 66.7, actual: 64.3, difference: -2.4 },
          eev2_semantic_classification: "PROGRESS_VARIANCE",
          variance_consistency: "ROUNDING_DIFFERENCE_REVIEW"
        },
        {
          statement: "32 observed monthly delay-event days were recorded. Critical-path impact is not established.",
          amount_inr: 0, exposure_amount_inr: 0, days: 32,
          financial_category: "LEAKAGE_AND_OVERRUN",
          eev2_semantic_classification: "OBSERVED_DELAY_EVENT_DAYS"
        },
        {
          statement: "Delay responsibility profile: contractor non-excusable 11 days; client 7 days; neutral/external 14 days.",
          amount_inr: 0, exposure_amount_inr: 0, days: 0,
          financial_category: "LEAKAGE_AND_OVERRUN",
          eev2_semantic_classification: "DELAY_RESPONSIBILITY_PROFILE"
        },
        {
          statement: "Approved variation/change order VO-11/01 with cited cost impact of INR 10,50,000 and 5 day(s) stated schedule impact. Approved change against baseline -- monitor; not contractor-recoverable leakage.",
          amount_inr: 1050000, exposure_amount_inr: 0, days: 5,
          financial_category: "BASELINE_BUDGET",
          eev2_semantic_classification: "BASELINE_BUDGET",
          recoverability_guardrail: "NOT_ESTABLISHED"
        },
        {
          statement: "Approved variation/change order VO-12/02 with cited cost impact of INR 2,50,000 and 0 day(s) stated schedule impact. Approved change against baseline -- monitor; not contractor-recoverable leakage.",
          amount_inr: 250000, exposure_amount_inr: 0, days: 0,
          financial_category: "BASELINE_BUDGET",
          eev2_semantic_classification: "BASELINE_BUDGET",
          recoverability_guardrail: "NOT_ESTABLISHED"
        },
        {
          statement: "Cumulative adverse cost variance of INR 54,98,134 is a quantified cost exposure. Recoverability is not established.",
          amount_inr: 0, exposure_amount_inr: 5498134, days: 0,
          financial_category: "LEAKAGE_AND_OVERRUN",
          eev2_semantic_classification: "COST_EXPOSURE"
        }
      ];

      // Drive eev2AttachLiveSchedulePosition exactly the way both real call
      // sites do: a browserReport object mutated in place, findings supplied.
      const browserReportMain = { findings: findings.slice() };
      call("eev2AttachLiveSchedulePosition", [browserReportMain]);
      const browserReportRerun = { findings: findings.slice() };
      call("eev2AttachLiveSchedulePosition", [browserReportRerun]);

      const rcMain = browserReportMain.eev2_schedule_reconciliation || {};
      const rcRerun = browserReportRerun.eev2_schedule_reconciliation || {};
      const voMain = rcMain.variation_order_evidence || {};
      const voRerun = rcRerun.variation_order_evidence || {};

      dynamic.main_path = {
        attached: !!browserReportMain.eev2_schedule_reconciliation,
        vo_total_days: voMain.total_approved_schedule_impact_days,
        client_days: (rcMain.delay_position || {}).client_days
      };
      dynamic.rerun_path = {
        attached: !!browserReportRerun.eev2_schedule_reconciliation,
        vo_total_days: voRerun.total_approved_schedule_impact_days,
        client_days: (rcRerun.delay_position || {}).client_days
      };

      // The behavioural assertion that WOULD have caught Phase-1 gap #2
      // (eev2AggregateAndListVoScheduleDays missing) and gap #3
      // (eev2ScheduleVariationOrderPosition missing): the two approved VOs'
      // schedule-impact days (5 + 0) must reach client_days on top of the
      // 7 days the responsibility profile itself states (7 + 5 = 12), on
      // BOTH call sites identically -- a correction rerun must not silently
      // compute a different schedule position than the original submission.
      checks.push(["main_path_attached_reconciliation", dynamic.main_path.attached === true]);
      checks.push(["rerun_path_attached_reconciliation", dynamic.rerun_path.attached === true]);
      checks.push(["main_path_vo_days_aggregated_to_5", dynamic.main_path.vo_total_days === 5]);
      checks.push(["rerun_path_vo_days_aggregated_to_5", dynamic.rerun_path.vo_total_days === 5]);
      checks.push(["main_path_client_days_includes_vo", dynamic.main_path.client_days === 12]);
      checks.push(["rerun_path_client_days_includes_vo", dynamic.rerun_path.client_days === 12]);
      checks.push(["both_call_sites_agree", dynamic.main_path.vo_total_days === dynamic.rerun_path.vo_total_days && dynamic.main_path.client_days === dynamic.rerun_path.client_days]);

      // eev2RouteStructuredBoardroomFindings, driven with the same real
      // 24-page-EOT-claim-shaped prose that exposed Phase-1 gap #5 (the
      // routing function existed under the same name in both the repo and
      // V11 but with an older, evidence-dropping body in the repo -- a
      // presence check alone cannot see this, only driving it can).
      const eotProseResult = call("eev2RouteStructuredBoardroomFindings", [
        "EOT_Claim.pdf", "Page 3",
        "Extension of time claim. Delay analysis and responsibility: 27 calendar days delay attributable to late client approval of drawings."
      ]);
      dynamic.structured_routing_prose_eot = eotProseResult;
      checks.push(["routing_does_not_falsely_short_circuit_unextracted_document", eotProseResult && eotProseResult.handled === false]);

      // Positive control: a document the delay module CAN extract must still
      // be handled normally -- this suite must not just reward "always
      // return handled:false".
      const delayTableResult = call("eev2RouteStructuredBoardroomFindings", [
        "M08_DelayAnalysis_BAD.pdf", "Workspace OCR",
        ["Delay Analysis ID: PROJ-1", "Cause of Delay Days Lost Responsibility Delay Type Mitigation Action",
         "Labour Shortage - Migration of workers post festival 7 Contractor Non-excusable Hire through labour contractors",
         "TOTAL DELAY THIS MONTH 7"].join("\n")
      ]);
      dynamic.structured_routing_real_delay_table = delayTableResult;
      checks.push(["routing_still_handles_a_real_extractable_delay_table", delayTableResult && delayTableResult.handled === true && (delayTableResult.findings || []).length > 0]);
    } catch (execError) {
      dynamic.error = execError && execError.message ? execError.message : String(execError);
      checks.push(["dynamic_execution_did_not_throw", false]);
      reasons.push("DYNAMIC EXECUTION FAILED: " + dynamic.error);
    }
  } else {
    dynamic.skipped_reason = "No runtime context with live eev2AttachLiveSchedulePosition/eev2RouteStructuredBoardroomFindings was supplied -- static call-site checks only.";
  }

  checks.forEach(function (item) {
    if (item[1] !== true) reasons.push("CHECK FAILED: " + item[0]);
  });

  return {
    ticket: "EEV2-008",
    ok: reasons.length === 0,
    checks: checks.map(function (item) { return { check: item[0], pass: item[1] === true }; }),
    dynamic: dynamic,
    reasons: reasons
  };
}
