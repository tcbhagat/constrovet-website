---
name: eev2-011-row-boundary-proposal
description: Revised design proposal (not yet implemented) for a real fix to cross-row label bleed in boardroomTriggerOwnedAmount. The EEV2-009 newline guard is a no-op on real Gemini OCR text. This revision empirically tests four candidate general signals (character-class transitions, whitespace-run patterns, and the original doc's Option A/Option B) against the real job form-20260909-072421-33a43b52 citation text and the existing genuine-leakage fixtures — none hold up as a safe, document-agnostic signal. Proposes a narrower, explicitly-labeled interim fix and tracks the general problem as its own separate open item, per explicit instruction not to fold the two together.
---

# EEV2-011 — Row-boundary guard doesn't work on real OCR text (revised proposal, not yet built)

## One sentence
EEV2-009's `\n`-based row-boundary guard only narrows `boardroomTriggerOwnedAmount`'s
label window when a newline is present in the citation text; real Gemini OCR
extraction for tabular documents contains no newlines at all, so the guard is a
no-op in production — confirmed live by job `form-20260909-072421-33a43b52`. This
revision empirically tests whether a *general*, document-agnostic structural signal
exists to replace it. **It does not, on the evidence gathered so far.** A narrower
interim fix is proposed instead, explicitly labeled interim, with the general
problem tracked separately below.

## Real failure, confirmed live (2026-09-09) — unchanged from the original proposal
Job `form-20260909-072421-33a43b52`, the real 9-file Procurement_* Test A set, was
**sent** (`email_status: EMAIL_SENT`), not held. The report cited `INR 3,671`
(`amount_inr: 3670.55`) as `LEAKAGE_AND_OVERRUN` from `Procurement_Purchase_Orders.pdf`
— the exact AAC Blocks (PO-5578-007) unit-rate figure EEV2-009 was built to stop.

Root cause, reproduced offline against the real citation text pulled from this job's
own `final-report.json`: the real span is one continuous string —
`"...Supplier-GDelayed PO-5578-007AAC Blocks335 Cu.M Rs.3,670.55..."` — with a single
space, never a newline, between PO-5578-006's trailing "Delayed" and PO-5578-007's row
start. The gap from the end of "Delayed" to the start of "3,670.55" is **34
characters**, inside the existing 40-char `BOARDROOM_LABEL_WINDOW`.

## Why a per-document ID regex (e.g. `PO-\d{4}-\d{3}`) is the wrong fix — unchanged
This document's rows genuinely start with a `PO-5578-0NN` marker, and a regex keyed to
that exact pattern would fix this one document. This project's own recurring-failure
list already flags "fixing one keyword/proximity defect and introducing another in the
same mechanism class" as a repeat pattern here. Not proposing a `PO-####-###`-specific
regex.

## What was actually tested this revision (real code, real text — not speculation)

The original version of this document proposed "Option A" and "Option B" as
*untested*, "testable" candidates. This revision ran four candidates for real against
(a) the exact real `form-20260909-072421-33a43b52` citation text and (b) the four
existing genuine-leakage regression fixtures (NGT penalty, liquidated damages,
material wastage, 245-Crores budget). Full results below, with the actual commands
and output.

### Candidate 1 — bare character-class transition (digit/lowercase → uppercase)
Hypothesis: a row boundary is marked by a transition from a lowercase letter or digit
directly into an uppercase letter (`[a-z0-9]\s{0,1}[A-Z]`), since `"...Delayed PO-..."`
and `"...GDelayed PO-..."` both show exactly this shape.

**Tested against the real document:** the signal fires **90 times** in the full real
citation text. Only **12 of those 90** correspond to an actual row start (the 12 real
PO row boundaries). The other 78 fire on ordinary field-to-field transitions inside a
single row (date → `Supplier`, material description → quantity, etc.) — e.g. `"...
20246 Supplier-B Delayed..."` triggers the same pattern mid-row, not at a row boundary.
**Precision: 12/90 ≈ 13%. Rejected — far too noisy to trust.**

**Worse, tested against the genuine fixtures:** the signal also fires immediately
*before* the currency marker itself in every `Rs.`-prefixed genuine case, because `Rs`
starts with an uppercase letter following whitespace:

```
"NGT imposed a penalty of Rs. 25,00,000..." -> nearest transition 2 chars before "Rs."
"Liquidated damages of Rs. 8,50,000..."     -> nearest transition 2 chars before "Rs."
"Material wastage valued at Rs. 3,75,000..." -> nearest transition 2 chars before "Rs."
```

Using this signal to cap the label window would shrink it to ~2 characters immediately
before "Rs." in every genuine case tested — destroying visibility of "penalty",
"damages", "wastage" entirely. **This candidate is disqualified twice over: low
precision on the real document, and self-defeating on genuine cases.**

### Candidate 2 — whitespace-run length
Hypothesis: a row boundary might use a different amount of whitespace than an ordinary
field separator (e.g. two spaces, a tab-like gap).

**Tested against the real document:** every whitespace run in the entire real citation
text is exactly **1 character** — including the boundary that has no space at all
(`"Supplier-GDelayed PO-5578-007"`, where "GDelayed" glues directly onto the previous
cell). There is **zero variance** to detect. **Rejected — no signal exists at all in
this real text.**

### Candidate 3 — original "Option B" (currency/date density veto, reusing CHECK 5d)
Hypothesis (from the original version of this document): a row-boundary crossing sits
inside a dense run of other structured data (dates, other currency figures), so
requiring the label region to be free of a second currency figure or a date pattern
before trusting a trigger match should catch it.

**Tested against the real, actual 40-char label region scanned for PO-5578-007's
figure** (not a wider window — the real window the existing code scans):

```
label region: "-GDelayed PO-5578-007AAC Blocks335 Cu.M "
contains a date-shaped token: false
contains a second currency figure: false
```

**This candidate does NOT fire on the real failing case.** The previous row's dates
(`09-Dec-2024`, etc.) and second currency figure (`Rs.697,229.68`) sit *further back*
than the 40-character window reaches — they're invisible to this check by the time it
runs. **The original document's claim that Option B was "testable" against this case
turned out, on actual testing, to be wrong: it would not have caught this failure.**
Recorded here to correct that claim rather than carry it forward untested.

### Candidate 4 — original "Option A" (nearest-of-multiple trigger occurrences)
Hypothesis: if more than one trigger word sits in the label window, only trust the one
closest to the figure.

**Tested against the real label region** (`"-GDelayed PO-5578-007AAC Blocks335 Cu.M "`):
only **one** trigger match exists in that window (`"Delay"`, from "GDelayed"). There is
no second, competing trigger occurrence to disambiguate between. **This candidate does
not apply to this failure mode at all** — the bug here isn't "which of several trigger
words owns this figure," it's "the only trigger word in the window belongs to a
different row than the figure does." Recorded here to correct the original document's
framing, not just to reject the option.

## Conclusion: no general, document-agnostic structural signal was found
Four candidates were tested for real, against the real failing text and the real
genuine-case fixtures. None hold up as a safe, general row-boundary signal:
character-class transitions are both too noisy (13% precision) and self-defeating
(collide with the currency marker itself); whitespace-run patterns carry no
information in this real document; and the two previously-proposed options either
don't fire on the real failure (Option B) or don't apply to this failure mode at all
(Option A). This is a stronger, evidence-based version of the prior document's
softer claim ("there isn't one that's safe to hardcode") — that claim is now
confirmed by actual testing, not just reasoning.

## Interim fix (explicitly labeled interim — not the general solution)

**Candidate 5 — generalized record-ID-token pattern**, broader than a single
document's ID format: `\b[A-Z]{1,6}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\d\b` — an
uppercase-letter prefix (1-6 chars), a hyphen, an alphanumeric/hyphenated body ending
in a digit. This is **not** `PO-\d{4}-\d{3}` specifically — it also matches
`PRJ-2026-5578`, and would match other common construction-document ID conventions
(`CO-2026-014`, `RFI-118`, `WO-4471`, etc.) without being tied to any one of them.

**Tested against the real document:** fires at **all 12 of 12** real row boundaries
(`PO-5578-001` through `PO-5578-012`), exactly at each row's start position — verified
by exact string-index match, not visual inspection.

**Tested against all 4 genuine-leakage fixtures:** fires **zero** times in any of
them — none of "NGT imposed a penalty of Rs. 25,00,000...", "Liquidated damages of
Rs. 8,50,000...", "Material wastage valued at Rs. 3,75,000...", or "High-Level Budget:
₹ 245 Crores..." contain any ID-shaped token, so none would have their label window
incorrectly narrowed.

**What this candidate would and wouldn't catch, worked against the real case:**
using this pattern to cap the label region at the nearest such ID-token found before
the currency match (the same mechanism the `\n`-based guard used, just with a
different boundary marker) would correctly cap PO-5578-007's label region at the
start of `"PO-5578-007"` itself, excluding "GDelayed" entirely and correctly
returning `0` for `boardroomTriggerOwnedAmount` on this real case.

**Why this is interim, not general, and must be labeled as such:** it is still
fundamentally an ID-token-shape heuristic — broader than one document's exact format,
but it only works for document families whose rows carry a *visible, structured ID
token* in the OCR text. It provides zero protection for a document family whose rows
have no such visible ID (a narrative correspondence log, a table with only descriptive
row labels and no code). Whether any of this session's other real document families
(Change Order logs, RFI trackers, Governance/Risk-Register docs) lack a visible
per-row ID token in their actual OCR text has **not been checked this revision** — see
the open item below.

## Separate open item — tracked independently, not folded into "the fix"

**No document-agnostic (ID-token-free) row-boundary signal exists, on the evidence
gathered so far.** If Candidate 5 ships as the interim fix, any real document family
whose rows are not identified by a visible structured code in the extracted text
remains exposed to the same cross-row label-bleed mechanism this whole EEV2-008/009/011
chain has been chasing. This needs its own real investigation — pulling OCR text from
a real document family without visible row IDs and checking whether *any* signal
(not yet identified) distinguishes its row boundaries — before it can be closed. Not
scoped or attempted in this document.

## Regression fixture — unchanged, real, not reconstructed
The exact real citation text from job `form-20260909-072421-33a43b52` (pulled from
Drive's `final-report.json` for that job):

```
"PRJ-2026-5578 All Purchase Orders PO_Number Material_Description Quatity Unit Rate Total_ValuePO_Date Expected_Delivery Actual_Delivery Delivery_Delay_Days Supplier Status PO-5578-001Cement (OPC 53 Grade) 144 MT Rs.454.16 Rs.65,398.920-Aug-202406-Sep-202412-Sep-20246 Supplier-B Delayed PO-5578-002TMT Steel Bars (Fe 500D) 470 MT Rs.57,248.13Rs.26,906,620.46 23-Sep-202428-Oct-202412-Nov-202415 Supplier-C Delayed PO-5578-003Ready Mix Concrete (M30) 182 Cu.M Rs.6,367.49Rs.1,158,883.94 26-Oct-202421-Nov-202403-Dec-202412 Supplier-D Delayed PO-5578-004Bricks (Class A) 229 1000 Nos Rs.6,028.53Rs.1,380,533.88 18-Mar-202513-Apr-202514-Apr-20251 Supplier-E Delivered PO-5578-005Sand (River Sand) 285 Cu.M Rs.2,101.04Rs.598,796.59 09-Jul-202425-Jul-202401-Aug-20247 Supplier-F Delayed PO-5578-006Aggregates (20mm) 489 Cu.M Rs.1,425.83Rs.697,229.68 09-Dec-202422-Dec-202401-Jan-202510 Supplier-GDelayed PO-5578-007AAC Blocks335 Cu.M Rs.3,670.55Rs.1,229,634.43 1-Dec-202408-Jan-202508-Jan-20250 Supplier-H Delivered PO-5578-008Plywood (BWP) 493 Sheet Rs.1,934.64Rs.953,779.78 18-Feb-202528-Mar-202501-Apr-20254 Supplier-I Delivered PO-5578-009Paint (Emulsion) 309 Liter Rs.470.36 Rs.145,342.75 03-Apr-202529-Apr-202509-May-202510 Supplier-J Delayed PO-5578-010Ceramic Tiles 204 Sq.M Rs.483.32 Rs.98,596.9228-Mar-202520-Apr-202518-Apr-20250 Supplier-A Delivered PO-5578-011Aluminum Windows 490 Sq.M Rs.2,568.93Rs.1,258,776.52 18-Nov-202406-Dec-202412-Dec-20246 Supplier-B Delayed PO-5578-012Electrical Cables 59 RM Rs.163.59 Rs.9,651.7924-Sep-202431-Oct-202405-Nov-20245 Supplier-C Delivered Category: 09_Procurement NBC 2016"
```

Expected `boardroomTriggerOwnedAmount(fullSpan, boardroomLeakageRe())` result once
fixed: `0` (no genuine trigger word owns any figure in this row-dense metadata table).

## What this means for M3 / M10 / project state — unchanged from the original
- M3 remains REOPENED: checksum match confirms deployment, not correctness.
- M10 remains BLOCKED: first real cycle is a genuine FAIL.
- Test A must not be re-run against unfixed code.

## Not yet done
- No code change has been made — this is a proposal only.
- Neither the interim fix (Candidate 5) nor a path to a general solution has been
  chosen or approved.
- The general-signal open item above is unresolved and unscoped, tracked separately.
- Whether other real document families (Change Order logs, RFI trackers,
  Governance/Risk-Register docs) have a visible per-row ID token has not been checked.
- The submitter-address deviation on the real Test A run (`bhagat.taran@gmail.com`
  instead of `admin@constrovet.com`, per Contract 5) is noted but not resolved here.
