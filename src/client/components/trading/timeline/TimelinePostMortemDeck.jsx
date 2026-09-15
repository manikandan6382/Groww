import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck, BookOpen, Award, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

export function TimelinePostMortemDeck({
  isPeakGiveback,
  isTargetHit,
  mindsetEmotion,
  peakPrice,
  peakPts,
  drawdownPts,
  peakRupees,
  mfeTargetEfficiencyPct,
  troughPrice,
  drawdownRupees,
  maeRiskConsumedPct
}) {
  return (
    <div className="mt-3.5 space-y-3.5 font-mono">
      {/* Hero Bento Bar: 💡 Mark Douglas Discipline & Rule Audit */}
      <div className={clsx(
        "p-4 sm:p-5 rounded-3xl border backdrop-blur-2xl relative overflow-hidden transition-all",
        isPeakGiveback
          ? "bg-gradient-to-r from-rose-950/40 via-[#0e060a]/90 to-rose-950/20 border-rose-500/35 shadow-sm"
          : isTargetHit
          ? "bg-gradient-to-r from-emerald-950/40 via-[#050e09]/90 to-emerald-950/20 border-emerald-500/35 shadow-sm"
          : "bg-gradient-to-r from-slate-900/60 via-[#070910]/90 to-slate-900/40 border-white/10 shadow-sm"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3 mb-3">
          <div className="flex items-center gap-2">
            {isPeakGiveback ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-rose-300 font-black text-xs sm:text-sm">Peak Giveback Detected</span>
              </>
            ) : isTargetHit ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-black text-xs sm:text-sm">Clean Edge Execution</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-cyan-300 font-black text-xs sm:text-sm">Risk Discipline Audit</span>
              </>
            )}
            <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 flex items-center gap-1.5 ml-1">
              <BookOpen className="w-3 h-3 text-cyan-400" />
              <span>Mark Douglas Rule</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10.5px] text-zinc-400 font-sans">
            <span>Execution Mindset:</span>
            <strong className="text-white font-mono px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/15">
              {mindsetEmotion || (isTargetHit ? "Disciplined Execution" : "Controlled Exit")}
            </strong>
          </div>
        </div>

        <p className="text-[12.5px] text-zinc-300 leading-relaxed font-sans">
          {isPeakGiveback ? (
            <span>
              Market expanded to <strong className="text-white font-bold font-mono">₹{peakPrice.toFixed(1)} (+{peakPts.toFixed(1)} pts)</strong> but reversed into Stop Loss. <strong className="text-rose-300 font-bold">Mark Douglas Invariant:</strong> Once price reaches 1:1 R:R, ratchet stop loss to Breakeven (+0 pts) to eliminate capital risk before market structure breaks.
            </span>
          ) : isTargetHit ? (
            <span>
              Target captured with minimal adverse stress (<strong className="text-emerald-300 font-mono">-{drawdownPts.toFixed(1)} pts MAE</strong>). Smooth expansion from entry to exit with zero hesitation. The trader accepts the risk before entry and lets the probability distribution play out.
            </span>
          ) : (
            <span>
              Stop loss cut cleanly at predefined threshold. Capital preserved for next probability edge without revenge trading or averaging down. Every loss is simply a cost of doing business.
            </span>
          )}
        </p>
      </div>

      {/* 2-Column Balanced Deck: MFE & MAE Excursions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Card 1: 🏆 Max Favorable Excursion */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-emerald-500/[0.08] via-[#060a12]/80 to-black/90 border border-emerald-500/25 backdrop-blur-2xl shadow-sm flex flex-col justify-between group hover:border-emerald-500/40 transition-all">
          <div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
              <span className="flex items-center gap-2 text-emerald-400 font-bold">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Max Favorable Excursion</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-black border border-emerald-500/25 tabular-nums">MFE</span>
            </div>
            <div className="text-2xl font-black text-white tabular-nums tracking-tight mt-1">₹{peakPrice.toFixed(2)}</div>
            <p className="text-[11.5px] text-zinc-300 mt-1 flex items-center justify-between tabular-nums">
              <span className="text-emerald-400 font-bold">+{peakPts.toFixed(2)} pts</span>
              <span className="text-zinc-400 text-[10.5px]">Peak Gain: <strong className="text-emerald-300 font-mono">{peakPts > 0 ? `+₹${peakRupees.toFixed(2)}` : "₹0.00"}</strong></span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.08]">
            <div className="flex items-center justify-between text-[10.5px] text-zinc-400 mb-1.5">
              <span>Target Capture Efficiency</span>
              <strong className="text-emerald-300 font-mono tabular-nums">{mfeTargetEfficiencyPct}%</strong>
            </div>
            <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/5">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${Math.min(100, Math.max(0, mfeTargetEfficiencyPct))}%` }} />
            </div>
          </div>
        </div>

        {/* Card 2: 📉 Max Adverse Excursion */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-rose-500/[0.08] via-[#0a060e]/80 to-black/90 border border-rose-500/25 backdrop-blur-2xl shadow-sm flex flex-col justify-between group hover:border-rose-500/40 transition-all">
          <div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
              <span className="flex items-center gap-2 text-rose-400 font-bold">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span>Max Adverse Excursion</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-black border border-rose-500/25 tabular-nums">MAE</span>
            </div>
            <div className="text-2xl font-black text-white tabular-nums tracking-tight mt-1">₹{troughPrice.toFixed(2)}</div>
            <p className="text-[11.5px] text-zinc-300 mt-1 flex items-center justify-between tabular-nums">
              <span className="text-rose-400 font-bold">-{drawdownPts.toFixed(2)} pts</span>
              <span className="text-zinc-400 text-[10.5px]">Deepest Heat: <strong className="text-rose-300 font-mono">{drawdownPts > 0 ? `-₹${drawdownRupees.toFixed(2)}` : "₹0.00"}</strong></span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.08]">
            <div className="flex items-center justify-between text-[10.5px] text-zinc-400 mb-1.5">
              <span>Stop Cushion Consumed</span>
              <strong className={clsx("font-mono tabular-nums", maeRiskConsumedPct > 75 ? "text-rose-400" : "text-amber-300")}>{maeRiskConsumedPct}%</strong>
            </div>
            <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className={clsx("h-full rounded-full transition-all duration-500", maeRiskConsumedPct > 75 ? "bg-gradient-to-r from-amber-500 via-rose-500 to-red-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-gradient-to-r from-zinc-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]")}
                style={{ width: `${Math.min(100, Math.max(0, maeRiskConsumedPct))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
