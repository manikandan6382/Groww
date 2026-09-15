import React from "react";
import { Maximize2 } from "lucide-react";

export function TVChartHeader({
  symbol,
  selectedRange,
  setSelectedRange,
  onPopout
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold font-mono">
            {symbol}
          </span>
          <strong className="text-base font-extrabold text-white font-mono tabular-nums">25,190.00</strong>
          <span className="text-xs font-bold text-emerald-400 font-mono tabular-nums">+0.82%</span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
          <span className="pulse-beacon" />
          60 FPS Canvas
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Timeframe Range Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-white/5">
          {["1D", "1W", "1M", "1Y", "ALL"].map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setSelectedRange(range)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition cursor-pointer ${
                selectedRange === range ? "bg-white/10 text-white font-extrabold" : "text-slate-400 hover:text-white"
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Popout Button */}
        <button
          type="button"
          onClick={onPopout}
          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg border border-white/10 flex items-center gap-1.5 transition cursor-pointer"
          title="Open detached multi-monitor TradingView window"
        >
          <Maximize2 className="w-3 h-3" />
          <span className="hidden sm:inline">Pop-Out</span>
        </button>
      </div>
    </div>
  );
}
