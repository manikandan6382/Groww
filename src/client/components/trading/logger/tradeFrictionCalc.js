/**
 * Indian Statutory Taxes & Friction Calculator
 * STT, GST, Stamp Duty, Exchange Charges, Brokerage, SEBI fees
 */
export function calculateTradeFriction(entryPrice, exitPrice, quantity, side) {
  const entry = Number(entryPrice || 0);
  const exit = Number(exitPrice || 0);
  const qty = Number(quantity || 1);
  const pts = side === "BUY" ? (exit - entry) : (entry - exit);
  const grossPnl = pts * qty;

  const buyTurnover = entry * qty;
  const sellTurnover = exit * qty;
  const totalTurnover = buyTurnover + sellTurnover;

  const brokerage = 40.0; // ₹20 flat buy + ₹20 flat sell
  const stt = side === "BUY" ? (sellTurnover * 0.001) : (buyTurnover * 0.001); // 0.1% on sell side option turnover
  const exchangeCharges = totalTurnover * 0.0005; // 0.05% on premium turnover
  const gst = 0.18 * (brokerage + exchangeCharges); // 18% GST on brokerage + exchange fee
  const stampDuty = side === "BUY" ? (buyTurnover * 0.00003) : 0; // 0.003% on buy turnover
  const sebiCharges = totalTurnover * 0.000001; // ₹10 per crore

  const totalFriction = Math.round((brokerage + stt + exchangeCharges + gst + stampDuty + sebiCharges) * 100) / 100;
  const netTakeHomePnl = grossPnl - totalFriction;
  const isProfit = netTakeHomePnl >= 0;

  return {
    entry,
    exit,
    qty,
    pts,
    grossPnl,
    buyTurnover,
    sellTurnover,
    totalTurnover,
    brokerage,
    stt,
    exchangeCharges,
    gst,
    stampDuty,
    sebiCharges,
    totalFriction,
    netTakeHomePnl,
    isProfit,
  };
}

export function checkFrictionDrag(targetPrice, entry, side, totalFriction, qty) {
  const targetVal = Number(targetPrice || 0);
  const targetPts = side === "BUY" ? (targetVal - entry) : (entry - targetVal);
  const frictionPts = qty > 0 ? (totalFriction / qty) : 0;
  const isHighFrictionDrag = targetVal > 0 && targetPts > 0 && targetPts < (frictionPts * 2.5);

  return {
    targetVal,
    targetPts,
    frictionPts,
    isHighFrictionDrag,
  };
}
