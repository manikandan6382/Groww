import React, { useState, useRef, useEffect } from "react";
import { useTradingStore, INDIAN_STOCK_META, getStockMeta, resolveIndexLotSize } from "../../stores/useTradingStore";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { Sparkline } from "../common/Sparkline";
import { RollingTicker } from "../common/RollingTicker";
import { soundEngine } from "../../utils/soundEngine";
import { Search, Plus, Trash2, TrendingUp, TrendingDown, Radio, Zap, Sparkles } from "lucide-react";
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
    setActiveSectorFilter,
    setActiveView,
    setOrderPadPreFill
  } = useTradingStore();

  const [search, setSearch] = useState("");
  const searchInputRef = useRef(null);

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

  const handleTabChange = (tabId) => {
    setActiveSectorFilter(tabId);
    soundEngine.playTabSwitchTone();
  };

  const handleAddPreset = (sym) => {
    addWatchSymbol(sym);
    soundEngine.playSuccessTone();
  };

  return (
    <div className="p-6 sm:p-8 rounded-[32px] bg-[#070b14]/80 backdrop-blur-3xl border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.18)] relative overflow-hidden space-y-6 hover:border-white/[0.12] transition-colors">
      {/* 🌌 Apple Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-[420px] h-[220px] bg-emerald-500/[0.05] rounded-full blur-[90px] pointer-events-none -mt-24" />

      {/* 1. Header: Master Title, Telemetry Badges & Active Count */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-full border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] whitespace-nowrap">
              ⚡ REAL-TIME RADAR
            </span>
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 font-mono flex items-center gap-1.5 whitespace-nowrap">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              NSE / BSE Live Quotes
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Market Watchlist &amp; Liquidity Radar
          </h2>
          <p className="text-xs text-slate-300">
            High-conviction market leaders, index bellwethers, and real-time option scalp bridges.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-mono font-bold text-slate-300 px-3.5 py-1.5 rounded-2xl bg-white/[0.04] border border-white/10 shadow-sm whitespace-nowrap">
            {filteredSymbols.length} of {watchlistSymbols.length} Tracked
          </span>
        </div>
      </div>

      {/* 2. Search & Quick Presets Strip */}
      <div className="relative space-y-3">
        {/* Apple Vision Pro Frosted Search Input */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search NSE/BSE stocks (e.g. RELIANCE, TCS, HDFCBANK)..."
            className="w-full bg-black/40 border border-white/15 rounded-2xl pl-10 pr-20 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-xl transition shadow-inner font-sans"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                soundEngine.playSuccessTone();
              }}
              className="absolute right-3.5 text-xs font-mono font-bold text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg transition cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Presets Strip */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-slate-400 text-[11px] font-bold mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Quick Add:</span>
          </span>
          {QUICK_PRESETS.map((p) => (
            <button
              key={p.symbol}
              type="button"
              onClick={() => handleAddPreset(p.symbol)}
              className="px-2.5 py-1 rounded-xl bg-white/[0.03] hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 transition-all active:scale-95 text-[11px] font-mono shadow-sm cursor-pointer whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Frosted Segmented Category Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-2xl shadow-inner overflow-x-auto no-scrollbar text-xs">
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
            onClick={() => handleTabChange(tab.id)}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl font-bold transition-all duration-200 whitespace-nowrap cursor-pointer active:scale-95",
              activeSectorFilter === tab.id
                ? "bg-white/15 text-white border border-white/20 shadow-[0_2px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.25)]"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Luxury Watchlist Spatial Tiles Grid */}
      {filteredSymbols.length === 0 ? (
        <div className="py-12 rounded-2xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-white">No watchlist symbols match your search</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setActiveSectorFilter("all");
              soundEngine.playSuccessTone();
            }}
            className="px-4 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300 transition active:scale-95 cursor-pointer shadow-sm"
          >
            Reset Watchlist Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredSymbols.map((symbol) => {
            const meta = getStockMeta(symbol);
            const isGain = meta.change >= 0;
            const cleanSym = symbol.replace(/\.NS$/, "");

            return (
              <div
                key={symbol}
                className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:from-white/[0.07] hover:to-white/[0.02] border border-white/[0.08] hover:border-cyan-500/35 transition-all duration-200 group relative shadow-sm hover:shadow-[0_16px_36px_rgba(0,0,0,0.4)] flex flex-col justify-between space-y-3"
              >
                {/* Tile Top: Avatar, Symbol & Quick Action Hub */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white flex-shrink-0 shadow-sm border border-white/10"
                      style={{ backgroundColor: `${meta.color || "#38bdf8"}25` }}
                    >
                      {cleanSym.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white font-mono group-hover:text-cyan-300 transition truncate">
                        {cleanSym}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[110px]">
                        {meta.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* 1-Click Deploy to Paper Lab */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const spot = Number(meta.price || 1000);
                        const roundedStrike = Math.round(spot / 50) * 50;
                        setOrderPadPreFill({
                          symbol: `${cleanSym} ${roundedStrike} CE`,
                          underlying: cleanSym,
                          entryPrice: Number((spot * 0.02).toFixed(2)),
                          targetPrice: Number((spot * 0.026).toFixed(2)),
                          stopLoss: Number((spot * 0.016).toFixed(2)),
                          quantity: 1,
                          lotSize: resolveIndexLotSize(cleanSym)
                        });
                        setActiveView("paper");
                        soundEngine.playSuccessTone();
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/50 text-[10px] font-mono font-bold text-cyan-300 transition active:scale-95 cursor-pointer shadow-sm"
                      title={`1-Click Deploy ${cleanSym} to Live Order Pad`}
                    >
                      <Zap className="w-2.5 h-2.5 text-cyan-400" />
                      <span>Deploy</span>
                    </button>

                    {/* Remove Symbol */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWatchSymbol(symbol);
                        soundEngine.playSuccessTone();
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tile Bottom: Live LTP, Trend Pill & Mini-Sparkline */}
                <div className="flex items-end justify-between pt-1 border-t border-white/[0.04]">
                  <div>
                    <div className="text-sm font-mono font-black text-white">
                      <RollingTicker
                        value={meta.price}
                        prefix="₹"
                        decimalPlaces={2}
                        className="text-white font-black font-mono"
                      />
                    </div>
                    <div className={clsx(
                      "text-[10px] font-mono font-bold flex items-center gap-1 mt-0.5",
                      isGain ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isGain ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                      <span>{isGain ? "+" : ""}{meta.change} ({isGain ? "+" : ""}{meta.changePct}%)</span>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg bg-white/[0.02] border border-white/5 shadow-inner">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
