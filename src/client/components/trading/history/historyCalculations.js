import { getTradeOutcome } from "../../../utils/tradeNormalizer.js";

export function resolveUnderlying(trade) {
  const sym = String(trade.underlyingSymbol || trade.symbol || "").toUpperCase();
  if (sym.includes("BANK")) return "BANKNIFTY";
  if (sym.includes("SENSEX")) return "SENSEX";
  if (sym.includes("NIFTY")) return "NIFTY";
  return "OTHER";
}

export function computeAssetCounts(closedAlerts = []) {
  let nifty = 0, bank = 0, sensex = 0;
  for (const t of closedAlerts) {
    const u = resolveUnderlying(t);
    if (u === "NIFTY") nifty++;
    else if (u === "BANKNIFTY") bank++;
    else if (u === "SENSEX") sensex++;
  }
  return { allCount: closedAlerts.length, niftyCount: nifty, bankCount: bank, sensexCount: sensex };
}

/**
 * Institutional Market Session Window Classifier (Indian Market Microstructure)
 * Maps execution timestamp to 3 institutional regimes:
 * - 09:15 to 10:30 AM IST: Opening Drive (High momentum expansion)
 * - 10:30 to 13:30 PM IST: Midday Chop (Theta bleed & range-bound consolidation)
 * - 13:30 to 15:30 PM IST: Power Hour (Gamma squeeze & institutional settlement)
 */
export function resolveMarketSession(datetimeStr) {
  if (!datetimeStr) {
    return {
      id: "REGULAR",
      label: "Market Hours",
      shortLabel: "Regular",
      icon: "📊",
      isChopRisk: false,
      badgeClass: "bg-slate-500/15 text-slate-400 border-slate-500/30"
    };
  }

  const d = new Date(datetimeStr);
  if (isNaN(d.getTime())) {
    return {
      id: "REGULAR",
      label: "Market Hours",
      shortLabel: "Regular",
      icon: "📊",
      isChopRisk: false,
      badgeClass: "bg-slate-500/15 text-slate-400 border-slate-500/30"
    };
  }

  let istHours, istMins;
  if (typeof datetimeStr === "string" && datetimeStr.endsWith("Z")) {
    const utcHours = d.getUTCHours();
    const utcMinutes = d.getUTCMinutes();
    const istTotal = (utcHours * 60 + utcMinutes + 330) % 1440;
    istHours = Math.floor(istTotal / 60);
    istMins = istTotal % 60;
  } else {
    istHours = d.getHours();
    istMins = d.getMinutes();
  }
  const timeVal = istHours * 100 + istMins;

  if (timeVal >= 915 && timeVal < 1030) {
    return {
      id: "OPENING",
      label: "Opening Drive",
      shortLabel: "Opening",
      icon: "🌅",
      isChopRisk: false,
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30"
    };
  } else if (timeVal >= 1030 && timeVal < 1330) {
    return {
      id: "MIDDAY",
      label: "Midday Chop",
      shortLabel: "Midday",
      icon: "⏳",
      isChopRisk: true,
      badgeClass: "bg-orange-500/20 text-orange-300 border-orange-500/40"
    };
  } else if (timeVal >= 1330 && timeVal <= 1530) {
    return {
      id: "CLOSING",
      label: "Power Hour",
      shortLabel: "Closing",
      icon: "⚡",
      isChopRisk: false,
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
    };
  }
  return {
    id: "OFF_HOURS",
    label: "Off Hours",
    shortLabel: "Off Hours",
    icon: "🌙",
    isChopRisk: false,
    badgeClass: "bg-slate-500/15 text-slate-400 border-slate-500/30"
  };
}

