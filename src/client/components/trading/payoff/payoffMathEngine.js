// NSE Standard Tick Size Snapping (₹0.05 multiples)
export const snapToTick = (val) => Math.round(Number(val) * 20) / 20;

export function calculateBreakevenSpot({ isDirect, isCall, strike, entry, hedgePrc }) {
  if (!isDirect) {
    const netDebit = Math.max(0.05, entry - Number(hedgePrc || 0));
    return isCall ? strike + netDebit : strike - netDebit;
  }
  return isCall ? strike + entry : strike - entry;
}

export function calculatePopPercent({ effectiveSpot, breakevenSpot, isCall }) {
  const dailyVol = effectiveSpot * (0.135 / Math.sqrt(252)); // 13.5% India VIX proxy
  const distToBEVal = isCall ? (breakevenSpot - effectiveSpot) : (effectiveSpot - breakevenSpot);
  const zScore = distToBEVal / (dailyVol * 1.5);
  const prob = 1 / (1 + Math.exp(zScore * 1.2));
  return Math.min(94, Math.max(12, Math.round(prob * 100)));
}

export function calculateDomain({ strike, effectiveSpot, breakevenSpot, entry }) {
  const buffer = Math.max(entry * 3.5, effectiveSpot * 0.015, 120);
  const minVal = Math.min(strike, effectiveSpot, breakevenSpot) - buffer;
  const maxVal = Math.max(strike, effectiveSpot, breakevenSpot) + buffer;
  return {
    min: Math.floor(minVal / 20) * 20,
    max: Math.ceil(maxVal / 20) * 20
  };
}

export function calculateApproxDelta({ isCall, effectiveSpot, strike }) {
  if (isCall) {
    if (effectiveSpot > strike) return Math.min(0.95, 0.52 + (effectiveSpot - strike) * 0.0018);
    return Math.max(0.08, 0.52 - (strike - effectiveSpot) * 0.0018);
  }
  if (effectiveSpot < strike) return Math.max(-0.95, -0.48 - (strike - effectiveSpot) * 0.0018);
  return Math.min(-0.08, -0.48 + (effectiveSpot - strike) * 0.0018);
}

export function calculateGammaFactor({ effectiveSpot, strike, isZeroDte }) {
  const distFromAtm = Math.abs(effectiveSpot - strike);
  const baseGamma = isZeroDte ? 0.0032 : 0.0016;
  return baseGamma / (1 + distFromAtm * 0.002);
}

export function calculateThetaDecayPct({ holdDuration, isZeroDte }) {
  if (holdDuration === "flash") return 0;
  if (holdDuration === "30m") return isZeroDte ? 0.08 : 0.045;
  if (holdDuration === "2h") return isZeroDte ? 0.22 : 0.13;
  return 0;
}

export function computeExpiryPayoff({ sT, isCall, strike, isDirect, hedgeStrk, hedgePrc, entry, isBuy, totalShares }) {
  let intrinsic = 0;
  if (isCall) {
    intrinsic = Math.max(0, sT - strike);
    if (!isDirect && hedgeStrk > strike) {
      intrinsic = Math.min(intrinsic, hedgeStrk - strike);
    }
  } else {
    intrinsic = Math.max(0, strike - sT);
    if (!isDirect && hedgeStrk < strike) {
      intrinsic = Math.min(intrinsic, strike - hedgeStrk);
    }
  }

  const netCost = !isDirect ? (entry - Number(hedgePrc || 0)) : entry;
  const pnlPerShare = isBuy ? (intrinsic - netCost) : (netCost - intrinsic);
  const totalPnl = pnlPerShare * totalShares;
  const returnPct = netCost > 0 ? (pnlPerShare / netCost) * 100 : 0;

  return { pnl: totalPnl, returnPct, pnlPerShare };
}

export function computePayoffRiskReward({ entry = 0, sl = 0, tp = 0, totalShares = 65, isBuy = true }) {
  const safeEntry = Math.max(0.05, Number(entry || 0));
  const shares = Math.max(1, Number(totalShares || 65));
  const defaultSlPoints = Math.max(0.5, Math.round((250 / shares) * 2) / 2);
  const defaultTpPoints = Number((defaultSlPoints * 2.0).toFixed(1));

  const safeSl = Number(sl && Number(sl) > 0 ? sl : Math.max(0.05, safeEntry - defaultSlPoints));
  const safeTp = Number(tp && Number(tp) > 0 ? tp : (safeEntry + defaultTpPoints));
  
  const riskPerShare = isBuy ? Math.max(0, safeEntry - safeSl) : Math.max(0, safeSl - safeEntry);
  const rewardPerShare = isBuy ? Math.max(0, safeTp - safeEntry) : Math.max(0, safeEntry - safeTp);
  
  const riskAmount = Math.round(riskPerShare * totalShares);
  const rewardAmount = Math.round(rewardPerShare * totalShares);
  const riskPct = safeEntry > 0 ? (riskPerShare / safeEntry) * 100 : 0;
  const rewardPct = safeEntry > 0 ? (rewardPerShare / safeEntry) * 100 : 0;
  const currentRR = riskPerShare > 0 ? `1:${(rewardPerShare / riskPerShare).toFixed(1)}` : "1:2.5";
  
  return {
    riskAmount,
    riskPct,
    rewardAmount,
    rewardPct,
    currentRR
  };
}

export function computeSimulatedOutcome({
  currentSimulatedSpot = 0,
  effectiveSpot = 0,
  approxDelta = 0.5,
  gammaFactor = 0.001,
  isBuy = true,
  entry = 100,
  thetaDecayPct = 0,
  totalShares = 1
}) {
  const spot = Math.round(currentSimulatedSpot);
  const spotDelta = Math.round(spot - effectiveSpot);
  
  const deltaMove = approxDelta * spotDelta;
  const gammaMove = 0.5 * gammaFactor * (spotDelta ** 2);
  const rawPrice = Math.max(0.05, entry + deltaMove + gammaMove);
  
  const decayedPrice = Math.max(0.05, rawPrice * (1 - (thetaDecayPct || 0) / 100));
  const estOptPrice = Math.max(0.05, Number(decayedPrice.toFixed(2)));
  
  const pnlPerShare = isBuy ? (estOptPrice - entry) : (entry - estOptPrice);
  const estPnl = Math.round(pnlPerShare * totalShares);
  const isProfit = estPnl >= 0;
  const estReturnPct = entry > 0 ? ((pnlPerShare / entry) * 100).toFixed(1) : "0.0";
  
  return {
    spot,
    spotDelta,
    estOptPrice,
    isProfit,
    estPnl,
    expiryPnl: estPnl,
    estReturnPct
  };
}
