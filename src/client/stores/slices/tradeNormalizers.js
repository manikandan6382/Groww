import { calculateTradeDuration } from "../../utils/dateUtils";

export function normalizeBackendOpenTrade(t, existing = {}) {
  return {
    ...existing,
    id: t.id,
    serverId: t.id,
    symbol: t.symbol,
    underlyingSymbol: t.underlyingSymbol || (t.symbol?.includes("BANK") ? "BANKNIFTY" : t.symbol?.includes("SENSEX") ? "SENSEX" : "NIFTY"),
    optionType: t.optionType || (t.symbol?.includes("CE") ? "CALL" : "PUT"),
    strikePrice: t.strikePrice,
    direction: t.direction || "LONG",
    tradeType: t.tradeType || "INTRADAY",
    entryDatetime: t.entryDatetime || t.createdAt,
    entryPrice: t.entryPrice,
    lastMarkPrice: t.lastMarkPrice || t.entryPrice,
    targetPrice: t.targetPrice,
    stopLoss: t.stopLoss,
    quantity: t.quantity || 1,
    lotSize: t.lotSize || 65,
    feedMode: t.feedMode || "LIVE",
    status: "OPEN",
  };
}

export function normalizeBackendTrade(t, existing = {}) {
  const grossPnl = Number(t.realizedPnl ?? t.grossPnl ?? 0);
  const charges = Number(t.charges ?? 55.20);
  const netPnl = Number(t.netPnl ?? (grossPnl - charges));
  const entryTime = t.entryDatetime || t.createdAt;
  const exitTime = t.exitDatetime || t.updatedAt || entryTime;

  return {
    ...existing,
    id: t.id,
    serverId: t.id,
    symbol: t.symbol || "",
    underlyingSymbol: t.underlyingSymbol || (t.symbol?.includes("BANK") ? "BANKNIFTY" : t.symbol?.includes("SENSEX") ? "SENSEX" : "NIFTY"),
    optionType: t.optionType || (t.symbol?.includes("CE") ? "CALL" : "PUT"),
    strikePrice: t.strikePrice,
    direction: t.direction || "LONG",
    tradeType: t.tradeType || "INTRADAY",
    entryDatetime: entryTime,
    exitDatetime: exitTime,
    expiryDatetime: t.expiryDatetime,
    expiryDate: t.expiryDate,
    duration: calculateTradeDuration(entryTime, exitTime),
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    targetPrice: t.targetPrice,
    stopLoss: t.stopLoss,
    quantity: t.quantity || 1,
    lotSize: t.lotSize || 65,
    grossPnl,
    taxesAndCharges: charges,
    charges,
    netPnl,
    closeReason: t.closeReason || (t.exitPrice >= t.entryPrice ? "TARGET_HIT" : "STOP_LOSS_HIT"),
    strategyTag: Array.isArray(t.strategyTags) ? (t.strategyTags[0] || "Practice Scalp") : String(t.strategyTags || t.strategyTag || "Practice Scalp"),
    strategyTags: Array.isArray(t.strategyTags) ? t.strategyTags : [String(t.strategyTags || t.strategyTag || "Practice Scalp")],
    mistakeTags: Array.isArray(t.mistakeTags) ? (t.mistakeTags.length > 0 ? t.mistakeTags.join(", ") : "None") : String(t.mistakeTags || "None"),
    confidenceScore: t.confidenceScore || 7,
    followedPlan: t.followedPlan !== false,
    personalNotes: t.personalNotes || "",
    catalyst: t.catalyst || t.personalNotes || "Live market scalp.",
    executionDetails: t.executionDetails || `Executed at ₹${t.entryPrice}, closed at ₹${t.exitPrice}. Net: ₹${netPnl}.`
  };
}
