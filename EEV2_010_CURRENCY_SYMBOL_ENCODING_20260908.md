---
name: eev2-010-currency-symbol-encoding-20260908
description: EEV2-010 — real document (national_Highway_PROJ, Month_01/BAD) renders its ₹ symbol as a bare "■" (U+25A0) in extracted text, making genuine currency figures invisible to boardroomFirstAmount/boardroomTriggerOwnedAmount, which only match ₹/INR/Rs. Found while testing Phase 2 gap #1 (evidence-window density), not a targeted search. UNVERIFIED against the real Gemini extraction pipeline — only confirmed via Drive's own read_file_content tool so far. Read before trusting amount_inr=0 on any finding derived from a document with irregular currency-symbol rendering.
---

# EEV2-010 — Currency symbol encoding blind spot — 2026-09-08

## One sentence
Two real files in the `national_Highway_PROJ` test corpus (`M01_MonthlySummary.pdf`,
`M01_IPC.pdf`) render their rupee amounts as `■ 1,073,700,365` instead of
`Rs.1,073,700,365` or `₹1,073,700,365` in extracted text — and every currency-detection
function in `Code.gs` (`boardroomFirstAmount`, `boardroomLastAmount`,
`boardroomTriggerOwnedAmount`) only matches `₹`, `\bINR\b`, or `\bRs\.?`, so these real,
large, genuine figures are currently invisible to the pipeline.

## How this was found
Not a targeted search — found incidentally while testing whether the
`national_Highway_PROJ / Month_01 / BAD` file set exercises the Phase 2 gap #1
evidence-window cap (`boardroomEvidenceWindows`, 40-window limit, `Code.gs:2287`). It
doesn't (confirmed: each file produces at most 1 evidence window). While checking that,
the `■` substitution was visible in the raw extracted text and confirmed independently
by two different reads (a `search_files` content snippet and a full `read_file_content`
fetch, byte-for-byte identical).

## Real evidence (verbatim, both files, Drive folder `1YVo_dkZsuMyDdxcJl6OUj0P1DfUCOkyL`)

`M01_MonthlySummary.pdf` (file `1TpKke0yaGsmI_lq4sEG-mLzL_vYb9PNo`):
```
Monthly Cost ■ 1,073,700,365
Cumulative Cost ■ 1,237,485,166
```

`M01_IPC.pdf` (file `1qHwgu8TTLc4uuoxuyZGAqD_EjTRh0kMD`):
```
Work Done (This Month) ■ 1,073,700,365
Cumulative Work Done ■ 1,237,485,166
Advance Deduction ■ 0
Retention Money (5%) ■ 61,874,258
Net Payment Due ■ 1,175,610,908
```

`■` is U+25A0 (BLACK SQUARE) — the typical fallback glyph a text extractor renders when
a PDF's embedded font maps a character (here, presumably ₹, U+20B9) without a usable
ToUnicode CMap entry. This is a known, common real-world PDF issue, not unique to this
one synthetic generator — several PDF export tools mishandle the ₹ glyph this way.

## Verified so far (real test, this session)
Ran the real `boardroomEvidenceWindows` function (loaded from the actual `Code.gs`, not
simulated) against `M01_MonthlySummary.pdf`'s full extracted text: produces exactly 1
evidence window, containing the `■` figures verbatim — confirming the text reaches the
evidence-matching stage with the symbol already broken, not stripped or fixed downstream
by that function.

## NOT verified — the load-bearing unknown
**Everything above used Google Drive's own `read_file_content` tool to extract text from
these PDFs.** Constrovet's real production pipeline extracts PDF text via **Gemini AI**,
a completely different extraction path. Whether Gemini's extraction produces the same
`■` substitution on this exact file, correctly renders `₹`, or does something else
entirely is **unknown and untested this session**. If Gemini extracts `₹` correctly here,
this finding is a Drive-tool-only artifact with no real production impact, and this
whole ticket downgrades to informational. This must be checked before treating this as a
live production risk.

## Proposed fix — NOT decided, two candidate approaches, scope depends on the unverified item above
1. **If Gemini also produces `■` (or similar) on affected real documents:** the smallest
   defensive fix is a regex change in `Code.gs` to treat a bare `■` (or other common
   tofu/replacement-character glyphs) immediately preceding a number as a currency
   candidate, gated the same way `Rs`/`INR`/`₹` are today. Risk: `■` and similar glyphs
   are also used as generic bullet points elsewhere in real documents, so this needs a
   real false-positive check against other real documents before shipping, not just
   this one.
2. **If this is Gemini-extraction-specific or fixable upstream:** better to correct it at
   the extraction/prompt layer (asking Gemini to normalize currency symbols on output)
   than to patch every downstream regex — smaller blast radius, doesn't touch the
   already-verified EEV2-004/008/009 code path.

## Regression test to add (once the unverified item is resolved)
Real fixture, both files above, asserting `boardroomTriggerOwnedAmount` currently
returns `0` for a `■`-prefixed figure that should genuinely be a large `LEAKAGE`-class
or `BASELINE_BUDGET`-class amount — documenting the gap honestly (pass: true on the
*current*, broken value) the same way EEV2-008's PO-5578-007 check did, until the real
fix flips it.

## Next single test
Submit `M01_MonthlySummary.pdf` or `M01_IPC.pdf` through the **real intake form
pipeline** (Gemini extraction, not Drive's `read_file_content`) and inspect the actual
extracted text Gemini produces for the same rupee figures. That single result determines
whether this ticket is a real production defect or a false lead from a different tool's
extraction quirk.
