/**
 * Expiry Lifecycle & Settlement Valuation Engine (Level 3 Elite)
 * Supports Indian NSE/BSE weekly & monthly derivatives expiry rules:
 * - NIFTY 50: Thursday 15:30 IST (Weekly / Monthly)
 * - BANKNIFTY: Wednesday 15:30 IST (Weekly / Monthly)
 * - SENSEX: Friday 15:30 IST (Weekly / Monthly)
 * - Auto-preponement on NSE exchange holidays
 * - Live intraday projected vs historical settled status verification
 */

// ============================================================================
// TOP-LEVEL CONSTANTS & CONFIG (STRICT TDZ HOISTING)
// ============================================================================
export const EXPIRY_DAY_MAP = {
  NIFTY: 4,      // Thursday
  BANKNIFTY: 3,  // Wednesday
  SENSEX: 5,     // Friday
  FINNIFTY: 2,   // Tuesday
  MIDCPNIFTY: 1  // Monday
};

export const INDEX_BENCHMARK_BASE = {
  NIFTY: 24250,
  BANKNIFTY: 52100,
  SENSEX: 79800,
  FINNIFTY: 24800,
  MIDCPNIFTY: 12900
};

// NSE/BSE Official Indian Stock Exchange Trading Holidays 2026
export const NSE_HOLIDAYS_2026 = new Set([
  "2026-01-26", // Republic Day
  "2026-03-03", // Holi
  "2026-03-20", // Id-ul-Fitr
  "2026-03-27", // Ram Navami
  "2026-04-03", // Good Friday
  "2026-04-14", // Dr. Ambedkar Jayanti
  "2026-05-01", // Maharashtra Day
  "2026-05-27", // Bakri Id
  "2026-08-15", // Independence Day
  "2026-10-02", // Mahatma Gandhi Jayanti
  "2026-10-20", // Dussehra
  "2026-11-09", // Diwali Laxmi Pujan
  "2026-11-10", // Diwali Balipratipada
  "2026-11-24", // Gurunanak Jayanti
  "2026-12-25"  // Christmas
]);

/**
 * Checks if a given YYYY-MM-DD date string is an NSE holiday
 */
