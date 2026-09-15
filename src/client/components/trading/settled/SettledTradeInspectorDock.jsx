import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { TradeLifecycleCanvas } from "../TradeLifecycleCanvas";
import { ViewErrorBoundary } from "../../common/ViewErrorBoundary";
import { formatTimeShort } from "../../../utils/tradeNormalizer";

export function SettledTradeInspectorDock({ activePoint, onSnapLatest, playAudio }) {
  return (
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
  );
}
