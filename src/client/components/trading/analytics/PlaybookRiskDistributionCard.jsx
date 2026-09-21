import React from "react";
import clsx from "clsx";
import { 
  Activity, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Zap, 
  Flame, 
  Sparkles 
} from "lucide-react";
import { RollingTicker } from "../../common/RollingTicker";

export function PlaybookRiskDistributionCard({
  dynamicStrategies = [],
  selectedStrategyFilter,
  onSelectStrategy
}) {
  const selectedStrat = dynamicStrategies.find((s) => s.name === selectedStrategyFilter) || dynamicStrategies[0];

  // Aggregate time of day across all active strategies
  const aggregateTiming = {
    OPENING_DRIVE: { label: "Opening Drive", time: "09:15–10:30", trades: 0, wins: 0, pnl: 0 },
    MIDDAY_CHOP: { label: "Midday Bleed", time: "10:30–13:30", trades: 0, wins: 0, pnl: 0, isRisk: true },
    POWER_HOUR: { label: "Power Hour", time: "13:30–15:30", trades: 0, wins: 0, pnl: 0 }
  };

  dynamicStrategies.forEach((strat) => {
    if (strat.timeWindows) {
      Object.keys(aggregateTiming).forEach((key) => {
        if (strat.timeWindows[key]) {
          aggregateTiming[key].trades += strat.timeWindows[key].trades;
          aggregateTiming[key].wins += strat.timeWindows[key].wins;
          aggregateTiming[key].pnl += strat.timeWindows[key].pnl;
        }
      });
    }
  });

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 hover:border-white/[0.14] transition-all duration-300 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-sm shadow-cyan-500/10">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-white tracking-tight truncate">
              Playbook Risk &amp; Microstructure Attribution
            </h3>
            <span className="text-[10px] text-slate-400 block truncate">
              Cognitive leakage per setup &bull; Time-of-day execution edge
            </span>
          </div>
        </div>

        {selectedStrat && (
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex-shrink-0">
            {selectedStrat.name}
          </span>
        )}
      </div>

      {/* Section 1: Time-of-Day Microstructure Matrix */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span>Market Microstructure Windows (IST)</span>
        </span>

        <div className="grid grid-cols-3 gap-2">
          {Object.entries(aggregateTiming).map(([key, win]) => {
            const winRate = win.trades > 0 ? Math.round((win.wins / win.trades) * 100) : 0;
            const isProfit = win.pnl >= 0;
            return (
              <div 
                key={key} 
                className={clsx(
                  "p-2.5 rounded-2xl border text-center space-y-1 transition-all",
                  win.isRisk 
                    ? "bg-amber-500/[0.04] border-amber-500/20" 
                    : "bg-white/[0.02] border-white/[0.06]"
                )}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] font-bold text-white block truncate">{win.label}</span>
                  {win.isRisk && <AlertTriangle className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />}
                </div>
                <span className="text-[9px] text-slate-400 font-mono block">{win.time}</span>
                <div className={clsx("font-mono text-xs font-black", isProfit ? "text-emerald-400" : "text-rose-400")}>
                  {win.pnl >= 0 ? "+" : ""}₹{Math.round(win.pnl)}
                </div>
                <span className="text-[9px] text-slate-500 font-mono block">
                  {winRate}% ({win.trades}tr)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Setup Capital Leakage Breakdown */}
      <div className="space-y-2 pt-1 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-[10px]">
          <span className="uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
            <Flame className="w-3 h-3 text-rose-400" />
            <span>Preventable Leakage by Strategy</span>
          </span>
          <span className="text-slate-500 font-mono text-[9px]">Click to filter</span>
        </div>

        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
          {dynamicStrategies.map((strat) => {
            const isSelected = selectedStrategyFilter === strat.name;
            const hasLeak = (strat.leakedRupees || 0) > 0;
            return (
              <div
                key={strat.name}
                onClick={() => onSelectStrategy && onSelectStrategy(isSelected ? null : strat.name)}
                className={clsx(
                  "p-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all cursor-pointer",
                  isSelected
                    ? "bg-cyan-500/20 border-cyan-400/80 shadow-sm"
                    : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06]"
                )}
              >
                <div className="min-w-0">
                  <span className="font-bold text-white text-[11px] block truncate group-hover:text-cyan-300">
                    {strat.name}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {strat.trades} Trades · PF {strat.profitFactor}
                  </span>
                </div>

                <div className="text-right flex-shrink-0">
                  {hasLeak ? (
                    <span className="font-mono text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                      -₹{strat.leakedRupees} Leak
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Zero Leak</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Quarter-Kelly Capital Sizing Advisory Box */}
      {selectedStrat && (
        <div className="p-3 rounded-2xl bg-[#090d16]/90 border border-cyan-500/25 space-y-1.5 mt-1 shadow-md">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Quarter-Kelly Sizing: {selectedStrat.name}</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
              {selectedStrat.sizingAdvice}
            </span>
          </div>

          <p className="text-[10px] text-slate-300 leading-relaxed">
            {selectedStrat.recommendation}
          </p>

          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-white/[0.04]">
            <span>Invariant Shield: <strong className="text-rose-400">Max Loss ₹250-₹300</strong></span>
            <span>Target Gain: <strong className="text-emerald-400">₹400-₹600 (1:2 RR)</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlaybookRiskDistributionCard;
