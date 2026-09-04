# EEV2-004 — CHECK 5e, live-only patch

**Status: NOT APPLIED. Paste-ready. The founder holds deploy.**

`validateReportOutput` does not exist in this repo — it lives only in the live
Apps Script project `ConstroVet Evidence Assurance — PRODUCTION`
(script id `1ous3k8pH6pwyH0g-O44nIvmcQTvr9pYuWSfn2apVlnLFRdPWhc5WWvbo`),
in `Code.js`, function starting at line 219 as pulled 2026-09-04.

## Why this exists

Job `form-20260902-184403-e5014284` emailed a client an INR 27,60,26,419
headline. Replayed against that job's real findings, the live validator returns:

    isValid: true | errors: 0 | warnings: 1

Correctly, by its own rules. CHECK 5b asks whether the figure sits next to a
currency marker — `Rs.34503245.66` does. CHECK 5c asks whether it follows a
counting phrase — it follows `Total Procurement Value`, which is not in
`COUNT_PHRASES`. **Every check asks whether the number is real. None asks
whether it belongs to the term that claimed it.**

## Where to paste

In `Code.js`, inside `validateReportOutput`, immediately BEFORE this existing line:

    // CHECK 6: Every finding must cite its source (file + quoted span).

## Verified effect (real jobs, replayed offline 2026-09-04)

| Job | live today | with CHECK 5e |
|---|---|---|
| `form-20260902-184403-e5014284` (emailed INR 27.6 cr) | isValid=true, 0 errors | **isValid=false, 9 errors** |
| `form-20260902-152539-b6de1624` (INR 12 x 8) | isValid=false, 16 errors | isValid=false, 25 errors |
| `form-20260902-072151-3a11bd12` (genuine NGT penalty) | isValid=false, 4 errors | isValid=false, **4 errors**, 4 new warnings |

The third row is the false-positive control. The genuine
`...NGT penalty of Rs. 25,00,000` finding is NOT flagged, and no new BLOCKING
error is introduced. The four new entries there are warnings by design — see the
scope comment in the code.

## Not verified

- Not run inside Apps Script. Verified by extracting the live function verbatim
  and running it under Node against the real `browser-report.json` of three real
  jobs.
- Only three of the ~20 jobs from 2026-09-02 were replayed.
- No ESG_METRIC or BASELINE_BUDGET counter-example was found where the warning
  form would have been wrong to block — the scoping is precautionary, based on
  one probable false positive (the Rs. 3,50,000 anti-smog compliance quotation).

## The patch

```javascript
  // CHECK 5e (EEV2-004): LABEL OWNERSHIP. A figure that is real, and sits next
  // to a real currency marker, can still belong to somebody else's line item.
  // CHECK 5b asks "is this number money?"; 5c asks "is it a count?". Neither
  // asks "does this number belong to the term that claimed it?" — which is why
  // job form-20260902-184403-e5014284 scored isValid=true with 0 errors while
  // emailing a client INR 27,60,26,419 built from the project's own Total
  // Procurement Value, claimed by the trigger term "delay".
  //
  // Rule: the 40 characters immediately preceding the currency marker (the same
  // window CHECK 5c uses) must contain a term of the finding's own category.
  // "…penalty of Rs. 25,00,000" passes. "…Total Procurement Value Rs.34503245.66"
  // does not.
  //
  // Proximity was evaluated and rejected: on real spans the fabricated figure
  // sits 15 chars BEFORE its trigger while a genuine one sits 107 chars after.
  // No distance threshold separates them. Do not re-propose one.
  const OWNERSHIP_RE_BY_CATEGORY = {
    LEAKAGE_AND_OVERRUN: boardroomLeakageRe(),
    BASELINE_BUDGET: boardroomBaselineRe(),
    ESG_METRIC: boardroomEsgRe()
  };
  findings.forEach((f, idx) => {
    if (!(f.amount_inr > 0)) return;

    // Same exemption as CHECK 5b: a STRUCTURED_ACTUAL_BUDGET amount is a
    // computed difference and legitimately never appears verbatim in the text.
    const calc = f.calculation || {};
    if (f.evidence_quality === "STRUCTURED_ACTUAL_BUDGET" &&
        calc.budget > 0 && calc.actual > 0 &&
        Math.abs((calc.actual - calc.budget) - f.amount_inr) <= 1) {
      return;
    }

    const ownershipRe = OWNERSHIP_RE_BY_CATEGORY[f.financial_category];
    if (!ownershipRe) return;   // unknown category is CHECK 2's job, not ours
    const trigger = new RegExp(ownershipRe.source, "i");
    const amountStr = String(f.amount_inr);

    const owned = (f.citations || []).some(c => {
      const text = (c.quoted_span || "");
      const currency = /(?:₹|\bINR\b|\bRs\.?)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac)?/ig;
      let match;
      let previousEnd = 0;
      while ((match = currency.exec(text)) !== null) {
        const labelRegion = text.slice(Math.max(previousEnd, match.index - 40), match.index);
        previousEnd = match.index + match[0].length;
        let value = Number(match[1].replace(/,/g, ""));
        const unit = (match[2] || "").toLowerCase();
        if (unit === "crore" || unit === "cr") value *= 10000000;
        if (unit === "lakh" || unit === "lac") value *= 100000;
        if (String(value) !== amountStr) continue;
        if (trigger.test(labelRegion)) return true;
      }
      return false;
    });

    if (owned) return;
    // Scope: ERROR only for LEAKAGE_AND_OVERRUN, the category the EEV2-004
    // defect actually lives in and the one that drives the client-facing
    // recoverable-exposure headline. BASELINE_BUDGET and ESG_METRIC amounts are
    // reported as WARNINGS: tested against real job form-20260902-072151-3a11bd12
    // the strict form flagged an ESG compliance quotation ("...quotation of
    // Rs. 3,50,000 ... anti-smog") that a human reader would accept, so making
    // those categories block would hold legitimate reports. Revisit only with
    // real counter-examples, not by assumption.
    const message = `UNOWNED_AMOUNT: Finding ${idx} claims INR ${f.amount_inr}, but in every citation that figure is introduced by a label that does not belong to this finding's category (${f.financial_category}) — the figure is real but it is another line item's`;
    if (f.financial_category === "LEAKAGE_AND_OVERRUN") {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  });
```
