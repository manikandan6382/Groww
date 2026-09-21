import React, { useMemo } from "react";
import clsx from "clsx";
import { Award, ShieldCheck, Scale, Flame, CheckCircle2, AlertCircle, Compass, Zap } from "lucide-react";
import { calculatePropFirmScorecard } from "./crucibleCalculations";

export function PropFirmScorecardCard({ trades = [] }) {
  const {
    compositeScore,
    tier,
    tierColor,
    tierBadge,
    payoffRatio,
    pillars,
    prescription,
    disciplinedTradesCount,
    totalTradesCount
  } = useMemo(() => calculatePropFirmScorecard(trades), [trades]);

  const pillarIcons = {
    ria: ShieldCheck,
    qd: Scale,
    prq: Compass,
    ee: Flame
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 hover:border-white/[0.14] transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25 whitespace-nowrap shadow-sm shadow-emerald-500/10 flex items-center gap-1.5">
              <Award className="w-3 h-3 text-emerald-400" />
              PROP-FIRM CONSISTENCY INDEX
            </span>
            <span className="text-xs font-extrabold text-white">Institutional Scorecard</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Algorithmic audit evaluating adherence to your ₹250 stop loss cap, 3-trade daily budget, and 1:2.00 target payoff.
          </p>
        </div>

        {/* Tier Badge */}
        <div className={clsx("px-3 py-1 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 shadow-sm whitespace-nowrap", tierColor)}>
          <Zap className="w-3 h-3 fill-current" />
          <span>{tierBadge}</span>
        </div>
      </div>

      {/* Main Score Hero & Pillar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left Column: Big Radial Score Gauge */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center space-y-1">
          <div className="relative flex items-center justify-center w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <path
                className="text-white/10"
                strokeWidth="3.2"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* Progress circle */}
              <path
                className={clsx(
                  "transition-all duration-1000 ease-out",
                  compositeScore >= 90
                    ? "text-purple-400"
                    : compositeScore >= 75
                    ? "text-emerald-400"
                    : compositeScore >= 50
                    ? "text-amber-400"
                    : "text-rose-400"
                )}
                strokeDasharray={`${compositeScore}, 100`}
                strokeWidth="3.2"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className="text-2xl font-black text-white">{compositeScore}</span>
              <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">/ 100 PTS</span>
            </div>
          </div>
          <span className="text-xs font-bold text-white tracking-wide pt-1">{tier}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {disciplinedTradesCount}/{totalTradesCount} clean trades
          </span>
        </div>

        {/* Right Column: The 4 Pillars */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Object.entries(pillars).map(([key, p]) => {
            const Icon = pillarIcons[key] || CheckCircle2;
            const pct = Math.round((p.score / p.max) * 100);
            return (
              <div key={key} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1.5 hover:border-white/10 transition">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-300 text-[11px]">
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{p.label}</span>
                  </span>
                  <span className="font-mono text-[11px] font-extrabold text-white">
                    {p.score}/{p.max}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all duration-500",
                      pct >= 85 ? "bg-emerald-400" : pct >= 65 ? "bg-cyan-400" : pct >= 40 ? "bg-amber-400" : "bg-rose-400"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="text-[10px] text-slate-400 font-mono truncate" title={p.detail}>
                  {p.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Algorithmic Coaching Prescription Callout */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500/[0.08] via-cyan-500/[0.04] to-transparent border border-purple-500/20 flex items-start gap-2.5">
        <Compass className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-xs">
          <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider block">
            Algorithmic Head-Trader Prescription
          </span>
          <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
            {prescription}
          </p>
        </div>
      </div>
    </div>
  );
}
