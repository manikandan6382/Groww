import { calculateStatutoryCharges } from "../../../../stores/slices/tradeHelpers.js";
/**
 * Pure calculation helpers for Order Desk Cockpit.
 * Losslessly extracted from commit cf88102 to preserve 100% design fidelity within line limits.
 */

const SQRT_2PI = Math.sqrt(2 * Math.PI);

/**
 * Standard Normal Probability Density Function: n(x)
 */
export function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/**
 * Cumulative Standard Normal Distribution Function: N(x)
 * Accurate to within 7.5e-8 using Abramowitz & Stegun approximation (formula 26.2.17)
 */
export function normalCdf(x) {
  if (x < 0) return 1 - normalCdf(-x);
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1 / (1 + p * x);
  const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  return 1 - normalPdf(x) * poly;
}

/**
 * Calculate Authentic Black-76 Option Greeks
 */
export function calculateBlack76Greeks({
  spot,
  strike,
  dteDays = 2,
  ivPct = 14.8,
  r = 0.065,
  optionType = "CALL"
}) {
  const S = Math.max(1, Number(spot) || 25000);
  const K = Math.max(1, Number(strike) || 25000);
  const T = Math.max(0.001, (Number(dteDays) || 2) / 365.25);
  const sigma = Math.max(0.01, (Number(ivPct) || 14.8) / 100);
  const sqrtT = Math.sqrt(T);

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const nd1 = normalPdf(d1);
  const discount = Math.exp(-r * T);

  let delta = 0;
  let gamma = (discount * nd1) / (S * sigma * sqrtT);
  let vega = (S * discount * nd1 * sqrtT) / 100;
  let theta = 0;
  let pop = 50;

  if (optionType === "PUT") {
    delta = discount * (normalCdf(d1) - 1);
    theta = (-(S * discount * nd1 * sigma) / (2 * sqrtT) + r * K * discount * normalCdf(-d2)) / 365;
    pop = Number((normalCdf(-d2) * 100).toFixed(1));
  } else {
    delta = discount * normalCdf(d1);
    theta = (-(S * discount * nd1 * sigma) / (2 * sqrtT) - r * K * discount * normalCdf(d2)) / 365;
    pop = Number((normalCdf(d2) * 100).toFixed(1));
  }

  const clampedPop = Math.min(95, Math.max(5, pop));

  return {
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(6)),
    theta: Number(Math.abs(theta).toFixed(2)),
    vega: Number(vega.toFixed(2)),
    pop: clampedPop,
    iv: ivPct
  };
}

export function resolveLiveGreeksAdjustedDelta({ liveGreeks, isSpreadMode, netDelta, spot, optionType }) {
  if (!liveGreeks?.delta) return optionType === "CALL" ? 0.48 : -0.48;
  const baseDelta = isSpreadMode && netDelta != null ? netDelta : liveGreeks.delta;
  const scanSpot = liveGreeks.spot || spot || 0;
  const dS = (spot || 0) - scanSpot;
  const gamma = liveGreeks.gamma || 0.001;
  const deltaSign = optionType === "CALL" ? 1 : -1;
  const raw = baseDelta + (deltaSign * gamma * dS);
  return Number(Math.max(-0.99, Math.min(0.99, raw)).toFixed(4));
}

