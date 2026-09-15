import { gunzipSync } from "node:zlib";
import {
  toUpstoxSide,
  normalizeInstrumentKey,
  expiryKeys,
} from "./upstoxUtils.js";

export function findOptionToken(instruments, trade) {
  const underlying = String(trade.underlyingSymbol || "").trim().toUpperCase();
  const strike = Number(trade.strikePrice || 0);
  const side = toUpstoxSide(trade.optionType);
  const tradeExpiryKeys = expiryKeys(trade.expiryDate);

  if (!underlying || !strike || !side) return null;

  const candidates = (Array.isArray(instruments) ? instruments : []).filter((item) => {
    const text = instrumentText(item);
    return optionSide(item) === side && text.includes(underlying) && matchesStrike(item, strike);
  });

  if (!candidates.length) return null;

  if (tradeExpiryKeys.length) {
    const match = candidates.find((item) => {
      const itemExpiryKeys = expiryKeys(item.expiry || item.expiry_date || item.expiryDate);
      return itemExpiryKeys.some((key) => tradeExpiryKeys.includes(key));
    });
    if (match) return buildInstrumentKey(match);
  }

  return buildInstrumentKey(candidates[0]);
}

export function buildInstrumentKey(item) {
  const direct = normalizeInstrumentKey(item.instrument_key || item.instrumentKey || item.instrument_token);
  if (direct?.includes("|")) return direct;
  const exchange = String(item.exchange || item.segment || "NSE_FO").toUpperCase().replace("NFO", "NSE_FO");
  const token = String(item.exchange_token || item.token || item.isin || direct || "");
  if (token.includes("|")) return token;
  return `${exchange}|${token}`;
}

export function parseInstrumentPayload(buffer) {
  const asText = buffer.toString("utf8");
  try {
    return JSON.parse(asText);
  } catch {
    return JSON.parse(gunzipSync(buffer).toString("utf8"));
  }
}

export function instrumentText(item) {
  return [
    item.name,
    item.trading_symbol,
    item.tradingsymbol,
    item.symbol,
    item.instrument_key,
    item.instrumentKey,
    item.underlying_symbol,
    item.asset_symbol,
  ].filter(Boolean).join(" ").toUpperCase();
}

export function optionSide(item) {
  const type = String(item.instrument_type || item.option_type || item.optionType || "").toUpperCase();
  if (type === "CE" || type === "CALL") return "CE";
  if (type === "PE" || type === "PUT") return "PE";
  const text = instrumentText(item);
  if (/(^|[^A-Z])CE($|[^A-Z])/.test(text) || text.endsWith("CE")) return "CE";
  if (/(^|[^A-Z])PE($|[^A-Z])/.test(text) || text.endsWith("PE")) return "PE";
  return "";
}

export function matchesStrike(item, strike) {
  const numeric = Number(item.strike_price || item.strike || item.strikePrice || 0);
  if (Number.isFinite(numeric) && numeric > 0) return Math.abs(numeric - strike) < 0.01;
  return instrumentText(item).includes(String(strike));
}
