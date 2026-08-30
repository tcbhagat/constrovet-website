import { parseMedicalDocument } from "./parseMedicalDocument";

function expectSuccess(rawText: string) {
  const result = parseMedicalDocument(rawText);
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(JSON.stringify(result.issues));
  return result.data;
}

describe("parseMedicalDocument", () => {
  test("validates canonical JSON and resolves a percentage room-rent cap", () => {
    const data = expectSuccess(JSON.stringify({
      sumInsured: 500000,
      roomRentCapPerDay: { type: "PERCENTAGE_OF_SUM_INSURED", value: 1 },
      lineItems: [
        { code: "RR01", description: "Room rent including nursing", rawAmount: 20000, normalizedCategory: "ROOM_RENT" },
        { code: "NS01", description: "Nursing Charges", rawAmount: 4500, normalizedCategory: "NURSING" }
      ],
      deductible: 10000,
      copayPercentage: 20
    }));

    expect(data.resolvedRoomRentCapPerDay).toBe(5000);
    expect(data.lineItems[0]?.isUnbundledFlag).toBe(false);
    expect(data.lineItems[1]?.isUnbundledFlag).toBe(true);
    expect(data.validationFlags).toContainEqual(expect.objectContaining({
      code: "NURSING_UNBUNDLED_FROM_ROOM_RENT",
      lineItemCode: "NS01"
    }));
  });

  test("normalizes Indian, European, lakh and OCR-noisy currency strings", () => {
    const data = expectSuccess(`LLM output follows:\n\`\`\`json
    {
      “sum_insured”: “₹ 5,00,000”,
      “room_rent_cap_per_day”: { “type”: “flat”, “amount”: “INR 5O,OOO” },
      “line_items”: [
        { “item_code”: “MED-1”, “name”: “Pharmacy medicines”, “amount”: “1.25 lakh”, “category”: “pharmacy” },
        { “item_code”: “DX-1”, “name”: “Diagnostic imaging”, “amount”: “EUR 1.234,56”, “category”: “diagnostic” }
      ],
      “deductible_amount”: “Rs. 10,000”,
      “copay”: “2O%”,
    }
    \`\`\``);

    expect(data.sumInsured).toBe(500000);
    expect(data.roomRentCapPerDay).toEqual({ type: "FLAT_AMOUNT", value: 50000 });
    expect(data.resolvedRoomRentCapPerDay).toBe(50000);
    expect(data.lineItems.map((item) => [item.rawAmount, item.normalizedCategory])).toEqual([
      [125000, "MEDICINES"],
      [1234.56, "DIAGNOSTICS"]
    ]);
    expect(data.deductible).toBe(10000);
    expect(data.copayPercentage).toBe(20);
  });

  test("reports strict schema paths for missing required fields", () => {
    const result = parseMedicalDocument(JSON.stringify({
      sumInsured: null,
      roomRentCapPerDay: null,
      lineItems: []
    }));

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.stage).toBe("SCHEMA_VALIDATION");
    expect(result.issues.map((entry) => entry.path)).toEqual(expect.arrayContaining([
      "deductible",
      "copayPercentage"
    ]));
  });

  test("rejects a room-rent cap without an explicit type", () => {
    const result = parseMedicalDocument(JSON.stringify({
      sumInsured: 500000,
      roomRentCapPerDay: "5000",
      lineItems: [],
      deductible: 0,
      copayPercentage: 0
    }));

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.some((entry) => entry.path === "roomRentCapPerDay.type")).toBe(true);
  });

  test("retains an unresolved percentage cap and emits an evidence warning", () => {
    const data = expectSuccess(JSON.stringify({
      sumInsured: null,
      roomRentCapPerDay: { type: "percentage", value: "1%" },
      lineItems: [],
      deductible: 0,
      copayPercentage: 0
    }));

    expect(data.resolvedRoomRentCapPerDay).toBeNull();
    expect(data.validationFlags).toContainEqual(expect.objectContaining({
      code: "PERCENTAGE_CAP_WITHOUT_SUM_INSURED"
    }));
  });

  test("does not flag nursing unless evidence says room rent covers it", () => {
    const data = expectSuccess(JSON.stringify({
      sumInsured: 300000,
      roomRentCapPerDay: null,
      lineItems: [
        { code: "R1", description: "Private room rent", rawAmount: "12,000", category: "room" },
        { code: "N1", description: "Nursing Charges", rawAmount: "2,500", category: "nursing" }
      ],
      deductible: 0,
      copayPercentage: 10
    }));

    expect(data.lineItems[1]?.isUnbundledFlag).toBe(false);
    expect(data.validationFlags).toEqual([]);
  });

  test("rejects out-of-range copay and negative monetary values", () => {
    const result = parseMedicalDocument(JSON.stringify({
      sumInsured: 500000,
      roomRentCapPerDay: { type: "FLAT_AMOUNT", value: -1 },
      lineItems: [{ code: "X", description: "Miscellaneous", rawAmount: -100, normalizedCategory: "OTHER" }],
      deductible: -10,
      copayPercentage: 110
    }));

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues.map((entry) => entry.path)).toEqual(expect.arrayContaining([
      "roomRentCapPerDay.value",
      "lineItems.0.rawAmount",
      "deductible",
      "copayPercentage"
    ]));
  });

  test("returns structured JSON extraction errors for blank and non-JSON OCR text", () => {
    expect(parseMedicalDocument("   ")).toEqual(expect.objectContaining({
      success: false,
      stage: "JSON_EXTRACTION",
      issues: [expect.objectContaining({ code: "EMPTY_INPUT" })]
    }));
    expect(parseMedicalDocument("ROOM RENT INR 5000; no structured output")).toEqual(expect.objectContaining({
      success: false,
      stage: "JSON_EXTRACTION",
      issues: [expect.objectContaining({ code: "INVALID_JSON" })]
    }));
  });
});
