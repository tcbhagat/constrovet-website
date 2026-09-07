# Autofix pipeline report — Issue #15

**EEV2-004: leakage-amount extraction ignores which figure the trigger term actually points at**

Verdict: **ALREADY_FIXED**

This report was produced by the daily-issue-fix-pr.yml pipeline. Nothing
in this PR was pushed to Apps Script and no live deploy occurred — this
pipeline never invokes `clasp`. Per AGENTS.md, any apps-script/-touching
commit still requires founder approval before merge, unchanged by this
pipeline existing.

## Analysis

NOTE ON THIS RUN: The real Anthropic API call (scripts/autofix-issue.mjs,
invoked via the actual GitHub Actions workflow, run 34099250030) reached
the API successfully -- GH_TOKEN was fixed and the request was sent -- but
the account behind ANTHROPIC_API_KEY returned 400 invalid_request_error,
"Your credit balance is too low to access the Anthropic API." A retry after
attempting to add credit also failed (payment method declined). This is a
real billing blocker on the founder's Anthropic account, not a pipeline
defect -- confirmed by the specific, correctly-formed API error message,
not a malformed-request or auth error.

Per founder direction, this run substitutes Claude (interactively, in the
paid Claude Code session already open) for the literal HTTP call, doing
the identical task autofix-issue.mjs's system/user prompt specifies: read
real current source, quote before proposing anything, determine
ALREADY_FIXED vs NEEDS_FIX. This is not a simulated or fabricated verdict --
it is a real analysis of real current apps-script/Code.gs, re-verified cold
(fresh grep against current HEAD, not reused from a stale prior read)
immediately before writing this file.

VERDICT: ALREADY_FIXED

ROOT_CAUSE: A finding tagged LEAKAGE_AND_OVERRUN is built from a text span
tested against a trigger-keyword regex (boardroomLeakageRe) purely as a
boolean gate -- if the regex matches anywhere in the span, a finding fires.
Separately, an amount is extracted from that same span. If amount-extraction
scans the whole span from character 0 rather than looking at text near the
matched trigger term specifically, it can attach a completely unrelated
currency figure to the finding.

EVIDENCE (apps-script/Code.gs, current HEAD, re-confirmed by grep this run):

Line 2130-2137:
    if (boardroomLeakageRe().test(lower)) {
      // EEV2-004: was boardroomFirstAmount(span), which scanned from character 0
      // and let a trigger term claim any figure in the span regardless of which
      // label owned it. No fallback to `actual` here: when no figure is owned by
      // the trigger the finding reports 0 and keeps its narrative and days.
      const amount = boardroomTriggerOwnedAmount(span, boardroomLeakageRe());
      const days = boardroomFirstDays(span);
      findings.push(boardroomFinding(boardroomSignalStatement_("LEAKAGE", span, amount, days), "LEAKAGE_AND_OVERRUN", amount, days, file, pageOrSheet, span, budget || 0, actual || 0, actual && budget ? actual - budget : 0, amount || days ? "MEDIUM" : "LOW"));

Line 2301-2319, the fix itself (BOARDROOM_LABEL_WINDOW=40 defined at line 9):
    function boardroomTriggerOwnedAmount(text, keywordRegex) {
      const source = String(text || "");
      const currency = /(?:₹|\bINR\b|\bRs\.?)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac)?/ig;
      const trigger = new RegExp(keywordRegex.source, "i");
      let match;
      let previousEnd = 0;
      while ((match = currency.exec(source))) {
        const labelStart = Math.max(previousEnd, match.index - BOARDROOM_LABEL_WINDOW);
        const labelRegion = source.slice(labelStart, match.index);
        previousEnd = match.index + match[0].length;
        if (!trigger.test(labelRegion)) continue;
        let value = Number(match[1].replace(/,/g, ""));
        const unit = (match[2] || "").toLowerCase();
        if (unit === "crore" || unit === "cr") value *= 10000000;
        if (unit === "lakh" || unit === "lac") value *= 100000;
        return value;
      }
      return 0;
    }

This walks every currency-marked figure in the span in order and only
attributes one to the finding if the trigger keyword appears within a
40-character lookback immediately preceding that figure -- the figure must
be "owned" by a label containing the trigger term, not merely co-located.
An unrelated aggregate/unit-rate figure is skipped; the function returns 0
if nothing is ever trigger-owned. This satisfies both conditions in the
issue's "what fixed looks like": unrelated figures are not attributed, and
genuinely trigger-adjacent figures (e.g. "penalty of Rs. 25,00,000" where
"penalty" is itself a trigger term) are still correctly extracted.

A regression suite already exists and exercises exactly this distinction:
apps-script/EEV2ProximityRegression.gs, eev2RunProximityRegression(). It
uses real production quoted_span values from job
form-20260902-184403-e5014284 as fabrication fixtures, a real genuine-
penalty case, and explicit non-regression checks against the EEV2-003
word-boundary fix.

FIX_NEEDED: no. The described defect matches the documented, already-fixed
EEV2-004 state of this code exactly. No code change is proposed.


## Verified this run

- Full regression suite (`npm run test:harness` + `npm test`) was run
  after this pipeline's step, with the result recorded in this PR's CI
  checks, not just asserted here.

## Not verified by this pipeline

- Whether the model's root-cause reasoning is correct beyond what the
  regression suite can catch — founder review is still the closing step,
  per this project's standing operating rules.

