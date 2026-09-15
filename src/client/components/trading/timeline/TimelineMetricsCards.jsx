import React from 'react';
import { Award, TrendingDown, ShieldCheck, Clock } from 'lucide-react';
import clsx from 'clsx';
import { formatTimeShort } from '../../../utils/tradeNormalizer';
import { calculateTradeDuration } from '../../../utils/dateUtils';

export function TimelineMetricsCards({
  scrubTelemetry,
  peakPrice,
  peakPts,
  peakRupees,
  mfeTargetEfficiencyPct,
  troughPrice,
  drawdownPts,
  drawdownRupees,
  maeRiskConsumedPct,
  netZeroPrice,
  frictionPerUnit,
  charges,
  trade,
  entryTime,
  exitTime,
  closeReason
}) {
  return (
    <div className="my-2.5">
      {scrubTelemetry ? (
        <div className="p-3.5 rounded-2xl bg-black/70 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.18),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5 flex-wrap tabular-nums">
            <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-[10.5px] flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>CURSOR TELEMETRY</span>
            </span>
            <span className="text-zinc-400">@{scrubTelemetry.timeStr} IST</span>
            <span className="text-white font-black px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/15 text-sm shadow-inner">
              ₹{scrubTelemetry.currentP.toFixed(2)}
            </span>
            <span className={clsx("font-black text-sm", scrubTelemetry.isNetGain ? "text-emerald-400" : "text-rose-400")}>
              {scrubTelemetry.ptsDelta >= 0 ? "+" : ""}₹{scrubTelemetry.rupeesDelta.toFixed(2)} ({scrubTelemetry.ptsDelta >= 0 ? "+" : ""}{scrubTelemetry.ptsDelta} pts / {scrubTelemetry.pctReturn}%)
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 flex-wrap">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shadow-sm">
              To High: <strong className="font-bold">{scrubTelemetry.distToPeak > 0 ? `-${scrubTelemetry.distToPeak} pts` : "At High"}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 shadow-sm">
              To Low: <strong className="font-bold">{scrubTelemetry.distToTrough > 0 ? `+${scrubTelemetry.distToTrough} pts` : "At Low"}</strong>
            </span>
            {scrubTelemetry.distToTarget !== null && (
              <span className="hidden md:inline text-zinc-400 px-2 py-1 rounded-xl bg-white/[0.04] border border-white/10">
                TP: <strong className="text-emerald-300 font-bold">₹{scrubTelemetry.distToTarget}</strong>
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
          {/* Card 1: 🟢 All-Time High */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-emerald-500/[0.07] to-white/[0.02] border border-emerald-500/25 backdrop-blur-2xl shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Award className="w-3.5 h-3.5" />
                <span>Trade Peak (High)</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/20">MFE</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">₹{peakPrice.toFixed(2)}</div>
            <div className="text-[11px] text-zinc-300 mt-1 flex items-center justify-between tabular-nums">
              <span className="text-emerald-400 font-bold">+{peakPts.toFixed(2)} pts</span>
              <span className="text-zinc-400 text-[10px]">{peakPts > 0 ? `+₹${peakRupees.toFixed(2)}` : "Flat at Entry"}</span>
            </div>
            <div className="mt-2 pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-400">
              <span>Capture Efficiency</span>
              <span className="text-emerald-300 font-bold">{mfeTargetEfficiencyPct}%</span>
            </div>
          </div>

          {/* Card 2: 🔴 All-Time Low */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-rose-500/[0.07] to-white/[0.02] border border-rose-500/25 backdrop-blur-2xl shadow-sm flex flex-col justify-between hover:border-rose-500/40 transition-all">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
              <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Deepest Low (MAE)</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 font-bold border border-rose-500/20">DRAWDOWN</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">₹{troughPrice.toFixed(2)}</div>
            <div className="text-[11px] text-zinc-300 mt-1 flex items-center justify-between tabular-nums">
              <span className="text-rose-400 font-bold">-{drawdownPts.toFixed(2)} pts</span>
              <span className="text-zinc-400 text-[10px]">{drawdownPts > 0 ? `-₹${drawdownRupees.toFixed(2)}` : "Zero Drawdown"}</span>
            </div>
            <div className="mt-2 pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-400">
              <span>Cushion Used</span>
              <span className={clsx("font-bold", maeRiskConsumedPct > 75 ? "text-rose-400" : "text-amber-300")}>{maeRiskConsumedPct}%</span>
            </div>
          </div>

          {/* Card 3: ⚖️ True Breakeven */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-500/[0.04] to-white/[0.02] border border-white/10 backdrop-blur-2xl shadow-sm flex flex-col justify-between hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
              <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>True Breakeven (BE)</span>
              </span>
              <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">FRICTION</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">₹{netZeroPrice.toFixed(2)}</div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between tabular-nums">
              <span>Tax Friction:</span>
              <strong className="text-amber-300 font-bold">+{frictionPerUnit.toFixed(2)} pts/qty</strong>
            </div>
            <div className="mt-2 pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-400">
              <span>Total Charges</span>
              <span className="text-zinc-300 font-bold font-mono">₹{charges.toFixed(2)}</span>
            </div>
          </div>

          {/* Card 4: ⏱️ Duration */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-cyan-500/[0.04] to-white/[0.02] border border-white/10 backdrop-blur-2xl shadow-sm flex flex-col justify-between hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
              <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Holding Duration</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                {trade?.duration || calculateTradeDuration(trade?.entryDatetime, trade?.exitDatetime)}
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-white tabular-nums flex items-center gap-2 mt-0.5">
              <span>{formatTimeShort(entryTime)}</span>
              <span className="text-zinc-500 text-xs font-normal">➔</span>
              <span>{formatTimeShort(exitTime)}</span>
            </div>
            <div className="text-[10.5px] text-zinc-400 mt-1 truncate" title={closeReason.replace(/_/g, " ")}>
              Reason: <strong className="text-zinc-300">{closeReason.replace(/_/g, " ")}</strong>
            </div>
            <div className="mt-2 pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-zinc-400">
              <span>Settlement</span>
              <span className="text-cyan-300 font-bold font-mono">Realized</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
