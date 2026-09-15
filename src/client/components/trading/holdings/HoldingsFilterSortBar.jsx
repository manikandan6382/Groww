import React from "react";
import clsx from "clsx";
import { ArrowUpDown } from "lucide-react";
import { FILTER_TABS } from "./holdingsConstants";

export function HoldingsFilterSortBar({
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  totalItemsCount,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-2xl shadow-inner flex-wrap">
        {FILTER_TABS.map((tab) => {
          const label = tab.id === "all" ? `All Assets (${totalItemsCount})` : tab.label;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange(tab.id)}
              className={clsx(
                "px-3 py-1 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95",
                filter === tab.id
                  ? "bg-white/15 text-white border border-white/20 shadow-[0_2px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.25)]"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Sort Selector */}
      <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-slate-400">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="bg-black/40 border border-white/15 rounded-xl px-3 py-1 text-slate-200 focus:outline-none text-xs font-mono font-bold cursor-pointer"
        >
          <option value="weight" className="bg-slate-900 text-white">Portfolio Weight %</option>
          <option value="pnl" className="bg-slate-900 text-white">Total P&amp;L (₹)</option>
          <option value="day" className="bg-slate-900 text-white">Today's Change %</option>
          <option value="symbol" className="bg-slate-900 text-white">Stock Symbol</option>
        </select>
      </div>
    </div>
  );
}
