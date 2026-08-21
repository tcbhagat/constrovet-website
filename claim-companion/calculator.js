const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export function calculateCostLock(input) {
  const totalBill = number(input.estimatedBill);
  const sumInsured = number(input.sumInsured);
  const nonPayables = Math.min(totalBill, number(input.nonPayables));
  const deductible = number(input.deductible);
  const copayPercent = Math.min(100, number(input.copayPercent));
  const stayDays = number(input.stayDays);
  const roomLimit = number(input.roomLimit);
  const actualRoomRate = number(input.actualRoomRate);
  const proportionateCharges = Math.min(totalBill, number(input.proportionateCharges));

  const roomRatio = roomLimit && actualRoomRate > roomLimit
    ? Math.max(0, Math.min(1, roomLimit / actualRoomRate))
    : 1;
  const selectedRoomCost = Math.min(totalBill, actualRoomRate * stayDays);
  const allowedRoomCost = roomLimit && actualRoomRate
    ? Math.min(selectedRoomCost, roomLimit * stayDays)
    : selectedRoomCost;
  const directRoomDeduction = Math.max(0, selectedRoomCost - allowedRoomCost);
  const proportionalDeduction = Math.max(0, proportionateCharges * (1 - roomRatio));
  const beforeDeductible = Math.max(0, totalBill - nonPayables - directRoomDeduction - proportionalDeduction);
  const deductibleApplied = Math.min(beforeDeductible, deductible);
  const afterDeductible = Math.max(0, beforeDeductible - deductibleApplied);
  const copayApplied = afterDeductible * (copayPercent / 100);
  const policyAdmissible = Math.max(0, afterDeductible - copayApplied);
  const estimatedInsurerContribution = Math.min(sumInsured || policyAdmissible, policyAdmissible);
  const estimatedPatientShare = Math.max(0, totalBill - estimatedInsurerContribution);

  return {
    totalBill,
    nonPayables,
    roomRatio,
    directRoomDeduction,
    proportionalDeduction,
    deductibleApplied,
    copayApplied,
    policyAdmissible,
    estimatedInsurerContribution,
    estimatedPatientShare,
    hasRoomLimitImpact: roomRatio < 1,
    assumptions: [
      !roomLimit ? "Room-rent policy limit was not supplied." : "Room-rent limit is based on the user-confirmed policy value.",
      !actualRoomRate ? "Selected hospital room rate was not supplied." : "Selected room rate is based on the hospital estimate or user confirmation.",
      "Actual admissibility, package tariff and final bill may differ."
    ]
  };
}

export function formatInr(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(number(value));
}

export function validateCostLock(input) {
  const errors = [];
  if (!String(input.procedureName || "").trim()) errors.push("Treatment or procedure is required.");
  if (!String(input.hospitalName || "").trim()) errors.push("Hospital name is required.");
  if (!number(input.estimatedBill)) errors.push("Hospital estimate must be greater than zero.");
  if (!number(input.sumInsured)) errors.push("Available sum insured must be greater than zero.");
  if (number(input.nonPayables) > number(input.estimatedBill)) errors.push("Non-payables cannot exceed the estimated bill.");
  if (number(input.proportionateCharges) > number(input.estimatedBill)) errors.push("Proportionate charges cannot exceed the estimated bill.");
  return errors;
}
