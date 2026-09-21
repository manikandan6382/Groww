import { calculateTradeRMultiple } from "../history/historyCalculations";

export function calculateMatrixStats(matrixTrades = []) {
  const matrixWins = matrixTrades.filter((t) => Number(t.netPnl || 0) > 0);
  const matrixLosses = matrixTrades.filter((t) => Number(t.netPnl || 0) <= 0);
  const matrixTotalCount = matrixTrades.length;
  const matrixWinRate = matrixTotalCount > 0 ? ((matrixWins.length / matrixTotalCount) * 100).toFixed(1) : "0.0";

  const matrixGrossWins = matrixWins.reduce((acc, t) => acc + Math.max(0, Number(t.netPnl || 0)), 0);
  const matrixGrossLosses = Math.abs(matrixLosses.reduce((acc, t) => acc + Math.min(0, Number(t.netPnl || 0)), 0));
  const isMatrixPureWins = matrixGrossWins > 0 && matrixGrossLosses === 0;
  const matrixProfitFactor = matrixGrossLosses > 0 
    ? (matrixGrossWins / matrixGrossLosses).toFixed(2) 
    : isMatrixPureWins 
      ? "∞" 
      : "0.00";

  // Mathematical Expectancy (₹ per trade)
  const pWin = matrixTotalCount > 0 ? matrixWins.length / matrixTotalCount : 0;
  const pLoss = matrixTotalCount > 0 ? matrixLosses.length / matrixTotalCount : 0;
  const avgWinAmount = matrixWins.length > 0 ? matrixGrossWins / matrixWins.length : 0;
  const avgLossAmount = matrixLosses.length > 0 ? matrixGrossLosses / matrixLosses.length : 0;
  const quantExpectancy = Number(((pWin * avgWinAmount) - (pLoss * avgLossAmount)).toFixed(1));
  const expectancyStr = `${quantExpectancy >= 0 ? "+" : ""}₹${Math.abs(quantExpectancy).toFixed(1)}/trade`;

  // Realized R-Multiples and Expectancy R
  let totalR = 0;
  const rBuckets = {
    severeLoss: 0, // < -1.0R (Breach / Slipped)
    fullLoss: 0,   // -1.0R to -0.2R
    scratch: 0,    // -0.2R to +0.2R (Breakeven)
    smallGain: 0,  // +0.2R to +1.0R (Base Hit)
    targetGain: 0, // +1.0R to +2.0R (Target)
    runnerGain: 0  // >= +2.0R (Full Runner)
  };

  matrixTrades.forEach((t) => {
    const { rMultiple } = calculateTradeRMultiple(t);
    totalR += rMultiple;
    if (rMultiple < -1.05) {
      rBuckets.severeLoss++;
    } else if (rMultiple < -0.2) {
      rBuckets.fullLoss++;
    } else if (rMultiple <= 0.2) {
      rBuckets.scratch++;
    } else if (rMultiple < 1.0) {
      rBuckets.smallGain++;
    } else if (rMultiple < 2.0) {
      rBuckets.targetGain++;
    } else {
      rBuckets.runnerGain++;
    }
  });

  const avgRealizedR = matrixTotalCount > 0 ? (totalR / matrixTotalCount).toFixed(2) : "0.00";

  // Planned R:R ratios
  const calculatedRRs = matrixTrades.map((t) => {
    const entry = Number(t.entryPrice || 0);
    const target = Number(t.targetPrice || 0);
    const sl = Number(t.stopLoss || 0);
    if (entry > 0 && target > 0 && sl > 0) {
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(target - entry);
      if (risk > 0) return reward / risk;
    }
    return null;
  }).filter((r) => r !== null && !isNaN(r) && r > 0 && r < 50);

  const avgRRValue = calculatedRRs.length > 0 
    ? (calculatedRRs.reduce((a, b) => a + b, 0) / calculatedRRs.length).toFixed(2) 
    : "0.00";

  // Streak calculation
  let maxS = 0;
  let currS = 0;
  const sorted = [...matrixTrades].sort((a, b) => new Date(a.entryDatetime || a.date || 0) - new Date(b.entryDatetime || b.date || 0));
  sorted.forEach((t) => {
    if (Number(t.netPnl || 0) > 0) {
      currS++;
      if (currS > maxS) maxS = currS;
    } else {
      currS = 0;
    }
  });

  // Max Drawdown in ₹ and %
  let peak = 0;
  let currentBalance = 0;
  let maxDrawdownRupees = 0;
  sorted.forEach((t) => {
    currentBalance += Number(t.netPnl || 0);
    if (currentBalance > peak) peak = currentBalance;
    const dd = peak - currentBalance;
    if (dd > maxDrawdownRupees) maxDrawdownRupees = dd;
  });

  // Quarter-Kelly Criterion: f* = (p(b+1) - 1) / b
  // where b = avgWinAmount / avgLossAmount
  let quarterKellyPct = 0;
  let recommendedRiskRupees = 250;
  if (pWin > 0 && avgLossAmount > 0) {
    const b = avgWinAmount / avgLossAmount;
    if (b > 0) {
      const fullKelly = (pWin * (b + 1) - 1) / b;
      if (fullKelly > 0) {
        quarterKellyPct = Number((fullKelly * 25).toFixed(1)); // 0.25x full kelly in %
        recommendedRiskRupees = Math.min(250, Math.max(150, Math.round(250 * (quarterKellyPct / 10))));
      } else {
        quarterKellyPct = 0;
        recommendedRiskRupees = 150; // Minimum conservative risk
      }
    }
  } else if (pWin === 1 && matrixWins.length > 0) {
    // 100% win rate edge: Quarter-Kelly pegged to 25.0% and max ₹250 risk invariant
    quarterKellyPct = 25.0;
    recommendedRiskRupees = 250;
  }

  // Statutory Friction
  const totalFriction = matrixTrades.reduce((acc, t) => acc + Number(t.taxesAndCharges ?? t.charges ?? 55.20), 0);
  const netPnl = matrixTrades.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
  const grossPnl = netPnl + totalFriction;
  const frictionDragPct = grossPnl > 0 ? Math.min(100, Number(((totalFriction / grossPnl) * 100).toFixed(1))) : 0;

  // Rule Deviation Cost ("Discipline Tax")
  // Tracks avoidable losses from breaking invariants:
  // 1) Net losses exceeding ₹300 hard limit (excess over ₹250 planned risk)
  // 2) Losses on over-quota trades (> 3 trades in a single calendar day)
  const tradesByDay = new Map();
  sorted.forEach((t) => {
    const dayKey = (t.exitDatetime || t.entryDatetime || "unknown").split("T")[0];
    if (!tradesByDay.has(dayKey)) tradesByDay.set(dayKey, []);
    tradesByDay.get(dayKey).push(t);
  });

  let disciplineTax = 0;
  tradesByDay.forEach((dayTrades) => {
    dayTrades.forEach((t, idx) => {
      const pnl = Number(t.netPnl || 0);
      const isOverQuota = idx >= 3;
      const isLossBreach = pnl < -300;

      if (isOverQuota && pnl < 0) {
        disciplineTax += Math.abs(pnl);
      } else if (isLossBreach) {
        disciplineTax += (Math.abs(pnl) - 250);
      }
    });
  });
  const disciplineTaxRupees = Math.round(disciplineTax);
  const rawStrategyAlphaRupees = Math.round(netPnl + disciplineTaxRupees);

  return {
    matrixTotalCount,
    matrixWinsCount: matrixWins.length,
    matrixLossesCount: matrixLosses.length,
    matrixWinRate,
    matrixGrossWins,
    matrixGrossLosses,
    matrixProfitFactor,
    isMatrixPureWins,
    avgRRValue,
    avgRealizedR,
    quantExpectancy,
    expectancyStr,
    rBuckets,
    maxDrawdownRupees: Math.round(maxDrawdownRupees),
    quarterKellyPct,
    recommendedRiskRupees,
    totalFriction: Math.round(totalFriction),
    frictionDragPct,
    netPnl,
    grossPnl,
    matrixBestStreak: maxS,
    disciplineTaxRupees,
    rawStrategyAlphaRupees
  };
}

