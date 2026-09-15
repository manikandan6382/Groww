import React from "react";
import { RollingTicker } from "../../common/RollingTicker";

export function TargetDisciplineCard({
  filteredTradesLength,
  winAngle,
  winRate,
  winTradesLength,
  lossTradesLength,
  wilsonFloor,
  ruleDisciplinePct,
  displayStreak,
  maxLoss
}) {
  return (
    <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <div>
            <h2 className="text-sm font-bold text-white">Target Success &amp; Discipline</h2>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>Sample:</span>
              <RollingTicker value={filteredTradesLength} suffix=" Trades" decimalPlaces={0} className="text-cyan-400 font-mono font-bold" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            100% Plan Adherence
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Apple Fitness Ring SVG */}
        <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1e293b" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="transparent"
              stroke="#00f5c4"
              strokeWidth="10"
              strokeDasharray={`${winAngle} 238.76`}
              strokeDashoffset="0"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="text-base font-black font-mono text-white">
              <RollingTicker value={Number(winRate)} suffix="%" decimalPlaces={1} className="text-white" />
            </div>
            <span className="text-[9px] text-slate-400 font-bold uppercase">Win Rate</span>
          </div>
        </div>

        {/* Ring Legend & Stats */}
        <div className="flex-1 space-y-2 text-xs">
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300">Targets Hit</span>
            </div>
            <div className="text-emerald-400 font-mono font-bold">
              <RollingTicker value={winTradesLength} suffix=" Won" decimalPlaces={0} className="text-emerald-400" />
            </div>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
              <span className="text-slate-300">Disciplined Stops</span>
            </div>
            <div className="text-rose-400 font-mono font-bold">
              <RollingTicker value={lossTradesLength} suffix=" Cut" decimalPlaces={0} className="text-rose-400" />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-0.5 flex items-center justify-between">
            <span>95% Wilson Confidence Floor:</span>
            <strong className="text-cyan-400 font-mono">
              <RollingTicker value={Number(wilsonFloor)} suffix="%" decimalPlaces={1} className="text-cyan-400" />
            </strong>
          </div>
        </div>
      </div>

      {/* 4-Chip Discipline Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-[10px] text-slate-400 block">Rule Discipline</span>
          <div className="font-mono text-emerald-400 font-bold">
            <RollingTicker value={ruleDisciplinePct} suffix="%" decimalPlaces={0} className="text-emerald-400 font-bold" />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-[10px] text-slate-400 block">Streak</span>
          <div className="font-mono text-amber-400 font-bold">
            <RollingTicker value={displayStreak} suffix=" Wins" decimalPlaces={0} className="text-amber-400 font-bold" />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-[10px] text-slate-400 block">Account Safety</span>
          <div className="font-mono text-rose-400 font-bold">
            <RollingTicker value={maxLoss} prefix="₹" showSign={true} decimalPlaces={2} className="text-rose-400 font-bold" />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-[10px] text-slate-400 block">Top Setup</span>
          <strong className="text-cyan-400 font-bold text-[11px] truncate block">0DTE Momentum</strong>
        </div>
      </div>
    </div>
  );
}