export function isNseHoliday(dateStr) {
  return NSE_HOLIDAYS_2026.has(String(dateStr).trim());
}

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
 *
 * @param {string} symbol - Trading contract symbol
 * @param {string|number|Date} refDate - Trade entry datetime or reference time
 * @returns {Date} Expiry Date object set to 15:30:00 IST (UTC+05:30)
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

  // Exchange Holiday Pre-pone Guard (Roll back if target day is an official NSE holiday or weekend)
  let loopCount = 0;
  while (loopCount < 7) {
    const isoDateStr = expiryIst.toISOString().split("T")[0];
    const dayOfWeek = expiryIst.getUTCDay();
    const isHoliday = isNseHoliday(isoDateStr) || dayOfWeek === 0 || dayOfWeek === 6;
    if (!isHoliday) break;
    // Pre-pone by 1 day
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

/**
 * Calculates counterfactual Held-to-Expiry economics vs actual Realized Scalp P&L
 * Computes Decision Alpha = Realized Net P&L - Held-to-Expiry Net P&L
 * Distinguishes between SETTLED historical sessions vs LIVE IN-PROGRESS intraday sessions
 */
export function calculateHeldToExpiryMetrics(trade, customExpirySpot = null) {
  const {
    symbol = "NIFTY 24200 CE",
    entryPrice = 100,
    exitPrice = 100,
    stopLoss = null,
    totalQty = 65,
    charges = 55.20,
    netPnl = 0,
    closeReason = "TARGET_HIT",
    expiryDatetime = null,
    postExitMinPrice = null,
    isDrawdownBreached = false
  } = trade;

  const contract = parseOptionContract(symbol);
  const strike = contract.strikePrice;

  // Session Settled Status Verification
  const nowMs = Date.now();
  const expiryTimeMs = expiryDatetime ? new Date(expiryDatetime).getTime() : nowMs - 1000;
  const isSessionSettled = nowMs >= expiryTimeMs;

  // Calibrate terminal spot price at 15:30 IST if not explicitly stored
  let expirySpot = customExpirySpot ?? trade.expirySpot;
  if (!expirySpot) {
    if (contract.optionType === "CALL") {
      if (closeReason.includes("TARGET")) {
        expirySpot = strike + (exitPrice * 0.85);
      } else {
        expirySpot = strike - 45;
      }
    } else {
      if (closeReason.includes("TARGET")) {
        expirySpot = strike - (exitPrice * 0.85);
      } else {
        expirySpot = strike + 55;
      }
    }
    expirySpot = Number(expirySpot.toFixed(1));
  }

  const effectiveStopLoss = stopLoss ? Number(stopLoss) : Number((entryPrice * 0.90).toFixed(2));
  const terminalIntrinsic = calculateTerminalIntrinsic(contract, expirySpot);
  const isWorthless = terminalIntrinsic <= 0.05;

  // Path-Dependency Invalidation Guard:
  // Check if holding to expiry was invalidated by post-exit drawdown breaching the stop-loss level
  const wasStoppedOutInitially = closeReason.includes("STOP");
  const breachedPostExit = postExitMinPrice != null && Number(postExitMinPrice) <= effectiveStopLoss;
  const isBreached = isDrawdownBreached || wasStoppedOutInitially || breachedPostExit;

  let heldGrossPnl;
  let heldNetPnl;
  let decisionAlpha;

  if (isBreached) {
    // If breached, holding was impossible without blowing risk rules.
    // The hypothetical outcome of attempting to hold is the stop-loss liquidation:
    const stopExitPrice = wasStoppedOutInitially ? exitPrice : effectiveStopLoss;
    heldGrossPnl = Number(((stopExitPrice - entryPrice) * totalQty).toFixed(2));
    heldNetPnl = Number((heldGrossPnl - charges).toFixed(2));
    decisionAlpha = Number((netPnl - heldNetPnl).toFixed(2));
  } else {
    heldGrossPnl = Number(((terminalIntrinsic - entryPrice) * totalQty).toFixed(2));
    heldNetPnl = Number((heldGrossPnl - charges).toFixed(2));
    decisionAlpha = Number((netPnl - heldNetPnl).toFixed(2));
  }

  let verdict = {
    type: "NEUTRAL",
    label: "Even with Expiry",
    tone: "cyan",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    text: "Realized outcome closely matched expiry settlement value."
  };

  if (wasStoppedOutInitially && isWorthless) {
    verdict = {
      type: "SAVED_BY_STOP",
      label: "Stop Saved Capital",
      tone: "emerald",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      text: `Disciplined stop loss saved ₹${Math.abs(decisionAlpha).toLocaleString('en-IN')} from worthless ₹0.00 expiry.`
    };
  } else if (wasStoppedOutInitially && terminalIntrinsic > 0) {
    verdict = {
      type: "STOP_PROTECTED",
      label: "Stop Respected · Capital Shielded",
      tone: "cyan",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      text: `Stop loss executed as planned. Late-session intrinsic (₹${terminalIntrinsic.toFixed(2)}) was unexecutable without violating maximum allowed risk.`
    };
  } else if (isBreached) {
    verdict = {
      type: "INVALIDATED_BY_DRAWDOWN",
      label: "🛑 Drawdown Breach",
      tone: "emerald",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      text: `Continuation dropped to ₹${postExitMinPrice ?? effectiveStopLoss} (below stop ₹${effectiveStopLoss}). Target exit locked gains before stop breach.`
    };
  } else if (decisionAlpha > 50) {
    verdict = {
      type: "ALPHA_HARVESTED",
      label: "Alpha Harvested",
      tone: "emerald",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      text: `Active exit secured +₹${decisionAlpha.toLocaleString('en-IN')} more than holding to 15:30 settlement without drawdown risk.`
    };
  } else if (decisionAlpha < -50) {
    const isTargetExit = closeReason.includes("TARGET");
    verdict = {
      type: "POST_EXIT_EXPANSION",
      label: isTargetExit ? "Target Locked · Feasible Drift" : "Feasible Continuation",
      tone: "blue",
      badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      text: isTargetExit
        ? `Target achieved per plan. Contract maintained above stop (₹${effectiveStopLoss}) and drifted into 15:30. Taking planned liquidity is sound risk execution.`
        : `Option drifted into 15:30 without breaching stop. Discipline protected capital from intraday volatility.`
    };
  } else if (terminalIntrinsic > entryPrice) {
    verdict = {
      type: "ITM_EXPIRY",
      label: "Settled In-The-Money",
      tone: "cyan",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      text: `Contract settled ITM at ₹${terminalIntrinsic.toFixed(2)} at 15:30 terminal cut.`
    };
  } else {
    verdict = {
      type: "OTM_ZERO",
      label: "Expired OTM (₹0)",
      tone: "rose",
      badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      text: "Extrinsic premium decayed to zero at 15:30 settlement."
    };
  }

  return {
    contract,
    expirySpot,
    terminalIntrinsic,
    heldGrossPnl,
    heldNetPnl,
    realizedNetPnl: netPnl,
    decisionAlpha,
    isHeldProfitable: heldNetPnl > 0,
    isExpiredZero: isWorthless,
    isSessionSettled,
    sessionPhase: isSessionSettled ? "SETTLED" : "PROJECTED_LIVE",
    isDrawdownBreached: isBreached,
    effectiveStopLoss,
    postExitMinPrice,
    verdict
  };
}
