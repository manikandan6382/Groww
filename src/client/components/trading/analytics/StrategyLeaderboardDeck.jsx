import React, { useState } from "react";
import { Target, Sparkles } from "lucide-react";
import { StrategyEdgeCard } from "./StrategyEdgeCard";

export function StrategyLeaderboardDeck({
  dynamicStrategies,
  selectedStrategyFilter,
  onSelectStrategy,
}) {
  const [showExplainer, setShowExplainer] = useState(false);

  return (
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
            className="text-[10px] font-bold px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
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

      {/* Dynamic Strategy Rows with Controlled Max-Height */}
      {dynamicStrategies.length > 0 ? (
        <div className="max-h-[440px] overflow-y-auto pr-1 space-y-2.5">
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
        <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 text-center space-y-2">
          <span className="text-2xl block">🎯</span>
          <p className="text-xs text-slate-300 font-bold">No strategy executions found for this period.</p>
          <span className="text-[10px] text-slate-500 block">Log your practice trades or import sample data to see your setup rankings.</span>
        </div>
      )}
    </div>
  );
}
