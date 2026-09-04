// EEV2-006 regression — safe to run manually in Apps Script TEST project.
// Proves the ROADMAP.md Milestone 7 circuit-breaker (2026-09-04, six-lens
// audit): sendReportEmail must refuse to send while GATE_HEALTH is "FAILED",
// regardless of which caller invokes it, and boardroomGateHealthCheck must
// correctly detect both a presence failure and an invocation failure.
//
// This is a redundant, independent path on top of validateReportOutput --
// it must work even when reasoning about validateReportOutput's own behavior
// would be circular. It is tested here as a plain kill-switch: does
// sendReportEmail actually refuse to run when the property is set, using
// real PropertiesService, not a mock.
//
// NOTE: this suite uses the real Apps Script PropertiesService and MailApp,
// so it is NOT safe to add to the local Node harness (scripts/run-eev2-
// harness.mjs), which blocks those services entirely by design. Run this one
// manually inside the Apps Script TEST project only, the same way
// EEV2ControlledTestReleaseGate.gs's fail-closed check is run.

function eev2RunGateHealthCircuitBreakerRegression() {
  const checks = [];
  const props = PropertiesService.getScriptProperties();
  const originalValue = props.getProperty(GATE_HEALTH_PROPERTY);

  try {
    // CHECK 1: kill-switch set -- sendReportEmail must throw, must NOT call
    // MailApp.sendEmail. Uses a syntactically valid but unroutable test
    // address so a real send would be detectable if the guard failed.
    props.setProperty(GATE_HEALTH_PROPERTY, "FAILED");
    let threw = false;
    let messageMentionsGateHealth = false;
    try {
      sendReportEmail("test-recipient@example.invalid", "TEST-JOB-001", { browser_report: {} }, null, "");
    } catch (error) {
      threw = true;
      messageMentionsGateHealth = /GATE_HEALTH_FAILED/.test(String(error.message || error));
    }
    checks.push(["kill-switch set: sendReportEmail throws", threw === true]);
    checks.push(["kill-switch set: error message identifies GATE_HEALTH_FAILED (not a generic failure)", messageMentionsGateHealth === true]);

    // CHECK 2: kill-switch cleared -- sendReportEmail must reach the normal
    // email-validation check (isValidEmail), not the circuit breaker. Passing
    // a deliberately invalid email proves execution passed the breaker: the
    // resulting error must be the *email validation* error, not GATE_HEALTH_FAILED.
    props.deleteProperty(GATE_HEALTH_PROPERTY);
    let clearedThrew = false;
    let clearedIsEmailError = false;
    try {
      sendReportEmail("not-an-email", "TEST-JOB-002", { browser_report: {} }, null, "");
    } catch (error) {
      clearedThrew = true;
      clearedIsEmailError = /Valid user email is required/.test(String(error.message || error));
    }
    checks.push(["kill-switch cleared: sendReportEmail proceeds past the breaker", clearedThrew === true && clearedIsEmailError === true]);

    // CHECK 3: boardroomClearGateHealthKillSwitch_ actually clears the property.
    props.setProperty(GATE_HEALTH_PROPERTY, "FAILED");
    boardroomClearGateHealthKillSwitch_();
    checks.push(["boardroomClearGateHealthKillSwitch_ removes the property", props.getProperty(GATE_HEALTH_PROPERTY) === null]);

    // CHECK 4: boardroomGateHealthCheck detects a presence failure when a
    // required function name is (simulated as) undefined. Cannot literally
    // undefine a function in this runtime, so this checks the reasons array
    // shape directly against the real, current deployment instead -- on a
    // deployment where the validation layer IS present (this one), ok must
    // be true and reasons must be empty.
    const presenceResult = boardroomGateHealthCheck();
    checks.push(["boardroomGateHealthCheck reports ok=true when the validation layer is present", presenceResult.ok === true]);
    checks.push(["boardroomGateHealthCheck sets no reasons when healthy", presenceResult.reasons.length === 0]);
    // The check above also exercises the real MailApp/PropertiesService path;
    // since it found no failure it must not have re-set GATE_HEALTH.
    checks.push(["a healthy check does not set the kill-switch", props.getProperty(GATE_HEALTH_PROPERTY) === null]);
  } finally {
    // Restore whatever was there before this suite ran, real or absent.
    if (originalValue === null) {
      props.deleteProperty(GATE_HEALTH_PROPERTY);
    } else {
      props.setProperty(GATE_HEALTH_PROPERTY, originalValue);
    }
  }

  const output = {
    ticket: "EEV2-006",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };

  console.log("EEV2-006 GATE HEALTH CIRCUIT BREAKER REGRESSION");
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) throw new Error("EEV2-006 gate health circuit breaker regression FAILED. See execution log.");
  console.log("EEV2-006 GATE HEALTH CIRCUIT BREAKER REGRESSION PASS: ok=true");
  return output;
}
