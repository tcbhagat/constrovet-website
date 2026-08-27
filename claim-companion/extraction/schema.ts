import { z } from "zod";

export const RoomRentCapTypeSchema = z.enum([
  "FLAT_AMOUNT",
  "PERCENTAGE_OF_SUM_INSURED"
]);

export const NormalizedCategorySchema = z.enum([
  "ROOM_RENT",
  "NURSING",
  "PROFESSIONAL_FEES",
  "PROCEDURE",
  "MEDICINES",
  "CONSUMABLES",
  "DIAGNOSTICS",
  "IMPLANTS",
  "ADMINISTRATIVE",
  "OTHER"
]);

export const RoomRentCapSchema = z.object({
  type: RoomRentCapTypeSchema,
  value: z.number().finite().nonnegative()
}).strict();

export const MedicalLineItemSchema = z.object({
  code: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  rawAmount: z.number().finite().nonnegative(),
  normalizedCategory: NormalizedCategorySchema
}).strict();

export const MedicalEstimateSchema = z.object({
  sumInsured: z.number().finite().nonnegative().nullable(),
  roomRentCapPerDay: RoomRentCapSchema.nullable(),
  lineItems: z.array(MedicalLineItemSchema).max(1_000),
  deductible: z.number().finite().nonnegative(),
  copayPercentage: z.number().finite().min(0).max(100)
}).strict();

export type RoomRentCapType = z.infer<typeof RoomRentCapTypeSchema>;
export type NormalizedCategory = z.infer<typeof NormalizedCategorySchema>;
export type MedicalLineItem = z.infer<typeof MedicalLineItemSchema>;
export type MedicalEstimate = z.infer<typeof MedicalEstimateSchema>;
