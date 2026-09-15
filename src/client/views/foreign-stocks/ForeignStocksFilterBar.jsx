import React from "react";
import clsx from "clsx";
import { Search, LayoutGrid, List } from "lucide-react";
import { soundEngine } from "../../utils/soundEngine";
import { SECTORS } from "./foreignStocksData";

export function ForeignStocksFilterBar({
  selectedSector,
  setSelectedSector,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Sector Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
        {SECTORS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => {
              setSelectedSector(sec.id);
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 flex items-center gap-1.5",
              selectedSector === sec.id
                ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/5 hover:bg-white/[0.06]"
            )}
          >
            <span>{sec.label}</span>
          </button>
        ))}
      </div>

      {/* Search & Grid/Table Switcher */}
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search US Titans..."
            className="bg-white/[0.03] border border-white/10 rounded-full pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40 w-44 sm:w-56"
          />
        </div>

        <div className="h-8 flex items-center gap-1 p-0.5 rounded-full bg-white/[0.03] border border-white/10">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={clsx(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs transition cursor-pointer",
              viewMode === "grid" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-white"
            )}
            title="Bento Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={clsx(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs transition cursor-pointer",
              viewMode === "table" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-white"
            )}
            title="High-Density Table View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
