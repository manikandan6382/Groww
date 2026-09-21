import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, CheckCircle2, AlertTriangle, Tag, Receipt, Check, Edit3, Save } from "lucide-react";
import { useTradingStore } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";
import { resolveIndexLotSize } from "../../../stores/slices/tradeHelpers";
import { DynamicExecutionCandles } from "./DynamicExecutionCandles";

const MISTAKE_OPTIONS = [
  "None / Disciplined",
  "FOMO Entry",
  "Chased Green Candle",
  "Early Exit / Greed",
  "Slipped Stop Loss",
  "Hesitation on Entry",
  "Revenge Scalp"
];

export function TradeStoryCardDeepDrawer({
  isExpanded,
  trade,
  isGain,
  audit
}) {
  const updateTradeDetails = useTradingStore((s) => s.updateTradeDetails);
  const [isSavedTag, setIsSavedTag] = useState(false);

  // Inline reflection editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [executionText, setExecutionText] = useState(trade.executionDetails || "");
  const [lessonsText, setLessonsText] = useState(trade.lessonsLearned || "");
  const [isSavedNotes, setIsSavedNotes] = useState(false);

  const effectiveLotSize = resolveIndexLotSize(trade.symbol, trade.lotSize);
  const rawQty = Number(trade.quantity || 1);
  const qty = Number(trade.totalQty || (rawQty >= effectiveLotSize ? rawQty : rawQty * effectiveLotSize));

  const entry = Number(trade.entryPrice || 0);
  const exit = Number(trade.exitPrice || 0);
  const buyVal = entry * qty;
  const sellVal = exit * qty;

  const brokerage = 40.0;
  const stt = Number((sellVal * 0.001).toFixed(2));
  const exch = Number(((buyVal + sellVal) * 0.00053).toFixed(2));
  const sebi = Number(((buyVal + sellVal) * 0.000001).toFixed(2));
  const stamp = Number((buyVal * 0.00003).toFixed(2));
  const gst = Number((0.18 * (brokerage + exch + sebi)).toFixed(2));
  const calculatedCharges = Number((brokerage + stt + exch + sebi + stamp + gst).toFixed(2));
  const totalCharges = Number(trade.taxesAndCharges || calculatedCharges);

  const currentMistake = Array.isArray(trade.mistakeTags) 
    ? (trade.mistakeTags[0] || "None / Disciplined") 
    : (trade.mistakeTags || "None / Disciplined");

  const handleTagChange = (newTag) => {
    updateTradeDetails?.(trade.id, { mistakeTags: newTag });
    soundEngine?.playSuccessTone?.();
    setIsSavedTag(true);
    setTimeout(() => setIsSavedTag(false), 2000);
  };

  const handleSaveNotes = () => {
    updateTradeDetails?.(trade.id, {
      executionDetails: executionText,
      lessonsLearned: lessonsText
    });
    soundEngine?.playSuccessTone?.();
    setIsSavedNotes(true);
    setTimeout(() => {
      setIsSavedNotes(false);
      setIsEditingNotes(false);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          layout
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="p-4 sm:p-5 rounded-2xl bg-[#090d16]/95 border border-cyan-500/25 shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(6,182,212,0.1)] space-y-4 pt-3 overflow-hidden text-xs"
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

          {/* Dynamic Candlestick & Milestone Excursion Sparkline */}
          <DynamicExecutionCandles trade={trade} isGain={isGain} />

          {/* 2-Column Analytics: Execution Mechanics & Statutory Friction Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Mechanics & Lessons (Editable with Auto-Save) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Execution Mechanics &amp; Edge Reflection
                </span>
                {!isEditingNotes ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingNotes(true)}
                    className="text-[10px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 font-sans cursor-pointer hover:underline"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Notes
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {isSavedNotes && (
                      <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-bold">
                        <Check className="w-3 h-3" /> Saved!
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                    >
                      <Save className="w-3 h-3" /> Save Reflection
                    </button>
                  </div>
                )}
              </div>

              {isEditingNotes ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1">Execution Mechanics</label>
                    <textarea
                      value={executionText}
                      onChange={(e) => setExecutionText(e.target.value)}
                      rows={2}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-[11px] text-slate-200 font-sans focus:outline-none focus:border-cyan-500/50"
                      placeholder="Describe the entry confirmation, order fill, and management..."
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-emerald-400 uppercase tracking-wider block mb-1">Key Retrospective Lesson</label>
                    <textarea
                      value={lessonsText}
                      onChange={(e) => setLessonsText(e.target.value)}
                      rows={2}
                      className="w-full bg-black/60 border border-emerald-500/20 rounded-xl p-2 text-[11px] text-emerald-300 font-sans focus:outline-none focus:border-emerald-500/50 italic"
                      placeholder="What rule did this reinforce? What edge was protected?"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-200 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5 font-sans">
                    {trade.executionDetails || executionText || "Market order filled cleanly on breakout confirmation. Target reached after brief consolidation wick."}
                  </p>
                  <p className="text-[11px] text-emerald-300 leading-relaxed bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20 italic font-sans">
                    "{trade.lessonsLearned || lessonsText || "Disciplined execution at predetermined target level without second-guessing."}"
                  </p>
                </div>
              )}
            </div>

            {/* Statutory Friction Itemization & Interactive Mistake Tagger */}
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5 font-mono text-[10px]">
                <div className="flex items-center justify-between text-slate-300 font-sans font-bold pb-1 border-b border-white/5">
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <Receipt className="w-3 h-3 text-amber-400" />
                    <span>Statutory Drag Itemization ({qty} Qty)</span>
                  </span>
                  <span className="text-rose-400 font-mono font-bold">-₹{totalCharges.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Flat Brokerage (Buy + Sell):</span>
                  <span>₹{brokerage.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>STT / CTT (0.1% Sell Turnover):</span>
                  <span>₹{stt.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Exchange Turnover (0.053%):</span>
                  <span>₹{exch.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>SEBI + Stamp Duty + 18% GST:</span>
                  <span>₹{(sebi + stamp + gst).toFixed(2)}</span>
                </div>
              </div>

              {/* Interactive Mistake Tag Selector */}
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-purple-300">
                    <Tag className="w-3 h-3 text-purple-400" />
                    <span>Post-Trade Mistake Audit</span>
                  </span>
                  {isSavedTag && (
                    <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-sans font-bold animate-in fade-in">
                      <Check className="w-3 h-3" /> Saved
                    </span>
                  )}
                </div>
                <select
                  value={currentMistake}
                  onChange={(e) => handleTagChange(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer font-sans"
                >
                  {MISTAKE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-slate-900 text-white">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 12-Filter Quantitative Rules Checklist */}
          <div className="pt-2 border-t border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Objective Quantitative Rules Audit (12-Filter Gate)
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                {audit.passedRules.length} / 12 Criteria Met
              </span>
            </div>
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

export default TradeStoryCardDeepDrawer;
