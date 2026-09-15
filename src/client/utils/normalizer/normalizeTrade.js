import { parseOptionContract, resolveNextExpiryDate, calculateHeldToExpiryMetrics } from "../expiryUtils.js";

const DEFAULT_TRADE = {
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

/**
 * Normalizes any raw trade entity into a guaranteed canonical contract.
 */
export function normalizeTrade(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TRADE };

  const id = String(raw.id || raw._id || `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const symbol = String(raw.symbol || raw.tradingsymbol || "UNKNOWN");
  const tokenKey = raw.tokenKey || raw.token_key || raw.instrument_token || null;

  const entryPrice = Number(raw.entryPrice ?? raw.entry_price ?? raw.price ?? 0);
  const exitPrice = Number(raw.exitPrice ?? raw.exit_price ?? raw.lastMarkPrice ?? entryPrice);

  const rawTarget = raw.targetPrice ?? raw.target_price ?? raw.target;
  const targetPrice = rawTarget !== null && rawTarget !== undefined && Number(rawTarget) > 0 ? Number(rawTarget) : null;

  const rawStop = raw.stopLoss ?? raw.stop_loss ?? raw.sl;
  const stopLoss = rawStop !== null && rawStop !== undefined && Number(rawStop) > 0 ? Number(rawStop) : null;

  const rawQty = Number(raw.quantity ?? raw.qty ?? 1);
  const lotSize = Number(raw.lotSize ?? raw.lot_size ?? 65);
  const lots = (rawQty >= lotSize && rawQty % lotSize === 0) ? (rawQty / lotSize) : rawQty;
  const quantity = Math.max(1, lots);
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
    isWin: netPnl >= 0
  };
}
