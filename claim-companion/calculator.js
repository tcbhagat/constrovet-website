const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const hasNumericValue = (value) => value !== undefined && value !== null && String(value).trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;

function calculateScenario({ totalBill, nonPayables, directRoomDeduction, proportionalDeduction, deductible, copayPercent, coverageCap }) {
  const beforeDeductible = Math.max(0, totalBill - nonPayables - directRoomDeduction - proportionalDeduction);
  const deductibleApplied = Math.min(beforeDeductible, deductible);
  const afterDeductible = Math.max(0, beforeDeductible - deductibleApplied);
  const copayApplied = afterDeductible * (copayPercent / 100);
  const policyAdmissible = Math.max(0, afterDeductible - copayApplied);
  const estimatedInsurerContribution = Math.min(coverageCap, policyAdmissible);
  return {
    proportionalDeduction,
    deductibleApplied,
    copayApplied,
    policyAdmissible,
    estimatedInsurerContribution,
    estimatedPatientShare: Math.max(0, totalBill - estimatedInsurerContribution)
  };
}

export function calculateCostLock(input) {
  const totalBill = number(input.estimatedBill);
  const baseSumInsured = number(input.baseSumInsured ?? input.sumInsured);
  const availableBalanceKnown = hasNumericValue(input.availableBalance);
  const availableBalance = availableBalanceKnown ? Math.max(0, Number(input.availableBalance)) : 0;
  const coverageCap = availableBalanceKnown ? availableBalance : baseSumInsured;
  const nonPayables = Math.min(totalBill, number(input.nonPayables));
  const deductible = number(input.deductible);
  const copayPercent = Math.min(100, number(input.copayPercent));
  const stayDays = number(input.stayDays);
  const roomLimit = number(input.roomLimit);
  const actualRoomRate = number(input.actualRoomRate);
  const proportionateChargesKnown = hasNumericValue(input.proportionateCharges);
  const proportionateCharges = Math.min(totalBill, number(input.proportionateCharges));

  const roomRatio = roomLimit && actualRoomRate > roomLimit
    ? Math.max(0, Math.min(1, roomLimit / actualRoomRate))
    : 1;
  const selectedRoomCost = Math.min(totalBill, actualRoomRate * stayDays);
  const allowedRoomCost = roomLimit && actualRoomRate
    ? Math.min(selectedRoomCost, roomLimit * stayDays)
    : selectedRoomCost;
  const directRoomDeduction = Math.max(0, selectedRoomCost - allowedRoomCost);
  const documentedProportionalDeduction = Math.max(0, proportionateCharges * (1 - roomRatio));
  const hasUncertainProportionateDeduction = roomRatio < 1 && Boolean(input.proportionateScalingApplies) && !proportionateChargesKnown;
  const potentiallyScaledCharges = Math.max(0, totalBill - nonPayables - selectedRoomCost);
  const maximumProportionalDeduction = hasUncertainProportionateDeduction
    ? potentiallyScaledCharges * (1 - roomRatio)
    : documentedProportionalDeduction;
  const optimistic = calculateScenario({ totalBill, nonPayables, directRoomDeduction, proportionalDeduction: documentedProportionalDeduction, deductible, copayPercent, coverageCap });
  const conservative = calculateScenario({ totalBill, nonPayables, directRoomDeduction, proportionalDeduction: maximumProportionalDeduction, deductible, copayPercent, coverageCap });
  const insurerContributionLow = Math.min(optimistic.estimatedInsurerContribution, conservative.estimatedInsurerContribution);
  const insurerContributionHigh = Math.max(optimistic.estimatedInsurerContribution, conservative.estimatedInsurerContribution);
  const patientShareLow = Math.min(optimistic.estimatedPatientShare, conservative.estimatedPatientShare);
  const patientShareHigh = Math.max(optimistic.estimatedPatientShare, conservative.estimatedPatientShare);
  const copayAppliedLow = Math.min(optimistic.copayApplied, conservative.copayApplied);
  const copayAppliedHigh = Math.max(optimistic.copayApplied, conservative.copayApplied);

  return {
    totalBill,
    baseSumInsured,
    availableBalance,
    availableBalanceKnown,
    coverageCap,
    coverageCapBasis: availableBalanceKnown ? "available balance" : "base sum insured",
    nonPayables,
    roomRatio,
    directRoomDeduction,
    proportionalDeduction: conservative.proportionalDeduction,
    proportionalDeductionLow: optimistic.proportionalDeduction,
    proportionalDeductionHigh: conservative.proportionalDeduction,
    deductibleApplied: conservative.deductibleApplied,
    copayApplied: conservative.copayApplied,
    copayAppliedLow,
    copayAppliedHigh,
    policyAdmissible: conservative.policyAdmissible,
    estimatedInsurerContribution: insurerContributionLow,
    estimatedPatientShare: patientShareHigh,
    insurerContributionLow,
    insurerContributionHigh,
    patientShareLow,
    patientShareHigh,
    hasEstimateRange: insurerContributionLow !== insurerContributionHigh,
    hasUncertainProportionateDeduction,
    hasRoomLimitImpact: roomRatio < 1,
    known: {
      availableBalance: availableBalanceKnown,
      copay: hasNumericValue(input.copayPercent),
      deductible: hasNumericValue(input.deductible),
      nonPayables: hasNumericValue(input.nonPayables),
      proportionateCharges: proportionateChargesKnown
    },
    assumptions: [
      !roomLimit ? "Room-rent policy limit was not supplied." : "Room-rent limit is based on the user-confirmed policy value.",
      !actualRoomRate ? "Selected hospital room rate was not supplied." : "Selected room rate is based on the hospital estimate or user confirmation.",
      availableBalanceKnown ? "The current available insurance balance was supplied." : "The base sum insured is used as a ceiling because the remaining balance was not documented.",
      hasUncertainProportionateDeduction ? "The range reflects uncertainty about which charges the room-rent proportional-scaling clause applies to." : "Actual admissibility and final billing may differ."
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
  if (!number(input.baseSumInsured ?? input.sumInsured)) errors.push("Base sum insured must be greater than zero.");
  if (number(input.nonPayables) > number(input.estimatedBill)) errors.push("Non-payables cannot exceed the estimated bill.");
  if (number(input.proportionateCharges) > number(input.estimatedBill)) errors.push("Proportionate charges cannot exceed the estimated bill.");
  return errors;
}
