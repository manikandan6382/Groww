import React from "react";
import { Sparkles, ShieldCheck } from "lucide-react";

export function LoggerHeader({ todayTradesCount }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fast Trade Logger (12-Col Flow)</h3>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Daily 3-Trade Cap Badge */}
        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-cyan-400" />
          Session Budget: {todayTradesCount} / 3 Max Trades
        </span>

        {/* India VIX Regime Badge */}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          ⚡ VIX 13.4 (Normal Trend Regime)
        </span>
      </div>
    </div>
  );
}
