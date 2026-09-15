import React from "react";
import { motion } from "framer-motion";
import { Zap, HelpCircle, Info, Flame } from "lucide-react";

export function DisciplineExpectancyMatrix({
  matrixTotalCount,
  currentDatasetLabel,
  paperPnlRange,
  matrixWinRate,
  isMatrixPureWins,
  matrixProfitFactor,
  avgRRValue,
  matrixBestStreak
}) {
  return (
    <div className="space-y-2.5 w-full">
      <div className="flex items-center justify-between gap-2 flex-wrap px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
          <Zap className="w-3 h-3 text-cyan-400" />
          DISCIPLINE &amp; EXPECTANCY MATRIX
        </span>
        <div className="flex items-center gap-2">
          {matrixTotalCount < 10 && matrixTotalCount > 0 && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
              Sample: {matrixTotalCount}/30 Practice Trades
            </span>
          )}
          <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
            Scoped: {currentDatasetLabel || paperPnlRange} ({matrixTotalCount} {matrixTotalCount === 1 ? "Trade" : "Trades"})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs w-full">
        {/* Metric 1: Win Rate */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] text-center relative group/matrix hover:border-cyan-500/50 transition-colors duration-300 cursor-help"
        >
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-white/10 shadow-2xl backdrop-blur-xl opacity-0 group-hover/matrix:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/matrix:scale-100 transform space-y-1 text-left">
            <div className="flex items-center gap-1 text-cyan-300 font-bold text-xs pb-1 border-b border-white/10 whitespace-nowrap">
              <Info className="w-3.5 h-3.5" />
              <span>Win Rate ({matrixWinRate}%)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Formula: <strong>(Targets Won ÷ Total Setups) × 100</strong>. At a 1:{avgRRValue} R:R, any win rate above 35% generates strong compounding profit.
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-white/10 rotate-45" />
          </div>

          <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
            Win Rate
            <HelpCircle className="w-3 h-3 text-slate-500" />
          </span>
          <strong className="font-mono text-cyan-400 font-black text-base block mt-1">{matrixWinRate}%</strong>
        </motion.div>

        {/* Metric 2: Profit Factor */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] text-center relative group/matrix hover:border-emerald-500/50 transition-colors duration-300 cursor-help"
        >
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-white/10 shadow-2xl backdrop-blur-xl opacity-0 group-hover/matrix:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/matrix:scale-100 transform space-y-1 text-left">
            <div className="flex items-center gap-1 text-emerald-300 font-bold text-xs pb-1 border-b border-white/10 whitespace-nowrap">
              <Info className="w-3.5 h-3.5" />
              <span>Profit Factor ({isMatrixPureWins ? "100% Win Rate" : `${matrixProfitFactor}x`})</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Formula: <strong>Gross Wins ÷ Gross Losses</strong>. Measures expectancy. Any factor &gt; 2.0x represents an institutional-grade trading edge.
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-white/10 rotate-45" />
          </div>

          <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
            Profit Factor
            <HelpCircle className="w-3 h-3 text-slate-500" />
          </span>
          <strong className="font-mono text-emerald-400 font-black text-base block mt-1">
            {isMatrixPureWins ? "∞ (100% Win)" : `${matrixProfitFactor}x`}
          </strong>
        </motion.div>

        {/* Metric 3: Avg R:R */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] text-center relative group/matrix hover:border-cyan-500/50 transition-colors duration-300 cursor-help"
        >
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-white/10 shadow-2xl backdrop-blur-xl opacity-0 group-hover/matrix:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/matrix:scale-100 transform space-y-1 text-left">
            <div className="flex items-center gap-1 text-cyan-300 font-bold text-xs pb-1 border-b border-white/10 whitespace-nowrap">
              <Info className="w-3.5 h-3.5" />
              <span>Risk-to-Reward (1:{avgRRValue})</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Formula: <strong>Target Points ÷ Stop Loss Points</strong>. On average, you capture ₹{avgRRValue} for every ₹1.00 risked.
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-white/10 rotate-45" />
          </div>

          <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
            Avg R:R
            <HelpCircle className="w-3 h-3 text-slate-500" />
          </span>
          <strong className="font-mono text-white font-black text-base block mt-1">1:{avgRRValue}</strong>
        </motion.div>

        {/* Metric 4: Best Streak */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] text-center relative group/matrix hover:border-amber-500/50 transition-colors duration-300 cursor-help"
        >
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-white/10 shadow-2xl backdrop-blur-xl opacity-0 group-hover/matrix:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/matrix:scale-100 transform space-y-1 text-left">
            <div className="flex items-center gap-1 text-amber-300 font-bold text-xs pb-1 border-b border-white/10 whitespace-nowrap">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Best Streak ({matrixBestStreak} {matrixBestStreak === 1 ? "Win" : "Wins"})</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Longest run: {matrixBestStreak} consecutive winning trades without triggering a single stop-loss.
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-white/10 rotate-45" />
          </div>

          <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
            Best Streak
            <HelpCircle className="w-3 h-3 text-slate-500" />
          </span>
          <strong className="font-mono text-amber-400 font-black text-base block mt-1">
            {matrixBestStreak} {matrixBestStreak === 1 ? "Win" : "Wins"}
          </strong>
        </motion.div>
      </div>
    </div>
  );
}
