const BASE_CAPITAL = 100000;

const safeNum = (v, fallback = 0) => {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function calculateEquityMetrics(activeTrades, accountingMode = "NET", baseCapital = BASE_CAPITAL) {
  let runningCap = baseCapital;
  let currentPeak = baseCapital;
  let maxDD = 0;
  let sumGross = 0;
  let sumCharges = 0;
  let sumNet = 0;
  let breachCount = 0;
  let winCount = 0;
  let lossCount = 0;
  let sumWinPnl = 0;
  let sumLossPnl = 0;
  let currentStreakCount = 0;
  let currentStreakType = null;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  // Drawdown episodes tracking
  const episodes = [];
  let currentEpisode = null;
  let maxUnderwaterTrades = 0;
  let currentUnderwaterTrades = 0;

  const points = [{
    id: "genesis-origin",
    index: 0,
    label: "Start",
    pnl: 0,
    netPnl: 0,
    grossPnl: 0,
    charges: 0,
    capital: baseCapital,
    hwm: baseCapital,
    drawdown: 0,
    drawdownPct: 0,
    symbol: "Vault Starting Capital",
    isWin: true,
    isBreach: false,
    time: "Initial Balance"
  }];

  activeTrades.forEach((t, i) => {
    const gross = safeNum(t.realizedPnl ?? t.grossPnl ?? t.netPnl, 0);
    const charges = safeNum(
      t.charges, 
      t.realizedPnl !== undefined && t.netPnl !== undefined 
        ? Math.max(0, safeNum(t.realizedPnl) - safeNum(t.netPnl)) 
        : 55.20
    );
    const net = safeNum(t.netPnl, gross - charges);

    sumGross += gross;
    sumCharges += charges;
    sumNet += net;

    const delta = accountingMode === "NET" ? net : gross;
    const isBreach = delta < -300;
    if (isBreach) breachCount++;

    if (delta > 0) {
      winCount++;
      sumWinPnl += delta;
      tempWinStreak++;
      tempLossStreak = 0;
      if (tempWinStreak > maxWinStreak) maxWinStreak = tempWinStreak;
      if (currentStreakType === "WIN") {
        currentStreakCount++;
      } else {
        currentStreakType = "WIN";
        currentStreakCount = 1;
      }
    } else if (delta < 0) {
      lossCount++;
      sumLossPnl += Math.abs(delta);
      tempLossStreak++;
      tempWinStreak = 0;
      if (tempLossStreak > maxLossStreak) maxLossStreak = tempLossStreak;
      if (currentStreakType === "LOSS") {
        currentStreakCount++;
      } else {
        currentStreakType = "LOSS";
        currentStreakCount = 1;
      }
    }

    runningCap += delta;
    
    // Peak and Drawdown Calculation
    if (runningCap > currentPeak) {
      // Reached a new ATH peak -> close any open drawdown episode
      if (currentEpisode) {
        currentEpisode.recoveredIndex = i + 1;
        currentEpisode.recoveredTime = t.exitDatetime || "Executed";
        currentEpisode.durationTrades = (i + 1) - currentEpisode.startIndex;
        episodes.push(currentEpisode);
        currentEpisode = null;
      }
      currentPeak = runningCap;
      currentUnderwaterTrades = 0;
    } else {
      currentUnderwaterTrades++;
      if (currentUnderwaterTrades > maxUnderwaterTrades) {
        maxUnderwaterTrades = currentUnderwaterTrades;
      }
      const dd = currentPeak - runningCap;
      const ddPct = currentPeak > 0 ? (dd / currentPeak) * 100 : 0;
      
      if (!currentEpisode) {
        currentEpisode = {
          startIndex: i,
          startTime: t.exitDatetime || "Executed",
          peakCapital: currentPeak,
          troughCapital: runningCap,
          maxDrawdown: dd,
          maxDrawdownPct: ddPct,
          troughIndex: i + 1,
          durationTrades: currentUnderwaterTrades,
          recoveredIndex: null
        };
      } else {
        if (dd > currentEpisode.maxDrawdown) {
          currentEpisode.maxDrawdown = dd;
          currentEpisode.maxDrawdownPct = ddPct;
          currentEpisode.troughCapital = runningCap;
          currentEpisode.troughIndex = i + 1;
        }
        currentEpisode.durationTrades = currentUnderwaterTrades;
      }
    }

    const dd = currentPeak - runningCap;
    if (dd > maxDD) maxDD = dd;
    const ddPct = currentPeak > 0 ? (dd / currentPeak) * 100 : 0;

    points.push({
      id: t.id ? String(t.id) : `trade-${t.symbol || 'scalp'}-${t.entryDatetime || t.entryPrice || (i + 1)}`,
      index: i + 1,
      label: `Trade #${i + 1}`,
      shortLabel: `#${i + 1}`,
      pnl: delta,
      netPnl: net,
      grossPnl: gross,
      charges: charges,
      capital: Math.round(runningCap * 100) / 100,
      hwm: Math.round(currentPeak * 100) / 100,
      drawdown: Math.round(dd * 100) / 100,
      drawdownPct: Math.round(ddPct * 10) / 10,
      symbol: String(t.symbol || "Option Scalp"),
      isWin: delta >= 0,
      isBreach,
      direction: t.direction || "LONG",
      entryPrice: t.entryPrice !== null && t.entryPrice !== undefined ? safeNum(t.entryPrice, null) : null,
      exitPrice: t.exitPrice !== null && t.exitPrice !== undefined ? safeNum(t.exitPrice, null) : null,
      targetPrice: t.targetPrice !== null && t.targetPrice !== undefined ? safeNum(t.targetPrice, null) : null,
      stopLoss: t.stopLoss !== null && t.stopLoss !== undefined ? safeNum(t.stopLoss, null) : null,
      quantity: t.quantity ? safeNum(t.quantity, 75) : 75,
      closeReason: t.closeReason || (delta >= 0 ? "TARGET_HIT" : "STOP_LOSS_HIT"),
      time: t.exitDatetime 
        ? new Date(t.exitDatetime).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) 
        : "Executed"
    });
  });

  // If there's an ongoing unrecovered drawdown episode, push it as active
  if (currentEpisode) {
    currentEpisode.durationTrades = currentUnderwaterTrades;
    episodes.push(currentEpisode);
  }

  // Sort episodes by deepest drawdown
  const topDrawdowns = [...episodes]
    .sort((a, b) => b.maxDrawdown - a.maxDrawdown)
    .slice(0, 3);

  // Ulcer Index Calculation (Root Mean Square of % Drawdowns)
  const squaredDDs = points.slice(1).map(p => Math.pow(p.drawdownPct, 2));
  const ulcerIndex = squaredDDs.length > 0 
    ? Math.sqrt(squaredDDs.reduce((a, b) => a + b, 0) / squaredDDs.length).toFixed(2)
    : "0.00";

  const netGain = runningCap - baseCapital;
  const recFactor = maxDD === 0 ? (netGain > 0 ? "10.0+ (No Drawdown)" : "1.00") : (netGain / maxDD).toFixed(2) + "x";
  const calmarRatio = maxDD === 0 
    ? (netGain > 0 ? "99.9" : "0.00") 
    : ((netGain / maxDD)).toFixed(2);
    
  const profitFactor = sumLossPnl > 0 
    ? (sumWinPnl / sumLossPnl).toFixed(2) 
    : (sumWinPnl > 0 ? "99.9" : "1.00");

  const allDeltas = points.slice(1).map((p) => p.pnl);
  const maxWinVal = allDeltas.length ? Math.max(...allDeltas, 0) : 0;
  const maxLossVal = allDeltas.length ? Math.min(...allDeltas, 0) : 0;
  const retPct = sumGross > 0 ? Math.max(0, Math.min(100, (sumNet / sumGross) * 100)).toFixed(1) : (sumGross < 0 ? "0.0" : "100.0");

  return {
    equityPoints: points,
    peakCapital: currentPeak,
    currentCapital: runningCap,
    maxDrawdown: maxDD,
    maxDrawdownPct: currentPeak > 0 ? (maxDD / currentPeak) * 100 : 0,
    recoveryFactor: recFactor,
    calmarRatio,
    ulcerIndex,
    profitFactor,
    maxWin: maxWinVal,
    maxLoss: maxLossVal,
    totalGross: sumGross,
    totalCharges: sumCharges,
    totalNet: sumNet,
    retentionPct: retPct,
    breachCount,
    maxWinStreak,
    maxLossStreak,
    currentStreak: { type: currentStreakType || "NONE", count: currentStreakCount },
    topDrawdowns,
    maxUnderwaterTrades
  };
}

