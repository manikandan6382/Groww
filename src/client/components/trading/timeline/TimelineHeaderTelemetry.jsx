import React from 'react';
import { Zap } from 'lucide-react';
import clsx from 'clsx';

export function TimelineHeaderTelemetry({
  trade,
  charges,
  isVerifiedTicks
}) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <div className={clsx(
        "text-xs font-mono font-black px-3.5 py-1.5 rounded-2xl border shadow-sm whitespace-nowrap shrink-0 tabular-nums flex items-center gap-2 backdrop-blur-xl",
        trade?.netPnl >= 0
          ? "bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/35 shadow-sm"
          : "bg-gradient-to-r from-rose-500/20 to-rose-500/5 text-rose-300 border-rose-500/35 shadow-sm"
      )}>
        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Net P&amp;L</span>
        <span className="text-sm font-black tracking-tight">{trade?.netPnl >= 0 ? "+" : ""}₹{Number(trade?.netPnl || 0).toFixed(2)}</span>
        <span className="text-[10.5px] px-1.5 py-0.2 rounded-md bg-white/10 text-white font-bold">
          {trade?.netReturnPct > 0 ? "+" : ""}{Number(trade?.netReturnPct || 0).toFixed(2)}%
        </span>
      </div>

      <span className="text-[11px] font-mono font-semibold px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-300 whitespace-nowrap shrink-0 shadow-sm flex items-center gap-1.5" title="Exchange statutory taxes & brokerage friction">
        <span className="text-zinc-500 text-[10px]">TAX</span>
        <strong className="text-cyan-300 font-bold">₹{charges.toFixed(2)}</strong>
      </span>

      <span className={clsx(
        "text-[10.5px] font-mono font-bold px-2.5 py-1.5 rounded-xl border shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-help",
        isVerifiedTicks ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 shadow-sm" : "bg-cyan-500/10 border-cyan-500/25 text-cyan-300"
      )} title={isVerifiedTicks ? "Verified Upstox 1-Minute OHLCV Candles." : "Geometric Lifecycle Spline."}>
        {isVerifiedTicks ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Upstox REST 1m</span>
          </>
        ) : (
          <>
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Simulated</span>
          </>
        )}
      </span>
    </div>
  );
}
