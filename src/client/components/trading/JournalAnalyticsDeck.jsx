import React from "react";
import { useTradingStore, isMarketWeekend } from "../../stores/useTradingStore";
import { Calendar, Target, TrendingUp, Sparkles, CheckCircle2, ShieldAlert, Award } from "lucide-react";
import { RollingTicker } from "../common/RollingTicker";
import clsx from "clsx";

export function JournalAnalyticsDeck() {
  const { 
    journalTrades, 
    journalRange, 
    journalCustomStart, 
    journalCustomEnd,
    setJournalCustomRange,
    selectedStrategyFilter,
    setSelectedStrategyFilter 
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

  // 3. Dynamic Strategy Alpha & Setup Expectancy Matrix with Canonical Normalization
  const strategyMap = new Map();
  for (const t of activeTrades) {
    const rawStrat = t.strategyTags || t.strategyTag || t.entryReason || "Discretionary Scalp";
    // Canonicalize strategy tag to eliminate duplicate fragment sprawl
    const strat = rawStrat.trim();
    if (!strategyMap.has(strat)) {
      strategyMap.set(strat, {
        name: strat,
        trades: 0,
        wins: 0,
        losses: 0,
        pnl: 0,
        grossWins: 0,
        grossLosses: 0,
        lossesList: [],
      });
    }
    const item = strategyMap.get(strat);
    item.trades++;
    const net = Number(t.netPnl || 0);
    item.pnl += net;
    if (net > 0) {
      item.wins++;
      item.grossWins += net;
    } else {
      item.losses++;
      item.grossLosses += Math.abs(net);
      item.lossesList.push(Math.abs(net));
    }
  }

  const dynamicStrategies = Array.from(strategyMap.values())
    .sort((a, b) => b.pnl - a.pnl)
    .map((s) => {
      const winRate = s.trades ? Math.round((s.wins / s.trades) * 100) : 0;
      const avgPayoff = s.trades ? Math.round((s.pnl / s.trades) * 100) / 100 : 0;
      const avgWin = s.wins > 0 ? s.grossWins / s.wins : 0;
      const avgLoss = s.losses > 0 ? s.grossLosses / s.losses : 1;
      const maxDrawdown = s.lossesList.length ? Math.max(...s.lossesList) : 0;
      const profitFactor = s.grossLosses > 0 
        ? (s.grossWins / s.grossLosses).toFixed(2) 
        : (s.grossWins > 0 ? "5.0+" : "0.00");

      // Bayesian Laplace Shrinkage Prior toward 50% baseline
      const pBayes = s.trades ? (s.wins + 2) / (s.trades + 4) : 0.5;
      const qBayes = 1 - pBayes;
      const b = avgLoss > 0 ? avgWin / avgLoss : 1;
      const rawKelly = b > 0 ? (pBayes * b - qBayes) / b : 0;
      const quarterKelly = Math.max(0, rawKelly * 0.25);

      // Sample-size Gated Sizing Guidance
      let sizingAdvice = "0.5 Lot (Exploratory · N < 10)";
      if (s.trades >= 20) {
        sizingAdvice = quarterKelly >= 0.12 ? "2 Lots (Aggressive Edge)" : quarterKelly >= 0.04 ? "1 Lot (Standard)" : "0.5 Lot (Defensive)";
      } else if (s.trades >= 10) {
        sizingAdvice = quarterKelly >= 0.08 ? "1 Lot (Calibrating)" : "0.5 Lot (Defensive)";
      }

      let statusTier = "neutral";
      let statusBadge = "⚖️ Balanced Setup";
      let statusClass = "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
      let tierBorder = "border-l-4 border-l-cyan-400";
      let recommendation = `Sizing: ${sizingAdvice} · Keep maintaining strict risk discipline.`;

      if (s.pnl > 0 && winRate >= 65) {
        statusTier = "top";
        statusBadge = "🏆 Alpha Goldmine";
        statusClass = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/10";
        tierBorder = "border-l-4 border-l-emerald-400";
        recommendation = `Sizing: ${sizingAdvice} · Double Down! Strong statistical edge.`;
      } else if (s.pnl > 0) {
        statusTier = "good";
        statusBadge = "✅ Profitable Play";
        statusClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        tierBorder = "border-l-4 border-l-teal-400";
        recommendation = `Sizing: ${sizingAdvice} · Positive Expectancy — Maintain stop-loss discipline.`;
      } else if (s.pnl <= 0 && winRate >= 60) {
        statusTier = "warning";
        statusBadge = "⚠️ Risk/Reward Leak";
        statusClass = "bg-amber-500/15 text-amber-300 border-amber-500/30";
        tierBorder = "border-l-4 border-l-amber-400";
        recommendation = "High win-rate but negative P&L — You are cutting winners too early!";
      } else {
        statusTier = "drain";
        statusBadge = "🛑 Capital Drain";
        statusClass = "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-sm shadow-rose-500/10";
        tierBorder = "border-l-4 border-l-rose-500";
        recommendation = "Eliminate Setup — Consistently draining your trading capital.";
      }

      return {
        ...s,
        winRate,
        avgPayoff,
        maxDrawdown,
        profitFactor,
        sizingAdvice,
        statusTier,
        statusBadge,
        statusClass,
        tierBorder,
        recommendation,
        pnl: Math.round(s.pnl * 100) / 100,
      };
    });

  const rangeLabel = journalRange === "today" 
    ? "Today" 
    : journalRange === "week" 
    ? "This Week" 
    : journalRange === "month" 
    ? "This Month" 
    : journalRange === "custom" 
    ? `${journalCustomStart} to ${journalCustomEnd}` 
    : "All Time";

  const [showExplainer, setShowExplainer] = React.useState(false);

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

        {/* Daily Session Cards Grid with Max-Height Container */}
        {dailySessions.length > 0 ? (
          <div className="max-h-[440px] overflow-y-auto pr-1 space-y-2.5">
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
                      <span className="text-[10px] text-slate-400 font-mono font-normal">({session.day})</span>
                    </div>

                    <span
                      className={clsx(
                        "text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded-md border",
                        session.win
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                      )}
                    >
                      {session.win ? "GREEN" : "RED"}
                    </span>
                  </div>

                  {/* Main Metric Row: PnL Display with Rolling Odometer Animation */}
                  <div>
                    <span className="text-[10px] text-slate-400 block">Session Net Take-Home</span>
                    <div className={clsx("font-mono text-base font-black block tracking-tight", session.win ? "text-emerald-400" : "text-rose-400")}>
                      <RollingTicker 
                        value={session.pnl} 
                        prefix="₹" 
                        showSign={true} 
                        decimalPlaces={2} 
                        className={session.win ? "text-emerald-400" : "text-rose-400"}
                      />
                    </div>
                  </div>

                  {/* Footer Sub-row: Best Performer / Trade Tag */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="truncate max-w-[120px]">⭐ {session.topSymbol}</span>
                    <span className="text-slate-500">{session.tradesCount} {session.tradesCount === 1 ? "trade" : "trades"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 text-center space-y-2">
            <span className="text-2xl block">{journalRange === "today" && isMarketWeekend() ? "🏖️" : "📅"}</span>
            <p className="text-xs text-slate-300 font-bold">
              {journalRange === "today" && isMarketWeekend()
                ? "Weekend — Indian Markets are Closed Today"
                : journalRange === "today"
                ? "No trading session logged for today yet."
                : "No trading sessions recorded in this date range."}
            </p>
            <span className="text-[10px] text-slate-500 block">
              {journalRange === "today" && isMarketWeekend()
                ? "Switch timeframe to \"This Week\" or \"All Time\" to view historical sessions."
                : "Record a trade with the 1-Click Strike Bar or adjust the date filter to view sessions."}
            </span>
          </div>
        )}
      </div>

      {/* 🎯 Master Deck 2: Redesigned Strategy Playbook & Setup Edge Leaderboard */}
      <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-3.5">
        {/* Header & Quick Helper Trigger */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white tracking-tight">Strategy &amp; Setup Edge Comparison</h3>
              </div>
              <span className="text-[11px] text-slate-400">Click any card to filter Trade Stories below</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowExplainer(!showExplainer)}
              className="text-[10px] font-bold px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition flex items-center gap-1"
              title="Click to understand how this leaderboard helps your trading"
            >
              <span>💡 {showExplainer ? "Hide Guide" : "What is this?"}</span>
            </button>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block">
              Alpha Matrix
            </span>
          </div>
        </div>

        {/* Expandable Beginner-Friendly Explanation Banner */}
        {showExplainer && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/[0.08] via-emerald-500/[0.05] to-transparent border border-cyan-500/20 text-xs text-slate-300 space-y-1.5 animate-fadeIn">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>How this section makes you a profitable trader:</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Every trade you take has a strategy tag. This card groups them all so you can see your <strong className="text-emerald-400">Green Alpha Goldmines</strong> (setups to double down on) versus your <strong className="text-rose-400">Red Capital Drains</strong> (setups to delete from your playbook). Click any card to filter your Trade Stories below!
            </p>
          </div>
        )}

        {/* Dynamic Strategy Rows with Controlled Max-Height & Interactive Drilldown */}
        {dynamicStrategies.length > 0 ? (
          <div className="max-h-[440px] overflow-y-auto pr-1 space-y-2.5">
            {dynamicStrategies.map((strat, idx) => {
              const isGain = strat.pnl >= 0;
              const isSelected = selectedStrategyFilter === strat.name;
              const rankIcon = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;

              return (
                <div
                  key={strat.name}
                  onClick={() => setSelectedStrategyFilter(strat.name)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedStrategyFilter(strat.name)}
                  className={clsx(
                    "p-3.5 rounded-2xl border transition-all duration-200 group relative overflow-hidden space-y-2.5 cursor-pointer select-none",
                    strat.tierBorder,
                    isSelected
                      ? "ring-2 ring-cyan-400 bg-cyan-500/15 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                      : strat.statusTier === "top" 
                      ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.07] border-emerald-500/25 shadow-sm shadow-emerald-500/5"
                      : strat.statusTier === "drain"
                      ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.07] border-rose-500/25"
                      : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5"
                  )}
                >
                  {/* Top Row: Rank, Strategy Name & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-bold w-5 text-slate-400 flex-shrink-0">{rankIcon}</span>
                      <div className="min-w-0">
                        <span className="text-white font-bold text-xs truncate block group-hover:text-cyan-300 transition-colors">
                          {strat.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {strat.trades} {strat.trades === 1 ? "execution" : "executions"} · {strat.wins}W · {strat.losses}L
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isSelected && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                          🎯 Active Filter
                        </span>
                      )}
                      <span className={clsx("text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap", strat.statusClass)}>
                        {strat.statusBadge}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Visual Win Rate Bar & Key Financial Metrics with Rolling Tickers */}
                  <div className="space-y-1.5 pt-1 border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400 flex items-baseline gap-1">
                        Win Rate: <RollingTicker value={strat.winRate} suffix="%" decimalPlaces={0} className={clsx("font-bold", strat.winRate >= 50 ? "text-emerald-400" : "text-rose-400")} />
                      </span>
                      <span className="text-slate-400 flex items-baseline gap-1">
                        Expectancy: <RollingTicker value={strat.avgPayoff} prefix="₹" suffix="/trade" showSign={true} decimalPlaces={0} className={clsx("font-bold", strat.avgPayoff >= 0 ? "text-emerald-400" : "text-rose-400")} />
                      </span>
                      <span className="text-slate-400 flex items-baseline gap-1">
                        Net: <RollingTicker value={strat.pnl} prefix="₹" showSign={true} decimalPlaces={2} className={clsx("text-xs font-black", isGain ? "text-emerald-400" : "text-rose-400")} />
                      </span>
                    </div>

                    {/* Visual Dual Progress Track */}
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-400 h-full transition-all duration-500 rounded-l-full"
                        style={{ width: `${strat.winRate}%` }}
                        title={`${strat.winRate}% Win Rate`}
                      />
                      <div
                        className="bg-rose-500/80 h-full transition-all duration-500 rounded-r-full"
                        style={{ width: `${100 - strat.winRate}%` }}
                        title={`${100 - strat.winRate}% Loss Rate`}
                      />
                    </div>

                    {/* Secondary Quantitative Telemetry: Profit Factor, Max Drawdown & Sample N */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-0.5">
                      <span>PF: <strong className="text-slate-300 font-bold">{strat.profitFactor}</strong></span>
                      {strat.maxDrawdown > 0 && (
                        <span>Worst Loss: <strong className="text-rose-400 font-bold">-₹{strat.maxDrawdown.toLocaleString("en-IN")}</strong></span>
                      )}
                      <span>Sample: <strong className="text-cyan-300 font-bold">N={strat.trades}</strong></span>
                    </div>
                  </div>

                  {/* Footer Actionable Guidance Callout */}
                  <div className="text-[10px] text-slate-400/90 font-sans flex items-center justify-between bg-white/[0.02] p-1.5 rounded-lg border border-white/5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-cyan-400 font-bold">💡 Tip:</span>
                      <span className="truncate">{strat.recommendation}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 group-hover:text-cyan-300 transition-colors whitespace-nowrap ml-2">
                      {isSelected ? "Click to reset" : "Click to view trades →"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 text-center space-y-2">
            <span className="text-2xl block">🎯</span>
            <p className="text-xs text-slate-300 font-bold">No strategy executions found for this period.</p>
            <span className="text-[10px] text-slate-500 block">Log your practice trades or import sample data to see your setup rankings.</span>
          </div>
        )}
      </div>
    </div>
  );
}
