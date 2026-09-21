import React from "react";
import clsx from "clsx";
import { RollingTicker } from "../../common/RollingTicker";
import { Target, ShieldCheck, ShieldAlert, Zap, Flame, Snowflake } from "lucide-react";

export function TargetDisciplineCard({
  filteredTradesLength = 0,
  winAngle = 0,
  disciplineAngle = 0,
  winRate = "0.0",
  winTradesLength = 0,
  lossTradesLength = 0,
  wilsonFloor = "0.0",
  ruleDisciplinePct = 100,
  streakType = "none",
  streakCount = 0,
  maxLoss = 0,
  maxLossBreached = false,
  breachedLossCount = 0,
  riskInvariantViolated = false,
  topSetup = "General Scalp",
  topSetupPnl
}) {
  return (
    <div className="relative p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 overflow-hidden transition-all duration-300 hover:border-white/[0.14] group">
      {/* Subtle Ambient Radial Lighting Glow */}
      <div className={clsx(
        "absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-opacity duration-500",
        riskInvariantViolated ? "bg-rose-500/[0.08]" : "bg-cyan-500/[0.05]"
      )} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-500/10">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
              <span>Target Success &amp; Discipline</span>
            </h2>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>Sample:</span>
              <RollingTicker value={filteredTradesLength} suffix=" Trades" decimalPlaces={0} className="text-cyan-400 font-mono font-bold" />
              <span>•</span>
              <span className="text-slate-400">Dual Edge Rings</span>
            </div>
          </div>
        </div>

        {/* Dynamic Plan Adherence Badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={clsx(
            "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm transition-colors",
            ruleDisciplinePct >= 80
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
              : ruleDisciplinePct >= 60
              ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
              : "bg-rose-500/10 text-rose-400 border-rose-500/25"
          )}>
            {ruleDisciplinePct}% Plan Adherence
          </span>
        </div>
      </div>

      {/* Apple Dual Concentric Activity Rings & Quantitative Telemetry */}
      <div className="flex items-center gap-5 sm:gap-6 pt-1">
        {/* Dual Concentric SVG Activity Rings */}
        <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_12px_rgba(0,245,196,0.15)]" viewBox="0 0 100 100">
            <defs>
              {/* Outer Ring Gradient: Cyan to Emerald */}
              <linearGradient id="winRateRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f5c4" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              {/* Inner Ring Gradient: Purple to Indigo */}
              <linearGradient id="disciplineRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>

            {/* Outer Ring Background (Radius 38) */}
            <circle cx="50" cy="50" r="38" fill="transparent" stroke="#1e293b" strokeWidth="7" opacity="0.4" />
            {/* Outer Ring Progress (Win Rate) */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="transparent"
              stroke="url(#winRateRingGradient)"
              strokeWidth="7"
              strokeDasharray={`${winAngle} 238.76`}
              strokeDashoffset="0"
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />

            {/* Inner Ring Background (Radius 27) */}
            <circle cx="50" cy="50" r="27" fill="transparent" stroke="#1e293b" strokeWidth="6" opacity="0.35" />
            {/* Inner Ring Progress (Rule Discipline) */}
            <circle
              cx="50"
              cy="50"
              r="27"
              fill="transparent"
              stroke="url(#disciplineRingGradient)"
              strokeWidth="6"
              strokeDasharray={`${disciplineAngle} 169.65`}
              strokeDashoffset="0"
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Core Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="text-base sm:text-lg font-black font-mono text-white tracking-tight">
              <RollingTicker value={Number(winRate)} suffix="%" decimalPlaces={1} className="text-white" />
            </div>
            <span className="text-[8px] sm:text-[9px] text-cyan-400 font-bold uppercase tracking-wider">Win Rate</span>
          </div>
        </div>

        {/* Quantitative Legend & Capital Invariant Telemetry */}
        <div className="flex-1 space-y-2 text-xs min-w-0">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
              <span className="text-slate-300 font-medium">Targets Hit</span>
            </div>
            <div className="text-emerald-400 font-mono font-bold">
              <RollingTicker value={winTradesLength} suffix=" Won" decimalPlaces={0} className="text-emerald-400" />
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50"></span>
              <span className="text-slate-300 font-medium">Disciplined Stops</span>
            </div>
            <div className="text-rose-400 font-mono font-bold">
              <RollingTicker value={lossTradesLength} suffix=" Cut" decimalPlaces={0} className="text-rose-400" />
            </div>
          </div>

          {/* Capital Shield Invariant Status */}
          <div className={clsx(
            "p-1.5 px-2 rounded-xl border flex items-center justify-between transition-colors",
            maxLossBreached
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-300"
          )}>
            <div className="flex items-center gap-1.5">
              {maxLossBreached ? (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              )}
              <span className="text-[10px] font-semibold truncate">
                {maxLossBreached ? "₹300 Cap Breached" : "₹300 Capital Shield"}
              </span>
            </div>
            <span className={clsx(
              "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded",
              maxLossBreached ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
            )}>
              {maxLossBreached ? `${breachedLossCount}x Violation` : "100% Guarded"}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 pt-0.5 flex items-center justify-between font-mono">
            <span className="font-sans text-slate-400 text-[10px]">95% Wilson Floor:</span>
            <strong className="text-cyan-300 font-mono text-[10px]">
              <RollingTicker value={Number(wilsonFloor)} suffix="%" decimalPlaces={1} className="text-cyan-300" />
            </strong>
          </div>
        </div>
      </div>

      {/* 4-Chip Discipline Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/[0.06] text-xs">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
          <span className="text-[10px] text-slate-400 block">Rule Discipline</span>
          <div className="font-mono text-emerald-400 font-bold mt-0.5">
            <RollingTicker value={ruleDisciplinePct} suffix="%" decimalPlaces={0} className="text-emerald-400 font-bold" />
          </div>
        </div>

        {/* Honest Active Streak Chip */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
          <span className="text-[10px] text-slate-400 block">
            {streakType === "win" ? "Win Streak" : streakType === "loss" ? "Cool-Off Streak" : "Active Streak"}
          </span>
          <div className="font-mono font-bold mt-0.5 flex items-center gap-1">
            {streakType === "win" ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <RollingTicker value={streakCount} suffix=" Wins" decimalPlaces={0} className="text-emerald-400 font-bold" />
                <span>🔥</span>
              </span>
            ) : streakType === "loss" ? (
              <span className="text-rose-400 flex items-center gap-0.5">
                <RollingTicker value={streakCount} suffix=" Loss" decimalPlaces={0} className="text-rose-400 font-bold" />
                <span>❄️</span>
              </span>
            ) : (
              <span className="text-slate-400">Flat (0)</span>
            )}
          </div>
        </div>

        {/* Account Safety / Max Loss with Invariant Alert */}
        <div className={clsx(
          "p-2.5 rounded-xl border transition-colors",
          maxLossBreached
            ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
            : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
        )}>
          <span className={clsx(
            "text-[10px] block",
            maxLossBreached ? "text-rose-400 font-bold" : "text-slate-400"
          )}>
            {maxLossBreached ? "⚠️ Breached Stop" : "Account Safety"}
          </span>
          <div className={clsx(
            "font-mono font-bold mt-0.5",
            maxLossBreached ? "text-rose-300" : "text-rose-400"
          )}>
            <RollingTicker value={maxLoss} prefix="₹" showSign={true} decimalPlaces={2} className={maxLossBreached ? "text-rose-300 font-bold" : "text-rose-400 font-bold"} />
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
          <span className="text-[10px] text-slate-400 block">Top Setup</span>
          <strong className="text-cyan-300 font-bold text-[11px] truncate block mt-0.5" title={topSetup}>
            {topSetup}
          </strong>
        </div>
      </div>
    </div>
  );
}

export default TargetDisciplineCard;
