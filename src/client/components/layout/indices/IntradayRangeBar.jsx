import React from "react";
import clsx from "clsx";

/**
 * 📊 Intraday Range Meter (Day Low to Day High)
 */
export function IntradayRangeBar({ low, high, current, isGain }) {
  const range = high - low || 1;
  const rawPct = ((current - low) / range) * 100;
  const pct = Math.min(Math.max(rawPct, 5), 95);

  return (
    <div className="space-y-1 w-full pt-1">
      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 font-bold leading-none">
        <span>L: {Number(low).toLocaleString("en-IN")}</span>
        <span className="text-slate-300">H: {Number(high).toLocaleString("en-IN")}</span>
      </div>
      <div className="relative w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden border border-white/5">
        <div 
          className={clsx(
            "absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500", 
            isGain ? "bg-emerald-500/40" : "bg-rose-500/40"
          )}
          style={{ width: `${pct}%` }}
        />
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.8)] -ml-0.5 transition-all duration-500"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}
