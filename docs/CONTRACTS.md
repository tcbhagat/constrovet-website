# CONTRACTS — The Evidence Core

**Layer 2 of the system. This document is the specification. `apps-script/` implements it. `tests/` and the regression suites enforce it.**

Change order is always: this file first, then the implementation, then the regression suite. Never the reverse. If code and this document disagree, the code is a bug.

---

## C1. The promise

Every executive finding Constrovet produces must be traceable to something a human can open and check. That is the entire product. Everything else is packaging.

Concretely: **a finding without a citation is not a finding.** It is deleted, not softened.

---

## C2. Citation requirement

Every finding carries:

| Field | Meaning | Required |
| --- | --- | --- |
| `source_file` | The uploaded file name | Yes |
| `location` | Page number, sheet name, or row | Yes |
| `quoted_span` | The literal text or cell value the finding rests on | Yes |
| `category` | One of the categories in C3 | Yes |
| `amount` | Numeric value, only if present in or derived from cited spans | No |
| `calculation` | The arithmetic performed, shown | Only if `amount` is derived |
| `rationale` | Why this matters, in plain language | Yes |

If any required field cannot be filled from the evidence, the item does not become a finding. It becomes a `honesty_check` entry.

---

## C3. Category rules

These three categories are mutually exclusive. Misclassification is the most common and most damaging failure mode, because it turns normal project spend into an alarming "leakage" number.

**`BASELINE_BUDGET`** — money that was always meant to be spent.
Standard contract value, cumulative work done, planned spend, BOQ value, advance recovery.

**`LEAKAGE_AND_OVERRUN`** — money lost or spent beyond plan.
Penalties, wastage, rework, delay cost, idle resources, delayed PO impact, excess consumption, and any calculated overrun.

**`ESG_METRIC`** — non-financial sustainability measures.
Carbon, waste diversion, energy, water, fuel, diesel, electricity, emissions.

### The overrun calculation

When both Budget and Actual are available for the same item:

```
variance = Actual − Budget
```

If `variance > 0`, emit a **separate** `LEAKAGE_AND_OVERRUN` finding for the variance. Do not fold it into the baseline line. Do not restate the whole contract value as leakage.

### Unestablished exposure

If a cost is visible but not established as recoverable, keep it as exposure. Do not promote it to recoverable leakage. The verifier preserves this distinction and so must any change to it.

---

## C4. The honesty check

`honesty_check` is a required output field, not an optional caveat. It lists what the evidence did not contain.

Populate it when: a document is missing, a figure is illegible, a date is absent, a cause is unstated, OCR failed, or a calculation could not be completed.

**Never infer** missing amounts, dates, causes, risks, or actions. An empty finding set with a full honesty check is a correct output. A confident finding set built on inference is a product failure.

---

## C5. What AI is allowed to do

| Allowed | Not allowed |
| --- | --- |
| Summarise cited findings | Produce a finding without a citation |
| Critique or challenge a cited finding | Fill a gap with a plausible number |
| Draft executive actions from cited findings | Infer a cause the evidence does not state |
| Rank or prioritise findings | Rewrite a quoted span |
| Write plain-language rationale | Change a category to make a story cleaner |

Deterministic extraction is authoritative. AI review is a layer on top and is approval-gated (Rule H6). If AI review is unavailable, deterministic output must still ship, with AI review marked unavailable.

---

## C6. What crosses the boundary

The Deep Analysis call to the Workspace processor may carry **only**: cited findings, quoted spans, calculations, action plans, the honesty check, and audit metadata.

It must not carry raw documents, raw OCR dumps, credentials, or anything not already reduced to a cited finding.

---

## C7. Output shape

```json
{
  "job_id": "string",
  "mode": "BROWSER_ANALYSE | DEEP_ANALYSIS",
  "findings": [
    {
      "category": "BASELINE_BUDGET | LEAKAGE_AND_OVERRUN | ESG_METRIC",
      "source_file": "string",
      "location": "string",
      "quoted_span": "string",
      "amount": "number | null",
      "calculation": "string | null",
      "rationale": "string"
    }
  ],
  "recoverable_exposure": "number",
  "unestablished_exposure": "number",
  "control_failures": ["string"],
  "action_plan": { "d7": ["string"], "d30": ["string"], "d90": ["string"] },
  "honesty_check": ["string"],
  "audit": { "generated_at": "ISO-8601", "ai_review": "used | unavailable | not_requested" }
}
```

---

## C8. How to change this contract

1. Edit this file. State what changes and why.
2. Add or update the regression suite that would catch the old behaviour.
3. Change the Apps Script module.
4. Run `npm run test:harness` and `npm test`.
5. Append the decision to `docs/DECISIONS.md`.

A contract change with no matching regression is not a contract change. It is a hope.
