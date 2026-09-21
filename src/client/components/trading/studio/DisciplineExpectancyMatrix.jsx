import React from "react";
import { motion } from "framer-motion";
import { Zap, HelpCircle, Info, Flame, ShieldAlert, TrendingUp, BarChart2 } from "lucide-react";
import clsx from "clsx";

export function DisciplineExpectancyMatrix({
  matrixTotalCount = 0,
  matrixWinsCount = 0,
  matrixLossesCount = 0,
  currentDatasetLabel,
  paperPnlRange,
  matrixWinRate = "0.0",
  isMatrixPureWins = false,
  matrixProfitFactor = "0.00",
  avgRRValue = "0.00",
  avgRealizedR = "0.00",
  quantExpectancy = 0,
  expectancyStr = "₹0.0/trade",
  rBuckets = {},
  maxDrawdownRupees = 0,
  quarterKellyPct = 0,
  recommendedRiskRupees = 250,
  matrixBestStreak = 0
}) {
  const buckets = [
    { key: "severeLoss", label: "< -1.0R", desc: "Slipped Loss / Rule Breach (>₹300)", count: rBuckets.severeLoss || 0, color: "from-rose-600 to-red-500", textColor: "text-rose-400", border: "border-rose-500/40" },
    { key: "fullLoss", label: "-1.0R", desc: "Disciplined Stop Loss (₹200-₹250)", count: rBuckets.fullLoss || 0, color: "from-rose-500/80 to-amber-500/80", textColor: "text-amber-400", border: "border-amber-500/40" },
    { key: "scratch", label: "0R (BE)", desc: "Breakeven / Scratch (Fees Covered)", count: rBuckets.scratch || 0, color: "from-slate-500 to-cyan-500/60", textColor: "text-cyan-300", border: "border-cyan-500/30" },
    { key: "smallGain", label: "+0.5R", desc: "Partial Profit / Base Hit", count: rBuckets.smallGain || 0, color: "from-emerald-600 to-teal-500", textColor: "text-emerald-400", border: "border-emerald-500/30" },
    { key: "targetGain", label: "+1.5R", desc: "Target Approached (+₹375-₹450)", count: rBuckets.targetGain || 0, color: "from-emerald-500 to-emerald-400", textColor: "text-emerald-300", border: "border-emerald-500/40" },
    { key: "runnerGain", label: "≥ +2.0R", desc: "Full Target Hit (≥ ₹500 Net)", count: rBuckets.runnerGain || 0, color: "from-emerald-400 via-teal-300 to-cyan-300", textColor: "text-cyan-200", border: "border-cyan-400/50" }
  ];

  const maxBucketCount = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="space-y-4 w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 flex items-center gap-1.5 font-mono shadow-sm">
            <Zap className="w-3 h-3 text-cyan-400" />
            DISCIPLINE &amp; QUANT EXPECTANCY MATRIX
          </span>
          <span className="text-[10px] font-bold text-slate-400 font-mono hidden sm:inline">
            • 6-Pillar Edge &amp; R-Distribution Audit
          </span>
        </div>
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

      {/* 6 Institutional Quantitative Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs w-full">
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
              Formula: <strong>(Targets Won ÷ Total Setups) × 100</strong>. At 1:{avgRRValue} R:R, any win rate above 35% compounds capital.
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-white/10 rotate-45" />
          </div>

          <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
            Win Rate
            <HelpCircle className="w-3 h-3 text-slate-500" />
          </span>
          <strong className="font-mono text-cyan-400 font-black text-base block mt-1">{matrixWinRate}%</strong>
          <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
            {matrixWinsCount}W · {matrixLossesCount}L
          </span>
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
              <span>Profit Factor ({isMatrixPureWins ? "Pure Wins" : `${matrixProfitFactor}x`})</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Formula: <strong>Gross Wins ÷ Gross Losses</strong>. Measures expectancy. Any factor ≥ 1.50x represents an institutional-grade trading edge.
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-white/10 rotate-45" />
          </div>

          <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
            Profit Factor
            <HelpCircle className="w-3 h-3 text-slate-500" />
          </span>
          <strong className="font-mono text-emerald-400 font-black text-base block mt-1">
            {isMatrixPureWins ? "∞" : `${matrixProfitFactor}x`}
          </strong>
          <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
            {Number(matrixProfitFactor) >= 1.50 ? "Target ≥ 1.50x Passed" : "Edge Developing"}
          </span>
        </motion.div>

        {/* Metric 3: Normalized R-Multiple */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] text-center relative group/matrix hover:border-cyan-500/50 transition-colors duration-300 cursor-help"
        >
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-white/10 shadow-2xl backdrop-blur-xl opacity-0 group-hover/matrix:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/matrix:scale-100 transform space-y-1 text-left">
            <div className="flex items-center gap-1 text-cyan-300 font-bold text-xs pb-1 border-b border-white/10 whitespace-nowrap">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Realized R-Multiple ({avgRealizedR}R)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Formula: <strong>Net P&amp;L ÷ Planned Risk (₹250)</strong>. Normalizes all trades into units of planned risk, eliminating dollar distortion.
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-white/10 rotate-45" />
          </div>

          <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
            Realized Edge
            <HelpCircle className="w-3 h-3 text-slate-500" />
          </span>
          <strong className={clsx("font-mono font-black text-base block mt-1", Number(avgRealizedR) >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {Number(avgRealizedR) >= 0 ? "+" : ""}{avgRealizedR}R
          </strong>
          <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
            Planned 1:{avgRRValue}
          </span>
        </motion.div>

        {/* Metric 4: Mathematical Expectancy */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] text-center relative group/matrix hover:border-emerald-500/50 transition-colors duration-300 cursor-help"
        >
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-white/10 shadow-2xl backdrop-blur-xl opacity-0 group-hover/matrix:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/matrix:scale-100 transform space-y-1 text-left">
            <div className="flex items-center gap-1 text-emerald-300 font-bold text-xs pb-1 border-b border-white/10 whitespace-nowrap">
              <Zap className="w-3.5 h-3.5" />
              <span>Quant Expectancy (E)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Formula: <strong>(P_win × Avg_Win) - (P_loss × Avg_Loss)</strong>. Shows expected take-home cash per execution after statutory taxes.
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-white/10 rotate-45" />
          </div>

          <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
            Quant Expectancy
            <HelpCircle className="w-3 h-3 text-slate-500" />
          </span>
          <strong className={clsx("font-mono font-black text-base block mt-1", quantExpectancy >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {expectancyStr.replace("/trade", "")}
          </strong>
          <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
            Expectancy / Trade
          </span>
        </motion.div>

        {/* Metric 5: Max Drawdown vs ₹300 Cap */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] text-center relative group/matrix hover:border-rose-500/50 transition-colors duration-300 cursor-help"
        >
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-white/10 shadow-2xl backdrop-blur-xl opacity-0 group-hover/matrix:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/matrix:scale-100 transform space-y-1 text-left">
            <div className="flex items-center gap-1 text-rose-300 font-bold text-xs pb-1 border-b border-white/10 whitespace-nowrap">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Max Timeframe Drawdown (₹{maxDrawdownRupees})</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Peak-to-trough capital dip. Evaluated against Manikandan&apos;s ₹300 daily loss circuit breaker invariant.
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-white/10 rotate-45" />
          </div>

          <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
            Max Drawdown
            <HelpCircle className="w-3 h-3 text-slate-500" />
          </span>
          <strong className={clsx("font-mono font-black text-base block mt-1", maxDrawdownRupees <= 300 ? "text-cyan-300" : "text-rose-400")}>
            -₹{maxDrawdownRupees}
          </strong>
          <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
            {maxDrawdownRupees <= 300 ? "Within ₹300 Cap" : "⚠️ Cap Exceeded"}
          </span>
        </motion.div>

        {/* Metric 6: Quarter-Kelly Sizing */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] text-center relative group/matrix hover:border-amber-500/50 transition-colors duration-300 cursor-help"
        >
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-white/10 shadow-2xl backdrop-blur-xl opacity-0 group-hover/matrix:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/matrix:scale-100 transform space-y-1 text-left">
            <div className="flex items-center gap-1 text-amber-300 font-bold text-xs pb-1 border-b border-white/10 whitespace-nowrap">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Quarter-Kelly Risk Sizing</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Calculates mathematically optimal position sizing fraction (0.25x Kelly). Clamped strictly to Manikandan&apos;s ₹250 target risk invariant.
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-white/10 rotate-45" />
          </div>

          <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
            Optimal Risk
            <HelpCircle className="w-3 h-3 text-slate-500" />
          </span>
          <strong className="font-mono text-amber-400 font-black text-base block mt-1">
            ₹{recommendedRiskRupees}
          </strong>
          <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
            {quarterKellyPct > 0 ? `${quarterKellyPct}% Kelly · Best: ${matrixBestStreak}W` : `Conservative · Best: ${matrixBestStreak}W`}
          </span>
        </motion.div>
      </div>

      {/* 📊 Institutional Realized R-Multiple Distribution Histogram */}
      <div className="p-4 rounded-3xl bg-[#090b10]/95 border border-white/10 shadow-2xl backdrop-blur-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Realized R-Multiple Distribution (R = Net P&amp;L / Risk)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {matrixTotalCount} Settled Executions Normalized by Planned Risk
          </span>
        </div>

        {/* Distribution Bars */}
        {matrixTotalCount === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
              <BarChart2 className="w-5 h-5 text-slate-500" />
            </div>
            <span className="text-xs font-bold text-slate-300 block">No Settled Executions in this Range</span>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Execute trades honoring the ₹200–₹300 risk budget to construct your live R-Multiple frequency distribution.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-2 pt-2">
            {buckets.map((b) => {
              const pct = Math.round((b.count / matrixTotalCount) * 100);
              const barHeightPct = Math.max(12, Math.round((b.count / maxBucketCount) * 100));

              return (
                <div key={b.key} className="flex flex-col items-center space-y-2 group/bucket relative cursor-help">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2.5 rounded-xl bg-[#121424]/95 border border-white/10 shadow-2xl backdrop-blur-xl opacity-0 group-hover/bucket:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/bucket:scale-100 transform text-center space-y-1">
                    <div className={clsx("font-mono font-bold text-xs", b.textColor)}>
                      {b.label} ({b.count} {b.count === 1 ? "trade" : "trades"})
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      {b.desc}
                    </p>
                    <span className="text-[9px] font-mono text-slate-400 block pt-0.5 border-t border-white/10">
                      {pct}% of Total Executions
                    </span>
                  </div>

                  {/* Count Pill */}
                  <span className={clsx("text-[10px] font-mono font-black", b.textColor)}>
                    {b.count}
                  </span>

                  {/* Vertical Bar Track */}
                  <div className="w-full h-24 bg-white/[0.02] rounded-xl border border-white/5 p-1 flex items-end justify-center relative overflow-hidden">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${barHeightPct}%` }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className={clsx(
                        "w-full rounded-lg bg-gradient-to-t shadow-sm border transition-all duration-300",
                        b.color,
                        b.border
                      )}
                    />
                  </div>

                  {/* Label & Pct */}
                  <div className="text-center">
                    <span className="text-[10px] font-mono font-bold text-slate-300 block">
                      {b.label}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 block">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
