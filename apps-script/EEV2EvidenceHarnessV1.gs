// Constrovet Evidence Harness v1 — TEST-only acceptance gate.
// Pure regression execution: no Drive, email, HTTP, forms, triggers, or production writes.

function eev2RunEvidenceHarnessV1() {
  const startedAt = new Date().toISOString();
  const regression = eev2RunFullRegressionGate();
  const suites = regression.suites || [];
  const failedSuites = suites.filter((suite) => suite.ok !== true);

  const result = {
    harness: "CONSTROVET_EVIDENCE_HARNESS_V1",
    mode: "TEST_ONLY",
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    ok: regression.ok === true && failedSuites.length === 0,
    production_mutation_authorized: false,
    paid_service_required: false,
    regression: {
      suite_count: regression.suite_count,
      pass_count: regression.pass_count,
      fail_count: regression.fail_count,
      pass_rate_pct: regression.suite_count
        ? Math.round((regression.pass_count / regression.suite_count) * 10000) / 100
        : 0,
      failed_suite_ids: failedSuites.map((suite) => suite.id)
    },
    release_decision: regression.ok === true && failedSuites.length === 0
      ? "READY_FOR_CONTROLLED_TEST_PROJECT_VALIDATION"
      : "BLOCKED_FIX_REGRESSIONS_FIRST",
    next_step: regression.ok === true && failedSuites.length === 0
      ? "Run the same gate in the Apps Script TEST project, then validate GOOD, BAD and NORMAL reference PDFs."
      : "Do not deploy. Correct every missing, failed or errored suite and rerun the harness."
  };

  console.log("CONSTROVET EVIDENCE HARNESS V1");
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    throw new Error("Constrovet Evidence Harness v1 failed. Production deployment is blocked.");
  }

  return result;
}
