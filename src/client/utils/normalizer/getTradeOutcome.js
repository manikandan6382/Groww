import { normalizeTrade } from "./normalizeTrade.js";

/**
 * Canonical Trade Outcome & Friction Classifier
 * Ground-truth mathematical model distinguishing between Target Hit, Realized Profit,
 * True Breakeven (₹0 net), Trailed BE Friction Drag, and Stop Cut.
 */
export function getTradeOutcome(rawTrade) {
  const trade = normalizeTrade(rawTrade);
  const {
    entryPrice,
    exitPrice,
    targetPrice,
    stopLoss,
    direction,
    netPnl,
    totalQty,
    closeReason,
    charges
  } = trade;

  const isShort = direction === "SHORT";
  // Gross price point delta
  const grossPts = isShort ? (entryPrice - exitPrice) : (exitPrice - entryPrice);
  const investedCapital = (entryPrice * totalQty) || 1;
  
  // Net Return percentage: mathematically grounded in total money deployed
  const netReturnPct = Number(((netPnl / investedCapital) * 100).toFixed(2));
  
  // Friction-adjusted net points per unit
  const netPts = totalQty > 0 ? Number((netPnl / totalQty).toFixed(2)) : grossPts;

  const isNetGain = netPnl > 0;
  const isNetTrueNeutral = Math.abs(netPnl) <= 15.0; // Within ₹15 of absolute zero net P&L
  
  // Target verification
  const isTargetExceeded = targetPrice !== null && targetPrice > 0 && (
    isShort ? exitPrice <= targetPrice + 0.1 : exitPrice >= targetPrice - 0.1
  );
  const isExplicitTarget = closeReason === "TARGET_HIT";

  // Trailing stop verification
  const isTrailedStop = closeReason === "TRAILING_SL_HIT" || closeReason === "BREAKEVEN_HIT";
  const isStopNearOrAboveEntry = stopLoss !== null && (
    isShort ? stopLoss <= entryPrice + 0.5 : stopLoss >= entryPrice - 0.5
  );
  const isGrossGainOrScratch = grossPts >= -0.2;

  const grossPnl = Number((grossPts * totalQty).toFixed(2));

  // 1. Target Hit: Explicit target trigger or price cleared target with green net P&L
  if ((isExplicitTarget || isTargetExceeded) && isNetGain) {
    return {
      type: "TARGET_HIT",
      label: "Target Hit",
      shortLabel: "Target",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      icon: "check",
      isNetGain: true,
      netPnl,
      grossPnl,
      netReturnPct,
      netPts,
      grossPts,
      charges,
      description: "Full profit target achieved with green net yield."
    };
  }

  // 2. Profit Exit: Positive net P&L
  if (isNetGain) {
    const isTrailingWin = isTrailedStop && stopLoss && (isShort ? stopLoss < entryPrice - 1 : stopLoss > entryPrice + 1);
    return {
      type: "PROFIT_EXIT",
      label: isTrailingWin ? "Trailed Profit" : "Profit Exit",
      shortLabel: isTrailingWin ? "Trailed" : "Profit",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      icon: "profit",
      isNetGain: true,
      netPnl,
      grossPnl,
      netReturnPct,
      netPts,
      grossPts,
      charges,
      description: "Profitable execution locking in positive bankable yield."
    };
  }

  // 3. True Breakeven: Capital and fees were neutral (Net P&L ~ ₹0.00)
  if (isNetTrueNeutral) {
    return {
      type: "TRUE_BREAKEVEN",
      label: "True Breakeven",
      shortLabel: "Breakeven",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      icon: "neutral",
      isNetGain: false,
      netPnl,
      grossPnl,
      netReturnPct,
      netPts,
      grossPts,
      charges,
      description: "Scratch execution with ₹0 capital loss and negligible statutory drag."
    };
  }

  // 4. Trailed BE with Friction Drag: Exited near entry, but statutory taxes created net loss
  if (isGrossGainOrScratch || isTrailedStop || isStopNearOrAboveEntry) {
    return {
      type: "TRAILED_BE_DRAG",
      label: "Trailed BE (Friction)",
      shortLabel: "BE Friction",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      icon: "friction",
      isNetGain: false,
      netPnl,
      grossPnl,
      netReturnPct,
      netPts,
      grossPts,
      charges,
      description: "Defended at entry price, but exchange statutory charges caused minor friction drag."
    };
  }

  // 5. Stop Cut: Downside protective stop loss hit
  return {
    type: "STOP_CUT",
    label: "Stop Cut",
    shortLabel: "Stop",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    icon: "stop",
    isNetGain: false,
    netPnl,
    grossPnl,
    netReturnPct,
    netPts,
    grossPts,
    charges,
    description: "Downside protective stop loss executed."
  };
}
