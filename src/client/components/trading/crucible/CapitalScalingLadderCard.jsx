import React, { useMemo } from "react";
import clsx from "clsx";
import { TrendingUp, Lock, CheckCircle2, ChevronRight, Award, AlertCircle } from "lucide-react";
import { calculateCapitalScalingLadder } from "./crucibleCalculations";

export function CapitalScalingLadderCard({ trades = [] }) {
  const {
    currentStreak,
    targetStreak,
    progressPercent,
    isUnlocked,
    message
  } = useMemo(() => calculateCapitalScalingLadder(trades), [trades]);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0d111a]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 hover:border-white/[0.14] transition-all duration-300 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/25 whitespace-nowrap shadow-sm shadow-amber-500/10 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-amber-400" />
              CAPITAL SCALING LADDER
            </span>
            <span className="text-xs font-extrabold text-white">Road to 2 Lots (130 Qty NIFTY)</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Rule-gated sizing progression: requires 20 consecutive disciplined trades with ₹250 stop loss adherence before doubling lot sizing.
          </p>
        </div>

        {/* Milestone Status Badge */}
        <div
          className={clsx(
            "px-3 py-1 rounded-xl text-xs font-mono font-extrabold border flex items-center gap-1.5 shadow-sm whitespace-nowrap",
            isUnlocked
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "bg-amber-500/15 text-amber-300 border-amber-500/30"
          )}
        >
          {isUnlocked ? <Award className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
          <span>{isUnlocked ? "2-Lot Scale Unlocked" : `${currentStreak} / ${targetStreak} Disciplined Streak`}</span>
        </div>
      </div>

      {/* Visual Progression Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        {/* Step 1: Base Tier */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-cyan-500/20 space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
              TIER 1 · ACTIVE
            </span>
            <span className="text-xs font-mono font-bold text-white">65 Qty (1 Lot)</span>
          </div>
          <div className="space-y-0.5 text-xs">
            <strong className="text-white block font-semibold">Base Invariant Calibration</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
              Risk: ₹200–₹300 (₹250 target) · Gain: ₹400–₹600 (₹500 target) · Daily Cap: ₹750
            </p>
          </div>
        </div>

        {/* Step 2: Next Scaling Tier */}
        <div
          className={clsx(
            "p-3.5 rounded-2xl border space-y-1.5 transition-all relative overflow-hidden",
            isUnlocked
              ? "bg-emerald-500/[0.04] border-emerald-500/30 text-white"
              : "bg-white/[0.01] border-white/5 opacity-70"
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={clsx(
                "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border",
                isUnlocked
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-white/5 text-slate-400 border-white/10"
              )}
            >
              TIER 2 · {isUnlocked ? "ELIGIBLE" : "LOCKED"}
            </span>
            <span className="text-xs font-mono font-bold text-white">130 Qty (2 Lots)</span>
          </div>
          <div className="space-y-0.5 text-xs">
            <strong className="text-white block font-semibold">Scaled Prop-Firm Capital</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
              Risk: ₹400–₹600 (₹500 target) · Gain: ₹800–₹1,200 (₹1,000 target) · Daily Cap: ₹1,500
            </p>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[11px] text-slate-400 font-sans">
            Streak Progress ({currentStreak} / {targetStreak} trades)
          </span>
          <span className="font-extrabold text-amber-300">{progressPercent}%</span>
        </div>

        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-700",
              isUnlocked ? "bg-gradient-to-r from-cyan-400 to-emerald-400" : "bg-gradient-to-r from-amber-500 to-yellow-400"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-0.5">
          <span>{message}</span>
          <span className="text-[10px] font-mono text-slate-500">
            Rule: 0 Stop Breaches Allowed
          </span>
        </div>
      </div>
    </div>
  );
}
