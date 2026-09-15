import { EXPIRY_DAY_MAP, INDEX_BENCHMARK_BASE, isNseHoliday } from "./expiryConstants.js";

/**
 * Extracts structured option contract metadata from string symbol
 * Examples: "NIFTY 24200 CE", "BANKNIFTY 52100 PE", "SENSEX 80000 CALL"
 */
export function parseOptionContract(symbol = "") {
  const str = String(symbol).toUpperCase().trim();
  let underlying = "NIFTY";
  if (str.includes("BANK")) underlying = "BANKNIFTY";
  else if (str.includes("SENSEX")) underlying = "SENSEX";
  else if (str.includes("FIN")) underlying = "FINNIFTY";
  else if (str.includes("MIDCP")) underlying = "MIDCPNIFTY";

  const strikeMatch = str.match(/\b\d{4,6}\b/);
  const strikePrice = strikeMatch ? Number(strikeMatch[0]) : (INDEX_BENCHMARK_BASE[underlying] || 24200);

  const isPut = str.includes("PE") || str.includes("PUT");
  const optionType = isPut ? "PUT" : "CALL";
  const optionTypeShort = isPut ? "PE" : "CE";

  return {
    underlying,
    strikePrice,
    optionType,
    optionTypeShort,
    canonicalSymbol: `${underlying} ${strikePrice} ${optionTypeShort}`
  };
}

/**
 * Resolves the precise next expiry timestamp (15:30:00 IST) relative to a reference date.
 * If reference date is on expiry day before 15:30, it is that same day.
 * If past 15:30, it rolls forward to the following week's expiry day.
 * Automatically pre-pones to previous trading day if scheduled day is an NSE holiday.
 */
export function resolveNextExpiryDate(symbol = "", refDate = null) {
  const { underlying } = parseOptionContract(symbol);
  const targetDay = EXPIRY_DAY_MAP[underlying] ?? 4; // Default Thursday

  const baseDate = refDate ? new Date(refDate) : new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(baseDate.getTime() + istOffsetMs);

  const currentIstDay = istTime.getUTCDay();
  const currentIstHour = istTime.getUTCHours();
  const currentIstMin = istTime.getUTCMinutes();
  const isPast1530 = currentIstHour > 15 || (currentIstHour === 15 && currentIstMin >= 30);

  let daysToAdd = (targetDay - currentIstDay + 7) % 7;
  if (daysToAdd === 0 && isPast1530) {
    daysToAdd = 7;
  }

  const expiryIst = new Date(istTime);
  expiryIst.setUTCDate(expiryIst.getUTCDate() + daysToAdd);
  expiryIst.setUTCHours(15, 30, 0, 0);

  // Exchange Holiday Pre-pone Guard
  let loopCount = 0;
  while (loopCount < 7) {
    const isoDateStr = expiryIst.toISOString().split("T")[0];
    const dayOfWeek = expiryIst.getUTCDay();
    const isHoliday = isNseHoliday(isoDateStr) || dayOfWeek === 0 || dayOfWeek === 6;
    if (!isHoliday) break;
    expiryIst.setUTCDate(expiryIst.getUTCDate() - 1);
    loopCount++;
  }

  return new Date(expiryIst.getTime() - istOffsetMs);
}

/**
 * Calculates theoretical intrinsic value at expiry
 * Terminal Call Intrinsic: Max(0, S_T - Strike)
 * Terminal Put Intrinsic: Max(0, Strike - S_T)
 */
export function calculateTerminalIntrinsic(symbolOrContract, spotPrice) {
  const contract = typeof symbolOrContract === "string" ? parseOptionContract(symbolOrContract) : symbolOrContract;
  const spot = Number(spotPrice || 0);
  const strike = Number(contract.strikePrice || 0);

  if (contract.optionType === "CALL") {
    return Math.max(0, Number((spot - strike).toFixed(2)));
  } else {
    return Math.max(0, Number((strike - spot).toFixed(2)));
  }
}
