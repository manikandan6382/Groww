import React from "react";
import { soundEngine } from "../../utils/soundEngine";
import { LayoutDashboard, Layers, ShieldX } from "lucide-react";
import clsx from "clsx";

export function ActiveTradesDockHeader({
  openAlertsCount,
  activeTradesViewMode,
  setActiveTradesViewMode,
  onSquareOffAll
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 shadow-sm whitespace-nowrap">
            ACTIVE ORDERS &amp; POSITIONS
          </span>
          <span className="text-[10px] font-bold text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 shadow-sm">
            {openAlertsCount} Positions Live
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
          My Active Practice Trades
        </h2>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
          Real-time mark-to-market delta tracking with automated target and stop-loss triggers.
        </p>
      </div>

      <div className="flex items-center gap-2.5 self-start sm:self-auto flex-shrink-0 flex-wrap">
        {/* Apple Segmented View Switcher */}
        <div className="p-1 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setActiveTradesViewMode("deck");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer",
              activeTradesViewMode === "deck"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
            title="Full-Column Expansive Pro Deck (Recommended)"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Pro Deck</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playTabSwitchTone();
              setActiveTradesViewMode("compact");
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer",
              activeTradesViewMode === "compact"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
            title="High-Density Compact Terminal Row"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Compact</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onSquareOffAll}
          disabled={openAlertsCount === 0}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 border border-rose-500/30 text-rose-300 font-bold text-xs transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer"
        >
          <ShieldX className="w-4 h-4 text-rose-400" />
          <span>Square Off All</span>
        </button>
        <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-2xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow-sm">
          {openAlertsCount} ACTIVE
        </span>
      </div>
    </div>
  );
}
