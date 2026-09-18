// EEV2-018 / EEV2-005-008 — browser-side guards in assets/js/dashboard-analyzer.js.
//
// Why this file exists: /upload submits browser_report.findings straight to the
// server, so the browser analyzer -- not Code.gs -- is what actually produced the
// 2026-09-18 incident (job cv-20260917223525-2z8936), where a US-dollar CSV
// shipped as "INR 5,400 across 12 finding(s)". The Apps Script regression gate
// only loads .gs files, so this whole path had no test coverage at all. That is
// also how the client copy of the EEV2-005/008 span truncation survived the
// 2026-09-08 server-side fix for ten days.
//
// The analyzer is a browser IIFE that returns early without a DOM and exports
// nothing, so its helpers are extracted by name and evaluated in a VM. That
// keeps these assertions behavioural (real inputs, real outputs) rather than
// grepping for strings, while matching the source-level checking this repo
// already does in eev2-send-gate-chokepoint.test.mjs.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const analyzerPath = join(root, "assets/js/dashboard-analyzer.js");
const source = readFileSync(analyzerPath, "utf8");

function extractFunction(name) {
  const pattern = new RegExp(`^  function ${name}\\([\\s\\S]*?^  \\}`, "m");
  const match = pattern.exec(source);
  assert.ok(match, `could not extract ${name}() from dashboard-analyzer.js — was it renamed?`);
  return match[0];
}

function loadAnalyzer() {
  const context = vm.createContext({ Number, String, Math, RegExp, JSON, Object, Array });
  const names = ["firstAmount", "parseAmount", "formatInr", "hasForeignCurrency", "finding", "csvBudgetActualFinding"];
  vm.runInContext(names.map(extractFunction).join("\n"), context);
  return context;
}

const HEADERS = ["Task description", "Budget", "Actual", "Invoices"];
const spanFor = (task, budget, actual) => `Task description: ${task} | Budget: ${budget} | Actual: ${actual}`;

function runRow(context, row) {
  context.__row = row;
  context.__headers = HEADERS;
  context.__span = spanFor(row[0], row[1], row[2]);
  return vm.runInContext(
    'JSON.stringify(csvBudgetActualFinding("test.csv", "CSV row 2", __span, __headers, __row) || null)',
    context
  );
}

test("EEV2-018: a foreign-currency CSV row produces no finding in the browser", () => {
  const context = loadAnalyzer();

  // The exact row from the real incident report's own citations.
  assert.equal(
    runRow(context, ["Steel Framing", "$45,000.00", "$46,000.00", "$46,000.00"]),
    "null",
    "the real incident row must no longer produce a finding"
  );

  for (const row of [
    ["Excavation", "€12,000.00", "€12,500.00", ""],
    ["Roofing", "£22,000.00", "£23,000.00", ""],
    ["Cladding", "¥15,000", "¥15,500", ""],
    ["Masonry", "USD 18000", "USD 18500", ""],
    ["Flooring", "EUR 13000", "EUR 13500", ""],
    ["Painting", "AED 9000", "AED 9500", ""]
  ]) {
    assert.equal(runRow(context, row), "null", `${row[1]} must not produce an INR-labelled finding`);
  }
});

test("EEV2-018: INR and unmarked rows still produce findings", () => {
  const context = loadAnalyzer();

  // Over-blocking here would break every ordinary submission, so these matter
  // as much as the cases above.
  for (const [row, expected] of [
    [["Excavation", "12000", "12500", ""], 500],
    [["Steel Framing", "INR 45,000.00", "INR 46,000.00", ""], 1000],
    [["Roofing", "Rs. 22,000", "Rs. 23,000", ""], 1000],
    [["Cladding", "₹15,000", "₹15,500", ""], 500]
  ]) {
    const finding = JSON.parse(runRow(context, row));
    assert.ok(finding, `${row[1]} must still produce a finding`);
    assert.equal(finding.amount_inr, expected);
    assert.equal(finding.financial_category, "LEAKAGE_AND_OVERRUN");
  }

  // The pre-existing no-overrun rule must be untouched.
  assert.equal(runRow(context, ["Curing", "3000", "3000", ""]), "null");
});

