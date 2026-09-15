import { getRangeWindow, rangeLabel } from "./trade-range-utils.js";

export { getRangeWindow, rangeLabel };

export function normalizeTradeInput(input = {}) {
  const entryPrice = toNumber(input.entryPrice);
  const exitPrice = input.exitPrice === "" || input.exitPrice == null ? null : toNumber(input.exitPrice);
  const quantity = toNumber(input.quantity);
  const targetPrice = input.targetPrice === "" || input.targetPrice == null ? null : toNumber(input.targetPrice);
  const stopLoss = input.stopLoss === "" || input.stopLoss == null ? null : toNumber(input.stopLoss);
  const direction = normalizeEnum(input.direction, ["LONG", "SHORT"], "LONG");
  const charges = toNumber(input.charges);
  const status = normalizeStatus(input.status, exitPrice);
  const lotSize = Math.max(1, toNumber(input.lotSize) || 1);
  const unitQuantity = quantity * lotSize;
  const positionSize = Math.abs(entryPrice * unitQuantity);
  const capitalUsed = toNumber(input.capitalUsed) || positionSize;
  const riskPerUnit = stopLoss == null ? 0 : Math.max(0, direction === "LONG" ? entryPrice - stopLoss : stopLoss - entryPrice);
  const rewardPerUnit = targetPrice == null ? 0 : Math.max(0, direction === "LONG" ? targetPrice - entryPrice : entryPrice - targetPrice);
  const riskAmount = toNumber(input.riskAmount) || riskPerUnit * unitQuantity;
  const expectedReward = toNumber(input.expectedReward) || rewardPerUnit * unitQuantity;
  const riskPercentage = toNumber(input.riskPercentage) || (capitalUsed ? (riskAmount / capitalUsed) * 100 : 0);
  const riskRewardRatio = toNumber(input.riskRewardRatio) || (riskAmount ? expectedReward / riskAmount : 0);
  const grossPnl = exitPrice == null ? 0 : (direction === "LONG" ? exitPrice - entryPrice : entryPrice - exitPrice) * unitQuantity;
  const netPnl = grossPnl - charges;

  return {
    accountId: input.accountId,
    idempotencyKey: cleanString(input.idempotencyKey) || null,
    symbol: sanitizeSymbol(input.symbol),
    displayName: cleanString(input.displayName),
    market: normalizeEnum(input.market, ["INDIA", "US"], "INDIA"),
    instrumentType: normalizeEnum(input.instrumentType, ["STOCK", "OPTION"], "STOCK"),
    exchange: cleanString(input.exchange),
    currency: cleanString(input.currency) || (input.market === "US" ? "USD" : "INR"),
    underlyingSymbol: sanitizeSymbol(input.underlyingSymbol),
    optionType: input.instrumentType === "OPTION" ? normalizeEnum(input.optionType, ["CALL", "PUT"], "CALL") : null,
    strikePrice: input.instrumentType === "OPTION" ? nullableNumber(input.strikePrice) : null,
    expiryDate: cleanString(input.expiryDate),
    lotSize,
    tradeMode: normalizeEnum(input.tradeMode, ["REAL", "PAPER"], "PAPER"),
    tradeType: normalizeEnum(input.tradeType, ["INTRADAY", "SWING"], "SWING"),
    direction,
    status,
    entryDatetime: cleanString(input.entryDatetime) || cleanString(input.entryDate) || (input.timestamp ? new Date(input.timestamp).toISOString() : new Date().toISOString()),
    exitDatetime: cleanString(input.exitDatetime),
    entryPrice,
    exitPrice,
    quantity,
    capitalUsed,
    positionSize,
    targetPrice,
    stopLoss,
    riskAmount,
    riskPercentage,
    expectedReward,
    riskRewardRatio,
    realizedPnl: grossPnl,
    charges,
    netPnl,
    journal: {
      entryReason: cleanString(input.entryReason),
      confidenceScore: nullableNumber(input.confidenceScore),
      emotionBefore: cleanString(input.emotionBefore),
      emotionAfter: cleanString(input.emotionAfter),
      followedPlan: Boolean(input.followedPlan),
      lessonsLearned: cleanString(input.lessonsLearned),
      personalNotes: cleanString(input.personalNotes),
    },
    strategyTags: normalizeTags(input.strategyTags),
    mistakeTags: normalizeTags(input.mistakeTags),
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
  };
}

export function validateTradeInput(trade) {
  const errors = [];
  if (!trade.symbol) errors.push("Symbol is required.");
  if (!trade.entryDatetime) errors.push("Entry date and time is required.");
  if (!trade.entryPrice || trade.entryPrice <= 0) errors.push("Entry price must be greater than zero.");
  if (!trade.quantity || trade.quantity <= 0) errors.push("Quantity must be greater than zero.");
  if (trade.exitPrice != null && trade.exitPrice <= 0) errors.push("Exit price must be greater than zero when provided.");
  if (trade.status === "CLOSED" && !trade.exitDatetime) errors.push("Exit date and time is required for closed trades.");
  if (trade.journal.confidenceScore != null && (trade.journal.confidenceScore < 1 || trade.journal.confidenceScore > 10)) {
    errors.push("Confidence score must be between 1 and 10.");
  }
  return errors;
}

function normalizeStatus(status, exitPrice) {
  const clean = normalizeEnum(status, ["PLANNED", "OPEN", "CLOSED", "CANCELLED"], "");
  if (clean) return clean;
  return exitPrice == null ? "OPEN" : "CLOSED";
}

function normalizeEnum(value, allowed, fallback) {
  const clean = cleanString(value).toUpperCase().replace(/[\s-]+/g, "_");
  return allowed.includes(clean) ? clean : fallback;
}

function sanitizeSymbol(value) {
  return cleanString(value).toUpperCase();
}

function normalizeTags(value) {
  const tags = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(tags.map((tag) => cleanString(tag)).filter(Boolean))];
}

function cleanString(value) {
  return String(value ?? "").trim();
}

function nullableNumber(value) {
  if (value === "" || value == null) return null;
  return toNumber(value);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
