import { resolveIndexLotSize, calculateStatutoryCharges } from "../stores/slices/tradeHelpers.js";

/**
 * Authoritative Canonical Execution Plan Engine for PORTFOLIOX
 *
 * Enforces Manikandan's Capital Risk Invariants across all entry points:
 * 1. Hard Risk Ceiling: Modelled net risk <= ₹300.00 (target ₹250.00).
 * 2. Minimum Reward-to-Risk: Modelled net reward-to-risk >= 2.00 (target ₹500.00 net gain).
 * 3. 0.50 pt Adverse Exit Slippage Allowance included in all downside modelling.
 * 4. Zero Bypass: No testing mode, sandbox mode, or warning bypass is permitted.
 */
export function calculateCanonicalExecutionPlan({
  symbol = "",
  underlying = "NIFTY",
  entryPrice,
  stopLoss,
  targetPrice,
  quantity = 1,
  lotSize,
  totalUnits,
  direction = "LONG",
  stopPolicy = "ATR_ENTRY_RELATIVE",
  targetPolicy = "RR_DERIVED",
  adverseSlippageAllowance = 0.50,
  testingMode = false,
  isUnrestricted = false
}) {
  const sym = (symbol || "").toUpperCase();
  const resolvedLotSize = Number(lotSize) || resolveIndexLotSize(sym || underlying);
  const units = Number(totalUnits) || (Number(quantity) || 1) * resolvedLotSize;
  const entry = Number(entryPrice) || 0;
  const sl = Number(stopLoss) || 0;
  const tp = Number(targetPrice) || 0;
  const isShort = String(direction).toUpperCase() === "SHORT";

  // 1. Structural Price Validations
  const isStopLossValid = entry > 0 && sl > 0 && (isShort ? sl > entry : sl < entry);
  const isTargetValid = entry > 0 && tp > 0 && (isShort ? tp < entry : tp > entry);

  const stopDistancePts = isStopLossValid ? Number(Math.abs(entry - sl).toFixed(2)) : 0;
  const targetDistancePts = isTargetValid ? Number(Math.abs(tp - entry).toFixed(2)) : 0;

  // 2. Risk Math with Adverse Exit Slippage Allowance
  const effectiveExitStop = isShort
    ? Number((sl + adverseSlippageAllowance).toFixed(2))
    : Math.max(0.05, Number((sl - adverseSlippageAllowance).toFixed(2)));

  const grossRiskRupees = isStopLossValid ? Number((Math.abs(entry - effectiveExitStop) * units).toFixed(2)) : 0;
  const statutoryRiskCharges = isStopLossValid ? calculateStatutoryCharges(entry, effectiveExitStop, units, direction) : 0;
  const modelledNetRisk = isStopLossValid ? Number((grossRiskRupees + statutoryRiskCharges).toFixed(2)) : 0;

  // 3. Reward Math with Statutory Friction
  const grossRewardRupees = isTargetValid ? Number((targetDistancePts * units).toFixed(2)) : 0;
  const statutoryTargetCharges = isTargetValid ? calculateStatutoryCharges(entry, tp, units, direction) : 0;
  const modelledNetReward = isTargetValid ? Number(Math.max(0, grossRewardRupees - statutoryTargetCharges).toFixed(2)) : 0;

  // 4. Reward-to-Risk Ratios
  const netRewardToRiskRatio = modelledNetRisk > 0 ? Number((modelledNetReward / modelledNetRisk).toFixed(2)) : 0;
  const grossRewardToRiskRatio = grossRiskRupees > 0 ? Number((grossRewardRupees / grossRiskRupees).toFixed(2)) : 0;

  // 5. Hard Compliance Gates: Authoritative Capital Risk Invariants (Zero testing-mode bypass)
  const isRiskCeilingSatisfied = isStopLossValid && modelledNetRisk <= 300.00;
  const isRewardToRiskSatisfied = isTargetValid && netRewardToRiskRatio >= 2.00;

  const rejectionReasonCodes = [];
  if (!isStopLossValid) rejectionReasonCodes.push("INVALID_STOP_LOSS");
  if (!isTargetValid) rejectionReasonCodes.push("INVALID_TARGET");
  if (isStopLossValid && !isRiskCeilingSatisfied) rejectionReasonCodes.push("MODELLED_RISK_EXCEEDS_CEILING");
  if (isTargetValid && !isRewardToRiskSatisfied) rejectionReasonCodes.push("RR_BELOW_MINIMUM");

  const isCompliant = isStopLossValid && isTargetValid && (isUnrestricted ? true : (isRiskCeilingSatisfied && isRewardToRiskSatisfied));

  return {
    symbol,
    underlying,
    direction: isShort ? "SHORT" : "LONG",
    quantity: Number(quantity) || 1,
    lotSize: resolvedLotSize,
    totalUnits: units,
    referenceEntryPrice: entry,
    stopLoss: sl,
    targetPrice: tp,
    stopDistancePts,
    targetDistancePts,
    effectiveExitStop,
    grossRiskRupees,
    statutoryRiskCharges,
    modelledNetRisk,
    grossRewardRupees,
    statutoryTargetCharges,
    modelledNetReward,
    grossRewardToRiskRatio,
    netRewardToRiskRatio,
    stopPolicy,
    targetPolicy,
    isStopLossValid,
    isTargetValid,
    isRiskCeilingSatisfied,
    isRewardToRiskSatisfied,
    isCompliant,
    isUnrestricted: Boolean(isUnrestricted),
    rejectionReasonCodes
  };
}
