import React from 'react';
import { Zap, Activity, Brain, BookOpen, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { formatTimeShort } from '../../../utils/tradeNormalizer';

export function TimelineJournalView({
  trade,
  diagnostics,
  entryPrice,
  exitPrice,
  netZeroPrice,
  frictionPerUnit,
  charges
}) {
  const entryTime = trade?.entryDatetime || trade?.timestamp;
  const exitTime = trade?.exitDatetime || trade?.closedAt;
  const stopLoss = trade?.stopLoss ? Number(trade.stopLoss) : null;
  const closeReason = String(trade?.closeReason || '');

  return (
    <div className="space-y-4 font-sans text-xs pt-3">
      {/* Top Metric Cards: Key Execution Levels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/10 shadow-sm backdrop-blur-xl">
          <span className="text-zinc-400 text-[10.5px] block mb-1 uppercase font-bold tracking-wider">Entry Price</span>
          <strong className="text-base sm:text-lg font-black text-white tabular-nums tracking-tight">₹{entryPrice.toFixed(2)}</strong>
          <p className="text-[10.5px] text-zinc-400 mt-1 font-sans">Filled @ {formatTimeShort(entryTime)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/10 shadow-sm backdrop-blur-xl">
          <span className="text-zinc-400 text-[10.5px] block mb-1 uppercase font-bold tracking-wider">Exit Price</span>
          <strong className={clsx("text-base sm:text-lg font-black tabular-nums tracking-tight", exitPrice >= entryPrice ? "text-emerald-400" : "text-rose-400")}>
            ₹{exitPrice.toFixed(2)}
          </strong>
          <p className="text-[10.5px] text-zinc-400 mt-1 font-sans">Closed @ {formatTimeShort(exitTime)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/10 shadow-sm backdrop-blur-xl">
          <span className="text-zinc-400 text-[10.5px] block mb-1 uppercase font-bold tracking-wider">Friction Breakeven (BE)</span>
          <strong className="text-base sm:text-lg font-black text-amber-300 tabular-nums tracking-tight">₹{netZeroPrice.toFixed(2)}</strong>
          <p className="text-[10.5px] text-zinc-400 mt-1 font-sans">Charges: ₹{charges.toFixed(2)} (+{frictionPerUnit.toFixed(2)} pts)</p>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/10 shadow-sm backdrop-blur-xl">
          <span className="text-zinc-400 text-[10.5px] block mb-1 uppercase font-bold tracking-wider">Stop Loss (SL)</span>
          <strong className="text-base sm:text-lg font-black text-rose-400 tabular-nums tracking-tight">{stopLoss ? `₹${stopLoss.toFixed(2)}` : "None"}</strong>
          <p className="text-[10.5px] text-zinc-400 mt-1 font-sans">Cushion: {stopLoss ? `-${Math.abs(entryPrice - stopLoss).toFixed(2)} pts` : "N/A"}</p>
        </div>
      </div>

      {/* Core Narrative: Catalyst & Execution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-gradient-to-b from-white/[0.05] via-[#060812]/80 to-black/90 border border-white/10 shadow-sm backdrop-blur-2xl">
          <h4 className="text-white font-black text-sm flex items-center gap-2 mb-2 tracking-tight font-sans">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span>Trade Catalyst &amp; Setup Logic</span>
          </h4>
          <p className="text-zinc-300 leading-relaxed text-[12.5px] font-sans">
            {trade?.catalyst || "Execution triggered by systematic strategy rule. Monitored momentum continuation with tight risk gating."}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-b from-white/[0.05] via-[#060812]/80 to-black/90 border border-white/10 shadow-sm backdrop-blur-2xl">
          <h4 className="text-white font-black text-sm flex items-center gap-2 mb-2 tracking-tight font-sans">
            <div className="w-7 h-7 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <span>Execution Details</span>
          </h4>
          <p className="text-zinc-300 leading-relaxed text-[12.5px] font-sans">
            {trade?.executionDetails || `Entry filled at ₹${entryPrice.toFixed(2)}. Position squared off at ₹${exitPrice.toFixed(2)} upon trigger of ${closeReason.replace(/_/g, " ")}.`}
          </p>
        </div>
      </div>

      {/* Psychology, Lessons & Compliance Bento Deck */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-gradient-to-b from-purple-500/[0.05] via-[#0a0614]/80 to-black/90 border border-purple-500/20 shadow-sm backdrop-blur-2xl flex flex-col justify-between">
          <div>
            <h4 className="text-white font-black text-sm flex items-center gap-2 mb-2 tracking-tight font-sans">
              <Brain className="w-4 h-4 text-purple-400" />
              <span>Mindset &amp; Emotion</span>
            </h4>
            <div className="inline-block px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold mb-2 shadow-sm">
              {trade?.mindsetEmotion || "Disciplined & Patient"}
            </div>
            <p className="text-zinc-400 text-[11.5px] leading-relaxed font-sans">
              Trader maintained emotional detachment and adhered to position sizing limits per Mark Douglas principles.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-b from-cyan-500/[0.05] via-[#060a14]/80 to-black/90 border border-cyan-500/20 shadow-sm backdrop-blur-2xl flex flex-col justify-between">
          <div>
            <h4 className="text-white font-black text-sm flex items-center gap-2 mb-2 tracking-tight font-sans">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Lessons Learned</span>
            </h4>
            <p className="text-zinc-300 text-[12px] leading-relaxed font-sans">
              {trade?.lessonsLearned || (diagnostics.isPeakGiveback
                ? "Move stop loss to breakeven once price travels 1R in favor to eliminate risk."
                : "Stick to predefined probability setups without hesitation.")}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-b from-emerald-500/[0.05] via-[#050a0a]/80 to-black/90 border border-emerald-500/20 shadow-sm backdrop-blur-2xl flex flex-col justify-between">
          <div>
            <h4 className="text-white font-black text-sm flex items-center gap-2 mb-2 tracking-tight font-sans">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Plan Compliance &amp; Conviction</span>
            </h4>
            <div className="flex items-center gap-2 mb-2">
              <span className={clsx(
                "px-2.5 py-1 rounded-xl font-mono font-bold text-xs border shadow-sm",
                trade?.followedPlan !== false ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border-rose-500/30"
              )}>
                {trade?.followedPlan !== false ? "Plan Followed 100%" : "Plan Deviated"}
              </span>
              <span className="text-zinc-400 font-mono text-xs">
                Conviction: <strong className="text-white">{trade?.confidenceScore ? `${trade.confidenceScore}/10` : "8/10"}</strong>
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] font-sans">
              Trade strictly conformed to intraday rules and system sizing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
