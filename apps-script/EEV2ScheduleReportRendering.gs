// Constrovet Evidence Engine v2 — schedule rendering bridge for existing report/email builders.
// Safe rule: render only schedule data already attached to browserReport by eev2AttachLiveSchedulePosition().

const EEV2_SCHEDULE_REPORT_RENDERING_VERSION = "2.0.0-dev.1";

function eev2ScheduleEmailTextLines(browserReport) {
  const report = browserReport || {};
  const lines = report.eev2_executive_schedule_text || [];
  return Array.isArray(lines) ? lines.slice() : [];
}

function eev2ScheduleEmailHtml(browserReport) {
  const report = browserReport || {};
  return String(report.eev2_executive_schedule_html || "");
}

function eev2ScheduleMarkdownBlock(browserReport) {
  const lines = eev2ScheduleEmailTextLines(browserReport);
  if (!lines.length) return "";
  return ["", "## Schedule Position", "", ...lines.slice(1), ""].join("\n");
}

function eev2AppendScheduleToMarkdown(markdown, browserReport) {
  const base = String(markdown || "");
  const block = eev2ScheduleMarkdownBlock(browserReport);
  if (!block) return base;
  if (/##\s+Schedule Position/i.test(base)) return base;
  return `${base}${block}`;
}