export function calculateStatutoryCharges(trade) {
  if (trade.taxesAndCharges != null && !isNaN(Number(trade.taxesAndCharges))) {
    return Number(trade.taxesAndCharges);
  }
  if (trade.charges != null && !isNaN(Number(trade.charges))) {
    return Number(trade.charges);
  }

  const rawQty = Number(trade.quantity || 1);
  const lotSize = Number(trade.lotSize || 65);
  const totalQty = Number(trade.totalQty || (rawQty >= lotSize ? rawQty : rawQty * lotSize) || 65);
  const entryPrice = Number(trade.entryPrice || 100);
  const exitPrice = Number(trade.exitPrice || entryPrice);

  const buyTurnover = entryPrice * totalQty;
  const sellTurnover = exitPrice * totalQty;
  const totalTurnover = buyTurnover + sellTurnover;

  const brokerage = 40.0; // ₹20 buy + ₹20 sell
  const stt = sellTurnover * 0.001; // 0.1% on sell premium
  const exchangeFee = totalTurnover * 0.0005; // NSE ~0.05%
  const gst = (brokerage + exchangeFee) * 0.18; // 18% GST
  const stampDuty = buyTurnover * 0.00003; // 0.003% buy
  const sebiCharges = totalTurnover * 0.000001; // ₹10/crore

  const total = brokerage + stt + exchangeFee + gst + stampDuty + sebiCharges;
  return Number(total.toFixed(2));
}

export function calculateTradeRMultiple(trade) {
  const net = Number(trade.netPnl || 0);
  const entry = Number(trade.entryPrice || 0);
  const sl = Number(trade.stopLoss || 0);
  const rawQty = Number(trade.quantity || 1);
  const lotSize = Number(trade.lotSize || 65);
  const qty = Number(trade.totalQty || (rawQty >= lotSize ? rawQty : rawQty * lotSize) || 65);

  const plannedRiskPts = (entry > 0 && sl > 0) ? Math.abs(entry - sl) : 0;
  // If planned risk was zero or missing, fallback to Manikandan's default ₹250 planned risk
  const plannedRiskRupees = plannedRiskPts > 0 ? (plannedRiskPts * qty) : 250;

  const rMultiple = plannedRiskRupees > 0 ? (net / plannedRiskRupees) : 0;

  // Rule Breach: Did actual loss blow past ₹300 invariant or exceed 1.25x of planned risk?
  const isRuleBreached = net < -300.00 || (net < 0 && Math.abs(net) > (plannedRiskRupees * 1.25) && Math.abs(net) > 300);

  return {
    plannedRiskRupees: Math.round(plannedRiskRupees),
    rMultiple: Number(rMultiple.toFixed(2)),
    rMultipleStr: `${rMultiple >= 0 ? "+" : ""}${rMultiple.toFixed(2)}R`,
    isRuleBreached
  };
}

export function calculateExcursionMetrics(trade) {
  const entry = Number(trade.entryPrice || 0);
  const exit = Number(trade.exitPrice || entry);
  const rawQty = Number(trade.quantity || 1);
  const lotSize = Number(trade.lotSize || 65);
  const qty = Number(trade.totalQty || (rawQty >= lotSize ? rawQty : rawQty * lotSize) || 65);

  let highPrice = entry;
  let lowPrice = entry;

  if (trade.highSinceEntry && !isNaN(Number(trade.highSinceEntry))) {
    highPrice = Number(trade.highSinceEntry);
  } else if (Array.isArray(trade.priceHistory) && trade.priceHistory.length > 0) {
    const prices = trade.priceHistory.map((p) => (typeof p === "object" ? Number(p.price || p.ltp || entry) : Number(p))).filter((p) => !isNaN(p));
    if (prices.length > 0) {
      highPrice = Math.max(...prices, entry, exit);
      lowPrice = Math.min(...prices, entry, exit);
    }
  } else {
    // Model excursion based on exit, target, and stop loss
    if (exit >= entry) {
      highPrice = Math.max(exit, entry + (exit - entry) * 1.15);
      lowPrice = Math.min(entry, entry - (exit - entry) * 0.25);
    } else {
      highPrice = Math.max(entry, entry + (entry - exit) * 0.35);
      lowPrice = Math.min(exit, entry - (entry - exit));
    }
  }

  const mfePts = Math.max(0, highPrice - entry);
  const maePts = Math.max(0, entry - lowPrice);

  const mfeRupees = Math.round(mfePts * qty);
  const maeRupees = Math.round(maePts * qty);

  // Benchmarks against ₹500 target and ₹250 risk
  const targetPctReached = Math.min(200, Math.round((mfeRupees / 500) * 100));
  const slPctDrawnDown = Math.min(200, Math.round((maeRupees / 250) * 100));

  // Execution slippage estimate
  const signalPrice = Number(trade.signalPrice || trade.triggerPrice || entry);
  const entrySlippagePts = Number((entry - signalPrice).toFixed(2));
  const entrySlippageRupees = Math.round(entrySlippagePts * qty);

  return {
    highPrice: Number(highPrice.toFixed(2)),
    lowPrice: Number(lowPrice.toFixed(2)),
    mfePts: Number(mfePts.toFixed(2)),
    maePts: Number(maePts.toFixed(2)),
    mfeRupees,
    maeRupees,
    targetPctReached,
    slPctDrawnDown,
    entrySlippagePts,
    entrySlippageRupees
  };
}

