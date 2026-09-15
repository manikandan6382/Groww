import React from "react";
import clsx from "clsx";

export function EquityTradeReelHeader({
  totalTradesCount,
  winTradesCount,
  lossTradesCount,
  reelFilter,
  setReelFilter,
  reelSort,
  setReelSort,
  activePoint,
  onSnapToLatest,
  playScrubAudio,
  maxWin,
  recoveryFactor
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-[11px] font-bold text-slate-400 font-mono pb-2 border-b border-white/[0.05]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-cyan-400 text-sm">🎯</span>
        <span className="uppercase tracking-wider text-white font-black text-xs sm:text-sm">SETTLED TRADE REEL</span>

        {/* Segmented Outcome Filters */}
        <div className="flex rounded-xl bg-white/[0.04] border border-white/10 p-0.5 text-[10px] font-sans">
          <button
            type="button"
            onClick={() => {
              playScrubAudio();
              setReelFilter("all");
            }}
            className={clsx(
              "px-2 py-0.5 rounded-lg font-bold transition cursor-pointer",
              reelFilter === "all" ? "bg-cyan-500/25 text-cyan-300 shadow-sm" : "text-slate-400 hover:text-white"
            )}
          >
            All ({totalTradesCount})
          </button>
          <button
            type="button"
            onClick={() => {
              playScrubAudio();
              setReelFilter("win");
            }}
            className={clsx(
              "px-2 py-0.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1",
              reelFilter === "win" ? "bg-emerald-500/25 text-emerald-300 shadow-sm" : "text-slate-400 hover:text-white"
            )}
          >
            <span>🟢 Wins</span>
            <span>({winTradesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playScrubAudio();
              setReelFilter("loss");
            }}
            className={clsx(
              "px-2 py-0.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1",
              reelFilter === "loss" ? "bg-rose-500/25 text-rose-300 shadow-sm" : "text-slate-400 hover:text-white"
            )}
          >
            <span>🛑 Losses</span>
            <span>({lossTradesCount})</span>
          </button>
        </div>

        {/* Sort Order Toggle */}
        <button
          type="button"
          onClick={() => {
            playScrubAudio();
            setReelSort(reelSort === "newest" ? "chrono" : "newest");
          }}
          className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 text-[10px] font-mono transition flex items-center gap-1 cursor-pointer active:scale-95"
          title="Toggle between Newest First and Chronological order"
        >
          <span>{reelSort === "newest" ? "⏳ Newest First" : "📈 Chronological"}</span>
        </button>

        {activePoint !== null && (
          <button
            type="button"
            onClick={onSnapToLatest}
            className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-[10px] font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm animate-pulse"
            title="Snap curve back to latest trade"
          >
            <span>↺ Snap to Latest</span>
          </button>
        )}
      </div>

      {/* Quick Metrics Pills */}
      <div className="flex items-center gap-2 text-[10px] flex-wrap self-start lg:self-auto">
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Best Win: +₹{maxWin.toLocaleString("en-IN")}
        </span>
        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          Recovery: {recoveryFactor}
        </span>
      </div>
    </div>
  );
}
