import React from "react";
import clsx from "clsx";

/**
 * 📊 52-Week Range Bar
 */
export function Range52Week({ low, high, current, isGain }) {
  const range = high - low || 1;
  const rawPct = ((current - low) / range) * 100;
  const pct = Math.min(Math.max(rawPct, 5), 95);

  return (
    <div className="space-y-1 w-full pt-1">
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 font-bold leading-none">
        <span>52W L: ${Number(low).toFixed(2)}</span>
        <span className="text-slate-300">52W H: ${Number(high).toFixed(2)}</span>
      </div>
      <div className="relative w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden border border-white/5">
        <div 
          className={clsx("absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500", isGain ? "bg-emerald-500/40" : "bg-rose-500/40")}
          style={{ width: `${pct}%` }}
        />
        <div 
          className="absolute top-0 bottom-0 w-1.5 bg-cyan-300 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.9)] -ml-0.5"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}
