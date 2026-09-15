export function calculateMatrixStats(matrixTrades) {
  const matrixWins = matrixTrades.filter((t) => Number(t.netPnl || 0) > 0);
  const matrixLosses = matrixTrades.filter((t) => Number(t.netPnl || 0) <= 0);
  const matrixTotalCount = matrixTrades.length;
  const matrixWinRate = matrixTotalCount > 0 ? ((matrixWins.length / matrixTotalCount) * 100).toFixed(1) : "0.0";

  const matrixGrossWins = matrixWins.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
  const matrixGrossLosses = Math.abs(matrixLosses.reduce((acc, t) => acc + Number(t.netPnl || 0), 0));
  const matrixProfitFactor = matrixGrossLosses > 0 ? (matrixGrossWins / matrixGrossLosses).toFixed(2) : matrixGrossWins > 0 ? (matrixLosses.length === 0 ? "4.00" : "0.00") : "0.00";
  const isMatrixPureWins = matrixGrossWins > 0 && matrixGrossLosses === 0;

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

  const avgRRValue = calculatedRRs.length > 0 ? (calculatedRRs.reduce((a, b) => a + b, 0) / calculatedRRs.length).toFixed(2) : "2.38";

  let maxS = 0;
  let currS = 0;
  const sorted = [...matrixTrades].sort((a, b) => new Date(a.entryDatetime || 0) - new Date(b.entryDatetime || 0));
  sorted.forEach((t) => {
    if (Number(t.netPnl || 0) > 0) {
      currS++;
      if (currS > maxS) maxS = currS;
    } else {
      currS = 0;
    }
  });

  return {
    matrixTotalCount,
    matrixWinRate,
    matrixProfitFactor,
    isMatrixPureWins,
    avgRRValue,
    matrixBestStreak: maxS
  };
}

export function calculateGraduationStats(closedAlerts = []) {
  const practiceCompleted = closedAlerts.length;
  const sampleSizeProgress = Math.min(100, Math.round((practiceCompleted / 30) * 100));

  const allWins = closedAlerts.filter((t) => (t.netPnl || 0) > 0);
  const allLosses = closedAlerts.filter((t) => (t.netPnl || 0) <= 0);
  const totalWinPnl = allWins.reduce((acc, t) => acc + Number(t.netPnl || 0), 0);
  const totalLossPnl = Math.abs(allLosses.reduce((acc, t) => acc + Number(t.netPnl || 0), 0));
  const gateProfitFactor = totalLossPnl > 0 ? (totalWinPnl / totalLossPnl).toFixed(2) : totalWinPnl > 0 ? (totalLossPnl === 0 ? "4.00" : "0.00") : "0.00";
  const isPureWins = totalWinPnl > 0 && totalLossPnl === 0;

  const planFollowedCount = closedAlerts.filter((t) => {
    if (t.followedPlan === false) return false;
    const m = Array.isArray(t.mistakeTags) ? t.mistakeTags.join(" ") : String(t.mistakeTags || "");
    return !m.includes("Chased Extended Wick") && !m.includes("Moved Stop Loss");
  }).length;
  const gateDisciplinePct = closedAlerts.length > 0 ? Math.round((planFollowedCount / closedAlerts.length) * 100) : 100;

  return {
    practiceCompleted,
    sampleSizeProgress,
    gateProfitFactor,
    isPureWins,
    gateDisciplinePct
  };
}
