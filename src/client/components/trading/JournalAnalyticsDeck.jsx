import React from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { Calendar, Target, TrendingUp, Sparkles, CheckCircle2, ShieldAlert, Award } from "lucide-react";
import clsx from "clsx";

export function JournalAnalyticsDeck() {
  const { 
    journalTrades, 
    journalRange, 
    journalCustomStart, 
    journalCustomEnd,
    setJournalCustomRange 
  } = useTradingStore();

  // Safe Dynamic Date Resolver
  const getTradeDate = (t) => {
    return t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || new Date().toISOString().split("T")[0];
  };

  // 1. Dynamic Trade Filtering based on Active Timeframe / Calendar
  const activeTrades = (journalTrades || []).filter((t) => {
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


  // 2. Aggregate Daily Calendar Sessions dynamically from actual trades
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

  // Sort sessions newest to oldest
  const dailySessions = Array.from(sessionMap.values())
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .map((s) => {
      // Parse date components safely
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

  // 3. Dynamic Strategy Alpha Matrix
  const strategyMap = new Map();
  for (const t of activeTrades) {
    const strat = t.strategyTags || "Discretionary Scalp";
    if (!strategyMap.has(strat)) {
      strategyMap.set(strat, { name: strat, trades: 0, wins: 0, pnl: 0 });
    }
    const item = strategyMap.get(strat);
    item.trades++;
    item.pnl += (t.netPnl || 0);
    if ((t.netPnl || 0) > 0) item.wins++;
  }

  const dynamicStrategies = Array.from(strategyMap.values())
    .sort((a, b) => b.pnl - a.pnl)
    .map((s) => ({
      name: s.name,
      trades: s.trades,
      winRate: Math.round((s.wins / s.trades) * 100),
      pnl: Math.round(s.pnl * 100) / 100
    }));

  const rangeLabel = journalRange === "today" 
    ? "Today" 
    : journalRange === "week" 
    ? "This Week" 
    : journalRange === "month" 
    ? "This Month" 
    : journalRange === "custom" 
    ? `${journalCustomStart} to ${journalCustomEnd}` 
    : "All Time";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 📅 Master Deck 1: Dynamic Custom Calendar Daily Session Cards */}
      <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Daily Session Calendar Cards</h3>
              <span className="text-[11px] text-slate-400">Session P&amp;L breakdown for <strong className="text-cyan-300">{rangeLabel}</strong></span>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            {dailySessions.length} Active {dailySessions.length === 1 ? "Session" : "Sessions"}
          </span>
        </div>

        {/* Daily Session Cards Grid */}
        {dailySessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {dailySessions.map((session) => (
              <div
                key={session.fullDate}
                className={clsx(
                  "p-3.5 rounded-2xl border transition group relative overflow-hidden flex flex-col justify-between space-y-2",
                  session.win
                    ? "bg-gradient-to-br from-emerald-500/[0.04] to-transparent border-emerald-500/20 hover:border-emerald-500/40"
                    : "bg-gradient-to-br from-rose-500/[0.04] to-transparent border-rose-500/20 hover:border-rose-500/40"
                )}
              >
                {/* Header Row: Date Pill & Outcome Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={clsx("w-2 h-2 rounded-full", session.win ? "bg-emerald-400 shadow-sm shadow-emerald-500/50" : "bg-rose-400 shadow-sm shadow-rose-500/50")} />
                    <span className="font-bold text-white text-xs">{session.date}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">({session.day})</span>
                  </div>

                  <span className={clsx("text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider", session.win ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/10 text-rose-400 border border-rose-500/30")}>
                    {session.win ? `${session.winCount}W / 0L` : `${session.lossCount}L Cut`}
                  </span>
                </div>

                {/* Net P&L Figure */}
                <div>
                  <span className="text-[10px] text-slate-400 block">Session Net Take-Home</span>
                  <strong className={clsx("font-mono text-base font-black block tracking-tight", session.win ? "text-emerald-400" : "text-rose-400")}>
                    {session.pnl >= 0 ? "+" : ""}₹{session.pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                {/* Footer Sub-row: Best Performer / Trade Tag */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className="truncate max-w-[120px]">⭐ {session.topSymbol}</span>
                  <span className="text-slate-500">{session.tradesCount} {session.tradesCount === 1 ? "trade" : "trades"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 text-center space-y-2">
            <span className="text-2xl block">📅</span>
            <p className="text-xs text-slate-300 font-bold">No trading sessions recorded in this date range.</p>
            <span className="text-[10px] text-slate-500 block">Use the "+ Add Custom Data" button or adjust the calendar to view sessions.</span>
          </div>
        )}
      </div>

      {/* 🎯 Master Deck 2: Dynamic Strategy & Setup Alpha Ranking */}
      <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Strategy &amp; Setup Edge Comparison</h3>
              <span className="text-[11px] text-slate-400">Realized expectancy grouped by strategy tag</span>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Alpha Matrix
          </span>
        </div>

        {/* Dynamic Strategy Rows */}
        {dynamicStrategies.length > 0 ? (
          <div className="space-y-2 text-xs">
            {dynamicStrategies.map((strat) => {
              const isGain = strat.pnl >= 0;
              return (
                <div
                  key={strat.name}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <div>
                      <span className="text-white font-bold block">{strat.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{strat.trades} {strat.trades === 1 ? "execution" : "executions"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Win Rate</span>
                      <span className="text-cyan-300 font-bold">{strat.winRate}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Net Yield</span>
                      <strong className={clsx("text-xs font-black", isGain ? "text-emerald-400" : "text-rose-400")}>
                        {isGain ? "+" : ""}₹{strat.pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 text-center space-y-2">
            <span className="text-2xl block">🎯</span>
            <p className="text-xs text-slate-300 font-bold">No strategy data for this period.</p>
          </div>
        )}
      </div>
    </div>
  );
}

