import React from "react";
import clsx from "clsx";
import { RollingTicker } from "../../common/RollingTicker";

export function JournalStoryHeader({
  filteredCount,
  dateFilteredCount,
  rangeLabel,
  totalNet,
  winCount,
  lossCount
}) {
  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-5 border-b border-white/10">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 whitespace-nowrap shadow-sm">
            EVIDENCE-AUDITED FORENSICS
          </span>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 whitespace-nowrap shadow-sm">
            {filteredCount} of {dateFilteredCount} Trade Stories ({rangeLabel})
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
          Every Trade's Story &amp; Audit Log
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl mt-1">
          Full 4-Act autopsy with Objective 12-Filter Quality Scoring, dynamic price action sparklines, and zero self-delusion bias.
        </p>
      </div>

      {/* Realized Summary Strip with Apple-Grade Rolling Odometer Ticker */}
      <div className="flex items-center gap-3 text-xs flex-wrap sm:flex-nowrap flex-shrink-0">
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-right shadow-sm min-w-[140px]">
          <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">
            Total Net Realized ({rangeLabel})
          </span>
          <div className={clsx("font-mono text-sm sm:text-base font-black flex justify-end items-baseline", totalNet >= 0 ? "text-emerald-400" : "text-rose-400")}>
            <RollingTicker 
              value={totalNet} 
              prefix="₹" 
              showSign={true} 
              decimalPlaces={2} 
              className={totalNet >= 0 ? "text-emerald-400" : "text-rose-400"}
            />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-right shadow-sm min-w-[110px]">
          <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Win/Stop Record</span>
          <div className="font-mono text-sm sm:text-base font-black text-cyan-400 flex items-center justify-end gap-1">
            <RollingTicker value={winCount} suffix="W" decimalPlaces={0} className="text-emerald-400 font-black" />
            <span className="text-slate-500 font-normal">·</span>
            <RollingTicker value={lossCount} suffix="L" decimalPlaces={0} className="text-rose-400 font-black" />
          </div>
        </div>
      </div>
    </div>
  );
}
