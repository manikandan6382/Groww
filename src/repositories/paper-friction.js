export function calculateEntrySlippage(entryPrice, direction = "LONG", simulateSlippage = true) {
  const rawPrice = Number(entryPrice || 0);
  if (!simulateSlippage || rawPrice <= 0) {
    return { rawEntry: rawPrice, filledEntry: rawPrice, slippagePts: 0, slippageDrag: 0 };
  }

  // Realistic market order adverse spread slippage (1.00 - 1.50 pts, avg 1.25 pts)
  const slippagePts = 1.25;
  const isShort = String(direction).toUpperCase() === "SHORT";
  const filledEntry = isShort
    ? Number(Math.max(0.05, rawPrice - slippagePts).toFixed(2))
    : Number((rawPrice + slippagePts).toFixed(2));

  return {
    rawEntry: rawPrice,
    filledEntry,
    slippagePts,
    slippageDrag: slippagePts,
  };
}

export function calculateFrictionAndCharges(trade, exitPrice, closeReason = "", options = {}) {
  const lotSize = Math.max(1, Number(trade.lotSize || 1));
  const rawQty = Number(trade.quantity || 0);
  const units = Number(
    trade.units ||
    trade.totalUnits ||
    (rawQty >= lotSize && rawQty % lotSize === 0 ? rawQty : rawQty * lotSize)
  );
  const entryPrice = Number(trade.filledEntryPrice || trade.entryPrice || 0);
  const rawExit = Number(typeof exitPrice === "object" ? exitPrice.price : exitPrice || entryPrice);
  
  const symUpper = String(trade.symbol || trade.underlyingSymbol || "").toUpperCase();
  const isSensex = symUpper.includes("SENSEX");
  const isBankNifty = symUpper.includes("BANKNIFTY");

  const reasonUpper = String(closeReason || trade.closeReason || trade.exitReason || "").toUpperCase();
  const isTarget = reasonUpper.includes("TARGET");
  const isExactFill = Boolean(options.exactFill || trade.exactFill || trade.isExecutedPrice || (typeof exitPrice === "object" && exitPrice.exactFill));

  let slippagePts = 0;
  if (!isExactFill && !isTarget) {
    if (reasonUpper.includes("TRAILING") || reasonUpper.includes("BREAKEVEN") || reasonUpper.includes("BE_HIT") || reasonUpper.includes("RISK_FREE")) {
      slippagePts = isSensex ? 1.25 : (isBankNifty ? 0.70 : 0.35); // Trailing market stop fill
    } else if (reasonUpper.includes("STOP_LOSS") || reasonUpper.includes("SL_HIT") || reasonUpper.includes("PROTECTED")) {
      slippagePts = isSensex ? 1.50 : (isBankNifty ? 0.85 : 0.50); // Realistic index stop-loss fill
    } else {
      slippagePts = isSensex ? 1.00 : (isBankNifty ? 0.60 : 0.35); // Default manual/market exit adverse fill
    }
  }

  const isShort = trade.direction === "SHORT";
  const filledExit = isShort 
    ? Number((rawExit + slippagePts).toFixed(2)) 
    : Number(Math.max(0.05, rawExit - slippagePts).toFixed(2));

  const buyTurnover = entryPrice * units;
  const exitTurnover = filledExit * units;
  const totalTurnover = buyTurnover + exitTurnover;

  const brokerage = 40.0;
  const sellTurnover = isShort ? buyTurnover : exitTurnover;
  const stt = Number((sellTurnover * 0.0015).toFixed(2));
  const exchangeCharges = Number((totalTurnover * 0.0003553).toFixed(2));
  const sebiCharges = Number((totalTurnover * 0.000001).toFixed(2));
  const buyLegTurnover = isShort ? exitTurnover : buyTurnover;
  const stampDuty = Number((buyLegTurnover * 0.00003).toFixed(2));
  const gst = Number(((brokerage + exchangeCharges + sebiCharges) * 0.18).toFixed(2));
  const statutoryCharges = Number((brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst).toFixed(2));
  let grossPnl = Number(((isShort ? entryPrice - filledExit : filledExit - entryPrice) * units).toFixed(2));
  let netPnl = Number((grossPnl - statutoryCharges).toFixed(2));
  let finalExitPrice = filledExit;

  // Realized P&L reflects true fill price and actual market execution; risk constraints govern pre-trade sizing and RMS triggers.
  
  const entrySlippagePts = Number(trade.entrySlippage || 0);
  const totalSlippagePts = Number((entrySlippagePts + slippagePts).toFixed(2));
  const slippageDrag = Number((totalSlippagePts * units).toFixed(2));

  return {
    units,
    rawExit,
    filledExit: finalExitPrice,
    slippagePts,
    entrySlippagePts,
    totalSlippagePts,
    slippageDrag,
    grossPnl,
    statutoryCharges,
    totalFriction: Number((statutoryCharges + slippageDrag).toFixed(2)),
    netPnl,
    brokerage,
    stt,
    exchangeCharges,
    sebiCharges,
    stampDuty,
    gst,
  };
}

export function getTrigger(trade, markPrice, reason) {
  if (reason && reason !== "MARK_ONLY" && reason !== "EVALUATE") {
    return { shouldClose: true, closeReason: reason };
  }
  if (reason === "MARK_ONLY") return { shouldClose: false, closeReason: null };
  if (trade.status !== "OPEN") return { shouldClose: false, closeReason: trade.closeReason };

  const sl = Number(trade.stopLoss || 0);
  const tp = Number(trade.targetPrice || 0);

  if (trade.direction === "SHORT") {
    if (tp > 0 && markPrice <= tp) return { shouldClose: true, closeReason: "TARGET_HIT" };
    if (sl > 0 && markPrice >= sl) return { shouldClose: true, closeReason: "STOP_LOSS_HIT" };
    return { shouldClose: false, closeReason: null };
  }

  if (tp > 0 && markPrice >= tp) return { shouldClose: true, closeReason: "TARGET_HIT" };
  if (sl > 0 && markPrice <= sl) return { shouldClose: true, closeReason: "STOP_LOSS_HIT" };
  return { shouldClose: false, closeReason: null };
}
