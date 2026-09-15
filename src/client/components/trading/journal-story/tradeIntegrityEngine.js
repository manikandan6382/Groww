// 🌟 OBJECTIVE SETUP INTEGRITY ENGINE (12-Filter Quantitative Gate)
export function evaluateTradeIntegrity(trade) {
  let score = 100;
  const violations = [];
  const passedRules = [];

  const entry = Number(trade.entryPrice || 0);
  const exit = Number(trade.exitPrice || 0);
  const sl = Number(trade.stopLoss || entry * 0.9);
  const tp = Number(trade.targetPrice || entry * 1.1);

  // 1. Risk-to-Reward Ratio Rule (Must be >= 1:1.8)
  const riskPts = Math.max(0.1, Math.abs(entry - sl));
  const rewardPts = Math.max(0.1, Math.abs(tp - entry));
  const rrRatio = Number((rewardPts / riskPts).toFixed(2));

  if (rrRatio >= 1.8) {
    passedRules.push(`R:R Target Ratio ≥ 1:1.8 (Calculated 1:${rrRatio})`);
  } else {
    score -= 25;
    violations.push(`Poor R:R Plan (1:${rrRatio} < 1:1.8 minimum)`);
  }

  // 2. Risk Sizing Limit (Max ₹1,500 on standard 1-lot scalps)
  const lotSize = trade.lotSize || 65;
  const totalRiskAmount = riskPts * (trade.quantity || 1) * lotSize;
  if (totalRiskAmount <= 1500) {
    passedRules.push(`Risk Allocated (₹${totalRiskAmount.toFixed(0)}) ≤ 1.5% Capital Budget`);
  } else {
    score -= 20;
    violations.push(`Oversized Risk (₹${totalRiskAmount.toFixed(0)} exceeds ₹1,500 limit)`);
  }

  // 3. Execution Discipline & Wick Chasing Audit
  const mistakeStr = Array.isArray(trade.mistakeTags) 
    ? trade.mistakeTags.join(" ").toLowerCase() 
    : String(trade.mistakeTags || "").toLowerCase();
  const isChased = mistakeStr.includes("chase") || mistakeStr.includes("fomo");
  if (!isChased && trade.followedPlan !== false) {
    passedRules.push("Entry Triggered on Retest Without Chasing Wicks");
  } else {
    score -= 30;
    violations.push("Chased Extended Candle / Entry Plan Deviated");
  }

  // 4. Clean Predetermined Exit
  if (trade.closeReason === "TARGET_HIT" || trade.closeReason === "STOP_LOSS_HIT") {
    passedRules.push("Predetermined Exit Honored Without Moving Stops");
  } else {
    score -= 15;
    violations.push("Manual Exit Panic Before Levels Hit");
  }

  const finalScore = Math.max(20, Math.min(100, score));
  const grade = finalScore >= 90 ? "A+" : finalScore >= 75 ? "B" : finalScore >= 60 ? "C" : "D (Impulse)";
  const isHighQualitySetup = finalScore >= 75;

  return { score: finalScore, grade, isHighQualitySetup, violations, passedRules, rrRatio };
}
