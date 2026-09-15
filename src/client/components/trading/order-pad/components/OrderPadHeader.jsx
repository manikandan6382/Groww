import React from "react";
import { Zap, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";

export function OrderPadHeader({ copilotRegime, onSetCopilotRegime }) {
  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 shadow-sm whitespace-nowrap">
          ⚡ OPTIONS ORDER DESK
        </span>
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Live Upstox Market Ticks
        </span>
      </div>

      {/* Dynamic Copilot Regime Simulator Pills */}
      <div className="flex items-center gap-1.5 text-xs flex-wrap">
        <span className="text-slate-400 text-[10px] font-medium mr-1 flex items-center gap-1 shrink-0">
          <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
          <span>Copilot Gate:</span>
        </span>
        <button
          type="button"
          onClick={() => onSetCopilotRegime("AUTO")}
          className={clsx(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shrink-0 whitespace-nowrap",
            copilotRegime === "AUTO"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
          )}
        >
          <Zap className="w-2.5 h-2.5 text-cyan-400" />
          <span>Auto IST</span>
        </button>
        <button
          type="button"
          onClick={() => onSetCopilotRegime("PRIME")}
          className={clsx(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shrink-0 whitespace-nowrap",
            copilotRegime === "PRIME"
              ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "bg-white/5 text-slate-400 hover:text-emerald-300 border border-white/5"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span>Prime</span>
        </button>
        <button
          type="button"
          onClick={() => onSetCopilotRegime("WARNING")}
          className={clsx(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shrink-0 whitespace-nowrap",
            copilotRegime === "WARNING"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
              : "bg-white/5 text-slate-400 hover:text-amber-300 border border-white/5"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
          <span>Caution</span>
        </button>
        <button
          type="button"
          onClick={() => onSetCopilotRegime("BLOCKED")}
          className={clsx(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition flex items-center gap-1.5 shrink-0 whitespace-nowrap",
            copilotRegime === "BLOCKED"
              ? "bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-sm"
              : "bg-white/5 text-slate-400 hover:text-rose-300 border border-white/5"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]" />
          <span>Blocked</span>
        </button>
      </div>
    </div>
  );
}
