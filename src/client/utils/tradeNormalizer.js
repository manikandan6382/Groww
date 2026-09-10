/**
 * Canonical Trade Schema Normalizer & Contract Validator
 * Prevents property naming drift across SQLite, Upstox REST API, and React components.
 */

import { parseOptionContract, resolveNextExpiryDate, calculateHeldToExpiryMetrics } from "./expiryUtils.js";

/**
 * Normalizes any raw trade entity into a guaranteed canonical contract.
 * @param {Object} raw - Raw trade record from database or store
 * @returns {Object} Normalized trade object
 */
export function normalizeTrade(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      id: "unknown",
      symbol: "UNKNOWN",
      tradingsymbol: "UNKNOWN",
      tokenKey: null,
      entryPrice: 0,
      exitPrice: 0,
      targetPrice: null,
      stopLoss: null,
      quantity: 1,
      lotSize: 65,
      totalQty: 65,
      charges: 0,
      netPnl: 0,
      pnl: 0,
      closeReason: "MANUAL_EXIT",
      direction: "LONG",
      entryTime: null,
      exitTime: null,
      expiryDatetime: null,
      expiryDate: null,
      terminalIntrinsic: 0,
      heldToExpiryPnl: 0,
      decisionAlpha: 0,
      alphaVerdict: null,
      isWin: false
    };
  }

  const id = String(raw.id || raw._id || `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const symbol = String(raw.symbol || raw.tradingsymbol || "UNKNOWN");
  const tokenKey = raw.tokenKey || raw.token_key || raw.instrument_token || null;

  const entryPrice = Number(raw.entryPrice ?? raw.entry_price ?? raw.price ?? 0);
  const exitPrice = Number(raw.exitPrice ?? raw.exit_price ?? raw.lastMarkPrice ?? entryPrice);

  const rawTarget = raw.targetPrice ?? raw.target_price ?? raw.target;
  const targetPrice = rawTarget !== null && rawTarget !== undefined && Number(rawTarget) > 0 ? Number(rawTarget) : null;

  const rawStop = raw.stopLoss ?? raw.stop_loss ?? raw.sl;
  const stopLoss = rawStop !== null && rawStop !== undefined && Number(rawStop) > 0 ? Number(rawStop) : null;

  const quantity = Number(raw.quantity ?? raw.qty ?? 1);
  const lotSize = Number(raw.lotSize ?? raw.lot_size ?? 65);
  const totalQty = quantity * lotSize;

  const charges = Number(raw.charges ?? raw.taxes ?? 55.20);
  const pnl = Number(raw.pnl ?? raw.netPnl ?? raw.net_pnl ?? ((exitPrice - entryPrice) * totalQty - charges));
  const netPnl = Number(raw.netPnl ?? raw.net_pnl ?? pnl);

  const closeReason = String(
    raw.closeReason ?? raw.close_reason ?? (exitPrice >= entryPrice ? "TARGET_HIT" : "STOP_LOSS_HIT")
  );

  const direction = String(raw.direction || (raw.side === "SELL" ? "SHORT" : "LONG")).toUpperCase();

  const entryTime = raw.entryDatetime || raw.entry_datetime || raw.createdAt || raw.time || null;
  const exitTime = raw.exitDatetime || raw.exit_datetime || raw.updatedAt || raw.closedAt || null;

  // Options Expiry Lifecycle Normalization
  const contract = parseOptionContract(symbol);
  const underlyingSymbol = raw.underlyingSymbol || raw.underlying || contract.underlying;
  const strikePrice = raw.strikePrice ? Number(raw.strikePrice) : contract.strikePrice;
  const optionType = raw.optionType || contract.optionType;

  let expiryDatetime = raw.expiryDatetime || raw.expiry_datetime;
  if (!expiryDatetime && entryTime) {
    try {
      expiryDatetime = resolveNextExpiryDate(symbol, entryTime).toISOString();
    } catch {
      expiryDatetime = null;
    }
  }
  const expiryDate = raw.expiryDate || raw.expiry_date || (expiryDatetime ? expiryDatetime.split("T")[0] : null);

  // Counterfactual Held-to-Expiry Telemetry
  let expirySpot = raw.expirySpot ?? null;
  let terminalIntrinsic = raw.terminalIntrinsic ?? 0;
  let heldToExpiryPnl = raw.heldToExpiryPnl ?? 0;
  let decisionAlpha = raw.decisionAlpha ?? 0;
  let alphaVerdict = raw.alphaVerdict ?? null;

  let isDrawdownBreached = Boolean(raw.isDrawdownBreached || (raw.closeReason && raw.closeReason.includes("STOP")));
  let effectiveStopLoss = raw.stopLoss ? Number(raw.stopLoss) : Number((entryPrice * 0.90).toFixed(2));
  let postExitMinPrice = raw.postExitMinPrice ?? null;

  try {
    const heldMetrics = calculateHeldToExpiryMetrics({
      symbol,
      entryPrice,
      exitPrice,
      stopLoss: raw.stopLoss,
      totalQty,
      charges,
      netPnl,
      closeReason,
      expirySpot,
      postExitMinPrice,
      isDrawdownBreached
    });
    expirySpot = heldMetrics.expirySpot;
    terminalIntrinsic = heldMetrics.terminalIntrinsic;
    heldToExpiryPnl = heldMetrics.heldNetPnl;
    decisionAlpha = heldMetrics.decisionAlpha;
    alphaVerdict = heldMetrics.verdict;
    isDrawdownBreached = heldMetrics.isDrawdownBreached;
    effectiveStopLoss = heldMetrics.effectiveStopLoss;
  } catch {}

  const isWin = netPnl >= 0;

  return {
    ...raw,
    id,
    symbol,
    tradingsymbol: symbol,
    underlyingSymbol,
    strikePrice,
    optionType,
    tokenKey,
    entryPrice,
    exitPrice,
    targetPrice,
    stopLoss,
    quantity,
    lotSize,
    totalQty,
    charges,
    pnl,
    netPnl,
    closeReason,
    direction,
    entryTime,
    exitTime,
    expiryDatetime,
    expiryDate,
    expirySpot,
    terminalIntrinsic,
    heldToExpiryPnl,
    decisionAlpha,
    isDrawdownBreached,
    effectiveStopLoss,
    postExitMinPrice,
    alphaVerdict,
    isWin
  };
}

/**
 * Strict Indian Standard Time (IST) Short Time Formatter (HH:MM AM/PM)
 */
export function formatTimeShort(dateInput) {
  if (!dateInput) return "--:--";
  try {
    const s = String(dateInput);
    const d = typeof dateInput === "number"
      ? new Date(dateInput)
      : new Date(s.includes("+") || s.includes("Z") ? s : s + "+05:30");

    return d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return String(dateInput).slice(11, 16) || "--:--";
  }
}

/**
 * Canonical Trade Outcome & Friction Classifier
 * Ground-truth mathematical model distinguishing between Target Hit, Realized Profit,
 * True Breakeven (₹0 net), Trailed BE Friction Drag (exit near entry, net loss due to fees),
 * and Stop Cut.
 * 
 * @param {Object} rawTrade - Raw or normalized trade object
 * @returns {Object} Outcome evaluation object
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
  const isGrossGainOrScratch = grossPts >= -0.2; // Exited at entry or slightly in green gross points

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

  // 2. Profit Exit: Positive net P&L (Trailed SL profit, discretionary take-profit, near-target exit)
  // Completely fixes Row 5: +₹301.88 was erroneously branded Breakeven!
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
  // Solves the trader's confusion on Rows 1, 2, 4, 6: Not a victory cyan pill, but an amber shield!
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

