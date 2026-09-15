export function getTradeDate(t) {
  return t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || new Date().toISOString().split("T")[0];
}

export function filterActiveTrades(journalTrades, journalRange, journalCustomStart, journalCustomEnd) {
  return (journalTrades || []).filter((t) => {
    const tradeDate = getTradeDate(t);
    const todayStr = new Date().toISOString().split("T")[0];

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
      return tradeDate >= monday.toISOString().split("T")[0] && tradeDate <= sunday.toISOString().split("T")[0];
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
        bestTrade: null
      });
    }
    const session = sessionMap.get(dateKey);
    session.trades.push(t);
    session.totalNet += (t.netPnl || 0);
    session.totalGross += (t.grossPnl || t.netPnl || 0);
    if ((t.netPnl || 0) > 0) {
      session.winCount++;
    } else {
      session.lossCount++;
    }
    if (!session.bestTrade || (t.netPnl || 0) > (session.bestTrade.netPnl || 0)) {
      session.bestTrade = t;
    }
  }

  return Array.from(sessionMap.values())
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .map((s) => {
      const parts = s.dateKey.split("-");
      const year = Number(parts[0]) || 2026;
      const month = (Number(parts[1]) || 7) - 1;
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
        topPnl: s.bestTrade?.netPnl || 0
      };
    });
}
