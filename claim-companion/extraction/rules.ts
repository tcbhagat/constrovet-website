import type { MedicalEstimate } from "./schema";
import type { ProcessedMedicalEstimate, ValidationFlag } from "./types";

const ROOM_COVERS_NURSING = /(?:room|ward|bed)[^\n.]{0,80}(?:includ(?:e|es|ed|ing)|inclusive of|covers?|with|&|and)[^\n.]{0,40}nurs/i;

export function applyMedicalValidationRules(
  estimate: MedicalEstimate,
  sourceText: string
): ProcessedMedicalEstimate {
  const validationFlags: ValidationFlag[] = [];
  let resolvedRoomRentCapPerDay: number | null = null;

  if (estimate.roomRentCapPerDay?.type === "FLAT_AMOUNT") {
    resolvedRoomRentCapPerDay = estimate.roomRentCapPerDay.value;
  } else if (estimate.roomRentCapPerDay?.type === "PERCENTAGE_OF_SUM_INSURED") {
    if (estimate.sumInsured === null) {
      validationFlags.push({
        code: "PERCENTAGE_CAP_WITHOUT_SUM_INSURED",
        message: "Room-rent percentage could not be converted because sum insured is missing."
      });
    } else {
      resolvedRoomRentCapPerDay = estimate.sumInsured * estimate.roomRentCapPerDay.value / 100;
    }
  }

  const roomIncludesNursing = ROOM_COVERS_NURSING.test(sourceText)
    || estimate.lineItems.some((item) => item.normalizedCategory === "ROOM_RENT" && ROOM_COVERS_NURSING.test(item.description));

  const lineItems = estimate.lineItems.map((item) => {
    const isUnbundledFlag = roomIncludesNursing && item.normalizedCategory === "NURSING";
    if (isUnbundledFlag) {
      validationFlags.push({
        code: "NURSING_UNBUNDLED_FROM_ROOM_RENT",
        lineItemCode: item.code,
        message: `Nursing line item ${item.code} may be separately charged although room rent includes nursing.`
      });
    }
    return { ...item, isUnbundledFlag };
  });

  return {
    ...estimate,
    lineItems,
    resolvedRoomRentCapPerDay,
    validationFlags
  };
}
