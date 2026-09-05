// Phase 1 verification: extract the previously-missing functions from the REAL
// candidate files (byte-offset brace matcher, not retyped) and execute each in an
// isolated vm context with realistic input. No harness, no npm test.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const C = "/media/taran/LargeStorage/taran/constrovet-website/recovery-v11/candidate-full";
const src = (name) => readFileSync(join(C, name), "utf8");

// Extract `function NAME(...) { ... }` verbatim by brace matching from the file text.
function extractFn(text, name) {
  const start = text.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found`);
  let i = text.indexOf("{", start), depth = 0, inStr = null, inTpl = 0;
  for (; i < text.length; i++) {
    const ch = text[i], prev = text[i - 1];
    if (inStr) { if (ch === inStr && prev !== "\\") inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
    if (ch === "/" && text[i + 1] === "/") { i = text.indexOf("\n", i); continue; }
    if (ch === "/" && text[i + 1] === "*") { i = text.indexOf("*/", i) + 1; continue; }
    if (ch === "{") depth++;
    if (ch === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  throw new Error(`unterminated ${name}`);
}
function ctx(extra = {}) { return vm.createContext({ Date, JSON, Math, Number, String, Boolean, Array, Object, RegExp, Error, Set, Map, isFinite, console, ...extra }); }
// Values created inside the vm realm carry that realm's prototypes; strict deepEqual rejects them
// even when structurally identical. Round-trip through JSON so comparisons are by value only.
const plain = (v) => JSON.parse(JSON.stringify(v));
const eq = (a, b) => assert.deepEqual(plain(a), plain(b));
const results = [];
const check = (label, fn) => { try { fn(); results.push([label, "PASS"]); } catch (e) { results.push([label, "FAIL: " + e.message]); } };

// ---- 1. eev2ScheduleStatusContradictionFindings_ (EEV2ScheduleStatusModule.gs) ----
// Depends on boardroomFinding (Code.gs). Extract that one function verbatim from candidate Code.gs.
{
  const code = src("Code.gs");
  const bfSrc = extractFn(code, "boardroomFinding");
  const modSrc = src("EEV2ScheduleStatusModule.gs");
  const c = ctx();
  vm.runInContext(bfSrc, c, { filename: "Code.gs#boardroomFinding" });
  vm.runInContext(modSrc, c, { filename: "EEV2ScheduleStatusModule.gs" });
  const text = [
    "SCHEDULE STATUS REPORT - Project PRJ-1182 Month 9 of 18",
    "Schedule Performance Index (SPI) 0.87 ON SCHEDULE",
    "Planned Completion Date 15-Mar-2026 Revised Completion Date 30-Apr-2026 ON TRACK",
    "Critical Path Status float fully consumed on Block B superstructure CRITICAL"
  ].join("\n");
  const out = vm.runInContext(`eev2ScheduleStatusContradictionFindings_("Schedule_Status_Report_Sep.pdf", "Page 1", ${JSON.stringify(text)})`, c);
  check("scheduleStatus: returns 3 contradiction findings on a self-contradicting report", () => {
    assert.equal(out.length, 3);
    for (const f of out) { assert.equal(f.eev2_semantic_classification, "SCHEDULE_STATUS_CONTRADICTION"); assert.equal(f.recoverability_guardrail, "NOT_ESTABLISHED"); assert.equal(f.amount_inr, 0); }
    assert.match(out[0].statement, /SPI\) of 0\.87/);
    assert.equal(out[1].days, 46);
    assert.match(out[2].statement, /Critical Path Status as CRITICAL/);
  });
  const none = vm.runInContext(`eev2ScheduleStatusContradictionFindings_("PO_Cement.pdf", "Page 1", "Purchase order cement OPC 53 grade Rs.454.16 per MT qty 120 MT")`, c);
  check("scheduleStatus: non-schedule document returns [] (negative control)", () => eq(none, []));
  const parsed = vm.runInContext(`eev2ParseScheduleStatusContradiction_(${JSON.stringify(out[0].statement)})`, c);
  check("scheduleStatus: eev2ParseScheduleStatusContradiction_ (2nd Code.gs call site) parses SPI gap 13", () => eq(parsed, { type: "SPI", gap: 13 }));
  console.log("scheduleStatus sample finding[1]:", out[1].statement);
}

// ---- 2. eev2AggregateAndListVoScheduleDays (EEV2LiveScheduleBridge.gs), pure ----
const voFindings = [
  { statement: "Approved variation/change order VO-11/01 with cited cost impact of INR 10,50,000 and 5 day(s) stated schedule impact. Approved change against baseline -- monitor; not contractor-recoverable leakage.", amount_inr: 1050000, exposure_amount_inr: 0, days: 5, financial_category: "BASELINE_BUDGET", eev2_semantic_classification: "BASELINE_BUDGET" },
  { statement: "Approved variation/change order VO-12/02 with cited cost impact of INR 2,50,000 and 0 day(s) stated schedule impact. Approved change against baseline -- monitor; not contractor-recoverable leakage.", amount_inr: 250000, exposure_amount_inr: 0, days: 0, financial_category: "BASELINE_BUDGET", eev2_semantic_classification: "BASELINE_BUDGET" },
  { statement: "Cumulative adverse cost variance of INR 54,98,134 is a quantified cost exposure. Recoverability is not established.", amount_inr: 0, exposure_amount_inr: 5498134, days: 0, financial_category: "LEAKAGE_AND_OVERRUN", eev2_semantic_classification: "COST_EXPOSURE" }
];
let voAgg;
{
  const c = ctx();
  vm.runInContext(extractFn(src("EEV2LiveScheduleBridge.gs"), "eev2AggregateAndListVoScheduleDays"), c);
  voAgg = vm.runInContext(`eev2AggregateAndListVoScheduleDays(${JSON.stringify(voFindings)})`, c);
  check("voAggregate: sums only positive-day VOs (5), lists both VOs, ignores non-BASELINE finding", () => {
    assert.equal(voAgg.days, 5); assert.equal(voAgg.entries.length, 2);
    assert.equal(voAgg.entries[0].vo_reference, "VO-11/01"); assert.equal(voAgg.entries[0].has_schedule_impact, true);
    assert.equal(voAgg.entries[1].vo_reference, "VO-12/02"); assert.equal(voAgg.entries[1].has_schedule_impact, false);
  });
  check("voAggregate: empty / undefined input returns {days:0, entries:[]}", () => { const z = vm.runInContext("eev2AggregateAndListVoScheduleDays(undefined)", c); eq(z, { days: 0, entries: [] }); });
}

// ---- 3. eev2ScheduleVariationOrderPosition (EEV2ScheduleReconciliation.gs), pure ----
{
  const c = ctx();
  vm.runInContext(extractFn(src("EEV2ScheduleReconciliation.gs"), "eev2ScheduleVariationOrderPosition"), c);
  const pos = vm.runInContext(`eev2ScheduleVariationOrderPosition(${JSON.stringify({ entries: voAgg.entries, total_approved_schedule_impact_days: voAgg.days })})`, c);
  check("voPosition: passes entries through and coerces total days to Number 5", () => { assert.equal(pos.entries.length, 2); assert.strictEqual(pos.total_approved_schedule_impact_days, 5); });
  check("voPosition: undefined evidence -> {entries:[], total 0}", () => eq(vm.runInContext("eev2ScheduleVariationOrderPosition(undefined)", c), { entries: [], total_approved_schedule_impact_days: 0 }));
}

// ---- 4. eev2StatedVariancePhrase_ / eev2FormatStatedVariance_ (EEV2ProgressModule.gs), pure ----
{
  const c = ctx();
  const p = src("EEV2ProgressModule.gs");
  vm.runInContext(extractFn(p, "eev2FormatStatedVariance_"), c);
  vm.runInContext(extractFn(p, "eev2StatedVariancePhrase_"), c);
  const r = (v) => vm.runInContext(`[eev2StatedVariancePhrase_(${JSON.stringify(v)}), eev2FormatStatedVariance_(${JSON.stringify(v)})]`, c);
  check("statedVariance: -2.4 -> 'is -2.4% points' / '-2.4%'", () => eq(r(-2.4), ["is -2.4% points", "-2.4%"]));
  check("statedVariance: null -> 'was not stated in the document' (never renders literal null)", () => eq(r(null), ["was not stated in the document", "not stated in the document"]));
  check("statedVariance: string 'null' and '' also treated as not stated", () => { assert.equal(r("null")[1], "not stated in the document"); assert.equal(r("")[1], "not stated in the document"); });
  check("statedVariance: NaN treated as not stated", () => assert.equal(vm.runInContext("eev2FormatStatedVariance_(NaN)", c), "not stated in the document"));
}

// ---- 5. Real call chain: eev2AttachLiveSchedulePosition through the whole candidate (every submission path) ----
{
  const blocked = (s) => new Proxy({}, { get: (_t, op) => () => { throw new Error(`${s}.${String(op)} blocked`); } });
  const c = ctx({ DriveApp: blocked("DriveApp"), MailApp: blocked("MailApp"), GmailApp: blocked("GmailApp"), UrlFetchApp: blocked("UrlFetchApp"), PropertiesService: blocked("PropertiesService"), ScriptApp: blocked("ScriptApp"), FormApp: blocked("FormApp"), SpreadsheetApp: blocked("SpreadsheetApp"), Utilities: blocked("Utilities"), Logger: { log() {} }, Session: blocked("Session"), HtmlService: blocked("HtmlService"), ContentService: blocked("ContentService") });
  const { readdirSync } = await import("node:fs");
  const files = readdirSync(C).filter((n) => n.endsWith(".gs")).sort((a, b) => (a === "Code.gs" ? -1 : b === "Code.gs" ? 1 : a.localeCompare(b)));
  for (const f of files) vm.runInContext(src(f), c, { filename: f });
  const fixture = [
    { statement: "Overall progress is 41.2% actual versus 43.6% planned. Source variance is -2.4% points; recalculated from displayed rounded values -2.4% points.", financial_category: "BASELINE_BUDGET", amount_inr: 0, exposure_amount_inr: 0, days: 0, citations: [{ file: "Progress.pdf", page_or_sheet: "Page 1", quoted_span: "Overall Project Progress: Planned = 43.6% | Actual = 41.2% | Variance = -2.4%" }], calculation: { budget: 43.6, actual: 41.2, difference: -2.4 }, eev2_semantic_classification: "PROGRESS_VARIANCE", variance_consistency: "SOURCE_MATCHES_RECALCULATION" },
    { statement: "Observed delay events total 32 days.", amount_inr: 0, exposure_amount_inr: 0, days: 32, financial_category: "LEAKAGE_AND_OVERRUN", eev2_semantic_classification: "OBSERVED_DELAY_EVENT_DAYS" },
    { statement: "Delay responsibility profile: contractor non-excusable 11 days; client 7 days; neutral/external 14 days.", amount_inr: 0, exposure_amount_inr: 0, days: 0, financial_category: "LEAKAGE_AND_OVERRUN", eev2_semantic_classification: "DELAY_RESPONSIBILITY_PROFILE" },
    ...voFindings
  ];
  const rep = vm.runInContext(`eev2AttachLiveSchedulePosition({ findings: ${JSON.stringify(fixture)} })`, c);
  check("callChain: eev2AttachLiveSchedulePosition runs end-to-end and VO days (5) reach client_days (7+5=12)", () => {
    const rc = rep.eev2_schedule_reconciliation;
    assert.equal(rc.variation_order_evidence.total_approved_schedule_impact_days, 5);
    // OBSERVATION (V11 behaviour, not introduced here): a real PROGRESS_VARIANCE finding also carries
    // financial_category BASELINE_BUDGET, so it is listed as a 3rd "VO" entry with empty vo_reference
    // and 0 days. It does not change the day sum. V11's own fixture omits financial_category on its
    // progress finding, which is why V11's regression sees exactly 2. Recorded, not changed.
    const entries = plain(rc.variation_order_evidence.entries);
    assert.equal(entries.length, 3);
    eq(entries.filter((e) => e.vo_reference).map((e) => [e.vo_reference, e.schedule_impact_days]), [["VO-11/01", 5], ["VO-12/02", 0]]);
    assert.equal(entries.filter((e) => !e.vo_reference).length, 1);
    assert.equal(entries.find((e) => !e.vo_reference).schedule_impact_days, 0);
    assert.equal(rc.delay_position.client_days, 12);
    assert.equal(rep.eev2_executive_schedule_summary.client_days, 12);
  });
  const routed = vm.runInContext(`eev2RouteStructuredBoardroomFindings("EOT_Claim.pdf", "Page 3", "Extension of time claim. Delay analysis and responsibility: 27 calendar days delay attributable to late client approval of drawings.")`, c);
  check("callChain: V11 routing does NOT short-circuit a recognised-but-unextracted document (5th gap)", () => assert.equal(routed.handled, false));
  const ss = vm.runInContext(`eev2ScheduleStatusContradictionFindings_("Schedule_Status.pdf", "Page 1", "Schedule Status Report\\nSchedule Performance Index (SPI) 0.91 ON TRACK\\nCritical Path Status CLEAR")`, c);
  check("callChain: schedule-status module callable inside the full candidate (1 SPI finding)", () => assert.equal(ss.length, 1));
}

let bad = 0;
for (const [l, r] of results) { console.log((r === "PASS" ? "PASS  " : "FAIL  ") + l + (r === "PASS" ? "" : "  -> " + r)); if (r !== "PASS") bad++; }
console.log(`\n${results.length - bad}/${results.length} checks passed`);
process.exitCode = bad ? 1 : 0;
