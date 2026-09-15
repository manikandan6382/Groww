import React from "react";
import clsx from "clsx";
import { Calculator } from "lucide-react";
import { STRIKE_PRESETS } from "./loggerPresetsData";

const STRIKE_COLORS = {
  "NIFTY 24500 CE": "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "NIFTY 24500 PE": "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30",
  "BANKNIFTY 52000 CE": "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "BANKNIFTY 52000 PE": "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30",
};

export function StrikePresetsStrip({ onApplyStrike }) {
  return (
    <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500/[0.07] via-white/[0.02] to-transparent border border-cyan-500/20 space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold text-cyan-300 flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-cyan-400" />
          <span>1-Click Strike &amp; Contract Auto-Populate:</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Auto-configures strike, lot size &amp; 1:2 R:R</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs flex-nowrap scrollbar-none">
        {STRIKE_PRESETS.map((p) => (
          <button
            key={p.symbol}
            type="button"
            onClick={() => onApplyStrike(p.symbol, p.entry, p.exit, p.sl, p.tp, p.qty, p.tag)}
            className={clsx(
              "px-2.5 py-1 rounded-xl border text-[11px] font-mono font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer",
              STRIKE_COLORS[p.symbol] || "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
            )}
          >
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
