import { getLocalDateKey } from "../../../utils/dateUtils";

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

export function getFilteredTrades(dateFilteredTrades, selectedStrategyFilter, journalFilter, searchQuery) {
  return dateFilteredTrades.filter((trade) => {
    const rawStrat = Array.isArray(trade.strategyTags)
      ? (trade.strategyTags[0] || trade.strategyTag || trade.entryReason || "")
      : (trade.strategyTags || trade.strategyTag || trade.entryReason || "");
    const tradeStrat = String(rawStrat || "").trim();

    if (selectedStrategyFilter && tradeStrat !== selectedStrategyFilter) return false;
    if (journalFilter === "WIN" && !(trade.closeReason === "TARGET_HIT" || trade.netPnl > 0)) return false;
    if (journalFilter === "LOSS" && !(trade.closeReason === "STOP_LOSS_HIT" || trade.netPnl < 0)) return false;
    if (journalFilter === "BREAKEVEN" && !(trade.closeReason === "BREAKEVEN_LOCKED" || trade.netPnl === 0)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSymbol = trade.symbol?.toLowerCase().includes(q);
      const matchStrategy = tradeStrat.toLowerCase().includes(q);
      const matchLesson = trade.lessonsLearned?.toLowerCase().includes(q);
      const matchCatalyst = trade.catalyst?.toLowerCase().includes(q);
      if (!matchSymbol && !matchStrategy && !matchLesson && !matchCatalyst) return false;
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
