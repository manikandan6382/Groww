import { getLocalDateKey } from "../../../utils/dateUtils.js";

export function getTradeDate(trade) {
  return getLocalDateKey(trade.exitDatetime || trade.entryDatetime);
}

export function getDateFilteredTrades(journalTrades, journalRange, journalCustomStart, journalCustomEnd) {
  return (journalTrades || []).filter((trade) => {
    const tradeDate = getTradeDate(trade);
    const todayKey = getLocalDateKey();

    if (journalRange === "today") return tradeDate === todayKey;
    if (journalRange === "week") {
      const d = new Date();
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return tradeDate >= getLocalDateKey(monday) && tradeDate <= getLocalDateKey(sunday);
    }
    if (journalRange === "month") {
      const now = new Date();
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return tradeDate.startsWith(prefix);
    }
    if (journalRange === "custom") {
      if (journalCustomStart && journalCustomEnd) {
        if (tradeDate < journalCustomStart || tradeDate > journalCustomEnd) return false;
      } else if (journalCustomStart) {
        if (tradeDate < journalCustomStart) return false;
      }
    }
    return true;
  });
}

export function isTradeInMiddayChop(trade) {
  const d = new Date(trade.entryDatetime || trade.datetime || Date.now());
  const utcHours = d.getUTCHours();
  const utcMins = d.getUTCMinutes();
  const totalMins = utcHours * 60 + utcMins;
  // 10:30 AM IST (05:00 UTC = 300m) to 13:30 PM IST (08:00 UTC = 480m)
  return totalMins >= 300 && totalMins < 480;
}

export function getFilteredTrades(dateFilteredTrades, selectedStrategyFilter, journalFilter, searchQuery) {
  return dateFilteredTrades.filter((trade) => {
    const rawStrat = Array.isArray(trade.strategyTags)
      ? (trade.strategyTags[0] || trade.strategyTag || trade.entryReason || "")
      : (trade.strategyTags || trade.strategyTag || trade.entryReason || "");
    const tradeStrat = String(rawStrat || "").trim();

    if (selectedStrategyFilter && tradeStrat !== selectedStrategyFilter) return false;

    const net = Number(trade.netPnl !== undefined ? trade.netPnl : 0);
    const m = Array.isArray(trade.mistakeTags) 
      ? trade.mistakeTags.join(" ").toLowerCase() 
      : String(trade.mistakeTags || "").toLowerCase();

    // Diagnostic Quick Filters
    if (journalFilter === "WIN" && !(trade.closeReason === "TARGET_HIT" || net > 0)) return false;
    if (journalFilter === "LOSS" && !(trade.closeReason === "STOP_LOSS_HIT" || net < 0)) return false;
    if (journalFilter === "BREACH" && !(net < -300 || trade.isRuleBreached === true)) return false;
    if (journalFilter === "RUNNERS" && !(net >= 400 || (trade.rMultiple && Number(trade.rMultiple) >= 2.0))) return false;
    if (journalFilter === "BREAKEVEN" && !(Math.abs(net) <= 65 || trade.closeReason === "BREAKEVEN_LOCKED")) return false;
    if (journalFilter === "CHOP" && !isTradeInMiddayChop(trade)) return false;
    if (journalFilter === "TILT" && !(trade.followedPlan === false || (m && m !== "none" && !m.includes("plan followed")))) return false;

    // Alphanumeric Multi-Field Search
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = String(trade.id || "").toLowerCase().includes(q);
      const matchSymbol = String(trade.symbol || "").toLowerCase().includes(q);
      const matchStrategy = tradeStrat.toLowerCase().includes(q);
      const matchLesson = String(trade.lessonsLearned || "").toLowerCase().includes(q);
      const matchCatalyst = String(trade.catalyst || trade.entryReason || "").toLowerCase().includes(q);
      const matchNotes = String(trade.notes || trade.executionDetails || "").toLowerCase().includes(q);
      const matchMistake = m.includes(q);

      if (!matchId && !matchSymbol && !matchStrategy && !matchLesson && !matchCatalyst && !matchNotes && !matchMistake) {
        return false;
      }
    }

    return true;
  });
}

export function getRangeLabel(journalRange, journalCustomStart, journalCustomEnd) {
  if (journalRange === "today") return "Today";
  if (journalRange === "week") return "This Week";
  if (journalRange === "month") return "This Month";
  if (journalRange === "custom") return `${journalCustomStart} to ${journalCustomEnd}`;
  return "All Time";
}
