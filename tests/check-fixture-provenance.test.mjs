import assert from "node:assert/strict";
import test from "node:test";
import { checkFileContent } from "../scripts/check-fixture-provenance.mjs";

// fixture-provenance-pattern-20260909.md, "Regression test for the fix
// itself": a deliberately unjustified "\n\n" fixture must fail, and the same
// fixture with a "// KNOWN-SYNTHETIC:" comment must pass.

test("flags a fixture containing the Drive-extraction tell with no justification", () => {
  const content =
    'const span = "PO-5578-006Supplier-GDelayed\\n\\nPO-5578-007AAC Blocks335 Cu.M Rs.3,670.55";\n';
  const violations = checkFileContent("fake/EEV2FakeRegression.gs", content);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].line, 1);
});

test("passes the same fixture once a KNOWN-SYNTHETIC comment justifies it", () => {
  const content =
    "// KNOWN-SYNTHETIC: intentionally Drive-shaped, testing the truncation\n" +
    "// boundary itself, not row-boundary behavior.\n" +
    'const span = "PO-5578-006Supplier-GDelayed\\n\\nPO-5578-007AAC Blocks335 Cu.M Rs.3,670.55";\n';
  const violations = checkFileContent("fake/EEV2FakeRegression.gs", content);
  assert.equal(violations.length, 0);
});

test("ignores fixtures with no Drive-extraction tell at all", () => {
  const content =
    'const span = "PO-5578-007AAC Blocks335 Cu.M Rs.3,670.55 Supplier-H Delivered";\n';
  const violations = checkFileContent("fake/EEV2FakeRegression.gs", content);
  assert.equal(violations.length, 0);
});

test("a justification more than the lookback window away does not count", () => {
  const filler = Array.from({ length: 10 }, (_, i) => `// filler line ${i}`).join("\n");
  const content =
    "// KNOWN-SYNTHETIC: this justification is too far from the fixture below.\n" +
    `${filler}\n` +
    'const span = "row one\\n\\nrow two";\n';
  const violations = checkFileContent("fake/EEV2FakeRegression.gs", content);
  assert.equal(violations.length, 1);
});

test("flags multiple unjustified occurrences independently", () => {
  const content =
    'const a = "row1\\n\\nrow2";\n' +
    'const b = "row3\\n\\nrow4";\n';
  const violations = checkFileContent("fake/EEV2FakeRegression.gs", content);
  assert.equal(violations.length, 2);
});
