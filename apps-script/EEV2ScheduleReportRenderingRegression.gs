// EEV2 schedule rendering regression — safe manual TEST runner.

function eev2RunScheduleReportRenderingRegression() {
  const browserReport = {
    eev2_executive_schedule_text: [
      "Schedule Position",
      "Planned progress: 66.7%",
      "Actual progress: 64.3%",
      "Reported source variance: -2.3 percentage points",
      "Recalculated variance: -2.4 percentage points",
      "Observed delay-event days: 32",
      "Contractor non-excusable: 11 days",
      "Client-caused: 7 days",
      "Neutral / external: 14 days",
      "Critical-path impact: NOT_ESTABLISHED",
      "Causal relationship to cost exposure: NOT_ESTABLISHED"
    ],
    eev2_executive_schedule_html: '<h2>Schedule Position</h2><table><tr><td>Observed delay-event days</td><td>32</td></tr></table><p>Observed delay-event days are not equivalent to project critical-path delay.</p>'
  };

  const text = eev2ScheduleEmailTextLines(browserReport);
  const html = eev2ScheduleEmailHtml(browserReport);
  const md = eev2AppendScheduleToMarkdown("# Executive Report\n", browserReport);
  const md2 = eev2AppendScheduleToMarkdown(md, browserReport);
  const rendered = `${text.join("\n")}\n${html}\n${md}`;

  const checks = [
    ["text_present", text.length >= 10],
    ["planned_present", /66\.7%/.test(rendered)],
    ["actual_present", /64\.3%/.test(rendered)],
    ["source_variance_present", /-2\.3/.test(rendered)],
    ["recalc_present", /-2\.4/.test(rendered)],
    ["observed_days_present", /Observed delay-event days[:<\/td>\s]*32/i.test(rendered)],
    ["responsibility_present", /11 days/.test(rendered) && /7 days/.test(rendered) && /14 days/.test(rendered)],
    ["critical_path_guardrail", /Critical-path impact: NOT_ESTABLISHED/.test(rendered)],
    ["cost_causation_guardrail", /Causal relationship to cost exposure: NOT_ESTABLISHED/.test(rendered)],
    ["html_present", /<h2>Schedule Position<\/h2>/.test(html)],
    ["markdown_present", /## Schedule Position/.test(md)],
    ["markdown_idempotent", (md2.match(/## Schedule Position/g) || []).length === 1],
    ["no_project_delayed_32_claim", !/project delayed by 32 days/i.test(rendered)],
    ["no_cost_causation_claim", !/(delay|delays).{0,40}(caused|causes).{0,40}(cost|exposure|overrun)/i.test(rendered)]
  ];

  const result = {
    ticket: "EEV2-002E-RENDER",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true }))
  };

  console.log("EEV2 SCHEDULE REPORT RENDERING REGRESSION");
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) throw new Error("EEV2 schedule report rendering regression FAILED. See execution log.");
  console.log("EEV2 SCHEDULE REPORT RENDERING REGRESSION PASS: ok=true");
  return result;
}