export function filterAlerts(
  closedAlerts = [],
  {
    assetFilter = "ALL",
    paperLedgerFilter = "all",
    diagnosticFilter = "all",
    dateRangeFilter = "all",
    customStart = "",
    customEnd = "",
    searchQuery = "",
    journalIds = new Set()
  } = {}
) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayStr = yDate.toISOString().split("T")[0];

  const curr = new Date();
  const day = curr.getDay();
  const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diffToMonday));
  const weekStartStr = monday.toISOString().split("T")[0];

  const monthStartStr = `${todayStr.slice(0, 7)}-01`;
  const cleanSearch = String(searchQuery || "").trim().toLowerCase();

  return closedAlerts.filter((trade) => {
    // 1. Asset Filter
    if (assetFilter !== "ALL" && resolveUnderlying(trade) !== assetFilter) return false;

    // 2. Outcome Filter
    const outcome = getTradeOutcome(trade);
    if (paperLedgerFilter === "win" && !outcome.isNetGain) return false;
    if (paperLedgerFilter === "loss" && outcome.isNetGain) return false;
    if (paperLedgerFilter === "friction" && !outcome.isBreakeven) return false;

    // 3. Diagnostic & Session Filter
    const { rMultiple, isRuleBreached } = calculateTradeRMultiple(trade);
    if (diagnosticFilter === "breach" && !isRuleBreached) return false;
    if (diagnosticFilter === "runner" && rMultiple < 2.0) return false;
    if (diagnosticFilter === "be" && !outcome.isBreakeven && Math.abs(Number(trade.netPnl || 0)) > 60) return false;
    if (diagnosticFilter === "journaled" && !journalIds.has(trade.id)) return false;
    if (diagnosticFilter === "midday") {
      const sess = resolveMarketSession(trade.entryDatetime);
      if (sess.id !== "MIDDAY") return false;
    }

    // 4. Date Range Filter
    const tradeDate = (trade.exitDatetime || trade.entryDatetime || trade.date || "").split("T")[0];
    if (dateRangeFilter === "today" && tradeDate !== todayStr) return false;
    if (dateRangeFilter === "yesterday" && tradeDate !== yesterdayStr) return false;
    if (dateRangeFilter === "week" && (tradeDate < weekStartStr || tradeDate > todayStr)) return false;
    if (dateRangeFilter === "month" && (tradeDate < monthStartStr || tradeDate > todayStr)) return false;
    if (dateRangeFilter === "custom" && customStart && customEnd) {
      if (tradeDate < customStart || tradeDate > customEnd) return false;
    }

    // 5. Alphanumeric Search Query (symbol, strike, order ID, tags, reason)
    if (cleanSearch) {
      const sym = String(trade.symbol || "").toLowerCase();
      const under = String(trade.underlyingSymbol || "").toLowerCase();
      const idStr = String(trade.id || trade.serverId || "").toLowerCase();
      const reason = String(trade.closeReason || "").toLowerCase();
      const tag = String(trade.strategyTag || trade.strategyTags || "").toLowerCase();
      const mistake = String(trade.mistakeTags || trade.mistakeTag || "").toLowerCase();
      const match =
        sym.includes(cleanSearch) ||
        under.includes(cleanSearch) ||
        idStr.includes(cleanSearch) ||
        reason.includes(cleanSearch) ||
        tag.includes(cleanSearch) ||
        mistake.includes(cleanSearch);
      if (!match) return false;
    }

    return true;
  });
}

