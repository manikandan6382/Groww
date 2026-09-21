import React, { useState } from "react";
import { Target, Sparkles, FilterX } from "lucide-react";
import { StrategyEdgeCard } from "./StrategyEdgeCard";

export function StrategyLeaderboardDeck({
  dynamicStrategies = [],
  selectedStrategyFilter,
  onSelectStrategy,
}) {
  const [showExplainer, setShowExplainer] = useState(false);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-3.5 hover:border-white/[0.14] transition-all duration-300">
      {/* Header & Quick Helper Trigger */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-sm shadow-emerald-500/10">
            <Target className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-white tracking-tight truncate">Strategy &amp; Setup Edge Comparison</h3>
            <span className="text-[10px] text-slate-400 block truncate">
              Quantitative playbook edge &bull; Click to isolate trades
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {selectedStrategyFilter && (
            <button
              type="button"
              onClick={() => onSelectStrategy(null)}
              className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 hover:bg-cyan-500/30 transition-colors cursor-pointer"
              title="Click to clear active strategy filter"
            >
              <FilterX className="w-2.5 h-2.5" />
              <span>{selectedStrategyFilter}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowExplainer(!showExplainer)}
            className="text-[10px] font-bold px-2 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            title="Click to understand how this leaderboard works"
          >
            <span>💡 {showExplainer ? "Hide Guide" : "Guide"}</span>
          </button>
          
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block">
            {dynamicStrategies.length} {dynamicStrategies.length === 1 ? "Setup" : "Setups"}
          </span>
        </div>
      </div>

      {/* Expandable Beginner-Friendly Explanation Banner */}
      {showExplainer && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/[0.08] via-emerald-500/[0.05] to-transparent border border-cyan-500/20 text-xs text-slate-300 space-y-1.5 animate-fadeIn">
          <div className="font-bold text-cyan-300 flex items-center gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Quantitative Edge Guidance:</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Every trade is attributed to a strategy setup. This matrix highlights your <strong className="text-emerald-400">Alpha Goldmines</strong> (high win-rate + preserved stops) vs your <strong className="text-rose-400">Capital Drains</strong> and <strong className="text-amber-300">Stop-Slippage Risks</strong> (&gt;₹300 losses). Click any card to filter your Trade Stories below!
          </p>
        </div>
      )}

      {/* Dynamic Strategy Rows with Controlled Max-Height */}
      {dynamicStrategies.length > 0 ? (
        <div className="max-h-[440px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
          {dynamicStrategies.map((strat, idx) => (
            <StrategyEdgeCard
              key={strat.name}
              strat={strat}
              idx={idx}
              isSelected={selectedStrategyFilter === strat.name}
              onSelect={() => onSelectStrategy(selectedStrategyFilter === strat.name ? null : strat.name)}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-white/[0.015] border border-white/[0.06] text-center space-y-2.5">
          <span className="text-3xl block">🎯</span>
          <p className="text-xs text-slate-200 font-bold">No strategy executions found for this timeframe.</p>
          <span className="text-[11px] text-slate-400 block max-w-sm mx-auto leading-relaxed">
            Log your practice trades or adjust the date range above to see your setup rankings.
          </span>
        </div>
      )}
    </div>
  );
}

export default StrategyLeaderboardDeck;

