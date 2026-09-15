import { resolveIndexLotSize } from "../../../stores/useTradingStore";

export function resolveUnderlying(trade) {
  const sym = String(trade.underlyingSymbol || trade.symbol || "").toUpperCase();
  if (sym.includes("BANK")) return "BANKNIFTY";
  if (sym.includes("SENSEX")) return "SENSEX";
  if (sym.includes("NIFTY")) return "NIFTY";
  return "OTHER";
}

export function getLiveLtp(trade, ticks) {
  const sym = trade.symbol;
  const tick = (trade.serverId && ticks?.[trade.serverId]) ||
    ticks?.[trade.id] ||
    ticks?.[sym] ||
    (trade.tokenKey && ticks?.[trade.tokenKey]);
  return Number(tick?.ltp || trade.lastMarkPrice || trade.entryPrice || 0);
}

export function calculateLiveMetrics(trade, currentLtp) {
  const lotSize = Number(trade.lotSize || resolveIndexLotSize(trade.symbol) || 65);
  const qty = Number(trade.quantity || 1) * lotSize;
  const isShort = trade.direction === "SHORT";
  const grossPnl = (currentLtp - Number(trade.entryPrice || 0)) * (isShort ? -1 : 1) * qty;
  const grossPts = (currentLtp - Number(trade.entryPrice || 0)) * (isShort ? -1 : 1);
  const friction = 55.20;
  const netPnl = grossPnl - friction;
  const capital = Number(trade.entryPrice || 0) * qty;
  const returnPct = capital > 0 ? (netPnl / capital) * 100 : 0;
  return { grossPnl, grossPts, friction, netPnl, returnPct };
}

export function getBatchSlice(N, k, totalB) {
  if (N === 0) return { start: 0, end: 0, count: 0 };
  let startIndex, endIndex;
  if (k === totalB) {
    startIndex = 0;
    const rem = N % 20;
    endIndex = rem === 0 && N > 0 ? 20 : rem;
  } else {
    endIndex = N - ((k - 1) * 20);
    startIndex = Math.max(0, endIndex - 20);
  }
  return { start: startIndex, end: endIndex, count: Math.max(0, endIndex - startIndex) };
}
