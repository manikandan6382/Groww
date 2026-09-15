import React from "react";
import { RollingTicker } from "../../common/RollingTicker";
import { Radio } from "lucide-react";
import clsx from "clsx";

export function StudioHeaderTelemetry({
  currentDatasetLabel,
  paperPnlRange,
  totalRealizedPnl,
  winRate,
  winCount,
  lossCount,
  totalTradesCount
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
            PORTFOLIO INTELLIGENCE &amp; PERFORMANCE STUDIO
          </span>
          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
            LIVE TELEMETRY
          </span>
        </div>
        <h2 className="text-base font-bold text-white">Daily Performance &amp; Execution Ledger</h2>
      </div>

      <div className="flex items-center gap-3 text-xs flex-wrap">
        <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 text-right flex-shrink-0">
          <span className="text-[10px] text-slate-400 block">Realized Net P&amp;L ({currentDatasetLabel || paperPnlRange})</span>
          <div className={clsx("font-mono text-sm font-bold", totalRealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
            <RollingTicker
              value={totalRealizedPnl}
              prefix="₹"
              showSign={true}
              decimalPlaces={2}
              className={totalRealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}
            />
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 text-right flex-shrink-0">
          <span className="text-[10px] text-slate-400 block">Win Rate</span>
          <div className="flex items-center gap-1.5 justify-end">
            <div className="font-mono text-sm font-bold text-cyan-400">
              <RollingTicker value={Number(winRate)} suffix="%" decimalPlaces={1} className="text-cyan-400" />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">({winCount}W / {lossCount}L)</span>
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 text-right flex-shrink-0">
          <span className="text-[10px] text-slate-400 block">Timeframe Sample</span>
          <div className="font-mono text-sm font-bold text-white">
            <RollingTicker value={totalTradesCount} suffix=" Trades" decimalPlaces={0} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
