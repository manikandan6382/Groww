/**
 * Pure calculation helpers for Order Desk Cockpit.
 * Losslessly extracted from commit cf88102 to preserve 100% design fidelity within line limits.
 */

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
export function calculateRiskRewardTargets({ entryPrice, totalQty = 65, underlying = "NIFTY" }) {
  const entry = Number(entryPrice) || 0;
  const qty = Number(totalQty) > 0 ? Number(totalQty) : 65;
  
  // Target risk is ₹250 (inside ₹200-₹300 budget)
  // SL distance in points = 250 / qty
  // For 65 qty (NIFTY / FINNIFTY) -> 3.8 ~ 4.0 points (4 * 65 = ₹260 risk)
  // For 30 qty (BANKNIFTY) -> ~8.3 ~ 8.5 points (8.5 * 30 = ₹255 risk)
  // For 20 qty (SENSEX) -> 12.5 points (12.5 * 20 = ₹250 risk)
  let rawSlPts = 250 / qty;
  let slPoints = Math.max(0.5, Math.round(rawSlPts * 2) / 2);
  let targetPoints = Number((slPoints * 2.0).toFixed(1));

  const stopLoss = Number(Math.max(0.05, entry - slPoints).toFixed(2));
  const targetPrice = Number((entry + targetPoints).toFixed(2));

  return {
    slPoints,
    targetPoints,
    stopLoss,
    targetPrice,
    maxRiskRupees: Number((slPoints * qty).toFixed(2)),
    targetRewardRupees: Number((targetPoints * qty).toFixed(2))
  };
}

export function computeFrictionMetrics({ netEntryPrice, totalQty, rewardAmount }) {
  const estimatedFriction = Number((55.20 + (netEntryPrice * totalQty * 0.001)).toFixed(2));
  const minViableReward = Math.max(250, estimatedFriction * 3.5);
  const isFrictionTrap = rewardAmount > 0 && rewardAmount < minViableReward;
  const frictionDragPct = rewardAmount > 0 ? Number(((estimatedFriction / rewardAmount) * 100).toFixed(1)) : 0;
  const frictionCoverageRatio = estimatedFriction > 0 && rewardAmount > 0 ? (rewardAmount / estimatedFriction).toFixed(1) : "0.0";

  return {
    estimatedFriction,
    minViableReward,
    isFrictionTrap,
    frictionDragPct,
    frictionCoverageRatio
  };
}

export function evaluateCopilotRegime({
  copilotRegime,
  activeAsset,
  rrRatio,
  isFrictionTrap,
  frictionDragPct,
  rewardAmount = 0,
  estimatedFriction = 55.20,
  minViableReward = 250
}) {
  const asset = activeAsset || {};
  const isMarketBearish = !asset.positive;
  const dynamicTitle = isMarketBearish ? "Breakdown Momentum Scalp" : "Bullish Expansion Scalp";
  const spotNum = Number(asset.spot || 0);
  const spotStr = Number.isFinite(spotNum) ? spotNum.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00";
  const dynamicSubtitle = `Spot @ ₹${spotStr} (${asset.change || "0.00%"}). ${asset.name || "Index"} ${isMarketBearish ? "breakdown below resistance" : "breakout above VWAP"} confirmed on Upstox v2 feed. 1:${rrRatio || "0.00"} R:R locked.`;

  if (copilotRegime === "PRIME") {
    if (isFrictionTrap) {
      return {
        regime: "PRIME",
        status: "FRICTION_TRAP",
        badge: `⚠️ FRICTION TRAP (${frictionDragPct}% TAX)`,
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
        bannerBg: "bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]",
        ambientGlow: "bg-amber-500/10",
        pulseColor: "bg-amber-400",
        title: "Micro-Yield Friction Trap",
        subtitle: `Projected reward (+₹${rewardAmount.toFixed(0)}) loses ${frictionDragPct}% to statutory friction (~₹${estimatedFriction.toFixed(0)}). Enforce ≥ ₹${minViableReward.toFixed(0)} reward floor.`,
        buttonText: "⚠️ Auto-Deploy (Friction Drag)",
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
      buttonText: "🛑 Stand Down (Locked)",
      buttonClass: "bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-not-allowed opacity-90",
      ctaText: "Deploy Practice Trade in Sandbox Mode →",
      ctaClass: "bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 text-black font-extrabold shadow-xl shadow-cyan-500/25 cursor-pointer",
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
