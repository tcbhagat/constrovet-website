import type { MedicalEstimate, MedicalLineItem } from "./schema";

export type ValidationFlagCode =
  | "PERCENTAGE_CAP_WITHOUT_SUM_INSURED"
  | "NURSING_UNBUNDLED_FROM_ROOM_RENT";

export interface ValidationFlag {
  code: ValidationFlagCode;
  message: string;
  lineItemCode?: string;
}

export interface ProcessedMedicalLineItem extends MedicalLineItem {
  isUnbundledFlag: boolean;
}

export interface ProcessedMedicalEstimate extends Omit<MedicalEstimate, "lineItems"> {
  lineItems: ProcessedMedicalLineItem[];
  resolvedRoomRentCapPerDay: number | null;
  validationFlags: ValidationFlag[];
}

export interface ParseIssue {
  path: string;
  code: string;
  message: string;
}

export type ParseMedicalDocumentResult =
  | {
      success: true;
      data: ProcessedMedicalEstimate;
      warnings: ValidationFlag[];
    }
  | {
      success: false;
      stage: "JSON_EXTRACTION" | "SCHEMA_VALIDATION";
      issues: ParseIssue[];
    };
