import type { NormalizedCategory, RoomRentCapType } from "./schema";

type JsonRecord = Record<string, unknown>;

const CATEGORY_ALIASES: Array<[NormalizedCategory, RegExp]> = [
  ["ROOM_RENT", /\b(room|ward|bed)\b/i],
  ["NURSING", /\b(nurs(?:e|es|ing)|caregiver)\b/i],
  ["PROFESSIONAL_FEES", /\b(surgeon|anaesth(?:esia|etist)|anesth(?:esia|etist)|consultant|doctor|professional)\b/i],
  ["PROCEDURE", /\b(procedure|surgery|operation|theatre|ot charge)\b/i],
  ["MEDICINES", /\b(medicine|medication|pharmacy|drug)\b/i],
  ["CONSUMABLES", /\b(consumable|ppe|syringe|disposable)\b/i],
  ["DIAGNOSTICS", /\b(diagnostic|laboratory|lab |radiology|scan|x-?ray|mri|ct )\b/i],
  ["IMPLANTS", /\b(implant|prosthesis|stent|mesh|plate|screw)\b/i],
  ["ADMINISTRATIVE", /\b(administrative|registration|record|documentation)\b/i]
];

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function first(record: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  }
  return undefined;
}

export function normalizeNumeric(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : value;
  if (typeof value !== "string") return value;

  let text = value.trim();
  if (!text) return value;
  let multiplier = 1;
  if (/\b(?:lakh|lac)\b/i.test(text)) multiplier = 100_000;
  else if (/\bcrore\b/i.test(text)) multiplier = 10_000_000;
  else if (/\bthousand\b/i.test(text) || /\d\s*k\b/i.test(text)) multiplier = 1_000;

  text = text
    .replace(/(?:₹|rs\.?|inr)/gi, "")
    .replace(/\b(?:lakh|lac|crore|thousand)\b/gi, "")
    .replace(/(?<=\d)\s*k\b/gi, "")
    .replace(/%/g, "")
    .replace(/\s+/g, "");

  if (/\d/.test(text)) text = text.replace(/[oO]/g, "0");
  text = text.replace(/[^\d.,+\-]/g, "");

  if (!text || !/\d/.test(text)) return value;
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    text = comma > dot
      ? text.replace(/\./g, "").replace(",", ".")
      : text.replace(/,/g, "");
  } else if (comma >= 0) {
    const commaCount = (text.match(/,/g) ?? []).length;
    const trailing = text.length - comma - 1;
    text = commaCount === 1 && trailing === 2
      ? text.replace(",", ".")
      : text.replace(/,/g, "");
  } else if ((text.match(/\./g) ?? []).length > 1) {
    text = text.replace(/\./g, "");
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed * multiplier : value;
}

function normalizeRoomRentType(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, RoomRentCapType> = {
    FLAT: "FLAT_AMOUNT",
    AMOUNT: "FLAT_AMOUNT",
    FLAT_AMOUNT: "FLAT_AMOUNT",
    PERCENT: "PERCENTAGE_OF_SUM_INSURED",
    PERCENTAGE: "PERCENTAGE_OF_SUM_INSURED",
    PERCENT_OF_SUM_INSURED: "PERCENTAGE_OF_SUM_INSURED",
    PERCENTAGE_OF_SUM_INSURED: "PERCENTAGE_OF_SUM_INSURED"
  };
  return aliases[normalized] ?? normalized;
}

function normalizeCategory(value: unknown, description: string): NormalizedCategory {
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase().replace(/[\s&/-]+/g, "_");
    const aliases: Record<string, NormalizedCategory> = {
      ROOM: "ROOM_RENT",
      ROOM_CHARGES: "ROOM_RENT",
      ROOM_RENT: "ROOM_RENT",
      NURSE: "NURSING",
      NURSING_CHARGES: "NURSING",
      DOCTOR_FEES: "PROFESSIONAL_FEES",
      PROFESSIONAL_FEES: "PROFESSIONAL_FEES",
      SURGERY: "PROCEDURE",
      PROCEDURE: "PROCEDURE",
      PHARMACY: "MEDICINES",
      MEDICINE: "MEDICINES",
      MEDICINES: "MEDICINES",
      CONSUMABLE: "CONSUMABLES",
      CONSUMABLES: "CONSUMABLES",
      DIAGNOSTIC: "DIAGNOSTICS",
      DIAGNOSTICS: "DIAGNOSTICS",
      IMPLANT: "IMPLANTS",
      IMPLANTS: "IMPLANTS",
      ADMIN: "ADMINISTRATIVE",
      ADMINISTRATIVE: "ADMINISTRATIVE",
      OTHER: "OTHER"
    };
    if (aliases[normalized]) return aliases[normalized];
  }
  return CATEGORY_ALIASES.find(([, pattern]) => pattern.test(description))?.[0] ?? "OTHER";
}

function normalizeRoomRentCap(root: JsonRecord): unknown {
  const source = first(root, ["roomRentCapPerDay", "room_rent_cap_per_day", "roomRentCap", "room_rent_cap"]);
  if (source === null || source === undefined) return source;
  const record = asRecord(source);
  const rootType = first(root, ["roomRentCapType", "room_rent_cap_type"]);
  if (!record) return { type: normalizeRoomRentType(rootType), value: normalizeNumeric(source) };
  return {
    type: normalizeRoomRentType(first(record, ["type", "capType", "cap_type"]) ?? rootType),
    value: normalizeNumeric(first(record, ["value", "amount", "percentage", "rawValue", "raw_value"]))
  };
}

export function normalizeMedicalCandidate(candidate: unknown): unknown {
  const root = asRecord(candidate);
  if (!root) return candidate;
  const lineItems = first(root, ["lineItems", "line_items", "items"]);

  return {
    sumInsured: first(root, ["sumInsured", "sum_insured", "coverageAmount", "coverage_amount"]) === null
      ? null
      : normalizeNumeric(first(root, ["sumInsured", "sum_insured", "coverageAmount", "coverage_amount"])),
    roomRentCapPerDay: normalizeRoomRentCap(root),
    lineItems: Array.isArray(lineItems) ? lineItems.map((item) => {
      const record = asRecord(item);
      if (!record) return item;
      const descriptionValue = first(record, ["description", "itemDescription", "item_description", "name"]);
      const description = typeof descriptionValue === "string" ? descriptionValue.replace(/\s+/g, " ").trim() : "";
      return {
        code: first(record, ["code", "itemCode", "item_code"]),
        description,
        rawAmount: normalizeNumeric(first(record, ["rawAmount", "raw_amount", "amount", "charge"])),
        normalizedCategory: normalizeCategory(first(record, ["normalizedCategory", "normalized_category", "category"]), description)
      };
    }) : lineItems,
    deductible: normalizeNumeric(first(root, ["deductible", "deductibleAmount", "deductible_amount"])),
    copayPercentage: normalizeNumeric(first(root, ["copayPercentage", "copay_percentage", "copay", "coPay"]))
  };
}

function balancedJsonObject(text: string): string | null {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (start < 0) {
      if (character === "{") { start = index; depth = 1; }
      continue;
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return text.slice(start, index + 1);
  }
  return null;
}

export function extractJsonCandidate(rawText: string): unknown {
  const cleaned = rawText
    .replace(/^\uFEFF/, "")
    .replace(/[“”]/g, '"')
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidates = [cleaned, fenced, balancedJsonObject(fenced ?? cleaned)].filter((value): value is string => Boolean(value));
  let lastError: unknown;
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); }
    catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new Error("No JSON object found in OCR/LLM output.");
}
