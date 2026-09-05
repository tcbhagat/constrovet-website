// Loads three REAL source trees and runs EEV2-007 (gate presence + wiring)
// and EEV2-008 (live call chain) against each, asserting the direction of
// each result explicitly. No mocking of the suites themselves; the .gs files
// under test are read from disk and either scanned as text (EEV2-007's own
// design) or loaded into a real vm context and executed (EEV2-008's dynamic
// half).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const REPO = "/media/taran/LargeStorage/taran/constrovet-website";

function loadDir(dir) {
  const files = {};
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".gs") && !name.endsWith(".js")) continue;
    files[name] = readFileSync(join(dir, name), "utf8");
  }
  return files;
}

// --- Tree A: CURRENT apps-script/ (no validation layer at all — post-incident, pre-restore) ---
const currentTree = loadDir(join(REPO, "apps-script"));

// --- Tree B: the OLD, broken candidate — Code.gs-only restore + apps-script/'s stale companions ---
// This is exactly what got pushed and crashed production: the prior merged candidate's Code.gs
// (which itself has the validation layer + EEV2-004/005/006) paired with the REPO's older
// companion files (missing EEV2ScheduleStatusModule entirely, older EEV2LiveScheduleBridge /
// EEV2ScheduleReconciliation / EEV2StructuredRouting / EEV2ProgressModule bodies).
const oldBrokenTree = { ...currentTree };
delete oldBrokenTree["Code.gs"];
oldBrokenTree["Code.gs"] = readFileSync(join(REPO, "recovery-v11", "Code.merged-candidate.js"), "utf8");

// --- Tree C: the Phase-1 full candidate ---
const candidateTree = loadDir(join(REPO, "recovery-v11", "candidate-full"));

// EEV2-007/EEV2-008's static helper needs to be present in the source tree
// scan for eev2ExtractFunctionBody_ to be picked up when EEV2-008 delegates to
// it; since we're calling the suite functions directly here (not sourcing
// them into each tree), pull the real suite source once from apps-script/.
const suiteSource = {
  gatePresence: readFileSync(join(REPO, "apps-script", "EEV2GatePresenceRegression.gs"), "utf8"),
  callChain: readFileSync(join(REPO, "apps-script", "EEV2LiveCallChainRegression.gs"), "utf8")
};

function makeSuiteRunner() {
  const ctx = vm.createContext({ console, RegExp, String, Array, Object, JSON, Number, Boolean, Error, globalThis: {} });
  vm.runInContext(suiteSource.gatePresence, ctx, { filename: "EEV2GatePresenceRegression.gs" });
  vm.runInContext(suiteSource.callChain, ctx, { filename: "EEV2LiveCallChainRegression.gs" });
  return ctx;
}

function runGatePresence(tree) {
  const ctx = makeSuiteRunner();
  vm.runInContext(`eev2RunGatePresenceRegression(${JSON.stringify(tree)})`, ctx);
  return vm.runInContext(`eev2RunGatePresenceRegression(${JSON.stringify(tree)})`, ctx);
}

function loadRuntimeForTree(tree) {
  // Real Apps Script execution context: block every Google service so any
  // accidental live call fails loudly instead of hanging or reaching out.
  const blocked = (svc) => new Proxy({}, { get: (_t, op) => () => { throw new Error(`${svc}.${String(op)} blocked in test runtime`); } });
  const ctx = vm.createContext({
    console, Date, JSON, Math, Number, String, Boolean, Array, Object, RegExp, Error, Set, Map, isFinite,
    DriveApp: blocked("DriveApp"), MailApp: blocked("MailApp"), GmailApp: blocked("GmailApp"),
    UrlFetchApp: blocked("UrlFetchApp"), PropertiesService: blocked("PropertiesService"),
    ScriptApp: blocked("ScriptApp"), FormApp: blocked("FormApp"), SpreadsheetApp: blocked("SpreadsheetApp"),
    Utilities: blocked("Utilities"), Logger: { log() {} }, Session: blocked("Session"),
    HtmlService: blocked("HtmlService"), ContentService: blocked("ContentService"),
    LockService: blocked("LockService"), CacheService: blocked("CacheService"), DocumentApp: blocked("DocumentApp"),
    MimeType: { PLAIN_TEXT: "text/plain", PDF: "application/pdf", CSV: "text/csv", GOOGLE_DOCS: "application/vnd.google-apps.document" }
  });
  const order = Object.keys(tree).filter((n) => n.endsWith(".gs")).sort((a, b) => (a === "Code.gs" ? -1 : b === "Code.gs" ? 1 : a.localeCompare(b)));
  const loadErrors = [];
  for (const name of order) {
    try {
      vm.runInContext(tree[name], ctx, { filename: name });
    } catch (e) {
      loadErrors.push(`${name}: ${e.message}`);
    }
  }
  return { ctx, loadErrors };
}

function runCallChain(tree, label) {
  const { ctx, loadErrors } = loadRuntimeForTree(tree);
  vm.runInContext(suiteSource.callChain, ctx, { filename: "EEV2LiveCallChainRegression.gs" });
  vm.runInContext(suiteSource.gatePresence, ctx, { filename: "EEV2GatePresenceRegression.gs" }); // for eev2ExtractFunctionBody_
  let result;
  try {
    result = vm.runInContext(`eev2RunLiveCallChainRegression(${JSON.stringify(tree)}, globalThis)`, ctx);
  } catch (e) {
    result = { ticket: "EEV2-008", ok: false, reasons: [`suite threw: ${e.message}`], loadErrors };
  }
  if (loadErrors.length) {
    result.ok = false;
    result.loadErrors = loadErrors;
    result.reasons = [...(result.reasons || []), ...loadErrors.map((e) => `LOAD ERROR: ${e}`)];
  }
  return result;
}

const outcomes = [];
function record(label, direction, result) {
  const pass = direction === "fail" ? result.ok === false : result.ok === true;
  outcomes.push({ label, direction, ok: result.ok, pass, reasons: result.reasons });
  console.log(`${pass ? "PASS" : "FAIL"}  [${label}] expected ok=${direction === "fail" ? "false" : "true"}, got ok=${result.ok}`);
  if (!pass || direction === "fail") {
    (result.reasons || []).forEach((r) => console.log(`    - ${r}`));
  }
}

console.log("=== EEV2-007 gate presence + wiring ===");
record("EEV2-007 vs current apps-script/ (no gate)", "fail", runGatePresence(currentTree));
record("EEV2-007 vs Phase-1 candidate", "pass", runGatePresence(candidateTree));
record("EEV2-007 vs old broken candidate (gate present, should still pass presence+wiring)", "pass", runGatePresence(oldBrokenTree));

console.log("\n=== EEV2-008 live call chain ===");
record("EEV2-008 vs current apps-script/ (no gate, no VO fns, old routing)", "fail", runCallChain(currentTree, "current"));
record("EEV2-008 vs OLD BROKEN candidate (Code.gs restored, companions stale)", "fail", runCallChain(oldBrokenTree, "old-broken"));
record("EEV2-008 vs Phase-1 candidate", "pass", runCallChain(candidateTree, "candidate"));

const allPass = outcomes.every((o) => o.pass);
console.log(`\n${outcomes.filter((o) => o.pass).length}/${outcomes.length} directional assertions correct`);
process.exitCode = allPass ? 0 : 1;
