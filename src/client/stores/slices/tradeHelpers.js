export function resolveIndexLotSize(symbol = "", explicitLot = null) {
  if (explicitLot && Number(explicitLot) > 0) return Number(explicitLot);
  const sym = (symbol || "").toUpperCase();
  if (sym.includes("BANKNIFTY")) return 30;
  if (sym.includes("FINNIFTY")) return 65;
  if (sym.includes("MIDCPNIFTY")) return 75;
  if (sym.includes("SENSEX")) return 20;
  if (sym.includes("NIFTY")) return 65;
  return 65;
}

export function calculateStatutoryCharges(entryPrice = 0, exitPrice = 0, totalQty = 65) {
  const buyTurnover = Number(entryPrice || 0) * Number(totalQty || 1);
  const sellTurnover = Number(exitPrice || 0) * Number(totalQty || 1);
  const totalTurnover = buyTurnover + sellTurnover;

  const brokerage = 40.0;
  const stt = sellTurnover * 0.001;
  const exchangeCharges = totalTurnover * 0.0005;
  const sebiCharges = totalTurnover * 0.000001;
  const stampDuty = buyTurnover * 0.00003;
  const gst = (brokerage + exchangeCharges + sebiCharges) * 0.18;

  const totalCharges = brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst;
  return Number(Math.max(45.0, totalCharges).toFixed(2));
}

export const CANONICAL_STRATEGY_TAGS = [
  "15m VWAP Retest",
  "Opening Range Breakout",
  "EMA Trend Pullback",
  "Delta Momentum Scalp",
  "Support Bounce Scalp",
  "Resistance Rejection Fade",
  "Expiry Zero Hero",
  "Defined-Risk Spread",
  "Discretionary Scalp",
];

export function canonicalizeStrategyTag(tag = "") {
  if (!tag) return "Discretionary Scalp";
  const trimmed = String(tag).trim();
  const lower = trimmed.toLowerCase();
  const match = CANONICAL_STRATEGY_TAGS.find(
    (c) => c.toLowerCase() === lower || lower.includes(c.toLowerCase())
  );
  return match || trimmed;
}

export function isMarketWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

export function isMarketOpenHours() {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const totalMins = now.getHours() * 60 + now.getMinutes();
  return totalMins >= 9 * 60 + 15 && totalMins <= 15 * 60 + 30;
}
