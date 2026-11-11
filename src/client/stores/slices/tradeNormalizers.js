import { calculateTradeDuration } from "../../utils/dateUtils.js";
import { calculateStatutoryCharges } from "./tradeHelpers.js";

export function normalizeBackendOpenTrade(t, existing = {}) {
  const tokenKey = t.tokenKey || t.instrumentKey || t.instrument_key || existing?.tokenKey || existing?.instrumentKey || null;
  const instrumentKey = t.instrumentKey || t.tokenKey || existing?.instrumentKey || existing?.tokenKey || null;
  const entryPrice = Number(t.entryPrice || existing?.entryPrice || 0);

  // Mark Price Preservation Invariant:
  // Never overwrite an active, real-time live mark price with an un-updated static entryPrice from SQLite
  const existingMark = Number(existing?.lastMarkPrice);
  const backendMark = Number(t.lastMarkPrice);
  let resolvedMarkPrice = entryPrice;

  if (Number.isFinite(existingMark) && existingMark > 0 && (backendMark <= 0 || backendMark === entryPrice)) {
    resolvedMarkPrice = existingMark;
  } else if (Number.isFinite(backendMark) && backendMark > 0) {
    resolvedMarkPrice = backendMark;
  } else if (Number.isFinite(existingMark) && existingMark > 0) {
    resolvedMarkPrice = existingMark;
  }

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
    entryPrice,
    lastMarkPrice: resolvedMarkPrice,
    targetPrice: t.targetPrice,
    stopLoss: t.stopLoss,
    quantity: t.quantity || 1,
    lotSize: t.lotSize || 65,
    tokenKey,
    instrumentKey,
    feedMode: t.feedMode || "LIVE",
    status: "OPEN",
  };
}

export function normalizeBackendTrade(t, existing = {}) {
  const grossPnl = Number(t.realizedPnl ?? t.grossPnl ?? 0);
  const units = Number(t.units ?? ((t.quantity || 1) * (t.lotSize || 65)));
  const hasAuthoritativeCharges = (t.charges != null && !isNaN(Number(t.charges))) ||
                                  (t.taxesAndCharges != null && !isNaN(Number(t.taxesAndCharges)));
  const charges = hasAuthoritativeCharges
    ? Number(t.charges ?? t.taxesAndCharges)
    : null;
  const chargesAvailable = hasAuthoritativeCharges;
  const isFinanciallyComplete = chargesAvailable && (t.netPnl != null || grossPnl != null);
  const netPnl = t.netPnl != null
    ? Number(t.netPnl)
    : (chargesAvailable ? Number((grossPnl - charges).toFixed(2)) : null);
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
    status: t.status || "CLOSED",
    isSettled: true,
    entryDatetime: entryTime,
    exitDatetime: exitTime,
    expiryDatetime: t.expiryDatetime,
    expiryDate: t.expiryDate,
    duration: calculateTradeDuration(entryTime, exitTime),
    entryPrice: Number(t.entryPrice || 0),
    exitPrice: Number(Number(t.exitPrice || 0).toFixed(2)),
    targetPrice: t.targetPrice,
    stopLoss: t.stopLoss,
    quantity: t.quantity || 1,
    lotSize: t.lotSize || 65,
    units,
    grossPnl: Number(grossPnl.toFixed(2)),
    taxesAndCharges: charges != null ? Number(Number(charges).toFixed(2)) : null,
    charges: charges != null ? Number(Number(charges).toFixed(2)) : null,
    chargesAvailable,
    isFinanciallyComplete,
    netPnl: netPnl != null ? Number(Number(netPnl).toFixed(2)) : null,
    closeReason: t.closeReason || (Number(t.exitPrice || 0) >= Number(t.entryPrice || 0) ? "TARGET_HIT" : "STOP_LOSS_HIT"),
    strategyTag: Array.isArray(t.strategyTags) ? (t.strategyTags[0] || "Practice Scalp") : String(t.strategyTags || t.strategyTag || "Practice Scalp"),
    strategyTags: Array.isArray(t.strategyTags) ? t.strategyTags : [String(t.strategyTags || t.strategyTag || "Practice Scalp")],
    mistakeTags: Array.isArray(t.mistakeTags) ? (t.mistakeTags.length > 0 ? t.mistakeTags.join(", ") : "None") : String(t.mistakeTags || "None"),
    confidenceScore: t.confidenceScore || 7,
    followedPlan: t.followedPlan !== false,
    personalNotes: t.personalNotes || "",
    catalyst: t.catalyst || t.personalNotes || "Live market scalp.",
    executionDetails: t.executionDetails || `Executed at ₹${t.entryPrice}, closed at ₹${Number(t.exitPrice || 0).toFixed(2)}. Net: ₹${netPnl != null ? netPnl.toFixed(2) : "0.00"}.`
  };
}