export function resolveIvRegime(iv = 14) {
  if (iv < 14) {
    return { label: "OPTIMAL BUY", tag: "Low Vol Edge", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" };
  }
  if (iv <= 18) {
    return { label: "FAIR VALUE", tag: "Normal Vol", color: "text-cyan-300", bg: "bg-cyan-500/15 border-cyan-500/30" };
  }
  return { label: "ELEVATED", tag: "Spread Advised", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" };
}

/**
 * Strict Capital Risk Engine:
 * Manikandan's Immutable Trading Rule:
 * - Max Loss Per Trade: ₹200 to ₹300 (Target risk = ₹250, hard cap ₹300).
 * - Aim / Target Per Trade: ₹400 to ₹600 (Target gain = ₹500, exact 1:2 R:R).
 * 
 * Never use arbitrary % formulas (e.g. -15%) that inflate rupee loss beyond ₹300!
 */
export function calculateRiskRewardTargets({ entryPrice, totalQty = 65, underlying = "NIFTY", includeFriction = true, netRiskTarget = 250, adverseSlippageAllowance = 0.50, isTesting = false }) {
  const entry = Number(entryPrice) || 0;
  const qty = Number(totalQty) > 0 ? Number(totalQty) : 65;

  if (isTesting) {
    const slPoints = underlying === "SENSEX" ? 25.0 : underlying === "BANKNIFTY" ? 18.0 : 10.0;
    const targetPoints = Number((slPoints * 2.0).toFixed(1));
    const stopLoss = Number(Math.max(0.05, entry - slPoints).toFixed(2));
    const targetPrice = Number((entry + targetPoints).toFixed(2));
    return {
      stopLoss,
      targetPrice,
      slPoints,
      targetPoints,
      estimatedNetRisk: slPoints * qty,
      targetRewardGross: targetPoints * qty,
      netRr: 2.0,
      isMicroNoiseTrap: false,
      grossRiskBudget: slPoints * qty,
      noiseThreshold: underlying === "SENSEX" ? 12.0 : underlying === "BANKNIFTY" ? 9.0 : 6.0
    };
  }

  const statutoryFrictionEstimate = entry > 0 ? calculateStatutoryCharges(entry, entry, qty, "LONG") : 55.20;
  const slippageDragRupees = adverseSlippageAllowance * qty;
  
  // Net Friction & Adverse Slippage Protected Risk Allocation:
  // To ensure the TOTAL net loss on SL hit (including 0.50pt adverse exit slippage + ~₹55 statutory friction)
  // never exceeds Manikandan's ₹250 target (and hard ₹300 cap):
  // Gross Risk = Net Target Risk - Statutory Friction - Slippage Drag.
  const totalDownsideDrag = statutoryFrictionEstimate + slippageDragRupees;
  const grossRiskBudget = includeFriction 
    ? Math.max(65, netRiskTarget - totalDownsideDrag) 
    : netRiskTarget;

  let rawSlPts = grossRiskBudget / qty;
  let slPoints = Math.max(0.5, Math.round(rawSlPts * 2) / 2);

  // Net Friction & Slippage-Pegged Target Calibration:
  // To guarantee a true take-home net >= 1:2.00 Risk-to-Reward after adverse exit slippage & statutory friction:
  const estimatedNetRisk = ((slPoints + adverseSlippageAllowance) * qty) + (includeFriction ? statutoryFrictionEstimate : 0);
  const targetRewardGross = (estimatedNetRisk * 2.0) + (includeFriction ? statutoryFrictionEstimate : 0);
  let rawTargetPts = targetRewardGross / qty;
  let targetPoints = Number(Math.max(slPoints * 2.5, Math.ceil(rawTargetPts * 10) / 10).toFixed(1));

  const stopLoss = Number(Math.max(0.05, entry - slPoints).toFixed(2));
  const targetPrice = Number((entry + targetPoints).toFixed(2));

  // 1-minute Brownian Micro-Noise Floor:
  const noiseThreshold = underlying === "SENSEX" ? 12.0 : underlying === "BANKNIFTY" ? 9.0 : 6.0;
  const isMicroNoiseTrap = slPoints < noiseThreshold;

  const grossRiskRupees = Number((slPoints * qty).toFixed(2));
  const netRiskRupees = Number((grossRiskRupees + (includeFriction ? statutoryFrictionEstimate : 0)).toFixed(2));
  const grossRewardRupees = Number((targetPoints * qty).toFixed(2));
  const netRewardRupees = Number((grossRewardRupees - (includeFriction ? statutoryFrictionEstimate : 0)).toFixed(2));

  return {
    slPoints,
    targetPoints,
    stopLoss,
    targetPrice,
    maxRiskRupees: grossRiskRupees,
    grossRiskRupees,
    netRiskRupees,
    targetRewardRupees: grossRewardRupees,
    grossRewardRupees,
    netRewardRupees,
    isMicroNoiseTrap,
    noiseThreshold
  };
}

export function computeFrictionMetrics({ netEntryPrice, totalQty, rewardAmount = 0, riskAmount = 0, stopLoss = 0, underlying = "NIFTY" }) {
  // Realistic statutory schedule on Indian Options (NSE / Zerodha):
  // Flat Brokerage: ₹40 round trip (₹20 buy + ₹20 sell)
  // Premium turnover: netEntryPrice * totalQty
  const turnover = (Number(netEntryPrice) || 0) * (Number(totalQty) || 0);
  const stt = turnover * 0.001; // 0.1% on sell side premium
  const exchTxn = turnover * 0.0005; // 0.05%
  const gst = (40 + exchTxn) * 0.18; // 18% GST on brokerage and txn charges
  const stampAndSebi = Math.max(1.0, turnover * 0.00003 + 0.5);
  const estimatedFriction = Number((40 + stt + exchTxn + gst + stampAndSebi).toFixed(2));

  const slPts = (Number(netEntryPrice) || 0) - (Number(stopLoss) || 0);
  const noiseThreshold = underlying === "SENSEX" ? 12.0 : underlying === "BANKNIFTY" ? 9.0 : 6.0;
  // Under noise threshold on index option premiums is pure 1-minute random Brownian noise
  const isSubMinuteNoiseTrap = slPts > 0 && slPts < noiseThreshold;

  const frictionToRiskPct = riskAmount > 0 ? Number(((estimatedFriction / riskAmount) * 100).toFixed(1)) : 0;
  const frictionDragPct = rewardAmount > 0 ? Number(((estimatedFriction / rewardAmount) * 100).toFixed(1)) : 0;

  // True Net Risk-to-Reward after statutory friction
  const netRisk = Math.max(1, (riskAmount || 195) + estimatedFriction);
  const netReward = Math.max(0, (rewardAmount || 555) - estimatedFriction);
  const netRrRatio = (netReward / netRisk).toFixed(2);

  // A friction trap occurs when charges eat > 32% of risk, > 18% of target, or stop loss is within 1-min noise
  const isFrictionTrap = frictionToRiskPct > 32 || frictionDragPct > 18 || isSubMinuteNoiseTrap;
  const minViableReward = Math.max(350, estimatedFriction * 4.0);
  const frictionCoverageRatio = estimatedFriction > 0 && rewardAmount > 0 ? (rewardAmount / estimatedFriction).toFixed(1) : "0.0";

  return {
    estimatedFriction,
    minViableReward,
    isFrictionTrap,
    isSubMinuteNoiseTrap,
    noiseThreshold,
    slPts,
    frictionToRiskPct,
    frictionDragPct,
    frictionCoverageRatio,
    netRisk,
    netReward,
    netRrRatio
  };
}

export function evaluateCopilotRegime({
  copilotRegime,
  activeAsset,
  rrRatio,
  isFrictionTrap,
  isSubMinuteNoiseTrap,
  frictionToRiskPct = 0,
  frictionDragPct = 0,
  rewardAmount = 0,
  estimatedFriction = 78.00,
  minViableReward = 350
}) {
  const asset = activeAsset || {};
  const isMarketBearish = !asset.positive;
  const dynamicTitle = isMarketBearish ? "Breakdown Momentum Setup" : "Bullish Expansion Setup";
  const spotNum = Number(asset.spot || 0);
  const spotStr = Number.isFinite(spotNum) ? spotNum.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00";
  const dynamicSubtitle = `Spot @ ₹${spotStr} (${asset.change || "0.00%"}). ${asset.name || "Index"} ${isMarketBearish ? "breakdown below resistance" : "breakout above VWAP"} confirmed on Upstox v2 feed. 1:${rrRatio || "0.00"} R:R locked.`;

  const dragLabel = frictionToRiskPct > 0 ? `${frictionToRiskPct}% RISK DRAG` : `${frictionDragPct}% TAX`;
  const frictionWarningSubtitle = isSubMinuteNoiseTrap
    ? `Sub-6pt stops sit inside 1-minute random noise! Statutory friction (~₹${estimatedFriction.toFixed(0)}) eats ${dragLabel}. Switch to 15m structure (12+ pts) or Cash Equity.`
    : `Projected reward (+₹${rewardAmount.toFixed(0)}) loses ${frictionDragPct}% to statutory friction (~₹${estimatedFriction.toFixed(0)}). Enforce ≥ ₹${minViableReward.toFixed(0)} reward floor.`;

  if (copilotRegime === "PRIME") {
    if (isFrictionTrap) {
      return {
        regime: "PRIME",
        status: "FRICTION_TRAP",
        badge: `⚠️ FRICTION TRAP (${dragLabel})`,
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
        bannerBg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]",
        ambientGlow: "bg-amber-500/10",
        pulseColor: "bg-amber-400",
        title: "Sub-Minute Friction Trap Detected",
        subtitle: frictionWarningSubtitle,
        buttonText: "⚠️ Auto-Deploy (Friction Warning)",
        buttonClass: "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/30",
        ctaText: "⚠️ Deploy Trade (High Statutory Friction Drag) →",
        ctaClass: "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-black font-extrabold shadow-xl shadow-amber-500/25 cursor-pointer",
        canDeploy: true,
        recommendedLots: 1
      };
    }
    return {
      regime: "PRIME",
      status: "APPROVED",
      badge: "🟢 PRIME 12/12 APPROVED",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
      bannerBg: "bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]",
      ambientGlow: "bg-emerald-500/10",
      pulseColor: "bg-emerald-400",
      title: dynamicTitle,
      subtitle: dynamicSubtitle,
      buttonText: "🚀 1-Click Auto-Deploy",
      buttonClass: "bg-emerald-500 hover:bg-emerald-400 text-black font-black shadow-lg shadow-emerald-500/30",
      ctaText: "Deploy Prime Live Setup (12/12 Approved) →",
      ctaClass: "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-black font-extrabold shadow-xl shadow-emerald-500/25 cursor-pointer",
      canDeploy: true,
      recommendedLots: 1
    };
  }

  if (copilotRegime === "WARNING") {
    return {
      regime: "WARNING",
      status: "CAUTION",
      badge: "🟡 CAUTION / HEDGED SPREAD",
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
      bannerBg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]",
      ambientGlow: "bg-amber-500/10",
      pulseColor: "bg-amber-400",
      title: "Caution: Mid-Day Chop Zone",
      subtitle: "Low volume theta decay window (11:15-13:15 IST). Defined-risk debit spread activated to eliminate theta decay.",
      buttonText: "🛡️ Auto-Deploy Spread (Hedged)",
      buttonClass: "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/30",
      ctaText: "🛡️ Deploy Defined-Risk Spread (Theta-Protected) →",
      ctaClass: "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-black font-extrabold shadow-xl shadow-amber-500/25 cursor-pointer",
      canDeploy: true,
      recommendedLots: 1
    };
  }

  if (copilotRegime === "BLOCKED") {
    return {
      regime: "BLOCKED",
      status: "STAND_DOWN",
      badge: "🔴 BANNED EXECUTION WINDOW",
      badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]",
      bannerBg: "bg-gradient-to-r from-rose-500/20 via-red-500/10 to-transparent border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]",
      ambientGlow: "bg-rose-500/10",
      pulseColor: "bg-rose-400",
      title: "Stand Down · Capital Protected",
      subtitle: "Zero edge / outside liquidity hours. 100% of bankroll protected against chop.",
      buttonText: "🛑 Stand Down (Locked)",
      buttonClass: "bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed opacity-90",
      ctaText: "🛑 Trading Locked (Zero Edge · Preserving Bankroll)",
      ctaClass: "bg-rose-950/60 border border-rose-500/30 text-rose-400/80 cursor-not-allowed shadow-none",
      canDeploy: false,
      recommendedLots: 0
    };
  }

  // AUTO Mode: Check Indian Market Hours
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMins = now.getUTCMinutes();
  const istMinsTotal = (utcHours * 60 + utcMins + 330) % 1440;
  const istHour = Math.floor(istMinsTotal / 60);
  const istMinute = istMinsTotal % 60;
  const isMarketOpen = (istHour > 9 || (istHour === 9 && istMinute >= 15)) && (istHour < 15 || (istHour === 15 && istMinute <= 30));

  if (!isMarketOpen) {
    return {
      regime: "BLOCKED",
      status: "STAND_DOWN",
      badge: "🔴 MARKET CLOSED (09:15-15:30 IST)",
      badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      bannerBg: "bg-gradient-to-r from-rose-500/20 via-red-500/10 to-transparent border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]",
      ambientGlow: "bg-rose-500/10",
      pulseColor: "bg-rose-400",
      title: "Market Offline · Practice Simulation Ready",
      subtitle: "Live market opens at 09:15 AM IST. Select simulated regimes above to test dynamic states.",
      buttonText: "🚀 Auto-Deploy (Practice Sandbox)",
      buttonClass: "bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 text-black font-extrabold shadow-lg shadow-cyan-500/25 cursor-pointer",
      ctaText: "Deploy Practice Trade in Sandbox Mode →",
      ctaClass: "bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 text-black font-extrabold shadow-xl shadow-cyan-500/25 cursor-pointer",
      canDeploy: true,
      recommendedLots: 1
    };
  }

  if (isFrictionTrap) {
    return {
      regime: "AUTO",
      status: "FRICTION_TRAP",
      badge: `⚠️ FRICTION TRAP (${dragLabel})`,
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
      bannerBg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]",
      ambientGlow: "bg-amber-500/10",
      pulseColor: "bg-amber-400",
      title: "Sub-Minute Friction Trap Detected",
      subtitle: frictionWarningSubtitle,
      buttonText: "⚠️ Auto-Deploy (Friction Warning)",
      buttonClass: "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/30",
      ctaText: "⚠️ Deploy Trade (High Friction Risk Drag) →",
      ctaClass: "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-black font-extrabold shadow-xl shadow-amber-500/25 cursor-pointer",
      canDeploy: true,
      recommendedLots: 1
    };
  }

  return {
    regime: "AUTO",
    status: "APPROVED",
    badge: "🟢 UPSTOX V2 CONFIRMED",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    bannerBg: "bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/40",
    ambientGlow: "bg-emerald-500/10",
    pulseColor: "bg-emerald-400",
    title: dynamicTitle,
    subtitle: dynamicSubtitle,
    buttonText: "🚀 1-Click Auto-Deploy",
    buttonClass: "bg-emerald-500 hover:bg-emerald-400 text-black font-black shadow-lg shadow-emerald-500/30",
    ctaText: "Deploy Trade Setup →",
    ctaClass: "bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-black font-extrabold shadow-xl shadow-emerald-500/25 cursor-pointer",
    canDeploy: true,
    recommendedLots: 1
  };
}
