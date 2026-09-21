import React from 'react';
import { Activity, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { soundEngine } from '../../utils/soundEngine';
import { ScoreboardFinancialCards } from './ScoreboardFinancialCards';
import { ScoreboardExecutionMatrix } from './ScoreboardExecutionMatrix';

export function LiveScoreboardSection({
  telemetry,
  scorecardTimeframe,
  setScorecardTimeframe,
  openAlertsCount
}) {
  const { startingCapital, currentAccountValue, netPnl, pnlPct } = telemetry;

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-app-card/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6 relative overflow-hidden">
      {/* Soft Ambient Studio Lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none" />
      <div className={clsx(
        "absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mb-20",
        netPnl >= 0 ? "bg-emerald-500/[0.04]" : "bg-rose-500/[0.04]"
      )} />

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 shadow-sm whitespace-nowrap">
              VIRTUAL CAPITAL &amp; PERFORMANCE TELEMETRY
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Live Capital &amp; Quantitative Execution Matrix
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time mark-to-market valuations, capital buffer tracking, and quantitative execution ratios.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 font-mono text-[11px] flex items-center gap-1.5 shadow-sm">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>{openAlertsCount || 0} Active Positions</span>
          </span>

          <div className="p-1 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone?.();
                setScorecardTimeframe("today");
              }}
              className={clsx(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer font-mono",
                scorecardTimeframe === "today"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              title="Filter to today's active session trades only"
            >
              <Calendar className="w-3 h-3 text-cyan-400" />
              <span>Today IST</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone?.();
                setScorecardTimeframe("all");
              }}
              className={clsx(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer font-mono",
                scorecardTimeframe === "all"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/35 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
              title="Show all-time historical practice trades"
            >
              <span>All-Time</span>
            </button>
          </div>
        </div>
      </div>

      <ScoreboardFinancialCards
        startingCapital={startingCapital}
        currentAccountValue={currentAccountValue}
        netPnl={netPnl}
        pnlPct={pnlPct}
        telemetry={telemetry}
      />

      <ScoreboardExecutionMatrix
        scorecardTimeframe={scorecardTimeframe}
        setScorecardTimeframe={setScorecardTimeframe}
        telemetry={telemetry}
      />
    </div>
  );
}
