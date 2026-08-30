import { MedicalEstimateSchema } from "./schema";
import { extractJsonCandidate, normalizeMedicalCandidate } from "./normalization";
import { applyMedicalValidationRules } from "./rules";
import type { ParseMedicalDocumentResult, ParseIssue } from "./types";

function issue(path: string, code: string, message: string): ParseIssue {
  return { path, code, message };
}

export function parseMedicalDocument(rawText: string): ParseMedicalDocumentResult {
  if (typeof rawText !== "string" || !rawText.trim()) {
    return {
      success: false,
      stage: "JSON_EXTRACTION",
      issues: [issue("$", "EMPTY_INPUT", "OCR/LLM output must be a non-empty string.")]
    };
  }

  let candidate: unknown;
  try {
    candidate = extractJsonCandidate(rawText);
  } catch (error) {
    return {
      success: false,
      stage: "JSON_EXTRACTION",
      issues: [issue("$", "INVALID_JSON", error instanceof Error ? error.message : "Invalid JSON output.")]
    };
  }

  const parsed = MedicalEstimateSchema.safeParse(normalizeMedicalCandidate(candidate));
  if (!parsed.success) {
    return {
      success: false,
      stage: "SCHEMA_VALIDATION",
      issues: parsed.error.issues.map((entry) => issue(
        entry.path.length ? entry.path.join(".") : "$",
        entry.code,
        entry.message
      ))
    };
  }

  const data = applyMedicalValidationRules(parsed.data, rawText);
  return { success: true, data, warnings: data.validationFlags };
}
