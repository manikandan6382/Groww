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
    runningCap += delta;
    if (runningCap > currentPeak) currentPeak = runningCap;
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

  const netGain = runningCap - baseCapital;
  const recFactor = maxDD === 0 ? (netGain > 0 ? "10.0+ (No Drawdown)" : "1.00") : (netGain / maxDD).toFixed(2) + "x";
  const allDeltas = points.slice(1).map((p) => p.pnl);
  const maxWinVal = allDeltas.length ? Math.max(...allDeltas, 0) : 0;
  const retPct = sumGross > 0 ? Math.max(0, Math.min(100, (sumNet / sumGross) * 100)).toFixed(1) : (sumGross < 0 ? "0.0" : "100.0");

  return {
    equityPoints: points,
    peakCapital: currentPeak,
    currentCapital: runningCap,
    maxDrawdown: maxDD,
    recoveryFactor: recFactor,
    maxWin: maxWinVal,
    totalGross: sumGross,
    totalCharges: sumCharges,
    totalNet: sumNet,
    retentionPct: retPct
  };
}
