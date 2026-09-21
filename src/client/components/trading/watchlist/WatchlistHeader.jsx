import React from "react";
import { Zap, Radio, LayoutGrid, ListFilter, TrendingUp, DollarSign } from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../../utils/soundEngine";

export const WatchlistHeader = React.memo(function WatchlistHeader({
  viewMode,
  setViewMode,
  sortBy,
  setSortBy,
  filteredCount,
  totalCount,
  currencySymbol = "₹",
  currency = "INR",
}) {
  return (
    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] whitespace-nowrap font-mono flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400/30" />
            <span>MARKET LIQUIDITY RADAR</span>
          </span>
          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 font-mono flex items-center gap-1.5 whitespace-nowrap">
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
            NSE / BSE Realtime Tick Stream
          </span>
          <span className="text-[10px] font-mono text-slate-300 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-cyan-400" />
            <span>{currencySymbol} {currency}</span>
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span>Market Watchlist &amp; Liquidity Radar</span>
        </h2>
        <p className="text-xs text-slate-300">
          Institutional volume tracking, 52-Week range proximity, order depth velocity, and 1-click execution desk.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap self-start lg:self-auto">
        {/* View Switcher: Cards vs Matrix */}
        <div className="flex items-center p-1 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-2xl shadow-inner">
          <button
            type="button"
            onClick={() => {
              setViewMode("grid");
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              viewMode === "grid"
                ? "bg-white/[0.14] text-white border border-white/[0.22] shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
            title="Spatial Grid Cards"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("matrix");
              soundEngine.playTabSwitchTone();
            }}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              viewMode === "matrix"
                ? "bg-white/[0.14] text-white border border-white/[0.22] shadow-sm"
                : "text-slate-400 hover:text-white"
            )}
            title="Detailed Liquidity Matrix Table"
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Matrix</span>
          </button>
        </div>

        {/* Sort selector */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-black/50 border border-white/10 text-xs font-mono text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-white/30 cursor-pointer"
          >
            <option value="default">Default Order</option>
            <option value="rvol">⚡ Highest RVOL Multiplier</option>
            <option value="gainers">▲ Top Gainers (%)</option>
            <option value="dips">▼ Top Dips (%)</option>
            <option value="price_high">Price: High to Low</option>
            <option value="price_low">Price: Low to High</option>
          </select>
        </div>

        <span className="text-xs font-mono font-bold text-slate-300 px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 shadow-sm whitespace-nowrap">
          {filteredCount} of {totalCount} Tracked
        </span>
      </div>
    </div>
  );
});
