# Schema-driven medical OCR extraction

This module validates structured JSON produced by an OCR/LLM adapter. It does not call an external model and does not transmit documents.

## Canonical extraction contract

```json
{
  "sumInsured": 500000,
  "roomRentCapPerDay": {
    "type": "PERCENTAGE_OF_SUM_INSURED",
    "value": 1
  },
  "lineItems": [
    {
      "code": "RR01",
      "description": "Room rent including nursing",
      "rawAmount": 20000,
      "normalizedCategory": "ROOM_RENT"
    }
  ],
  "deductible": 10000,
  "copayPercentage": 20
}
```

`roomRentCapPerDay.value` retains the value expressed by the source. For percentage caps, post-processing writes the computed monetary amount to `resolvedRoomRentCapPerDay`; it never overwrites the extracted evidence.

## Usage

```ts
import { parseMedicalDocument } from "./parseMedicalDocument";

const result = parseMedicalDocument(ocrOrLlmJsonText);
if (!result.success) {
  // Persist or display result.stage and result.issues.
  return;
}

const normalizedEstimate = result.data;
```

The parser accepts canonical camelCase and selected snake_case aliases. Currency strings are normalized before strict Zod validation. Missing required fields, invalid enum values, negative amounts and co-pay values outside 0–100 remain validation failures.

## Trust boundary

- OCR/LLM output is always treated as untrusted.
- `MedicalEstimateSchema.safeParse()` is the authoritative validation boundary.
- `isUnbundledFlag` and monetary percentage-cap resolution are computed locally after validation.
- The rule engine does not accept model-generated unbundling flags.
