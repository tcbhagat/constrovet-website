# Autofix pipeline report — Issue #15

**EEV2-004: leakage-amount extraction ignores which figure the trigger term actually points at**

Verdict: **ALREADY_FIXED**

This report was produced by the daily-issue-fix-pr.yml pipeline. Nothing
in this PR was pushed to Apps Script and no live deploy occurred — this
pipeline never invokes `clasp`. Per AGENTS.md, any apps-script/-touching
commit still requires founder approval before merge, unchanged by this
pipeline existing.

## Analysis

NOTE ON THIS DRY-RUN: ANTHROPIC_API_KEY is not configured in this repo or
this local environment (confirmed via `gh secret list` returning empty and
`echo $ANTHROPIC_API_KEY` returning unset). scripts/autofix-issue.mjs is
real, working code that would make this exact call in a live run, but for
this dry-run the analysis below was produced by Claude (interactively, in
this same session) reading the real repository directly, performing the
identical task the script's system/user prompt specifies: read real current
source, quote before proposing anything, determine ALREADY_FIXED vs
NEEDS_FIX. This is not a simulated or fabricated output -- it is a real
analysis of real current apps-script/Code.gs, done by the same model the
script would have called, just invoked directly instead of via the
Messages API this one time.

VERDICT: ALREADY_FIXED

ROOT_CAUSE: A finding tagged LEAKAGE_AND_OVERRUN is built from a text span
that is tested against a trigger-keyword regex (boardroomLeakageRe) purely
as a boolean gate -- if the regex matches anywhere in the span, a finding
fires. Separately, an amount is extracted from that same span. If the
amount-extraction step scans the whole span from character 0 rather than
looking specifically at what text is near the matched trigger term, it can
attach a completely unrelated currency figure to the finding -- e.g. a
"Total Procurement Value" label's value gets attributed to a finding whose
trigger term was "delay", because both happen to appear in the same OCR'd
span.

EVIDENCE (apps-script/Code.gs, current HEAD):

Line 2130-2137:
    if (boardroomLeakageRe().test(lower)) {
      // EEV2-004: was boardroomFirstAmount(span), which scanned from character 0
      // and let a trigger term claim any figure in the span regardless of which
      // label owned it. No fallback to `actual` here: when no figure is owned by
      // the trigger the finding reports 0 and keeps its narrative and days.
      const amount = boardroomTriggerOwnedAmount(span, boardroomLeakageRe());
      const days = boardroomFirstDays(span);
      findings.push(boardroomFinding(boardroomSignalStatement_("LEAKAGE", span, amount, days), "LEAKAGE_AND_OVERRUN", amount, days, file, pageOrSheet, span, budget || 0, actual || 0, actual && budget ? actual - budget : 0, amount || days ? "MEDIUM" : "LOW"));

The call site's own inline comment (added at the time of the fix) states
explicitly that this line previously called `boardroomFirstAmount(span)`
and describes the exact defect this issue reports -- confirming the
described bug is not hypothetical, it is the documented, already-fixed
predecessor state of this exact line.

Line 2301-2319, the fix itself:
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
attributes one to the finding if the trigger keyword itself appears within
a BOARDROOM_LABEL_WINDOW=40-character lookback immediately preceding that
figure -- i.e. the figure must be "owned" by a label that includes the
trigger term, not merely co-located anywhere in the same span. A figure
whose nearest preceding label is something else (e.g. "Total Procurement
Value") is skipped, and the function falls through to `return 0` if no
figure is ever trigger-owned. This directly satisfies both conditions in
the issue's "what fixed looks like": an unrelated aggregate/unit-rate
figure is not attributed (no owning label match within the window), and a
genuinely trigger-adjacent figure (e.g. "...penalty of Rs. 25,00,000" where
"penalty" is itself a trigger term) is still correctly extracted.

A regression suite already exists and already exercises exactly this
distinction: apps-script/EEV2ProximityRegression.gs, function
eev2RunProximityRegression(). It uses real production `quoted_span` values
from job form-20260902-184403-e5014284 (the same incident this repo's
Open Item 7 / CHECK 5e work also addresses, at a different pipeline layer)
as its fabrication fixtures, plus a real genuine-penalty case and explicit
non-regression checks against the unrelated EEV2-003 word-boundary fix.

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

