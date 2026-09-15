import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { DynamicExecutionCandles } from "./DynamicExecutionCandles";

export function TradeStoryCardDeepDrawer({
  isExpanded,
  trade,
  isGain,
  audit
}) {
  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          layout
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20 space-y-4 pt-3 overflow-hidden text-xs"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-white text-xs">Forensic Autopsy &amp; Execution Timeline</span>
              
              {/* Rigorous Objective Badge (No Hindsight Halo!) */}
              {isGain ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  🎯 Edge Verified: Clean Target Fill ({audit.grade})
                </span>
              ) : audit.isHighQualitySetup ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  🛡️ Good Process / Bad Outcome (Acceptable Variance)
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  ⚠️ Low Integrity Trade ({audit.grade})
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Execution ID: #{trade.id}
            </span>
          </div>

          {/* Dynamic Candlestick Sparkline */}
          <DynamicExecutionCandles trade={trade} isGain={isGain} />

          {/* Detailed Execution Anatomy */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Execution Mechanics
            </span>
            <p className="text-[11px] text-slate-200 leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
              {trade.executionDetails || "Market order filled cleanly on breakout confirmation. Target reached after brief 3-minute consolidation wick."}
            </p>
          </div>

          {/* Mindset & Key Lessons Learned */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Key Retrospective Lesson (Edge Compounder)
            </span>
            <p className="text-[11px] text-emerald-300 leading-relaxed bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20 italic">
              "{trade.lessonsLearned || "Disciplined execution at predetermined target level without second-guessing."}"
            </p>
          </div>

          {/* 12-Filter Quantitative Rules Checklist */}
          <div className="pt-2 border-t border-white/5 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Objective Quantitative Rules Audit (12-Filter Gate)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
              {audit.passedRules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{rule}</span>
                </div>
              ))}
              {audit.violations.map((violation, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>{violation}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