export function auditSessionDiscipline(session) {
  if (!session) {
    return {
      isLossCapCompliant: true,
      isQuotaCompliant: true,
      isRiskInvariantCompliant: true,
      maxTradeLoss: 0,
      tradesCount: 0,
      frictionPaid: 0,
      overallDisciplineScore: 100
    };
  }

  const trades = session.tradesList || [];
  const tradesCount = trades.length || Number(session.trades || 0);
  const sessionPnl = Number(session.pnl || 0);
  
  // 1. Loss Cap: <= ₹300
  const isLossCapCompliant = sessionPnl >= -300.00;

  // 2. 3-Trade Quota
  const isQuotaCompliant = tradesCount <= 3;

  // 3. Single Trade Risk Cap
  let maxTradeLoss = 0;
  let hasBreachedTrade = false;
  trades.forEach((t) => {
    const pnl = Number(t.pnl || t.netPnl || 0);
    if (pnl < 0 && Math.abs(pnl) > maxTradeLoss) {
      maxTradeLoss = Math.abs(pnl);
    }
    if (pnl < -300.00) {
      hasBreachedTrade = true;
    }
  });

  const isRiskInvariantCompliant = !hasBreachedTrade && maxTradeLoss <= 300.00;
  const frictionPaid = trades.reduce((acc, t) => acc + Number(t.charges || t.taxesAndCharges || 55.20), 0);

  let deductions = 0;
  if (!isLossCapCompliant) deductions += 40;
  if (!isQuotaCompliant) deductions += 30;
  if (!isRiskInvariantCompliant) deductions += 30;
  const overallDisciplineScore = Math.max(0, 100 - deductions);

  return {
    isLossCapCompliant,
    isQuotaCompliant,
    isRiskInvariantCompliant,
    maxTradeLoss: Math.round(maxTradeLoss),
    tradesCount,
    frictionPaid: Math.round(frictionPaid),
    overallDisciplineScore
  };
}

