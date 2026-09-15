import React from "react";
import clsx from "clsx";
import { 
  Target, 
  Receipt, 
  BrainCircuit, 
  BookOpen, 
  ChevronUp, 
  ChevronDown 
} from "lucide-react";
import { RollingTicker } from "../../common/RollingTicker";

export function TradeStoryCardActs({
  trade,
  isGain,
  audit,
  pts,
  pnlPercent,
  isExpanded,
  toggleExpand
}) {
  return (
    <>
      {/* 🌟 3-COLUMN CORE STORY SUMMARY (Act 1, 2, 3 Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
        {/* Act 1: 🎯 Catalyst & Technical Trigger */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/15 transition-all space-y-2 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px] uppercase tracking-wider">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>1. Setup Catalyst</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {trade.catalyst || trade.entryReason || "15m volume breakout above morning pivot with favorable momentum."}
          </p>
        </div>

        {/* Act 2: ⚡ Execution Telemetry & Taxes */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/15 transition-all space-y-2 font-mono backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-slate-400 font-sans font-bold text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              2. Execution &amp; Friction
            </span>
            <span className={clsx("font-bold text-[10px]", pts >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {pts >= 0 ? "+" : ""}{pts.toFixed(2)} pts ({pts >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-sans text-slate-400">Fill:</span>
              <span>₹{Number(trade.entryPrice).toFixed(2)} → ₹{Number(trade.exitPrice).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <span className="font-sans">Taxes &amp; Brokerage:</span>
              <span className="text-rose-400">-₹{trade.taxesAndCharges || "56.00"}</span>
            </div>
            <div className="flex items-center justify-between text-white font-bold pt-1.5 border-t border-white/10 text-[11px]">
              <span className="font-sans text-slate-400">True Take-Home:</span>
              <div className={clsx("flex items-center gap-1", isGain ? "text-emerald-400" : "text-rose-400")}>
                <RollingTicker 
                  value={Number(trade.netPnl || 0)} 
                  prefix="₹" 
                  showSign={true} 
                  decimalPlaces={2} 
                  className={isGain ? "text-emerald-400" : "text-rose-400"}
                />
                <span>({isGain ? "+" : ""}{pnlPercent.toFixed(2)}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Act 3: 🧠 Trader Psychology & Mindset Score */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/15 transition-all space-y-2 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-purple-300 font-bold text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
              3. Psychology Radar
            </span>
            <span className="text-purple-300 font-mono text-[10px]">
              {trade.confidenceScore || 9}/10 Conviction
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Mindset:</span>
              <span className="font-bold text-slate-200">{trade.mindsetEmotion || "Disciplined & Patient"}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Mistakes Avoided:</span>
              <span className={clsx("font-mono text-[10px] font-bold", audit.isHighQualitySetup ? "text-emerald-400" : "text-amber-400")}>
                {Array.isArray(trade.mistakeTags)
                  ? (trade.mistakeTags.length > 0 ? trade.mistakeTags.join(", ") : "Zero Tilt / Slipped Stops")
                  : (trade.mistakeTags && trade.mistakeTags !== "None" ? trade.mistakeTags : "Zero Tilt / Slipped Stops")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 ACT 4: EXPANDABLE DEEP FORENSIC DRAWER TOGGLE */}
      <div className="pt-1.5">
        <button
          type="button"
          onClick={() => toggleExpand(trade.id)}
          className="w-full py-2.5 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-500/30 text-xs font-bold text-cyan-300 transition-all flex items-center justify-between group/btn shadow-sm"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isExpanded ? "Collapse Case Study & Forensic Story" : "📖 Explore Full Story & Forensic Post-Mortem"}</span>
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 group-hover/btn:translate-y-0.5 transition-transform" />}
        </button>
      </div>
    </>
  );
}
