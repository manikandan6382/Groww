import React from "react";

export function TVChartLegend() {
  return (
    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <strong className="text-slate-300">Green Candle:</strong> Buyers (UP)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          <strong className="text-slate-300">Red Candle:</strong> Sellers (DOWN)
        </span>
      </div>
      <span className="font-mono text-slate-500">TradingView Lightweight Charts v5.2</span>
    </div>
  );
}
