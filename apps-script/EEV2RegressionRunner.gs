// TEST-only regression runner for EEV2-001.
// Adds visible logs and fails loudly when any synthetic cost check fails.

function eev2RunRegressionAndLog() {
  const result = eev2SyntheticCostRegression();
  console.log(JSON.stringify(result, null, 2));
  if (!result || result.ok !== true) {
    throw new Error("EEV2 synthetic cost regression FAILED. See Execution log for details.");
  }
  console.log("EEV2 REGRESSION PASS: ok=true");
  return result;
}