export function computeRealizedMetrics(filteredAlerts = []) {
  let realized = 0, gross = 0, charges = 0, wins = 0, losses = 0;
  let grossWins = 0, grossLosses = 0;
  let totalR = 0;
  let breachedCount = 0;
  let runnerCount = 0;
  let beCount = 0;
  let middayCount = 0;

  for (const t of filteredAlerts) {
    const net = Number(t.netPnl || 0);
    const c = calculateStatutoryCharges(t);
    const g = Number(t.grossPnl ?? (net + c));
    realized += net;
    charges += c;
    gross += g;

    if (net > 0) {
      wins++;
      grossWins += net;
    } else {
      losses++;
      grossLosses += Math.abs(net);
    }

    const { rMultiple, isRuleBreached } = calculateTradeRMultiple(t);
    totalR += rMultiple;
    if (isRuleBreached) breachedCount++;
    if (rMultiple >= 2.0) runnerCount++;
    const outcome = getTradeOutcome(t);
    if (outcome.isBreakeven || Math.abs(net) <= 60) beCount++;

    const sess = resolveMarketSession(t.entryDatetime);
    if (sess.id === "MIDDAY") middayCount++;
  }

  const totalCount = filteredAlerts.length;
  const winRate = totalCount > 0 ? ((wins / totalCount) * 100).toFixed(1) : "0.0";
  const profitFactor = grossLosses > 0 
    ? (grossWins / grossLosses).toFixed(2) 
    : (grossWins > 0 ? "∞" : "0.00");
  const avgRMultiple = totalCount > 0 ? (totalR / totalCount).toFixed(2) : "0.00";

  return {
    totalRealizedPnl: realized,
    totalGrossPnl: gross,
    totalCharges: charges,
    winCount: wins,
    lossCount: losses,
    winRate,
    profitFactor,
    avgRMultiple,
    breachedCount,
    runnerCount,
    beCount,
    middayCount
  };
}

export function computeCumulativeEquityCurve(filteredAlerts = []) {
  if (!filteredAlerts || filteredAlerts.length === 0) {
    return {
      points: [],
      peakEquity: 0,
      maxDrawdown: 0,
      recoveryFactor: "0.00",
      pathD: "",
      areaD: "",
      netTotal: 0
    };
  }

  // Sort chronologically
  const chronological = [...filteredAlerts].sort((a, b) => {
    const tA = new Date(a.exitDatetime || a.entryDatetime || 0).getTime();
    const tB = new Date(b.exitDatetime || b.entryDatetime || 0).getTime();
    return tA - tB;
  });

  let running = 0;
  let peak = 0;
  let maxDd = 0;
  const rawPoints = [{ index: 0, cumulative: 0, pnl: 0 }];

  chronological.forEach((t, i) => {
    const net = Number(t.netPnl || 0);
    running += net;
    if (running > peak) peak = running;
    const currentDd = peak - running;
    if (currentDd > maxDd) maxDd = currentDd;
    rawPoints.push({ index: i + 1, cumulative: running, pnl: net, symbol: t.symbol });
  });

  // Scale into SVG coordinates: width = 240, height = 54
  const width = 240;
  const height = 54;
  const paddingY = 8;
  const paddingX = 4;

  const minCum = Math.min(0, ...rawPoints.map((p) => p.cumulative));
  const maxCum = Math.max(0, ...rawPoints.map((p) => p.cumulative));
  const range = maxCum - minCum || 1;

  const getX = (index) => paddingX + (index / (rawPoints.length - 1 || 1)) * (width - paddingX * 2);
  const getY = (val) => height - paddingY - ((val - minCum) / range) * (height - paddingY * 2);

  const coords = rawPoints.map((p) => ({
    x: Number(getX(p.index).toFixed(1)),
    y: Number(getY(p.cumulative).toFixed(1))
  }));

  const pathD = coords.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`), "");
  const zeroY = Number(getY(0).toFixed(1));
  const areaD = `${pathD} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

  const recoveryFactor = maxDd > 0 
    ? (running > 0 ? (running / maxDd).toFixed(2) : "0.00")
    : (running > 0 ? "∞" : "0.00");

  return {
    points: rawPoints,
    peakEquity: Math.round(peak),
    maxDrawdown: Math.round(maxDd),
    recoveryFactor,
    zeroY,
    pathD,
    areaD,
    netTotal: running
  };
}
