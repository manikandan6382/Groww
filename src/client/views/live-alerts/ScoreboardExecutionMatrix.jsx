import React from 'react';
import { ArrowLeftRight, Trophy, ShieldAlert, Target, Zap, Scale } from 'lucide-react';
import clsx from 'clsx';

export function ScoreboardExecutionMatrix({
  scorecardTimeframe,
  telemetry = {}
}) {
  const isPrimePf = (telemetry.profitFactorNum ?? 0) >= 1.5;
  const isPositiveExpectancy = (telemetry.expectancy ?? 0) >= 0;

  return (
    <div className="space-y-3.5">
      {/* Session Context Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-white/5">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">
            {scorecardTimeframe === "today" ? "Intraday Quantitative Performance (Active IST Day)" : "Lifetime Statistical Practice Ledger"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span>{telemetry.openCount || 0} Running</span>
          <span>•</span>
          <span>{telemetry.totalClosed || 0} Settled</span>
          <span>•</span>
          <span className={clsx("font-bold", isPrimePf ? "text-emerald-400" : "text-cyan-400")}>
            PF: {telemetry.profitFactor ?? "0.00"}x
          </span>
        </div>
      </div>

      {/* 6-Column Institutional Quantitative Execution Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-3.5">
        {/* Metric 1: Total Setups Taken */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 backdrop-blur-xl shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {scorecardTimeframe === "today" ? "Today's Setups" : "Total Setups"}
              </span>
              <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                <ArrowLeftRight className="w-3 h-3 text-slate-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-lg sm:text-xl font-black font-mono text-white">
                {(telemetry.openCount || 0) + (telemetry.totalClosed || 0)}
              </strong>
              <span className="text-[10px] text-slate-500 font-mono">Executions</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between font-mono">
            <span>{telemetry.openCount || 0} Open</span>
            <span>{telemetry.totalClosed || 0} Resolved</span>
          </div>
        </div>

        {/* Metric 2: Target Win Rate */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-cyan-500/[0.03] hover:bg-cyan-500/[0.06] border border-cyan-500/20 backdrop-blur-xl shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">Win Rate</span>
              <div className="w-5 h-5 rounded-md bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                <Target className="w-3 h-3 text-cyan-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-lg sm:text-xl font-black font-mono text-cyan-300">{telemetry.winRate ?? "0.0"}%</strong>
              <span className="text-[10px] text-cyan-400/70 font-mono">Edge</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(Math.max(telemetry.winRateNum || 0, telemetry.totalClosed > 0 ? 5 : 0), 100)}%` }}
              />
            </div>
          </div>
          <div className="text-[10px] text-cyan-300/80 mt-2 pt-1.5 border-t border-cyan-500/15 font-mono">
            {telemetry.winCount || 0} Wins • {telemetry.lossCount || 0} Losses
          </div>
        </div>

        {/* Metric 3: Disciplined Stops Cut */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-500/[0.03] hover:bg-rose-500/[0.06] border border-rose-500/20 backdrop-blur-xl shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Disciplined Cuts</span>
              <div className="w-5 h-5 rounded-md bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-300">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-lg sm:text-xl font-black font-mono text-rose-400">{telemetry.lossCount || 0}</strong>
              <span className="text-[10px] text-rose-400/70 font-mono">Stops Hit</span>
            </div>
          </div>
          <div className="text-[10px] text-rose-400/80 mt-2 pt-1.5 border-t border-rose-500/15 font-mono truncate">
            Cut ≤ ₹300 Cap • 100% Rules
          </div>
        </div>

        {/* Metric 4: Profit Factor (Quant Quality) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] border border-emerald-500/20 backdrop-blur-xl shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Profit Factor</span>
              <div className="w-5 h-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                <Trophy className="w-3 h-3 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-lg sm:text-xl font-black font-mono text-emerald-400">
                {telemetry.profitFactor ?? "0.00"}x
              </strong>
              <span className={clsx(
                "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded",
                isPrimePf ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-400"
              )}>
                {isPrimePf ? "PRIME" : "MODERATE"}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-2 pt-1.5 border-t border-emerald-500/15 font-mono truncate">
            Benchmark: ≥ 1.50x Edge
          </div>
        </div>

        {/* Metric 5: Mathematical Expectancy (E) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-500/[0.03] hover:bg-purple-500/[0.06] border border-purple-500/20 backdrop-blur-xl shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Quant Expectancy</span>
              <div className="w-5 h-5 rounded-md bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Zap className="w-3 h-3 text-purple-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <strong className={clsx("text-lg sm:text-xl font-black font-mono", isPositiveExpectancy ? "text-purple-300" : "text-rose-400")}>
                {telemetry.expectancyStr ?? "₹0.0"}
              </strong>
              <span className="text-[10px] text-purple-400/70 font-mono">/ trade</span>
            </div>
          </div>
          <div className="text-[10px] text-purple-300/80 mt-2 pt-1.5 border-t border-purple-500/15 font-mono truncate">
            {isPositiveExpectancy ? "Positive Mathematical Edge" : "Sub-Zero Edge Window"}
          </div>
        </div>

        {/* Metric 6: Statutory Friction Drag */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/[0.03] hover:bg-amber-500/[0.06] border border-amber-500/20 backdrop-blur-xl shadow-sm transition-all duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Friction Drag</span>
              <div className="w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                <Scale className="w-3 h-3 text-amber-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-lg sm:text-xl font-black font-mono text-amber-300">
                -₹{telemetry.statutoryFrictionTotal ? telemetry.statutoryFrictionTotal.toFixed(0) : "0"}
              </strong>
              <span className="text-[10px] text-amber-400/70 font-mono">Fees</span>
            </div>
          </div>
          <div className="text-[10px] text-amber-300/80 mt-2 pt-1.5 border-t border-amber-500/15 font-mono truncate">
            {telemetry.frictionDragPct ?? "0.0"}% Drag on Gross Wins
          </div>
        </div>
      </div>
    </div>
  );
}
