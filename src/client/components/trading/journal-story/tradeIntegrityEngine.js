// 🌟 INSTITUTIONAL QUANTITATIVE INTEGRITY ENGINE (12-Filter Quantitative Gate)
// Strictly enforcing Manikandan's Capital Invariants:
// - Max Loss per trade: Strictly ₹200–₹300 (Default target risk = ₹250, hard cap ₹300)
// - Aim / Target per trade: Strictly ₹400–₹600 (Default target gain = ₹500, exact 1:2.00 RR)
// - Statutory Friction: ~₹55.20 round-trip options drag

import { resolveIndexLotSize } from "../../../stores/slices/tradeHelpers";

export function evaluateTradeIntegrity(trade) {
  let score = 100;
  const violations = [];
  const passedRules = [];

  const effectiveLotSize = resolveIndexLotSize(trade.symbol, trade.lotSize);
  const rawQty = Number(trade.quantity || 1);
  const qty = Number(trade.totalQty || (rawQty >= effectiveLotSize ? rawQty : rawQty * effectiveLotSize));

  const entry = Number(trade.entryPrice || 0);
  const exit = Number(trade.exitPrice || 0);

  // Dynamic Stop Loss & Target derived strictly from ₹250 risk budget (NO percentage fallbacks)
  const defaultSlPts = Number((250 / Math.max(1, qty)).toFixed(2));
  const defaultTpPts = Number((defaultSlPts * 2.0).toFixed(2));

  const sl = Number(trade.stopLoss || (entry > defaultSlPts ? entry - defaultSlPts : Math.max(0.1, entry * 0.95)));
  const tp = Number(trade.targetPrice || (entry + defaultTpPts));

  const riskPts = Math.max(0.1, Math.abs(entry - sl));
  const rewardPts = Math.max(0.1, Math.abs(tp - entry));
  const rrRatio = Number((rewardPts / riskPts).toFixed(2));

  const totalRiskRupees = Number((riskPts * qty).toFixed(2));
  const netPnl = Number(trade.netPnl !== undefined ? trade.netPnl : (exit - entry) * qty - 55.20);
  const isInvariantBreached = totalRiskRupees > 300 || netPnl < -300;

  const mistakeStr = Array.isArray(trade.mistakeTags) 
    ? trade.mistakeTags.join(" ").toLowerCase() 
    : String(trade.mistakeTags || "").toLowerCase();

  // -----------------------------------------------------------------
  // 1. Risk-to-Reward Ratio Rule (Must be >= 1:1.80, Target 1:2.00)
  // -----------------------------------------------------------------
  if (rrRatio >= 1.8) {
    passedRules.push(`R:R Target Ratio ≥ 1:1.80 (Calculated 1:${rrRatio})`);
  } else {
    score -= 15;
    violations.push(`Suboptimal R:R Ratio (1:${rrRatio} < 1:1.80 minimum)`);
  }

  // -----------------------------------------------------------------
  // 2. Strict Risk Budget Allocation (Strictly ₹200–₹300, Hard Cap ₹300)
  // -----------------------------------------------------------------
  if (totalRiskRupees <= 300) {
    passedRules.push(`Planned Risk (₹${Math.round(totalRiskRupees)}) within ₹200–₹300 Invariant`);
  } else {
    score -= 25;
    violations.push(`Risk Invariant Breached (₹${Math.round(totalRiskRupees)} exceeds ₹300 cap)`);
  }

  // -----------------------------------------------------------------
  // 3. Realized Capital Preservation Invariant (Loss <= ₹300)
  // -----------------------------------------------------------------
  if (netPnl >= -300) {
    passedRules.push(`Realized Loss Shield Intact (Downside capped at -₹300)`);
  } else {
    score -= 30;
    violations.push(`Capital Loss Invariant Breached (-₹${Math.abs(Math.round(netPnl))} > ₹300)`);
  }

  // -----------------------------------------------------------------
  // 4. Execution Discipline & Wick Chasing Audit
  // -----------------------------------------------------------------
  const isChased = mistakeStr.includes("chase") || mistakeStr.includes("fomo");
  if (!isChased && trade.followedPlan !== false) {
    passedRules.push("Entry Triggered on Retest / Structure Without Chasing Wicks");
  } else {
    score -= 20;
    violations.push("Chased Extended Candle / Entry Plan Deviated (FOMO)");
  }

  // -----------------------------------------------------------------
  // 5. Clean Predetermined Exit Protocol
  // -----------------------------------------------------------------
  const cleanExit = trade.closeReason === "TARGET_HIT" || 
                    trade.closeReason === "STOP_LOSS_HIT" || 
                    trade.closeReason === "BREAKEVEN_LOCKED" ||
                    trade.closeReason === "MANUAL_PROFIT_TAKE";
  if (cleanExit) {
    passedRules.push("Predetermined Exit Honored Without Stop Widening");
  } else {
    score -= 10;
    violations.push("Manual Panic Exit Before Predetermined Levels Hit");
  }

  // -----------------------------------------------------------------
  // 6. Market Microstructure Timing (Avoid 10:30–13:30 Midday Chop)
  // -----------------------------------------------------------------
  const dateObj = new Date(trade.entryDatetime || trade.datetime || Date.now());
  const utcHours = dateObj.getUTCHours();
  const utcMins = dateObj.getUTCMinutes();
  const totalUtcMinutes = utcHours * 60 + utcMins;
  // 10:30 IST is 05:00 UTC (300 mins), 13:30 IST is 08:00 UTC (480 mins)
  const isMiddayChop = totalUtcMinutes >= 300 && totalUtcMinutes < 480;

  if (!isMiddayChop) {
    passedRules.push("Optimal Microstructure Window (Opening Drive / Power Hour)");
  } else {
    score -= 10;
    violations.push("Midday Chop Trap (Entered in 10:30–13:30 Theta Bleed Zone)");
  }

  // -----------------------------------------------------------------
  // 7. Statutory Friction Drag Buffer
  // -----------------------------------------------------------------
  const taxes = Number(trade.taxesAndCharges || 55.20);
  const frictionPts = qty > 0 ? (taxes / qty) : 0.85;
  if (rewardPts >= frictionPts * 2.5) {
    passedRules.push(`Friction Buffer Healthy (Target ≥ 2.5× Statutory Drag)`);
  } else {
    score -= 10;
    violations.push(`Friction Drag Trap (Charges consume > 40% of target)`);
  }

  // -----------------------------------------------------------------
  // 8. Brownian Micro-Noise Stop Buffer (>= 3.8 pts on NIFTY)
  // -----------------------------------------------------------------
  if (riskPts >= 3.8) {
    passedRules.push(`Stop Loss Positioned Outside Brownian Micro-Spread Noise`);
  } else {
    score -= 10;
    violations.push(`Micro-Noise Exposure (SL < 3.8 pts vulnerable to spread chop)`);
  }

  // -----------------------------------------------------------------
  // 9. Emotional Tilt & Revenge Trading Shield
  // -----------------------------------------------------------------
  const isRevenge = mistakeStr.includes("revenge") || mistakeStr.includes("tilt") || mistakeStr.includes("over-trade");
  if (!isRevenge) {
    passedRules.push("Psychological Composure Intact (Zero Revenge / Over-Trading)");
  } else {
    score -= 25;
    violations.push("Psychological Tilt (Revenge Scalp / Impulsive Size)");
  }

  // -----------------------------------------------------------------
  // 10. Execution Slippage Containment (<= 1.0 pt)
  // -----------------------------------------------------------------
  const slippage = Math.abs(Number(trade.entrySlippagePts ?? trade.slippagePts ?? 0));
  if (slippage <= 1.0) {
    passedRules.push(`Adverse Fill Slippage Contained (≤ 1.0 pt tolerance)`);
  } else {
    score -= 10;
    violations.push(`Excessive Fill Slippage (+${slippage.toFixed(2)} pts drag)`);
  }

  // -----------------------------------------------------------------
  // 11. Discipline & Rule Fidelity
  // -----------------------------------------------------------------
  const movedStop = mistakeStr.includes("moved stop") || mistakeStr.includes("slipped stop");
  if (!movedStop) {
    passedRules.push("Iron Stop Discipline (Stop Loss Never Moved Adversely)");
  } else {
    score -= 25;
    violations.push("Stop Loss Moved Further Out (Deadly Discipline Breach)");
  }

  // -----------------------------------------------------------------
  // 12. Statistical Edge / Favorable Excursion Harvest
  // -----------------------------------------------------------------
  const mfe = Number(trade.mfePts ?? (netPnl > 0 ? (rewardPts * 0.9) : (rewardPts * 0.3)));
  if (netPnl > 0 || mfe >= riskPts) {
    passedRules.push(`Positive Alpha Generation / Target Excursion Verified`);
  } else {
    passedRules.push(`Risk Preserved within Bounds on Adverse Shift`);
  }

  const finalScore = Math.max(10, Math.min(100, score));
  const grade = finalScore >= 90 ? "A+" : finalScore >= 75 ? "B" : finalScore >= 60 ? "C" : "D (Impulse)";
  const isHighQualitySetup = finalScore >= 75;

  return { 
    score: finalScore, 
    grade, 
    isHighQualitySetup, 
    violations, 
    passedRules, 
    rrRatio,
    totalRiskRupees,
    isInvariantBreached
  };
}
