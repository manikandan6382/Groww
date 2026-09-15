import {
  getManualToken,
  toUpstoxSide,
  normalizeInstrumentKey,
} from "./upstoxUtils.js";
import { findOptionToken } from "./instrumentMatcher.js";

export async function resolveContractToken(client, trade) {
  const manual = getManualToken(trade);
  if (manual) return manual;
  if (!client.isConfigured()) return null;

  try {
    const sym = String(trade.symbol || trade.tradingsymbol || "");
    const underlying = String(
      trade.underlyingSymbol ||
      trade.underlying_symbol ||
      (sym.includes("SENSEX") ? "SENSEX" : sym.includes("BANK") ? "BANKNIFTY" : sym.includes("FIN") ? "FINNIFTY" : "NIFTY")
    ).toUpperCase();
    const parsedStrike = Number(trade.strikePrice || trade.strike_price || (sym.match(/\b\d{5,6}\b/) || sym.match(/\d+/) || [0])[0]);
    const strike = parsedStrike || Number((sym.match(/\d+/) || [0])[0]);
    const side = toUpstoxSide(trade.optionType || trade.option_type || (sym.includes("PE") ? "PUT" : "CALL"));
    const underlyingKey = underlying.includes("SENSEX") ? "BSE_INDEX|SENSEX" : (underlying.includes("BANK") ? "NSE_INDEX|Nifty Bank" : (underlying.includes("FIN") ? "NSE_INDEX|Nifty Fin Service" : "NSE_INDEX|Nifty 50"));
    
    const endpoint = new URL("https://api.upstox.com/v2/option/contract");
    endpoint.searchParams.set("instrument_key", underlyingKey);
    
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${client.accessToken}`,
        Accept: "application/json",
        "Api-Version": "2.0",
      },
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length) {
        const now = Date.now();
        const matches = json.data.filter((c) => {
          const expTime = new Date(c.expiry).getTime();
          return (
            Number(c.strike_price) === strike &&
            String(c.instrument_type).toUpperCase() === side &&
            expTime >= now - 86400000
          );
        });
        if (matches.length) {
          matches.sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime());

          const reqExp = String(trade.expiryDate || trade.expiry || "").trim().toLowerCase();
          const symDateMatch = sym.match(/\b(\d{1,2})[-_\s]?([A-Za-z]{3,4})[-_\s]?(\d{2,4})?\b/);

          let matchedContract = null;
          if (reqExp) {
            matchedContract = matches.find((c) => {
              const cExp = String(c.expiry).toLowerCase();
              const cSym = String(c.trading_symbol).toLowerCase();
              return cExp.includes(reqExp) || cSym.includes(reqExp) || reqExp.includes(cExp);
            });
          } else if (symDateMatch) {
            const dayStr = String(symDateMatch[1]).padStart(2, "0");
            const monStr = symDateMatch[2].toLowerCase().slice(0, 3);
            matchedContract = matches.find((c) => {
              const cSym = String(c.trading_symbol).toLowerCase();
              const cExp = String(c.expiry).toLowerCase();
              return (cSym.includes(dayStr) && cSym.includes(monStr)) || (cExp.includes(dayStr) && cExp.includes(monStr));
            });
          }

          if (!matchedContract) matchedContract = matches[0];

          if (trade.returnFullDetails) {
            return {
              instrumentKey: normalizeInstrumentKey(matchedContract.instrument_key),
              expiry: matchedContract.expiry,
              tradingSymbol: matchedContract.trading_symbol,
              availableContracts: matches.map((m) => ({
                instrumentKey: normalizeInstrumentKey(m.instrument_key),
                expiry: m.expiry,
                tradingSymbol: m.trading_symbol,
                strike: m.strike_price,
                type: m.instrument_type,
              })),
            };
          }

          return normalizeInstrumentKey(matchedContract.instrument_key);
        }
      }
    }
  } catch {
    // Fallback to offline master
  }

  try {
    const instruments = await client.getInstruments();
    const token = findOptionToken(instruments, trade);
    return token || null;
  } catch (error) {
    client.emit("error", new Error(`Token resolution failed: ${error.message}`));
    return null;
  }
}
