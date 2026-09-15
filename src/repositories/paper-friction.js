export function calculateFrictionAndCharges(trade, exitPrice, closeReason = "") {
  const units = Number(trade.quantity || 0) * Math.max(1, Number(trade.lotSize || 1));
  const entryPrice = Number(trade.entryPrice || 0);
  const rawExit = Number(exitPrice || entryPrice);
  
  let slippagePts = 0.25;
  const reasonUpper = String(closeReason || trade.closeReason || trade.exitReason || "").toUpperCase();
  if (reasonUpper.includes("TARGET")) {
    slippagePts = 0.15;
  } else if (reasonUpper.includes("TRAILING") || reasonUpper.includes("BREAKEVEN") || reasonUpper.includes("BE_HIT") || reasonUpper.includes("RISK_FREE")) {
    slippagePts = 0.30;
  } else if (reasonUpper.includes("STOP_LOSS") || reasonUpper.includes("SL_HIT") || reasonUpper.includes("PROTECTED")) {
    slippagePts = 0.60;
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
  const stt = Number((sellTurnover * 0.001).toFixed(2));
  const exchangeCharges = Number((totalTurnover * 0.000505).toFixed(2));
  const sebiCharges = Number((totalTurnover * 0.000001).toFixed(2));
  const buyLegTurnover = isShort ? exitTurnover : buyTurnover;
  const stampDuty = Number((buyLegTurnover * 0.00003).toFixed(2));
  const gst = Number(((brokerage + exchangeCharges + sebiCharges) * 0.18).toFixed(2));
  const statutoryCharges = Number((brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst).toFixed(2));
  const grossPnl = Number(((isShort ? entryPrice - filledExit : filledExit - entryPrice) * units).toFixed(2));
  const netPnl = Number((grossPnl - statutoryCharges).toFixed(2));
  const slippageDrag = Number((slippagePts * units).toFixed(2));

  return {
    units,
    rawExit,
    filledExit,
    slippagePts,
    slippageDrag,
    grossPnl,
    statutoryCharges,
    totalFriction: statutoryCharges,
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
  if (reason === "MANUAL_EXIT") return { shouldClose: true, closeReason: "MANUAL_EXIT" };
  if (reason === "MARK_ONLY") return { shouldClose: false, closeReason: null };
  if (trade.status !== "OPEN") return { shouldClose: false, closeReason: trade.closeReason };

  const sl = Number(trade.stopLoss || 0);
  const tp = Number(trade.targetPrice || 0);

  if (trade.direction === "SHORT") {
    if (tp > 0 && markPrice <= tp) return { shouldClose: true, closeReason: "TARGET_HIT" };
    if (sl > 0 && markPrice > sl) return { shouldClose: true, closeReason: "STOP_LOSS_HIT" };
    return { shouldClose: false, closeReason: null };
  }

  if (tp > 0 && markPrice >= tp) return { shouldClose: true, closeReason: "TARGET_HIT" };
  if (sl > 0 && markPrice < sl) return { shouldClose: true, closeReason: "STOP_LOSS_HIT" };
  return { shouldClose: false, closeReason: null };
}
