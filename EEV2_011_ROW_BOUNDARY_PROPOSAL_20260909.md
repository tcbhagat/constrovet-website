---
name: eev2-011-row-boundary-proposal
description: Design proposal (not yet implemented) for a real fix to cross-row label bleed in boardroomTriggerOwnedAmount, since the EEV2-009 newline-based row-boundary guard does not work against real Gemini OCR extraction, which contains no newlines. Confirms Test A's live failure on job form-20260909-072421-33a43b52 and proposes an approach for review before any code change.
---

# EEV2-011 — Row-boundary guard doesn't work on real OCR text (design proposal, not yet built)

## One sentence
EEV2-009's `\n`-based row-boundary guard only narrows `boardroomTriggerOwnedAmount`'s
label window when a newline is present in the citation text; real Gemini OCR
extraction for tabular documents contains no newlines at all, so the guard is a
no-op in production and the cross-row label-bleed bug it was meant to close is
still live — confirmed by a real Test A submission today.

## Real failure, confirmed live (2026-09-09)

Job `form-20260909-072421-33a43b52`, the real 9-file Procurement_* Test A set,
was **sent** (`email_status: EMAIL_SENT`), not held. The report cited
`INR 3,671` (`amount_inr: 3670.55`) as `LEAKAGE_AND_OVERRUN` from
`Procurement_Purchase_Orders.pdf` — the exact same AAC Blocks (PO-5578-007)
unit-rate figure EEV2-009 was built to stop.

Reproduced directly, offline, against the real citation text pulled from this
job's own `final-report.json` (not reconstructed):

```
$ node -e '... boardroomTriggerOwnedAmount(realSpan, boardroomLeakageRe()) ...'
contains newline: false
length: 1619
boardroomTriggerOwnedAmount result: 3670.55
```

Root cause: the real span is one continuous string —
`"...Supplier-GDelayed PO-5578-007AAC Blocks335 Cu.M Rs.3,670.55..."` — with a
single space, never a newline, between PO-5578-006's trailing "Delayed" and
PO-5578-007's row start. EEV2-008/009's regression fixture used `\n\n` between
rows (a formatting choice made when constructing the test, not something
copied verbatim from a real extraction artifact), so the suite's own assertion
passed while the real-world case it was meant to represent was never actually
covered.

Measured on the real text: the gap from the end of "Delayed" to the start of
"3,670.55" is **34 characters** — inside the existing 40-char
`BOARDROOM_LABEL_WINDOW`, which is why the original (pre-EEV2-009) bug fires,
and why a "just shrink the window" fix would need to go below 34 chars to help
at all, discussed and rejected below.

## Why a per-document ID regex (e.g. `PO-\d{4}-\d{3}`) is the wrong fix

This document's rows genuinely do start with a `PO-5578-0NN` marker, and a
regex keyed to that pattern would fix this exact document. But this project's
own recurring-failure-pattern list (ROADMAP.md) already flags "fixing one
keyword/proximity defect and introducing another in the same mechanism class"
as a repeat failure mode here (leakage regex -> ownership regex -> now this).
A different real document family (Change Order logs, RFI trackers,
correspondence logs — all already submitted this session) has a different row
ID shape or none visible at all in the OCR text. A regex tied to one ID format
would fix Procurement_* and silently leave every other tabular document family
exposed to the same mechanism. Not proposing this.

## What's actually generalizable, and what isn't

Investigated whether a single structural signal (a repeating delimiter, a
consistent character-class transition) reliably marks a row boundary across
different real document families pulled this session. Finding, stated
plainly: **there isn't one that's safe to hardcode.** Real OCR table
extraction concatenates columns with no separator at all in some places
(`"Supplier-GDelayed"`, no space) and a single space in others
(`"Delayed PO-5578-007"`), and the specific words on either side of that
boundary are entirely document-dependent (a status word here, something else
in another table). Any fix built purely from string-shape heuristics on this
one document risks the same trap the newline guard fell into: passing its own
regression suite while not covering the next real document that arrives.

## Proposed direction (for review, not yet built)

Two candidate approaches, presented for a decision rather than picked
unilaterally, since this is exactly the kind of judgment call this project's
guardrails reserve for explicit review before code changes:

