import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EquityInspectorMetrics } from "./EquityInspectorMetrics";
import clsx from "clsx";

export function EquityActivePointInspector({
  activePoint,
  isTradeOnCurrentPage,
  onReset,
  baseCapital = 100000
}) {
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
              <span
                className={clsx(
                  "px-2.5 py-1 rounded-xl text-xs font-black font-mono border shadow-sm shrink-0",
                  activePoint.id === "genesis-origin"
                    ? "bg-white/10 border-white/20 text-white"
                    : activePoint.pnl >= 0
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                )}
              >
                {activePoint.id === "genesis-origin" ? "🏛️ BASELINE" : `#${activePoint.index}`}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-xs sm:text-sm truncate">
                    {activePoint.symbol}
                  </span>
                  {activePoint.id !== "genesis-origin" && (
                    <span
                      className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border",
                        activePoint.pnl >= 0
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                      )}
                    >
                      {activePoint.exitPrice && activePoint.targetPrice && activePoint.exitPrice >= activePoint.targetPrice * 0.998
                        ? "🎯 Target Hit"
                        : activePoint.stopLoss && activePoint.entryPrice && Math.abs(activePoint.stopLoss - activePoint.entryPrice) <= 0.25
                        ? "🛡️ Trailed BE Exit"
                        : activePoint.pnl >= 0
                        ? "✅ Profit Exit"
                        : "🛑 Stop Cut"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10.5px] text-slate-400 font-mono block truncate">
                    {activePoint.id === "genesis-origin" ? "Initial Vault Starting Capital" : `Settled at ${activePoint.time}`}
                  </span>
                  {!isTradeOnCurrentPage && (
                    <span className="px-2 py-0.2 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[9.5px] font-mono">
                      📍 Card on Another Page
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Center/Right: Metrics */}
            {activePoint.id !== "genesis-origin" ? (
              <EquityInspectorMetrics activePoint={activePoint} onReset={onReset} />
            ) : (
              <div className="flex items-center gap-3">
                <div className="bg-black/50 px-3 py-1 rounded-xl border border-white/10 text-right font-mono">
                  <span className="text-slate-400 text-[9.5px] block uppercase">Genesis Capital</span>
                  <span className="text-white font-black text-xs sm:text-sm">₹{baseCapital.toLocaleString("en-IN")}</span>
                </div>
                <button
                  type="button"
                  onClick={onReset}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer text-xs font-bold shrink-0"
                  title="Close Inspector"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="inspector-empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] font-mono text-slate-400"
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
