import React from "react";
import clsx from "clsx";
import { ArrowUpDown, Layers, ShieldCheck, TrendingUp } from "lucide-react";
import { FILTER_TABS, SORT_OPTIONS, VIEW_MODES } from "./holdingsConstants";

export function HoldingsFilterSortBar({
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  viewMode = "all",
  onViewModeChange,
  totalItemsCount,
}) {
  const getViewIcon = (id) => {
    if (id === "cost") return <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />;
    if (id === "performance") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    return <Layers className="w-3.5 h-3.5 text-cyan-400" />;
  };

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
      {/* View Mode Switcher (Comprehensive vs Cost Basis Without Profit vs Performance) */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-2xl shadow-inner font-mono text-[11px] overflow-x-auto no-scrollbar">
        {VIEW_MODES.map((mode) => {
          const isActive = viewMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onViewModeChange && onViewModeChange(mode.id)}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95",
                isActive
                  ? mode.id === "cost"
                    ? "bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 shadow-[0_2px_12px_rgba(99,102,241,0.25)]"
                    : mode.id === "performance"
                    ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500/40 shadow-[0_2px_12px_rgba(16,185,129,0.25)]"
                    : "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-[0_2px_12px_rgba(6,182,212,0.25)]"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              )}
              title={mode.desc}
            >
              {getViewIcon(mode.id)}
              <span>{mode.label}</span>
              {mode.id === "cost" && (
                <span className="text-[9px] px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 rounded font-black">
                  NO PROFIT
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter Tabs & Sort Dropdown */}
      <div className="flex flex-wrap items-center justify-between md:justify-end gap-3">
        {/* Category Filters */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-2xl shadow-inner overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => {
            const label = tab.id === "all" ? `All (${totalItemsCount})` : tab.label;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilterChange(tab.id)}
                className={clsx(
                  "px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 whitespace-nowrap",
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

        {/* Dynamic Sort Selector */}
        <div className="flex items-center gap-2 text-xs text-slate-300 font-medium shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 hidden sm:inline">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs font-mono font-bold cursor-pointer transition shadow-inner"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-slate-900 text-white">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

