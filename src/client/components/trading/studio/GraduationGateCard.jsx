import React from "react";
import { motion } from "framer-motion";
import { Award, Info, HelpCircle } from "lucide-react";
import { GraduationMilestoneBanner } from "./GraduationMilestoneBanner";

export const GraduationGateCard = React.memo(function GraduationGateCard({
  practiceCompleted,
  gateProfitFactor,
  isPureWins,
  gateDisciplinePct,
  sampleSizeProgress,
  profitFactor,
}) {
  const isCertified = practiceCompleted >= 30 && (Number(gateProfitFactor) >= 1.5 || isPureWins) && gateDisciplinePct >= 90;

  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
      <GraduationMilestoneBanner
        isCertified={isCertified}
        isPureWins={isPureWins}
        gateProfitFactor={gateProfitFactor}
        gateDisciplinePct={gateDisciplinePct}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <div>
            <strong className="text-xs font-bold text-white">Live Capital Readiness &amp; Micro-Lot Graduation Gate</strong>
            <span className="text-[10px] text-slate-400 block sm:inline sm:ml-2">Complete 30 practice trades to unlock real-money trading mode</span>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 self-start sm:self-auto font-mono">
          Progress: {practiceCompleted} / 30 Practice Trades
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Step 1: Sample Size */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 relative group/gate hover:border-cyan-500/40 transition cursor-help">
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-cyan-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/gate:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/gate:scale-100 transform space-y-1.5">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs pb-1 border-b border-white/10">
              <Info className="w-3.5 h-3.5" />
              <span>Why 30 Trades?</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Statistical validity requires at least 30 executions (Law of Large Numbers) to separate genuine trading edge from short-term luck before risking real capital.
            </p>
            <div className="text-[10px] font-mono text-cyan-400 pt-0.5">
              {30 - practiceCompleted} more trades needed for graduation.
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-cyan-500/30 rotate-45" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-[11px] font-bold flex items-center gap-1">
              1. Sample Size (30 Trades)
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </span>
            <strong className="font-mono text-white font-bold">{practiceCompleted} / 30</strong>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${sampleSizeProgress}%` }}
              className="h-full bg-cyan-500 rounded-full"
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            {practiceCompleted >= 30 ? "✅ 30 Practice Trades Completed" : `${30 - practiceCompleted} more trades needed for sample significance`}
          </span>
        </div>

        {/* Step 2: Profit Factor */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 relative group/gate hover:border-emerald-500/40 transition cursor-help">
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-emerald-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/gate:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/gate:scale-100 transform space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs pb-1 border-b border-white/10">
              <Info className="w-3.5 h-3.5" />
              <span>Profit Factor ≥ 1.5 Target</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Profit Factor = <strong>Gross Wins ÷ Gross Losses</strong>. A value of <strong>{profitFactor}x</strong> means you make ₹{profitFactor} for every ₹1.00 lost, creating a thick buffer against brokerage taxes.
            </p>
            <div className="text-[10px] font-mono text-emerald-400 pt-0.5">
              Current status: Strong positive expectancy.
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-emerald-500/30 rotate-45" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-[11px] font-bold flex items-center gap-1">
              2. Profit Factor (&ge; 1.5)
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </span>
            <strong className="font-mono text-emerald-400 font-bold">
              {isPureWins ? "∞ (100% Win)" : `${gateProfitFactor}x`}
            </strong>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(100, isPureWins ? 100 : (Number(gateProfitFactor) / 2.0) * 100)}%` }} 
            />
          </div>
          <span className="text-[10px] text-emerald-400 block">
            {practiceCompleted === 0 
              ? "No practice trades recorded yet" 
              : Number(gateProfitFactor) >= 1.5 || isPureWins 
                ? `✅ Exceeds 1.5 minimum threshold (${isPureWins ? "100% Win Rate" : `${gateProfitFactor}x achieved`})` 
                : `⚠️ Current PF: ${gateProfitFactor}x (Target: ≥ 1.50x)`}
          </span>
        </div>

        {/* Step 3: Stop Loss Discipline */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 relative group/gate hover:border-emerald-500/40 transition cursor-help">
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 rounded-2xl bg-[#121424]/95 border border-emerald-500/30 shadow-2xl backdrop-blur-xl opacity-0 group-hover/gate:opacity-100 transition-all duration-200 pointer-events-none z-30 scale-95 group-hover/gate:scale-100 transform space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs pb-1 border-b border-white/10">
              <Info className="w-3.5 h-3.5" />
              <span>Zero Stop-Loss Overrides</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Measures whether you allow your automated stop-loss to execute cleanly without manually cancelling, freezing, or widening it during adverse price swings.
            </p>
            <div className="text-[10px] font-mono text-emerald-400 pt-0.5">
              Current status: {gateDisciplinePct}% plan adherence rate.
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#121424] border-r border-b border-emerald-500/30 rotate-45" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 text-[11px] font-bold flex items-center gap-1">
              3. Stop Loss Discipline
              <HelpCircle className="w-3 h-3 text-slate-500" />
            </span>
            <strong className="font-mono text-emerald-400 font-bold">{gateDisciplinePct}% Adherence</strong>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${gateDisciplinePct}%` }} />
          </div>
          <span className="text-[10px] text-emerald-400 block">
            {gateDisciplinePct >= 90 ? "✅ Disciplined exits maintained" : "⚠️ Attention needed on execution"}
          </span>
        </div>
      </div>
    </div>
  );
});