**Option A — currency-marker-relative tightening, not a row-boundary detector.**
Instead of trying to detect *where a row starts* (which requires knowing the
document's structure), tighten what counts as "owning" a figure: require the
trigger word to be the *closest* trigger-shaped token to the figure within the
window, not merely *present* somewhere in the window. Concretely: scan the
label region for all matches of the trigger regex, and if more than one
exists, only attribute ownership using the occurrence nearest to the figure —
and separately, check whether a closer occurrence of a *different* row's own
identifying content (e.g. another currency figure, another date pattern)
sits between the candidate trigger word and the figure, which would mean the
trigger and figure are more likely on different logical rows. This uses
signals already present in the text (other currency markers, other dates)
rather than inventing a new per-document pattern.

**Option B — require an unbroken, low-noise span between trigger and figure.**
Every genuine same-row case in this project's existing regression fixtures
(the NGT penalty case, the Crore/Lakh cases) has the trigger word and the
currency figure separated by ordinary prose or a short label, not by a dense
run of other structured data (dates, other amounts, other IDs). Cross-row
bleed cases, by contrast, have the boundary sit inside a dense
number/date/ID-heavy run — exactly the shape CHECK 5d's
`MULTI_AMOUNT_CITATION` warning already detects (a passage with >2 distinct
currency figures). Option B would make the *existing* row-boundary guard
conditional: only trust a trigger-in-window match if the label region doesn't
itself contain another currency figure or a date pattern between the trigger
word and the claimed figure — i.e., reuse CHECK 5d's density signal as a
second, independent gate on `boardroomTriggerOwnedAmount` itself, not just as
a post-hoc warning.

Both are more conservative than a document-specific regex and both are
testable directly against this exact real failing case
(`form-20260909-072421-33a43b52`'s real citation text) plus the existing
genuine-leakage fixtures (NGT penalty, Crore/Lakh) as regression guards. Not
recommending one over the other without your input — Option A changes
ownership-resolution logic itself; Option B adds a second, independent
density-based veto without touching the existing window logic.

## Regression fixture, ready to use once an approach is chosen

The exact real citation text from job `form-20260909-072421-33a43b52`
(pulled from Drive's `final-report.json` for that job, not the earlier
Drive-`read_file_content`-derived EEV2-008/009 fixture) is the correct
regression case going forward — it is what actually shipped, not a
reconstruction. Recorded here so the next step doesn't require re-fetching it:

```
"PRJ-2026-5578 All Purchase Orders PO_Number Material_Description Quatity Unit Rate Total_ValuePO_Date Expected_Delivery Actual_Delivery Delivery_Delay_Days Supplier Status PO-5578-001Cement (OPC 53 Grade) 144 MT Rs.454.16 Rs.65,398.920-Aug-202406-Sep-202412-Sep-20246 Supplier-B Delayed PO-5578-002TMT Steel Bars (Fe 500D) 470 MT Rs.57,248.13Rs.26,906,620.46 23-Sep-202428-Oct-202412-Nov-202415 Supplier-C Delayed PO-5578-003Ready Mix Concrete (M30) 182 Cu.M Rs.6,367.49Rs.1,158,883.94 26-Oct-202421-Nov-202403-Dec-202412 Supplier-D Delayed PO-5578-004Bricks (Class A) 229 1000 Nos Rs.6,028.53Rs.1,380,533.88 18-Mar-202513-Apr-202514-Apr-20251 Supplier-E Delivered PO-5578-005Sand (River Sand) 285 Cu.M Rs.2,101.04Rs.598,796.59 09-Jul-202425-Jul-202401-Aug-20247 Supplier-F Delayed PO-5578-006Aggregates (20mm) 489 Cu.M Rs.1,425.83Rs.697,229.68 09-Dec-202422-Dec-202401-Jan-202510 Supplier-GDelayed PO-5578-007AAC Blocks335 Cu.M Rs.3,670.55Rs.1,229,634.43 1-Dec-202408-Jan-202508-Jan-20250 Supplier-H Delivered PO-5578-008Plywood (BWP) 493 Sheet Rs.1,934.64Rs.953,779.78 18-Feb-202528-Mar-202501-Apr-20254 Supplier-I Delivered PO-5578-009Paint (Emulsion) 309 Liter Rs.470.36 Rs.145,342.75 03-Apr-202529-Apr-202509-May-202510 Supplier-J Delayed PO-5578-010Ceramic Tiles 204 Sq.M Rs.483.32 Rs.98,596.9228-Mar-202520-Apr-202518-Apr-20250 Supplier-A Delivered PO-5578-011Aluminum Windows 490 Sq.M Rs.2,568.93Rs.1,258,776.52 18-Nov-202406-Dec-202412-Dec-20246 Supplier-B Delayed PO-5578-012Electrical Cables 59 RM Rs.163.59 Rs.9,651.7924-Sep-202431-Oct-202405-Nov-20245 Supplier-C Delivered Category: 09_Procurement NBC 2016"
```

Expected `boardroomTriggerOwnedAmount(fullSpan, boardroomLeakageRe())` result
once fixed: `0` (no genuine trigger word owns any figure in this row-dense
metadata table).

## What this means for M3 / M10 / project state

- **M3 is not fully DONE against its own real acceptance criteria.** The
  checksum match (code deployed as intended) is real and confirmed, but the
  underlying defect this milestone exists to close is still live in
  production, proven by a real Test A submission today. Recommend PROJECT_MILESTONES.md
  reflect this as "DEPLOYED, DEFECT NOT ACTUALLY CLOSED" rather than DONE,
  pending a real fix.
- **M10's first cycle is a real FAIL**, not a clean run — recorded as such,
  not rounded to a pass or silently retried.
- **Test A must not be re-run against unfixed code** — repeating the same
  live-fire test without a code change would just resend the same fabricated
  figure to an inbox again.

## Not yet done
- No code change has been made. This is a proposal only, per explicit
  instruction to show the approach before implementing.
- Neither Option A nor Option B has been chosen.
- The submitter-address deviation (this Test A run went from
  `bhagat.taran@gmail.com`, not `admin@constrovet.com` as Contract 5's canary
  rule specifies) is noted but not the subject of this document — no external
  exposure occurred (same personal inbox as every prior run), but the
  instruction wasn't followed for this run.