export function calculateAlphaLeakage(trade) {
  if (!trade) return { earlyExitLeakage: 0, slippageLoss: 0, netPnl: 0 };
  const net = Number(trade.netPnl || 0);
  const entry = Number(trade.entryPrice || 0);
  const exit = Number(trade.exitPrice || 0);
  const target = Number(trade.targetPrice || 0);
  const sl = Number(trade.stopLoss || 0);
  const rawQty = Number(trade.quantity || 1);
  const lotSize = Number(trade.lotSize || 65);
  const qty = Number(trade.totalQty || (rawQty >= lotSize ? rawQty : rawQty * lotSize) || 65);

  let earlyExitLeakage = 0;
  if (net > 0 && target > exit && exit > entry) {
    // Exited early before hitting full target
    earlyExitLeakage = Math.round((target - exit) * qty);
  }

  let slippageLoss = 0;
  if (net < 0 && sl > 0 && exit < sl) {
    // Slipped below stop loss price
    slippageLoss = Math.round((sl - exit) * qty);
  }

  return {
    earlyExitLeakage,
    slippageLoss,
    netPnl: net
  };
}

export function calculateGraduationStats(closedAlerts = []) {
  const practiceCompleted = closedAlerts.length;

  // 1. Regime Diversity: Count unique calendar sessions
  const uniqueDates = new Set();
  closedAlerts.forEach((t) => {
    const d = (t.exitDatetime || t.entryDatetime || t.date || "").split("T")[0];
    if (d) uniqueDates.add(d);
  });
  const distinctSessionsCount = uniqueDates.size;
  const sessionsTarget = 8;
  const sessionProgress = Math.min(100, Math.round((distinctSessionsCount / sessionsTarget) * 100));
  const tradeSampleProgress = Math.min(100, Math.round((practiceCompleted / 30) * 100));
  const sampleSizeProgress = Math.round((tradeSampleProgress * 0.6) + (sessionProgress * 0.4));

  // 2. Profit Factor & Edge
  const allWins = closedAlerts.filter((t) => (t.netPnl || 0) > 0);
  const allLosses = closedAlerts.filter((t) => (t.netPnl || 0) <= 0);
  const totalWinPnl = allWins.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
  const totalLossPnl = Math.abs(allLosses.reduce((acc, t) => acc + Number(t.netPnl || 0), 0));
  const isPureWins = totalWinPnl > 0 && totalLossPnl === 0;
  const gateProfitFactor = totalLossPnl > 0 
    ? (totalWinPnl / totalLossPnl).toFixed(2) 
    : isPureWins 
      ? "∞" 
      : "0.00";

  // 3. Strict RMS Invariant Discipline Auditing
  const dailySummary = {};
  closedAlerts.forEach((t) => {
    const dateKey = (t.exitDatetime || t.entryDatetime || "unknown").split("T")[0];
    if (!dailySummary[dateKey]) {
      dailySummary[dateKey] = { trades: 0, pnl: 0, quotaBreached: false, lossCapBreached: false };
    }
    dailySummary[dateKey].trades += 1;
    dailySummary[dateKey].pnl += Number(t.netPnl || 0);
    if (dailySummary[dateKey].trades > 3) dailySummary[dateKey].quotaBreached = true;
    if (dailySummary[dateKey].pnl < -300) dailySummary[dateKey].lossCapBreached = true;
  });

  let disciplineDeductions = 0;
  closedAlerts.forEach((t) => {
    let tradePenalty = 0;
    if (t.followedPlan === false) tradePenalty += 10;
    
    const m = Array.isArray(t.mistakeTags) ? t.mistakeTags.join(" ") : String(t.mistakeTags || "");
    if (m.includes("Moved Stop Loss")) tradePenalty += 15;
    if (m.includes("Chased Extended Wick")) tradePenalty += 10;
    if (m.includes("Revenge Trade")) tradePenalty += 25;
    if (m.includes("Over-Traded")) tradePenalty += 15;

    // Single trade risk cap check: strictly ₹200-₹300 invariant
    const entry = Number(t.entryPrice || 0);
    const sl = Number(t.stopLoss || 0);
    const qty = Number(t.quantity || 1) * Number(t.lotSize || 65);
    if (entry > 0 && sl > 0 && Math.abs(entry - sl) * qty > 300) {
      tradePenalty += 20;
    }

    disciplineDeductions += Math.min(40, tradePenalty);
  });

  let sessionBreachCount = 0;
  Object.values(dailySummary).forEach((sess) => {
    if (sess.quotaBreached) sessionBreachCount += 1;
    if (sess.lossCapBreached) sessionBreachCount += 1;
  });
  disciplineDeductions += sessionBreachCount * 15;

  const maxPossibleScore = Math.max(1, closedAlerts.length * 10);
  const gateDisciplinePct = closedAlerts.length === 0 
    ? 100 
    : Math.max(0, Math.min(100, Math.round(100 - (disciplineDeductions / maxPossibleScore) * 100)));

  // 4. Statutory Friction & Expectancy
  const totalFriction = closedAlerts.reduce((acc, t) => acc + Number(t.taxesAndCharges || 55.20), 0);
  const frictionDragPct = totalWinPnl > 0 ? Number(((totalFriction / totalWinPnl) * 100).toFixed(1)) : 0;
  const pWin = closedAlerts.length > 0 ? (allWins.length / closedAlerts.length) : 0;
  const pLoss = closedAlerts.length > 0 ? (allLosses.length / closedAlerts.length) : 0;
  const avgWin = allWins.length > 0 ? (totalWinPnl / allWins.length) : 0;
  const avgLoss = allLosses.length > 0 ? (totalLossPnl / allLosses.length) : 0;
  const expectancyPerTrade = Number(((pWin * avgWin) - (pLoss * avgLoss)).toFixed(2));

  // 5. Prop-Grade Consistency Score (FTMO / Topstep Standard)
  // Ensures no single session accounts for > 45% of total realized winning profits.
  let maxSessionGain = 0;
  Object.values(dailySummary).forEach((sess) => {
    if (sess.pnl > maxSessionGain) maxSessionGain = sess.pnl;
  });
  const consistencyScorePct = totalWinPnl > 0 
    ? Math.min(100, Math.round((maxSessionGain / totalWinPnl) * 100))
    : 0;
  const isConsistencyPassed = consistencyScorePct <= 45;

  // 6. Synthetic Slippage Stress-Testing (Live Market Robustness)
  // Simulates an adverse 1.0 pt slippage penalty on all loss/stop executions
  let syntheticSlippageTotal = 0;
  let totalStressedLossPnl = 0;

  allLosses.forEach((t) => {
    const rawQty = Number(t.quantity || 1);
    const lotSize = Number(t.lotSize || 65);
    const qty = Number(t.totalQty || (rawQty >= lotSize ? rawQty : rawQty * lotSize) || 65);
    const slippagePenalty = qty * 1.0; // 1.0 pt synthetic adverse fill slippage
    syntheticSlippageTotal += slippagePenalty;
    totalStressedLossPnl += Math.abs(Number(t.netPnl || 0)) + slippagePenalty;
  });

  const stressedProfitFactor = totalStressedLossPnl > 0
    ? (totalWinPnl / totalStressedLossPnl).toFixed(2)
    : isPureWins
      ? "∞"
      : "0.00";

  const avgStressedLoss = allLosses.length > 0 ? (totalStressedLossPnl / allLosses.length) : 0;
  const stressedExpectancy = Number(((pWin * avgWin) - (pLoss * avgStressedLoss)).toFixed(2));

  // Edge is slippage immune if stressed PF >= 1.30 and expectancy remains positive
  const isSlippageImmune = closedAlerts.length >= 5
    ? (Number(stressedProfitFactor) >= 1.30 || (isPureWins && stressedExpectancy > 0))
    : true;

  return {
    practiceCompleted,
    distinctSessionsCount,
    sessionsTarget,
    sampleSizeProgress,
    gateProfitFactor,
    isPureWins,
    gateDisciplinePct,
    totalFriction,
    frictionDragPct,
    expectancyPerTrade,
    consistencyScorePct,
    maxSessionGain: Math.round(maxSessionGain),
    isConsistencyPassed,
    syntheticSlippageTotal: Math.round(syntheticSlippageTotal),
    stressedProfitFactor,
    stressedExpectancy,
    isSlippageImmune
  };
}
