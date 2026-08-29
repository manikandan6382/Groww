import React, { useState } from "react";
import { useTradingStore, INDIAN_STOCK_META, getStockMeta } from "../../stores/useTradingStore";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { Sparkline } from "../common/Sparkline";
import { Search, Plus, Trash2, TrendingUp, TrendingDown, Radio } from "lucide-react";
import clsx from "clsx";

const QUICK_PRESETS = [
  { symbol: "RELIANCE.NS", label: "+ RELIANCE" },
  { symbol: "TCS.NS", label: "+ TCS" },
  { symbol: "HDFCBANK.NS", label: "+ HDFCBANK" },
  { symbol: "INFY.NS", label: "+ INFY" },
  { symbol: "SBIN.NS", label: "+ SBIN" },
  { symbol: "GOLDBEES.NS", label: "+ GOLDBEES" },
  { symbol: "TATAMOTORS.NS", label: "+ TATAMOTORS" },
];

export function WatchlistSection() {
  const { 
    watchlistSymbols, 
    addWatchSymbol, 
    removeWatchSymbol, 
    activeSectorFilter, 
    setActiveSectorFilter 
  } = useTradingStore();

  const [search, setSearch] = useState("");

  const filteredSymbols = watchlistSymbols.filter((symbol) => {
    const meta = getStockMeta(symbol);
    if (search && !symbol.toLowerCase().includes(search.toLowerCase()) && !meta.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (activeSectorFilter === "nifty") {
      return ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS"].includes(symbol);
    }
    if (activeSectorFilter === "banking") {
      return meta.sector.toLowerCase().includes("bank");
    }
    if (activeSectorFilter === "tech") {
      return meta.sector.toLowerCase().includes("it") || meta.sector.toLowerCase().includes("tech");
    }
    if (activeSectorFilter === "gainers") {
      return meta.change >= 0;
    }
    if (activeSectorFilter === "dips") {
      return meta.change < 0;
    }
    return true;
  });

  return (
    <div className="p-5 rounded-2xl bg-app-card/70 backdrop-blur-xl border border-white/5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              ⚡ REAL-TIME RADAR
            </span>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              NSE / BSE Live Quotes
            </span>
          </div>
          <h2 className="text-sm md:text-base font-bold text-white">Market Watchlist</h2>
          <span className="text-xs text-slate-400">
            High-conviction market leaders &amp; ETF trends with real-time price monitoring
          </span>
        </div>
        <span className="text-xs font-bold text-slate-300 px-3 py-1 rounded-xl bg-white/5 border border-white/10 self-start sm:self-auto">
          {filteredSymbols.length} of {watchlistSymbols.length} Tracked
        </span>
      </div>

      {/* Search & Quick Presets Strip */}
      <div className="space-y-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search NSE/BSE stocks (e.g. RELIANCE, TCS, HDFCBANK)..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-20 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Presets Strip */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-slate-400 text-[11px] font-medium mr-1">Quick Add:</span>
          {QUICK_PRESETS.map((p) => (
            <button
              key={p.symbol}
              type="button"
              onClick={() => addWatchSymbol(p.symbol)}
              className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-slate-300 hover:text-cyan-300 transition text-[11px] font-mono"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sector Segmented Control */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/5 overflow-x-auto no-scrollbar text-xs">
        {[
          { id: "all", label: "All Tracked" },
          { id: "nifty", label: "🇮🇳 Nifty Top 5" },
          { id: "banking", label: "🏦 Banking" },
          { id: "tech", label: "💻 Tech & IT" },
          { id: "gainers", label: "▲ Gainers" },
          { id: "dips", label: "▼ Dips" }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSectorFilter(tab.id)}
            className={clsx(
              "px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap",
              activeSectorFilter === tab.id
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Watchlist Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filteredSymbols.map((symbol) => {
          const meta = getStockMeta(symbol);
          const isGain = meta.change >= 0;

          return (
            <div
              key={symbol}
              className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-cyan-500/30 transition group relative"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-xs font-bold text-white font-mono group-hover:text-cyan-300 transition">
                    {symbol.replace(/\.NS$/, "")}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {meta.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWatchSymbol(symbol);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                  title="Remove from watchlist"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-end justify-between mt-3">
                <div>
                  <div className="text-xs font-mono font-extrabold text-white">
                    ₹{meta.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div className={clsx("text-[10px] font-mono font-bold flex items-center gap-0.5", isGain ? "text-emerald-400" : "text-rose-400")}>
                    {isGain ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {isGain ? "+" : ""}{meta.change} ({isGain ? "+" : ""}{meta.changePct}%)
                  </div>
                </div>
                <Sparkline
                  data={[
                    meta.price - 10,
                    meta.price - 5,
                    meta.price + (isGain ? 4 : -4),
                    meta.price + (isGain ? 8 : -8),
                    meta.price
                  ]}
                  isGain={isGain}
                  width={48}
                  height={18}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
