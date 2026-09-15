import React from "react";
import { Search } from "lucide-react";

export function HoldingsTableHeader({
  gainersCount,
  losersCount,
  topHolding,
  search,
  setSearch,
  searchInputRef,
}) {
  return (
    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-white/[0.08] pb-5">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] whitespace-nowrap">
            EQUITY ASSET MATRIX
          </span>
          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 font-mono flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {gainersCount} Gainers · {losersCount} Losers
          </span>
          <span className="text-[10px] font-bold text-slate-300 bg-white/5 px-3 py-1 rounded-full border border-white/10 font-mono whitespace-nowrap">
            {topHolding?.tradingsymbol ? `Top Holding: ${topHolding.tradingsymbol} (${topHolding.weightPct}%)` : "0 Active Positions"}
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
          Active Holdings &amp; Asset Concentration Matrix
        </h2>
        <p className="text-xs text-slate-300">
          Real-time equity valuation, portfolio weight dispersion, and 1-click option scalp deployment.
        </p>
      </div>

      {/* Apple Vision Pro Style Frosted Search Input */}
      <div className="relative flex items-center min-w-[280px]">
        <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stock, sector... (Press /)"
          className="w-full bg-black/40 border border-white/15 rounded-2xl pl-10 pr-12 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-xl transition shadow-inner font-sans"
        />
        <div className="absolute right-3 flex items-center gap-1">
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          ) : (
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/10 border border-white/10 px-1.5 py-0.5 rounded-md">
              /
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
