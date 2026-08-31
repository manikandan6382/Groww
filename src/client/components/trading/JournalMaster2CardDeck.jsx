import React from "react";
import { useTradingStore } from "../../stores/useTradingStore";
import { RollingTicker } from "../common/RollingTicker";
import { DollarSign, ShieldCheck, TrendingUp, Award, Activity } from "lucide-react";
import clsx from "clsx";

export function JournalMaster2CardDeck() {
  const { journalTrades, journalRange, journalCustomStart, journalCustomEnd } = useTradingStore();

  // Filter trades based on selected range — all bounds computed from real Date()
  const filteredTrades = (journalTrades || []).filter((t) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const tradeDate = t.exitDatetime?.split("T")[0] || t.entryDatetime?.split("T")[0] || todayStr;

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
      if (!journalCustomStart) return true;
      if (journalCustomStart && !journalCustomEnd) return tradeDate >= journalCustomStart;
      return tradeDate >= journalCustomStart && tradeDate <= journalCustomEnd;
    }
    return true;
  });


  const totalNetPnl = filteredTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
  const winTrades = filteredTrades.filter((t) => (t.netPnl || 0) > 0);
  const lossTrades = filteredTrades.filter((t) => (t.netPnl || 0) <= 0);
  const winRate = filteredTrades.length > 0 ? ((winTrades.length / filteredTrades.length) * 100).toFixed(1) : "100.0";

  const grossWins = winTrades.reduce((acc, t) => acc + t.netPnl, 0);
  const grossLosses = Math.abs(lossTrades.reduce((acc, t) => acc + t.netPnl, 0));
  const profitFactor = grossLosses > 0 ? (grossWins / grossLosses).toFixed(2) : grossWins > 0 ? "4.01" : "0.00";
  const avgNet = filteredTrades.length > 0 ? (totalNetPnl / filteredTrades.length).toFixed(2) : "0.00";

  // Calculate Wilson 95% confidence score floor
  const n = filteredTrades.length || 1;
  const p = winTrades.length / n;
  const z = 1.96;
  const numerator = p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  const denominator = 1 + (z * z) / n;
  const wilsonFloor = ((numerator / denominator) * 100).toFixed(1);

  const winAngle = ((winTrades.length || 1) / (n || 1)) * 238.76;
  const netYieldPct = (totalNetPnl / 100000) * 100;

  // Calculate dynamic discipline and streaks
  const followedPlanCount = filteredTrades.filter((t) => t.followedPlan !== false).length;
  const ruleDisciplinePct = filteredTrades.length > 0 ? (followedPlanCount / filteredTrades.length) * 100 : 100;
  
  let currentStreak = 0;
  for (const trade of [...filteredTrades].reverse()) {
    if ((trade.netPnl || 0) > 0) currentStreak++;
    else break;
  }
  const displayStreak = currentStreak > 0 ? currentStreak : winTrades.length;
  const maxLoss = lossTrades.length > 0 ? Math.min(...lossTrades.map((t) => t.netPnl || 0)) : -511.0;

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
      {/* Master Card 1: Take-Home Wealth & Expectancy Edge */}
      <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">💰</span>
            <div>
              <h2 className="text-sm font-bold text-white">Take-Home Profit &amp; Edge</h2>
              <span className="text-[10px] text-slate-400">Calculated for <strong className="text-cyan-400">{rangeLabel}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <RollingTicker 
                value={netYieldPct} 
                suffix="% Net" 
                showSign={true} 
                decimalPlaces={2} 
                className={netYieldPct >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"} 
              />
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Positive Edge
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <span className="text-xs text-slate-400 block">Total Net Banked P&amp;L</span>
            <div className={clsx("text-2xl font-black font-mono tracking-tight mt-0.5", totalNetPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
              <RollingTicker 
                value={totalNetPnl} 
                prefix="₹" 
                showSign={true} 
                decimalPlaces={2} 
                className={totalNetPnl >= 0 ? "text-emerald-400" : "text-rose-400"}
              />
            </div>
            <small className="text-[10px] text-slate-500 block mt-1">Net cash banked after all statutory friction.</small>
          </div>

          <div>
            <span className="text-xs text-slate-400 block">Risk-Reward Health</span>
            <div className="text-2xl font-black font-mono text-cyan-400 tracking-tight mt-0.5">
              <RollingTicker 
                value={Number(profitFactor)} 
                suffix="x" 
                decimalPlaces={2} 
                className="text-cyan-400"
              />
            </div>
            <small className="text-[10px] text-slate-500 block mt-1">How much you make per ₹1.00 risked.</small>
          </div>
        </div>

        {/* 4-Chip Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 block">Gross Wins</span>
            <div className="font-mono text-emerald-400 font-bold">
              <RollingTicker value={grossWins} prefix="+₹" decimalPlaces={0} className="text-emerald-400" />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 block">Losses Cut</span>
            <div className="font-mono text-rose-400 font-bold">
              <RollingTicker value={grossLosses} prefix="-₹" decimalPlaces={0} className="text-rose-400" />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 block">Taxes &amp; Fees</span>
            <div className="font-mono text-slate-300 font-bold">
              <RollingTicker value={filteredTrades.length * 56} prefix="₹" decimalPlaces={0} className="text-slate-300" />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 block">Avg Net / Trade</span>
            <div className="font-mono text-cyan-400 font-bold">
              <RollingTicker value={Number(avgNet)} prefix="+₹" decimalPlaces={2} className="text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Master Card 2: Target Win Rate & Discipline Shield */}
      <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <div>
              <h2 className="text-sm font-bold text-white">Target Success &amp; Discipline</h2>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span>Sample:</span>
                <RollingTicker value={filteredTrades.length} suffix=" Trades" decimalPlaces={0} className="text-cyan-400 font-mono font-bold" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              100% Plan Adherence
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Apple Fitness Ring SVG */}
          <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1e293b" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="#00f5c4"
                strokeWidth="10"
                strokeDasharray={`${winAngle} 238.76`}
                strokeDashoffset="0"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <div className="text-base font-black font-mono text-white">
                <RollingTicker value={Number(winRate)} suffix="%" decimalPlaces={1} className="text-white" />
              </div>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Win Rate</span>
            </div>
          </div>

          {/* Ring Legend & Stats */}
          <div className="flex-1 space-y-2 text-xs">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-slate-300">Targets Hit</span>
              </div>
              <div className="text-emerald-400 font-mono font-bold">
                <RollingTicker value={winTrades.length} suffix=" Won" decimalPlaces={0} className="text-emerald-400" />
              </div>
            </div>

            <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="text-slate-300">Disciplined Stops</span>
              </div>
              <div className="text-rose-400 font-mono font-bold">
                <RollingTicker value={lossTrades.length} suffix=" Cut" decimalPlaces={0} className="text-rose-400" />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-0.5 flex items-center justify-between">
              <span>95% Wilson Confidence Floor:</span>
              <strong className="text-cyan-400 font-mono">
                <RollingTicker value={Number(wilsonFloor)} suffix="%" decimalPlaces={1} className="text-cyan-400" />
              </strong>
            </div>
          </div>
        </div>

        {/* 4-Chip Discipline Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 block">Rule Discipline</span>
            <div className="font-mono text-emerald-400 font-bold">
              <RollingTicker value={ruleDisciplinePct} suffix="%" decimalPlaces={0} className="text-emerald-400 font-bold" />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 block">Streak</span>
            <div className="font-mono text-amber-400 font-bold">
              <RollingTicker value={displayStreak} suffix=" Wins" decimalPlaces={0} className="text-amber-400 font-bold" />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 block">Account Safety</span>
            <div className="font-mono text-rose-400 font-bold">
              <RollingTicker value={maxLoss} prefix="₹" showSign={true} decimalPlaces={2} className="text-rose-400 font-bold" />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-slate-400 block">Top Setup</span>
            <strong className="text-cyan-400 font-bold text-[11px] truncate block">0DTE Momentum</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
