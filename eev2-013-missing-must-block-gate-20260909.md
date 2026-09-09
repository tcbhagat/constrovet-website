---
name: eev2-013-missing-must-block-gate-20260909
description: EEV2-013 — the Procurement_* MUST-BLOCK gate documented in validation-layer-audit-20260902.md was never actually built. Confirmed by code trace (detectDocumentTemplate() is a label-only function, never read as a blocking condition) and by two real failed Test A attempts (form-20260909-072421-33a43b52, form-20260909-165508-4076a2ce). Unlike EEV2-004 through EEV2-012, this is not a bug in existing logic — it's a real product-behavior decision that needs the founder's call before any code gets written. Read before building anything against this ticket.
---

# EEV2-013 — The MUST-BLOCK gate was never built — 2026-09-09

## One sentence
The 9-file Procurement_* test set was designed from day one (Sept 2) as a synthetic
negative case that should always be held, never emailed — but no code anywhere reads
the document-template label as a condition for blocking a submission; the label exists
only for grouping repeated failures in review, and the two real attempts to trigger this
gate (once with the fabrication bug live, once after it was fixed) both resulted in a
report being sent.

## Real evidence — two real jobs, not hypothetical
- `form-20260909-072421-33a43b52` (before EEV2-012): sent, with a fabricated `INR 3,671`
  headline.
- `form-20260909-165508-4076a2ce` (after EEV2-012): sent, with a correct `INR 0`
  headline, evidence gaps correctly noted, recovery actions correctly withheld —
  **but still sent as a client-facing report**, which the original spec says should
  never happen for this document set.

## Root cause, traced in the real code
`detectDocumentTemplate()` (`apps-script/Code.gs`) derives a label like `"Procurement_*"`
from filenames. Its own comment states the purpose: *"so repeated failures from one
boilerplate template can be grouped in review."* The actual send/hold decision
(`REVERTED_NOT_SENT` vs `PASSED_VALIDATION`) is driven entirely by
`validationResult.isValid` — the per-figure checks (CHECK 5b/5c/5e, EEV2-012's
ownership veto). The template label is never read as an input to that decision anywhere
in the file. This was confirmed by search, not assumed.

## The real question — this is not a bug fix, it's a product decision
Every EEV2-004 through EEV2-012 fix corrected a specific extraction/attribution error
without changing what kind of report gets sent. This ticket is different: fixing it
means deciding **what "must block" should actually mean for a real client**, not just
patching a regex. Three candidate directions, genuinely different in consequence:

**A — Gate on evidence completeness, for every submission, permanently.**
If every cited finding in a report has `Evidence status: CITED_WITH_OPEN_EVIDENCE_GAPS`
(no finding with complete, verified evidence), hold the report entirely instead of
emailing it with caveats. This is a real behavior change affecting every future real
client, not just this test set — a legitimate first submission with genuine evidence
gaps would also be held under this rule, which may or may not be the right first
impression for a paying client.

**B — Gate on this specific synthetic canary only, not evidence-gaps generally.**
Some narrower signal specific to how this 9-file set was constructed (worth asking:
what made this exact set "should always fail" in the original test design — was it the
evidence gaps specifically, or some other property?) — narrower blast radius, but risks
being a special case that doesn't generalize to the next real problematic submission.

**C — Reconsider whether "must block" is still the right spec at all.**
The current behavior — an honest report stating `INR 0`, no recovery action recommended,
evidence gaps clearly flagged, follow-up requested — might actually be reasonable,
desired behavior for a genuine evidence-gap case, not a defect. The Sept 2 audit wrote
"must block" before this document set's exact real behavior under the now-more-mature
validation layer was known. Worth asking whether the spec itself needs revisiting, not
just the code.

## Recommendation
Not made here. This needs the founder's read on which of A/B/C reflects the actual
product intent, before any code is written — building a technical fix to a spec that
might itself be wrong would be exactly the "reasoned-not-measured" mistake EEV2-011
made, one layer up.

## Not verified
- What specifically about this 9-file set made it "should always fail" in the original
  Sept 2 test design — the evidence-gap characteristic, or something else not yet
  identified.
- Whether any other document template in real use would trigger evidence-gap-only
  findings the same way, which would matter for how narrow or broad option A's blast
  radius actually is.
- `eev2AuditJob`'s four-artifact status for either real job — still not run.

## Next single step
Not a code change. A decision: which of A, B, or C — or a fourth option not listed here
— reflects what should actually happen the next time a real submission looks like this.
