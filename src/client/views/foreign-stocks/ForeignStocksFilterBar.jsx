import React from "react";
import clsx from "clsx";
import { Search, LayoutGrid, List, Star, ArrowUpDown, PieChart, AlertTriangle, ShieldCheck, X } from "lucide-react";
import { soundEngine } from "../../utils/soundEngine";
import { SECTORS } from "./foreignStocksData";

export function ForeignStocksFilterBar({
  selectedSector,
  setSelectedSector,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  sortBy = "default",
  setSortBy,
  watchlistCount = 0,
  watchlistSectorDistribution = [],
  onToggleWatchlist,
  onResetFilters
}) {
  const isFiltered = selectedSector !== "all" || searchQuery.trim() !== "";
  const isHighTechConcentration = watchlistSectorDistribution.some((i) => i.pct >= 50 && (i.label.includes("AI") || i.label.includes("Cloud") || i.label.includes("Tech")));

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Sector Category Tabs + Watchlist Pill */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {/* Watchlist Quick Tab */}
          <button
            type="button"
            onClick={() => {
              setSelectedSector("watchlist");
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 flex items-center gap-1.5",
              selectedSector === "watchlist"
                ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/5 hover:bg-white/[0.06]"
            )}
          >
            <Star className={clsx("w-3 h-3", selectedSector === "watchlist" ? "fill-amber-300 text-amber-300" : "text-slate-400")} />
            <span>Watchlist</span>
            {watchlistCount > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-white font-black">
                {watchlistCount}
              </span>
            )}
          </button>

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

        {/* Right Side: Sorting, Search, Filter Reset & Grid/Table Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Multi-Factor Sort Selector */}
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3 h-3 text-cyan-400 absolute left-3 pointer-events-none" />
            <select
              value={sortBy}
              aria-label="Sort US Titans"
              onChange={(e) => {
                setSortBy?.(e.target.value);
                soundEngine.playTabSwitchTone();
              }}
              className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 rounded-full pl-8 pr-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-500/40 cursor-pointer transition appearance-none"
            >
              <option value="default" className="bg-[#0e1118] text-white">Sort: Curated</option>
              <option value="cagr" className="bg-[#0e1118] text-white">Sort: 3Y CAGR (High to Low)</option>
              <option value="gain" className="bg-[#0e1118] text-white">Sort: Today's Gainers</option>
              <option value="pe" className="bg-[#0e1118] text-white">Sort: Lowest P/E Multiple</option>
              <option value="mcap" className="bg-[#0e1118] text-white">Sort: Market Capitalization</option>
              <option value="beta" className="bg-[#0e1118] text-white">Sort: Lowest Beta (Defensive)</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search US Titans..."
              className="bg-white/[0.03] border border-white/10 rounded-full pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40 w-36 sm:w-48"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-slate-400 hover:text-white"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Clear Filters Chip (if active) */}
          {isFiltered && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-[10px] font-mono text-cyan-300 hover:text-white px-2 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition cursor-pointer"
              title="Reset all filters"
            >
              Reset
            </button>
          )}

          {/* Grid / Table Toggle */}
          <div className="h-8 flex items-center gap-1 p-0.5 rounded-full bg-white/[0.03] border border-white/10">
            <button
              type="button"
              onClick={() => {
                setViewMode("grid");
                soundEngine.playTabSwitchTone();
              }}
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
              onClick={() => {
                setViewMode("table");
                soundEngine.playTabSwitchTone();
              }}
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

      {/* 📊 Watchlist Sector Diversification & Portfolio Rebalance Telemetry */}
      {selectedSector === "watchlist" && watchlistSectorDistribution.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-white/[0.02] to-transparent border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <PieChart className="w-3.5 h-3.5" />
              <span>Sector Exposure Telemetry:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {watchlistSectorDistribution.map((item) => (
                <span
                  key={item.label}
                  className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 font-mono text-[10px] text-slate-300"
                >
                  {item.label}: <strong className="text-amber-300 font-bold">{item.pct}%</strong> ({item.count})
                </span>
              ))}
            </div>
          </div>

          {/* 1-Click Diversification Recommendation */}
          {isHighTechConcentration && onToggleWatchlist && (
            <div className="flex items-center gap-2 text-[10px] font-mono bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/25 flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-amber-200">&gt;50% High-Beta Tech Exposure.</span>
              <button
                type="button"
                onClick={() => {
                  onToggleWatchlist("VOO");
                  soundEngine.playSuccessTone();
                }}
                className="px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold transition cursor-pointer active:scale-95"
                title="Add S&P 500 Index ETF to anchor portfolio"
              >
                + Anchor with VOO
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ForeignStocksFilterBar;
