export function resolveIndexLotSize(symbol = "", explicitLot = null) {
  const sym = (symbol || "").toUpperCase();
  const canonical = sym.includes("BANKNIFTY")
    ? 30
    : sym.includes("FINNIFTY")
    ? 65
    : sym.includes("MIDCPNIFTY")
    ? 75
    : sym.includes("SENSEX")
    ? 20
    : sym.includes("NIFTY")
    ? 65
    : 65;

  const num = Number(explicitLot);
  if (Number.isFinite(num) && num >= 15) return num;
  return canonical;
}

export function calculateStatutoryCharges(entryPrice = 0, exitPrice = 0, totalQty = 65, direction = "LONG") {
  const isShort = String(direction).toUpperCase() === "SHORT";
  const buyTurnover = Number(entryPrice || 0) * Number(totalQty || 1);
  const exitTurnover = Number(exitPrice || 0) * Number(totalQty || 1);
  const totalTurnover = buyTurnover + exitTurnover;

  const brokerage = 40.0;
  const sellTurnover = isShort ? buyTurnover : exitTurnover;
  const stt = Number((sellTurnover * 0.0015).toFixed(2));
  const exchangeCharges = Number((totalTurnover * 0.0003553).toFixed(2));
  const sebiCharges = Number((totalTurnover * 0.000001).toFixed(2));
  const buyLegTurnover = isShort ? exitTurnover : buyTurnover;
  const stampDuty = Number((buyLegTurnover * 0.00003).toFixed(2));
  const gst = Number(((brokerage + exchangeCharges + sebiCharges) * 0.18).toFixed(2));

  const totalCharges = Number((brokerage + stt + exchangeCharges + sebiCharges + stampDuty + gst).toFixed(2));
  return totalCharges;
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

export function resolveLiveTickPrice(ticks, trade) {
  if (!trade || !ticks) return Number(trade?.lastMarkPrice || trade?.entryPrice || 0);
  const tokenKey = trade.tokenKey || trade.instrumentKey || trade.instrument_key;
  const sId = trade.serverId != null ? String(trade.serverId) : null;
  const id = trade.id != null ? String(trade.id) : null;
  const sym = trade.symbol || trade.tradingsymbol || trade.tradingSymbol;
  const altSym = sym ? sym.replace(/\s+/g, "") : null;
  const altToken = tokenKey ? (tokenKey.includes("|") ? tokenKey.replace("|", ":") : tokenKey.replace(":", "|")) : null;

  const tick = (tokenKey && ticks[tokenKey]) ||
               (altToken && ticks[altToken]) ||
               (sId && ticks[sId]) ||
               (id && ticks[id]) ||
               (sym && ticks[sym]) ||
               (altSym && ticks[altSym]) ||
               (trade.serverId && ticks[trade.serverId]) ||
               (trade.id && ticks[trade.id]);

  const tickLtp = Number(tick?.ltp ?? tick?.price ?? 0);
  if (Number.isFinite(tickLtp) && tickLtp > 0) {
    return tickLtp;
  }

  const mark = Number(trade.lastMarkPrice);
  if (Number.isFinite(mark) && mark > 0) {
    return mark;
  }

  return Number(trade.entryPrice || 0);
}

export { calculateCanonicalExecutionPlan } from "../../utils/canonicalExecutionPlan.js";
