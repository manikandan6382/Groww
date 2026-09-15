import React from 'react';
import { Activity } from 'lucide-react';
import clsx from 'clsx';
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

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 font-mono text-[11px] flex items-center gap-1.5 shadow-sm">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>{openAlertsCount} Active Positions</span>
          </span>
        </div>
      </div>

      <ScoreboardFinancialCards
        startingCapital={startingCapital}
        currentAccountValue={currentAccountValue}
        netPnl={netPnl}
        pnlPct={pnlPct}
      />

      <ScoreboardExecutionMatrix
        scorecardTimeframe={scorecardTimeframe}
        setScorecardTimeframe={setScorecardTimeframe}
        telemetry={telemetry}
      />
    </div>
  );
}