test("EEV2-018: the whole real USD CSV yields zero findings, its INR twin yields twelve", () => {
  const context = loadAnalyzer();
  const usdRows = [
    ["Excavation", "$12,000.00", "$12,500.00"], ["Steel Framing", "$45,000.00", "$46,000.00"],
    ["Roofing Installation", "$22,000.00", "$23,000.00"], ["Exterior Cladding", "$15,000.00", "$15,500.00"],
    ["Door Installation", "$8,000.00", "$8,200.00"], ["Electrical Rough-in", "$16,000.00", "$16,500.00"],
    ["Insulation", "$7,000.00", "$7,200.00"], ["Drywall Taping", "$4,000.00", "$4,200.00"],
    ["Flooring Installation", "$13,000.00", "$13,500.00"], ["Plumbing Fixtures", "$6,000.00", "$6,200.00"],
    ["Trim and Millwork", "$9,500.00", "$9,600.00"], ["Landscaping", "$12,000.00", "$12,500.00"]
  ];
  const tally = (rows) => rows.reduce((acc, r) => {
    const f = JSON.parse(runRow(context, [r[0], r[1], r[2], ""]));
    return f ? { count: acc.count + 1, total: acc.total + f.amount_inr } : acc;
  }, { count: 0, total: 0 });

  // Before the fix this produced exactly the shipped headline: 12 / INR 5,400.
  assert.deepEqual(tally(usdRows), { count: 0, total: 0 });

  const inrRows = usdRows.map((r) => [r[0], r[1].replace("$", "INR "), r[2].replace("$", "INR ")]);
  assert.deepEqual(tally(inrRows), { count: 12, total: 5400 });
});

test("EEV2-018: the guard fails closed on a source tree without it", () => {
  // Proves the tests above would actually catch a regression, rather than
  // passing for some unrelated reason.
  const context = vm.createContext({ Number, String, Math, RegExp, JSON, Object, Array });
  const withoutGuard = [
    extractFunction("firstAmount"), extractFunction("parseAmount"),
    extractFunction("formatInr"), extractFunction("finding"),
    extractFunction("csvBudgetActualFinding").replace(/if \(hasForeignCurrency[^\n]*\n/, "")
  ].join("\n");
  vm.runInContext(withoutGuard, context);
  context.__row = ["Steel Framing", "$45,000.00", "$46,000.00", ""];
  context.__headers = HEADERS;
  context.__span = spanFor("Steel Framing", "$45,000.00", "$46,000.00");
  const finding = JSON.parse(vm.runInContext(
    'JSON.stringify(csvBudgetActualFinding("t.csv", "r", __span, __headers, __row) || null)', context));

  assert.ok(finding, "removing the guard must reproduce the bug");
  assert.equal(finding.amount_inr, 1000);
  assert.match(finding.statement, /INR 1,000/, "this is the mislabeling the guard prevents");
});

test("EEV2-005/008: the browser must not truncate quoted_span before validation", () => {
  const context = loadAnalyzer();
  const longSpan = `Steel Framing budget line ${"x".repeat(900)} INR 46,000 invoiced`;
  context.__span = longSpan;
  const finding = JSON.parse(vm.runInContext(
    'JSON.stringify(finding("s", "LEAKAGE_AND_OVERRUN", 1000, 0, "f.csv", "1", __span, 45000, 46000, 1000, "HIGH"))',
    context
  ));

  // Storage-time truncation is the EEV2-005/008 defect itself: the server's
  // validator checks claimed figures against this text, so cutting it here
  // means the gate verifies against evidence that was silently shortened.
  assert.equal(finding.citations[0].quoted_span.length, longSpan.length);
  assert.equal(finding.citations[0].quoted_span, longSpan);
  assert.ok(!/\.\.\.$/.test(finding.citations[0].quoted_span));
});
