import React, { useState, useEffect } from "react";
import { Search, Sparkles, Plus, CornerDownLeft } from "lucide-react";
import clsx from "clsx";
import { soundEngine } from "../../../utils/soundEngine";
import { INDIAN_STOCK_META } from "../../../stores/useTradingStore";
import { QUICK_PRESETS } from "./watchlistRadarUtils";

export const WatchlistSearchStrip = React.memo(function WatchlistSearchStrip({
  search,
  setSearch,
  searchInputRef,
  searchCandidates = [],
  handleAddPreset,
  watchlistSymbols = [],
}) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    setFocusedIndex(0);
  }, [search]);

  const handleKeyDown = (e) => {
    if (!searchCandidates.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % searchCandidates.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + searchCandidates.length) % searchCandidates.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetSym = searchCandidates[focusedIndex] || searchCandidates[0];
      if (targetSym) {
        handleAddPreset(targetSym);
        setSearch("");
        setFocusedIndex(0);
      }
    }
  };

  return (
    <div className="relative space-y-3">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search NSE/BSE stocks to track or trade (e.g. RELIANCE, TCS, INFY)..."
          className="w-full bg-black/40 border border-white/15 rounded-2xl pl-10 pr-24 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 backdrop-blur-xl transition shadow-inner font-sans"
        />
        {search ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              soundEngine.playSuccessTone();
            }}
            className="absolute right-3 text-xs font-mono font-bold text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg transition cursor-pointer"
          >
            Clear
          </button>
        ) : (
          <span className="absolute right-3 text-[10px] font-mono text-slate-500 bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-md pointer-events-none hidden sm:inline-block">
            / to search
          </span>
        )}
      </div>

      {searchCandidates.length > 0 && (
        <div className="p-3 rounded-2xl bg-[#121424]/95 border border-white/10 backdrop-blur-3xl shadow-[0_16px_40px_rgba(0,0,0,0.8)] space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between text-[10px] font-bold text-cyan-300 uppercase tracking-wider font-mono">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Available to Add to Watchlist:</span>
            </div>
            <span className="text-slate-400 font-normal hidden sm:inline-flex items-center gap-1">
              <span>Use <kbd className="text-cyan-300">↑</kbd> <kbd className="text-cyan-300">↓</kbd> then</span>
              <kbd className="px-1 bg-white/10 rounded text-cyan-300 flex items-center gap-0.5"><CornerDownLeft className="w-2.5 h-2.5" /> Enter</kbd>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {searchCandidates.map((sym, idx) => {
              const meta = INDIAN_STOCK_META[sym];
              const clean = sym.replace(/\.NS$/, "");
              const isGain = (meta?.change || 0) >= 0;
              const isSelected = focusedIndex === idx;

              return (
                <div
                  key={sym}
                  onClick={() => {
                    handleAddPreset(sym);
                    setSearch("");
                  }}
                  className={clsx(
                    "p-2.5 rounded-xl border flex items-center justify-between gap-3 transition cursor-pointer group",
                    isSelected
                      ? "bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                      : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10"
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white font-mono group-hover:text-cyan-300 transition">{clean}</div>
                    <div className="text-[10px] text-slate-400 truncate">{meta?.name}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-white">₹{meta?.price}</div>
                      <div className={clsx("text-[9px] font-mono", isGain ? "text-emerald-400" : "text-rose-400")}>
                        {isGain ? "+" : ""}{meta?.changePct}%
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddPreset(sym);
                        setSearch("");
                      }}
                      className={clsx(
                        "p-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm",
                        isSelected
                          ? "bg-cyan-400 text-slate-950 font-black"
                          : "bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/40"
                      )}
                      title="Add to Watchlist"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        <span className="text-slate-400 text-[11px] font-bold mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Quick Add:</span>
        </span>
        {QUICK_PRESETS.map((p) => {
          const isTracked = watchlistSymbols.includes(p.symbol);
          return (
            <button
              key={p.symbol}
              type="button"
              onClick={() => {
                if (!isTracked) handleAddPreset(p.symbol);
              }}
              disabled={isTracked}
              className={clsx(
                "px-2.5 py-1 rounded-xl transition-all text-[11px] font-mono shadow-sm whitespace-nowrap flex items-center gap-1",
                isTracked
                  ? "bg-white/[0.02] border border-white/5 text-slate-500 cursor-default"
                  : "bg-white/[0.04] hover:bg-white/[0.10] border border-white/10 text-slate-300 hover:text-white cursor-pointer active:scale-95"
              )}
            >
              <span>{isTracked ? "✓" : "+"}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
