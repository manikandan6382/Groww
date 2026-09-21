import { getLocalDateKey } from "../../../utils/dateUtils";

export function getTradeDate(t) {
  return getLocalDateKey(t.exitDatetime || t.entryDatetime);
}

export function filterActiveTrades(journalTrades, journalRange, journalCustomStart, journalCustomEnd) {
  return (journalTrades || []).filter((t) => {
    const tradeDate = getTradeDate(t);
    const todayStr = getLocalDateKey();

    if (journalRange === "today") {
      return tradeDate === todayStr;
    }
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
        return tradeDate >= journalCustomStart && tradeDate <= journalCustomEnd;
      }
      if (journalCustomStart) return tradeDate >= journalCustomStart;
    }
    return true;
  });
}

export function aggregateDailySessions(activeTrades) {
  const sessionMap = new Map();
  for (const t of activeTrades) {
    const dateKey = getTradeDate(t);
    if (!sessionMap.has(dateKey)) {
      sessionMap.set(dateKey, {
        dateKey,
        trades: [],
        totalNet: 0,
        totalGross: 0,
        winCount: 0,
        lossCount: 0,
        bestTrade: null,
        worstTrade: null,
        breachedLossCount: 0
      });
    }
    const session = sessionMap.get(dateKey);
    session.trades.push(t);
    const net = Number(t.netPnl || 0);
    session.totalNet += net;
    session.totalGross += (t.grossPnl || net);
    if (net > 0) {
      session.winCount++;
    } else {
      session.lossCount++;
      if (net < -305) {
        session.breachedLossCount++;
      }
    }
    if (!session.bestTrade || net > (session.bestTrade.netPnl || 0)) {
      session.bestTrade = t;
    }
    if (!session.worstTrade || net < (session.worstTrade.netPnl || 0)) {
      session.worstTrade = t;
    }
  }

  return Array.from(sessionMap.values())
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .map((s) => {
      const parts = s.dateKey.split("-");
      const year = Number(parts[0]) || 2026;
      const month = (Number(parts[1]) || 1) - 1;
      const day = Number(parts[2]) || 1;
      const dt = new Date(year, month, day);

      const monthName = dt.toLocaleString("en-US", { month: "short" });
      const dayNum = String(day).padStart(2, "0");
      const weekdayName = dt.toLocaleString("en-US", { weekday: "short" });

      return {
        date: `${monthName} ${dayNum}`,
        fullDate: s.dateKey,
        day: weekdayName,
        pnl: Math.round(s.totalNet * 100) / 100,
        tradesCount: s.trades.length,
        winCount: s.winCount,
        lossCount: s.lossCount,
        win: s.totalNet >= 0,
        topSymbol: s.bestTrade?.symbol || "N/A",
        topPnl: s.bestTrade?.netPnl || 0,
        worstPnl: s.worstTrade?.netPnl || 0,
        breachedLossCount: s.breachedLossCount,
        riskInvariantViolated: s.breachedLossCount > 0
      };
    });
}

