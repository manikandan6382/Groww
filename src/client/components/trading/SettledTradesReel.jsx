import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { TradeLifecycleCanvas } from "./TradeLifecycleCanvas";
import { ViewErrorBoundary } from "../common/ViewErrorBoundary";
import { soundEngine } from "../../utils/soundEngine";
import { normalizeTrade, formatTimeShort } from "../../utils/tradeNormalizer";

const PAGE_SIZE = 25;

export function SettledTradesReel({
  equityPoints = [],
  activePoint = null,
  selectedId = null,
  onSelectTrade,
  onSnapLatest,
  maxWin = 0,
  recoveryFactor = 0,
  baseCapital = 100000
}) {
  const [reelFilter, setReelFilter] = useState("all"); // "all" | "win" | "loss"
  const [reelSort, setReelSort] = useState("newest");  // "newest" | "chrono"
  const [reelPage, setReelPage] = useState(1);

  const playAudio = () => {
    if (typeof soundEngine?.playScrub === "function") {
      soundEngine.playScrub();
    }
  };

  // Filtered and Sorted Reel Points
  const displayReelPoints = useMemo(() => {
    if (!equityPoints.length) return [];
    let pts = equityPoints.map((p) => normalizeTrade(p));

    if (reelFilter === "win") {
      pts = pts.filter((p) => p.id === "genesis-origin" || p.pnl >= 0);
    } else if (reelFilter === "loss") {
      pts = pts.filter((p) => p.id === "genesis-origin" || p.pnl < 0);
    }

    if (reelSort === "newest") {
      const genesis = pts.find((p) => p.id === "genesis-origin");
      const regular = pts.filter((p) => p.id !== "genesis-origin").reverse();
      return genesis ? [genesis, ...regular] : regular;
    }

    return pts;
  }, [equityPoints, reelFilter, reelSort]);

  // 25-Card Pagination
  const totalReelMatches = displayReelPoints.length;
  const totalPages = Math.ceil(totalReelMatches / PAGE_SIZE) || 1;
  const currentPage = Math.min(reelPage, totalPages);
  const paginatedPoints = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return displayReelPoints.slice(start, start + PAGE_SIZE);
  }, [displayReelPoints, currentPage]);

  // Keyboard Arrow Navigation
  const handleKeyDown = (e) => {
    if (!displayReelPoints.length) return;
    const currentIdx = displayReelPoints.findIndex((p) => p.id === activePoint?.id);

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      playAudio();
      const nextIdx = currentIdx < displayReelPoints.length - 1 ? currentIdx + 1 : 0;
      onSelectTrade(displayReelPoints[nextIdx].id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      playAudio();
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : displayReelPoints.length - 1;
      onSelectTrade(displayReelPoints[prevIdx].id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      playAudio();
      onSnapLatest();
    }
  };

  return (
    <div className="space-y-3.5 mt-4 pt-4 border-t border-white/[0.08]">
      {/* Reel Header Controls & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Outcome Filter Pills */}
          <div className="flex items-center p-0.5 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => {
                playAudio();
                setReelFilter("all");
                setReelPage(1);
              }}
              className={clsx(
                "px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1",
                reelFilter === "all" ? "bg-cyan-500/25 text-cyan-300 shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              <span>All Settled</span>
              <span>({equityPoints.slice(1).length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playAudio();
                setReelFilter("win");
                setReelPage(1);
              }}
              className={clsx(
                "px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1",
                reelFilter === "win" ? "bg-emerald-500/25 text-emerald-300 shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              <span>🎯 Wins</span>
              <span>({equityPoints.slice(1).filter((p) => p.pnl >= 0).length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playAudio();
                setReelFilter("loss");
                setReelPage(1);
              }}
              className={clsx(
                "px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1",
                reelFilter === "loss" ? "bg-rose-500/25 text-rose-300 shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              <span>🛑 Losses</span>
              <span>({equityPoints.slice(1).filter((p) => p.pnl < 0).length})</span>
            </button>
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => {
              playAudio();
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
              onClick={() => {
                playAudio();
                onSnapLatest();
              }}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-[10px] font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm animate-pulse"
              title="Snap curve back to latest trade"
            >
              <span>↺ Snap to Latest</span>
            </button>
          )}
        </div>

        {/* Quick Metrics Pills */}
        <div className="flex items-center gap-2 text-[10px] flex-wrap self-start sm:self-auto">
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

      {/* Quick Execution Telemetry Inspector Dock */}
      <AnimatePresence mode="wait">
        {activePoint !== null ? (
          <motion.div
            key={activePoint.id}
            initial={{ opacity: 0, y: -6, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.995 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl bg-gradient-to-r from-[#0c1a2f]/95 via-[#081324]/95 to-[#050d1a]/95 border border-cyan-400/40 p-3 sm:p-3.5 backdrop-blur-2xl shadow-[0_12px_32px_rgba(6,182,212,0.18),inset_0_1px_0_rgba(255,255,255,0.2)]"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Left: Trade Identity & Outcome Badge */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={clsx(
                  "px-2.5 py-1 rounded-xl text-xs font-black font-mono border shadow-sm shrink-0",
                  activePoint.id === "genesis-origin" 
                    ? "bg-white/10 border-white/20 text-white" 
                    : activePoint.pnl >= 0 
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" 
                    : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                )}>
                  {activePoint.id === "genesis-origin" ? "🏛️ BASELINE" : `#${activePoint.index ?? 1}`}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-xs sm:text-sm truncate">
                      {activePoint.symbol}
                    </span>
                    {activePoint.id !== "genesis-origin" && (
                      <span className={clsx(
                        "text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold",
                        activePoint.closeReason?.includes("TARGET") ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" :
                        activePoint.closeReason?.includes("STOP") ? "bg-rose-500/10 border-rose-500/30 text-rose-300" :
                        "bg-white/10 border-white/20 text-slate-300"
                      )}>
                        {activePoint.closeReason?.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                    <span>{formatTimeShort(activePoint.entryTime || activePoint.time)}</span>
                    <span>·</span>
                    <span>{activePoint.direction || "LONG"}</span>
                    <span>·</span>
                    <span>{activePoint.totalQty ?? 65} Qty</span>
                  </div>
                </div>
              </div>

              {/* Middle: Execution Metrics Bar */}
              {activePoint.id !== "genesis-origin" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px] font-mono bg-white/[0.03] p-2 rounded-xl border border-white/5">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Entry</span>
                    <span className="text-cyan-300 font-bold">₹{Number(activePoint.entryPrice || 100).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Exit</span>
                    <span className="text-white font-bold">₹{Number(activePoint.exitPrice || 100).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Friction Drag</span>
                    <span className="text-amber-400 font-bold">₹{Number(activePoint.charges || 55.20).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">Net Realized</span>
                    <span className={clsx("font-black", activePoint.pnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {activePoint.pnl >= 0 ? "+" : ""}₹{Number(activePoint.pnl || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Right: Close / Reset Button */}
              <button
                type="button"
                onClick={() => {
                  playAudio();
                  onSnapLatest();
                }}
                className="self-end lg:self-center px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Close Inspector</span>
                <span className="text-[10px] text-slate-500">Esc</span>
              </button>
            </div>

            {/* Blast-Radius Isolated Trade Lifecycle Visualizer */}
            {activePoint.id !== "genesis-origin" && (
              <ViewErrorBoundary fallbackTitle="Trade Trajectory Canvas Unavailable">
                <TradeLifecycleCanvas trade={activePoint} />
              </ViewErrorBoundary>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="inspector-empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] font-mono text-slate-400"
          >
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">💡</span>
              <span className="truncate">Click or use Arrow Keys (←, →, ↑, ↓) to inspect Entry, Exit, Target, Trailing Stop, and Friction Drag.</span>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">Press Esc or tap card to reset</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trade Cards Grid */}
      {displayReelPoints.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>No trades match the current outcome filter. Select "All" to view your complete trade reel.</span>
        </div>
      ) : equityPoints.length <= 1 ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" />
          <span>Vault initialized at ₹{baseCapital.toLocaleString("en-IN")} baseline. Execute setups to dynamically chart compounding!</span>
        </div>
      ) : (
        <div 
          tabIndex={0}
          onKeyDown={handleKeyDown}
          title="Trade Reel: Use Arrow Keys (←, →, ↑, ↓) to navigate trades · Esc to snap to live"
          className="max-h-[460px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 scrollbar-track-transparent focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/40 rounded-2xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
            {paginatedPoints.map((p) => {
              const originalIdx = p.originalIndex ?? p.index;
              const isSelected = activePoint?.id === p.id;
              const isGenesis = p.id === "genesis-origin" || originalIdx === 0;
              const isCE = p.symbol && p.symbol.includes("CE");
              const isPE = p.symbol && p.symbol.includes("PE");
              const isWin = p.pnl >= 0;

              if (isGenesis) {
                return (
                  <button
                    key="genesis-anchor"
                    type="button"
                    onClick={() => {
                      playAudio();
                      onSelectTrade(selectedId === p.id ? null : p.id);
                    }}
                    className={clsx(
                      "p-3 rounded-2xl border text-left font-mono transition-all duration-300 cursor-pointer active:scale-[0.97] flex flex-col justify-between gap-2.5 relative overflow-hidden group/card focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 [content-visibility:auto] [contain-intrinsic-size:110px]",
                      isSelected
                        ? "bg-gradient-to-b from-cyan-500/20 via-[#121424]/95 to-[#0d0f14]/95 border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400/40 -translate-y-1"
                        : "bg-[#0d0f14]/90 border-white/10 text-slate-300 hover:border-white/20 hover:shadow-[0_12px_28px_rgba(0,0,0,0.45)] hover:-translate-y-1"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono bg-slate-500/15 border border-slate-500/30 text-slate-200">
                        🏛️ GENESIS ANCHOR
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Origin</span>
                    </div>

                    <div className="space-y-0.5 w-full">
                      <span className="text-xs font-bold text-slate-200 truncate block tracking-tight">
                        Vault Starting Capital
                      </span>
                      <div className="text-sm sm:text-base font-black font-mono tracking-tight text-white">
                        ₹{baseCapital.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 w-full pt-1.5 border-t border-white/[0.05] text-[10.5px] font-mono">
                      <span className="text-slate-400">Compounding Baseline</span>
                      <span className="text-[9px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.2 rounded font-bold">
                        Day 0
                      </span>
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    playAudio();
                    onSelectTrade(selectedId === p.id ? null : p.id);
                  }}
                  className={clsx(
                    "p-3 rounded-2xl border text-left font-mono transition-all duration-300 cursor-pointer active:scale-[0.97] flex flex-col justify-between gap-2.5 relative overflow-hidden group/card focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060709] [content-visibility:auto] [contain-intrinsic-size:110px]",
                    isSelected
                      ? "bg-gradient-to-b from-cyan-500/15 via-[#121424]/95 to-[#0d0f14]/95 border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-cyan-400/40 -translate-y-1"
                      : "bg-gradient-to-b from-[#121424]/85 via-[#0d0f14]/85 to-[#060709]/85 border-white/[0.07] text-slate-300 hover:text-white hover:from-[#1a1f2c]/90 hover:to-[#0d0f14]/90 hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  )}
                >
                  {/* Top Row: Jewel Badge + Option Pill + Timestamp */}
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <div className="flex items-center gap-1.5">
                      <span className={clsx(
                        "px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase font-mono border shadow-sm",
                        isWin ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                      )}>
                        #{originalIdx}
                      </span>
                      {(isCE || isPE) && (
                        <span className={clsx(
                          "px-1 py-0.2 rounded text-[9px] font-black font-mono border",
                          isCE ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        )}>
                          {isCE ? "CE" : "PE"}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      {formatTimeShort(p.entryTime || p.time)}
                    </span>
                  </div>

                  {/* Middle: Symbol & Realized P&L */}
                  <div className="space-y-0.5 w-full min-w-0">
                    <span 
                      title={p.symbol}
                      className="text-xs font-bold text-white truncate block tracking-tight group-hover/card:text-cyan-300 transition-colors"
                    >
                      {p.symbol}
                    </span>
                    <div className="flex items-baseline justify-between gap-1">
                      <div className={clsx("text-sm sm:text-base font-black font-mono tracking-tight", isWin ? "text-emerald-400" : "text-rose-400")}>
                        {isWin ? "+" : ""}₹{p.pnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {p.pnl !== 0 && (
                        <span className={clsx("text-[10px] font-mono font-bold", isWin ? "text-emerald-400/80" : "text-rose-400/80")}>
                          {isWin ? "+" : ""}{((p.pnl / (p.capital - p.pnl || baseCapital)) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Vault Balance + ATH/DD Pill */}
                  <div className="flex items-center justify-between gap-1 w-full pt-1.5 border-t border-white/[0.05] text-[10.5px] font-mono">
                    <span className="text-slate-400 truncate">
                      ₹{Number(p.capital || baseCapital).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    {p.drawdownPct > 0 ? (
                      <span className="text-[9px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded font-bold">
                        -{p.drawdownPct}% DD
                      </span>
                    ) : (
                      <span className="text-[9px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                        ATH 🌟
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* View Capping / 25-Card Pagination Footer */}
          {totalReelMatches > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 pt-2.5 mt-2 text-[11px] font-mono border-t border-white/[0.06] flex-wrap">
              <span className="text-slate-400">
                Showing page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong> ({totalReelMatches} settled trades)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => {
                    playAudio();
                    setReelPage((p) => Math.max(1, p - 1));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => {
                    playAudio();
                    setReelPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition cursor-pointer flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
