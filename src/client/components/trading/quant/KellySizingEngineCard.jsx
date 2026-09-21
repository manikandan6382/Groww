import React from "react";
import clsx from "clsx";
import { Scale, TrendingUp, ShieldAlert, Award, ArrowUpRight } from "lucide-react";

export function KellySizingEngineCard({ kellyData }) {
  const {
    winRate = 60,
    payoffRatio = 2.0,
    expectancyRupees = 210,
    quarterKellyPercent = 6.5,
    breakevenWinRate = 33.3,
    recommendedLots = 1,
    scalingVerdict = "Maintain 1 Lot (65 Qty) Baseline",
    totalTrades = 0
  } = kellyData || {};

  const isEdgePositive = expectancyRupees > 0;
  const isScaled = recommendedLots > 1;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 relative overflow-hidden transition-all duration-300 hover:border-white/[0.14]">
      {/* Ambient Radial Spotlight */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/[0.05] rounded-full blur-[80px] pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shadow-sm shadow-purple-500/10">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              <span>Quarter-Kelly Sizing &amp; Expectancy</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold">
                Quarter-Kelly (¼K)
              </span>
            </h3>
            <p className="text-xs text-slate-400 leading-none pt-0.5">
              Empirically calculated position sizing to maximize logarithmic growth while preventing ruin.
            </p>
          </div>
        </div>

        {/* Lot Size Recommendation Badge */}
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className={clsx(
            "flex items-center gap-1.5 px-3 py-1 rounded-full border font-bold",
            isScaled
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-purple-500/15 border-purple-500/30 text-purple-300"
          )}>
            <Award className="w-3.5 h-3.5" />
            <span>Target Sizing: {recommendedLots} Lot ({recommendedLots * 65} Qty)</span>
          </span>
        </div>
      </div>

      {/* Hero Stat: Per-Trade Mathematical Expectancy */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Mathematical Expectancy per Trade (E)
          </div>
          <div className="flex items-baseline gap-2">
            <span className={clsx("text-2xl font-black font-mono tracking-tight", isEdgePositive ? "text-emerald-400" : "text-rose-400")}>
              {isEdgePositive ? `+₹${expectancyRupees}` : `-₹${Math.abs(expectancyRupees)}`}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / trade after statutory charges
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-md">
            Over a 100-trade sequence, your statistical edge projects a net capital yield of{" "}
            <strong className={isEdgePositive ? "text-emerald-300" : "text-rose-300"}>
              {isEdgePositive ? `+₹${expectancyRupees * 100}` : `-₹${Math.abs(expectancyRupees * 100)}`}
            </strong>.
          </p>
        </div>

        {/* Quarter-Kelly Sizing Dial Box */}
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center min-w-[130px] font-mono">
          <div className="text-[9px] text-purple-300 font-bold uppercase tracking-wider">Quarter-Kelly Buffer</div>
          <div className="text-xl font-black text-purple-200 pt-0.5">{quarterKellyPercent}%</div>
          <div className="text-[8px] text-slate-400">Optimal risk allocation</div>
        </div>
      </div>

      {/* Win Rate vs Breakeven Visual Progress */}
      <div className="space-y-1.5 font-mono">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <span>Empirical Win Rate:</span>
            <strong className="text-white">{winRate}%</strong>
          </span>
          <span className="text-slate-400 flex items-center gap-1.5">
            <span>Breakeven Threshold:</span>
            <strong className="text-cyan-300">{breakevenWinRate}%</strong>
          </span>
        </div>

        {/* Dual Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] relative overflow-hidden">
          {/* Breakeven Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10"
            style={{ left: `${Math.min(100, Math.max(0, breakevenWinRate))}%` }}
            title={`Breakeven at ${breakevenWinRate}%`}
          />
          {/* Actual Win Rate Fill */}
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-500",
              winRate >= breakevenWinRate
                ? "bg-gradient-to-r from-cyan-500 via-emerald-400 to-emerald-300"
                : "bg-gradient-to-r from-rose-500 to-amber-400"
            )}
            style={{ width: `${Math.min(100, Math.max(0, winRate))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] text-slate-500">
          <span>0%</span>
          <span className="text-cyan-400 font-bold">↑ Breakeven @ {payoffRatio}:1 RR</span>
          <span>100%</span>
        </div>
      </div>

      {/* Verdict Strip */}
      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span className="text-white font-bold">{scalingVerdict}</span>
        </div>
        <span className="text-[10px] text-slate-400">
          Sample: <strong className="text-white">{totalTrades}</strong> trades
        </span>
      </div>
    </div>
  );
}

export default KellySizingEngineCard;
