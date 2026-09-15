import React from "react";
import clsx from "clsx";
import { RollingTicker } from "../../common/RollingTicker";

export function StrategyEdgeCard({
  strat,
  idx,
  isSelected,
  onSelect,
}) {
  const isGain = strat.pnl >= 0;
  const rankIcon = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
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

      {/* Middle Row: Visual Win Rate Bar & Key Financial Metrics */}
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

        {/* Secondary Quantitative Telemetry */}
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
}
