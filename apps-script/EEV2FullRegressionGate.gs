// Constrovet Evidence Engine v2 — EEV2-002F
// Full regression gate for routing + exposure reporting + delay + EOT + progress + reconciliation + executive schedule reporting.
// Safe to run manually in Apps Script TEST project. Does not submit forms or modify production data.

function eev2RunFullRegressionGate() {
  const suites = [
    { id: "EEV2-001", name: "Structured cost extraction", fn: "eev2RunRegressionAndLog" },
    { id: "EEV2-001G", name: "Executive exposure reporting", fn: "eev2RunExecutiveExposureRegression" },
    { id: "EEV2-002A", name: "Structured delay extraction", fn: "eev2RunDelayRegression" },
    { id: "EEV2-002B", name: "EOT intelligence", fn: "eev2RunEotRegression" },
    { id: "EEV2-002C", name: "Structured progress extraction", fn: "eev2RunProgressRegression" },
    { id: "EEV2-002D", name: "Cross-document reconciliation", fn: "eev2RunScheduleReconciliationRegression" },
    { id: "EEV2-002E", name: "Executive schedule reporting", fn: "eev2RunExecutiveScheduleReportingRegression" },
    { id: "EEV2-002E-RENDER", name: "Schedule report rendering", fn: "eev2RunScheduleReportRenderingRegression" },
    { id: "EEV2-002E-LIVE-BRIDGE", name: "Live schedule bridge", fn: "eev2RunLiveScheduleBridgeRegression" },
    { id: "EEV2-002F-ROUTING", name: "Structured cost, delay and progress routing", fn: "eev2RunStructuredRoutingRegression" }
  ];

  const results = [];

  suites.forEach((suite) => {
    const callable = eev2ResolveRegressionFunction(suite.fn);
    if (!callable) {
      results.push({
        id: suite.id,
        name: suite.name,
        function_name: suite.fn,
        status: "MISSING",
        ok: false,
        error: `Required regression function ${suite.fn} is not available in this Apps Script project.`
      });
      return;
    }

    try {
      const result = callable();
      const ok = Boolean(result && result.ok === true);
      results.push({
        id: suite.id,
        name: suite.name,
        function_name: suite.fn,
        status: ok ? "PASS" : "FAIL",
        ok,
        result: result || null
      });
    } catch (err) {
      results.push({
        id: suite.id,
        name: suite.name,
        function_name: suite.fn,
        status: "ERROR",
        ok: false,
        error: String(err && err.message ? err.message : err)
      });
    }
  });

  const allPresent = results.every((item) => item.status !== "MISSING");
  const allPass = results.every((item) => item.ok === true);

  const gate = {
    ticket: "EEV2-002F",
    gate: "FULL_REGRESSION_GATE",
    ok: allPresent && allPass,
    all_required_suites_present: allPresent,
    suite_count: suites.length,
    pass_count: results.filter((item) => item.ok).length,
    fail_count: results.filter((item) => !item.ok).length,
    suites: results.map((item) => ({
      id: item.id,
      name: item.name,
      function_name: item.function_name,
      status: item.status,
      ok: item.ok,
      error: item.error || ""
    })),
    live_pipeline_integration_authorized: allPresent && allPass,
    next_step: allPresent && allPass
      ? "Proceed to controlled TEST-only pipeline integration. Do not deploy or merge yet."
      : "STOP. Fix missing or failed regression suites before modifying Code.gs or running another Form submission."
  };

  console.log("EEV2-002F FULL REGRESSION GATE");
  console.log(JSON.stringify(gate, null, 2));

  if (!gate.ok) {
    throw new Error("EEV2-002F FULL REGRESSION GATE FAILED. Do not modify Code.gs. See execution log.");
  }

  console.log("EEV2-002F FULL REGRESSION GATE PASS: ok=true");
  return gate;
}

function eev2ResolveRegressionFunction(name) {
  const registry = {
    eev2RunRegressionAndLog: typeof eev2RunRegressionAndLog === "function" ? eev2RunRegressionAndLog : null,
    eev2RunStructuredRoutingRegression: typeof eev2RunStructuredRoutingRegression === "function" ? eev2RunStructuredRoutingRegression : null,
    eev2RunExecutiveExposureRegression: typeof eev2RunExecutiveExposureRegression === "function" ? eev2RunExecutiveExposureRegression : null,
    eev2RunDelayRegression: typeof eev2RunDelayRegression === "function" ? eev2RunDelayRegression : null,
    eev2RunEotRegression: typeof eev2RunEotRegression === "function" ? eev2RunEotRegression : null,
    eev2RunProgressRegression: typeof eev2RunProgressRegression === "function" ? eev2RunProgressRegression : null,
    eev2RunScheduleReconciliationRegression: typeof eev2RunScheduleReconciliationRegression === "function" ? eev2RunScheduleReconciliationRegression : null,
    eev2RunExecutiveScheduleReportingRegression: typeof eev2RunExecutiveScheduleReportingRegression === "function" ? eev2RunExecutiveScheduleReportingRegression : null,
    eev2RunScheduleReportRenderingRegression: typeof eev2RunScheduleReportRenderingRegression === "function" ? eev2RunScheduleReportRenderingRegression : null,
    eev2RunLiveScheduleBridgeRegression: typeof eev2RunLiveScheduleBridgeRegression === "function" ? eev2RunLiveScheduleBridgeRegression : null
  };
  return registry[name] || null;
}
