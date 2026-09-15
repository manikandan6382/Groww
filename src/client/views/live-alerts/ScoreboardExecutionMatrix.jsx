import React from 'react';
import { Calendar, ArrowLeftRight, Trophy, ShieldAlert, Target } from 'lucide-react';
import clsx from 'clsx';
import { soundEngine } from '../../utils/soundEngine';

export function ScoreboardExecutionMatrix({
  scorecardTimeframe,
  setScorecardTimeframe,
  telemetry
}) {
  return (
    <>
      {/* Session Switcher Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>{scorecardTimeframe === "today" ? "Today's Trading Scoreboard" : "All-Time Practice Ledger"}</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {scorecardTimeframe === "today" ? "• Real-Time Active IST Day" : "• Lifetime Historical Edge"}
          </span>
        </div>

        <div className="p-1 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone?.();
              setScorecardTimeframe("today");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[32px]",
              scorecardTimeframe === "today" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm" : "text-slate-400 hover:text-white"
            )}
            title="Filter to today's active session trades only"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Today's Session</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone?.();
              setScorecardTimeframe("all");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[32px]",
              scorecardTimeframe === "all" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm" : "text-slate-400 hover:text-white"
            )}
            title="Show all-time historical practice trades"
          >
            <span>All-Time</span>
          </button>
        </div>
      </div>

      {/* 4-Column Quantitative Execution Matrix */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Total Trades */}
        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 backdrop-blur-xl shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {scorecardTimeframe === "today" ? "Today's Trades" : "Total Trades"}
            </span>
            <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <strong className="text-xl sm:text-2xl font-black font-mono text-white">
              {telemetry.openCount + telemetry.totalClosed}
            </strong>
            <span className="text-[10px] text-slate-500 font-sans">Setups</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between font-mono">
            <span>{telemetry.openCount} Open</span>
            <span>{telemetry.totalClosed} Resolved</span>
          </div>
        </div>

        {/* Metric 2: Winning Trades */}
        <div className="p-4 rounded-2xl bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] border border-emerald-500/20 backdrop-blur-xl shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Winning Trades</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <strong className="text-xl sm:text-2xl font-black font-mono text-emerald-400">{telemetry.winCount}</strong>
            <span className="text-[10px] text-emerald-400/70 font-sans">Targets Hit</span>
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1 font-mono">
            {scorecardTimeframe === "today" ? "Profitable Trades Today" : "Alpha Captured Successfully"}
          </div>
        </div>

        {/* Metric 3: Disciplined Stops */}
        <div className="p-4 rounded-2xl bg-rose-500/[0.03] hover:bg-rose-500/[0.06] border border-rose-500/20 backdrop-blur-xl shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Disciplined Stops</span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-300">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <strong className="text-xl sm:text-2xl font-black font-mono text-rose-400">{telemetry.lossCount}</strong>
            <span className="text-[10px] text-rose-400/70 font-sans">Stops Cut</span>
          </div>
          <div className="text-[10px] text-rose-400/80 mt-1 font-mono">
            {scorecardTimeframe === "today" ? "Cut Cleanly by Rules Today" : "Capital Preserved by Rules"}
          </div>
        </div>

        {/* Metric 4: Target Win Rate */}
        <div className="p-4 rounded-2xl bg-cyan-500/[0.03] hover:bg-cyan-500/[0.06] border border-cyan-500/20 backdrop-blur-xl shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">Target Win Rate</span>
            <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <strong className="text-xl sm:text-2xl font-black font-mono text-cyan-300">{telemetry.winRate}%</strong>
            <span className="text-[10px] text-cyan-400/70 font-sans">{telemetry.totalClosed > 0 ? "Edge" : "No Trades"}</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Math.max(telemetry.winRateNum, telemetry.totalClosed > 0 ? 5 : 0), 100)}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
